import json
from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx

elevenlabs_base_address = "https://api.elevenlabs.io"
elevenlabs_speech_model_identifier = "eleven_multilingual_v2"
elevenlabs_audio_output_format = "mp3_44100_128"
elevenlabs_voice_page_size = 100
elevenlabs_request_timeout_seconds = 30.0

invalid_access_key_status_names = {"invalid_api_key", "missing_api_key", "needs_authorization", "missing_permissions"}
exhausted_quota_status_names = {"quota_exceeded"}
busy_provider_status_names = {"too_many_concurrent_requests", "system_busy", "rate_limit_exceeded"}
unknown_voice_status_names = {"voice_not_found", "invalid_uid"}


class SpeechProviderError(Exception):
    failure_name = "speech_provider_failed"
    response_status_code = 502


class AccessKeyRejectedError(SpeechProviderError):
    failure_name = "access_key_rejected"
    response_status_code = 401


class SpeechQuotaExhaustedError(SpeechProviderError):
    failure_name = "speech_quota_exhausted"
    response_status_code = 402


class SpeechProviderBusyError(SpeechProviderError):
    failure_name = "speech_provider_busy"
    response_status_code = 429


class VoiceNotFoundError(SpeechProviderError):
    failure_name = "voice_not_found"
    response_status_code = 404


class SpeechProviderUnreachableError(SpeechProviderError):
    failure_name = "speech_provider_unreachable"
    response_status_code = 504


@dataclass(frozen=True)
class AvailableVoice:
    voice_identifier: str
    visible_name: str
    speaks_spanish: bool


def read_provider_status_name(response_body: bytes) -> str:
    try:
        parsed_body = json.loads(response_body)
    except ValueError:
        return ""
    if not isinstance(parsed_body, dict):
        return ""
    detail = parsed_body.get("detail")
    if isinstance(detail, dict) and isinstance(detail.get("status"), str):
        return detail["status"]
    return ""


def build_error_for_provider_response(response_status_code: int, response_body: bytes) -> SpeechProviderError:
    provider_status_name = read_provider_status_name(response_body)
    if provider_status_name in exhausted_quota_status_names or response_status_code == 402:
        return SpeechQuotaExhaustedError()
    if provider_status_name in invalid_access_key_status_names or response_status_code in (401, 403):
        return AccessKeyRejectedError()
    if provider_status_name in busy_provider_status_names or response_status_code == 429:
        return SpeechProviderBusyError()
    if provider_status_name in unknown_voice_status_names or response_status_code == 404:
        return VoiceNotFoundError()
    return SpeechProviderError()


def does_voice_speak_spanish(voice_record: dict) -> bool:
    labels = voice_record.get("labels")
    if isinstance(labels, dict) and labels.get("language") == "es":
        return True
    verified_languages = voice_record.get("verified_languages")
    if not isinstance(verified_languages, list):
        return False
    return any(
        isinstance(verified_language, dict) and verified_language.get("language") == "es"
        for verified_language in verified_languages
    )


class ElevenLabsSpeechClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.http_client = httpx.AsyncClient(
            base_url=elevenlabs_base_address,
            timeout=elevenlabs_request_timeout_seconds,
            transport=transport,
        )

    async def close(self) -> None:
        await self.http_client.aclose()

    async def list_available_voices(self, access_key: str) -> list[AvailableVoice]:
        try:
            response = await self.http_client.get(
                "/v2/voices",
                params={"page_size": elevenlabs_voice_page_size},
                headers={"xi-api-key": access_key},
            )
        except httpx.HTTPError as network_error:
            raise SpeechProviderUnreachableError() from network_error
        if response.status_code != 200:
            raise build_error_for_provider_response(response.status_code, response.content)
        try:
            voice_records = response.json().get("voices", [])
        except (ValueError, AttributeError) as parsing_error:
            raise SpeechProviderError() from parsing_error
        available_voices = [
            AvailableVoice(
                voice_identifier=voice_record["voice_id"],
                visible_name=voice_record["name"],
                speaks_spanish=does_voice_speak_spanish(voice_record),
            )
            for voice_record in voice_records
            if isinstance(voice_record, dict)
            and isinstance(voice_record.get("voice_id"), str)
            and isinstance(voice_record.get("name"), str)
        ]
        return sorted(
            available_voices,
            key=lambda available_voice: (not available_voice.speaks_spanish, available_voice.visible_name.lower()),
        )

    async def open_speech_audio_stream(
        self, access_key: str, voice_identifier: str, text: str
    ) -> AsyncIterator[bytes]:
        request = self.http_client.build_request(
            "POST",
            f"/v1/text-to-speech/{voice_identifier}/stream",
            params={"output_format": elevenlabs_audio_output_format},
            headers={"xi-api-key": access_key},
            json={"text": text, "model_id": elevenlabs_speech_model_identifier},
        )
        try:
            response = await self.http_client.send(request, stream=True)
        except httpx.HTTPError as network_error:
            raise SpeechProviderUnreachableError() from network_error
        if response.status_code != 200:
            try:
                response_body = await response.aread()
            except httpx.HTTPError:
                response_body = b""
            finally:
                await response.aclose()
            raise build_error_for_provider_response(response.status_code, response_body)

        async def iterate_audio_chunks() -> AsyncIterator[bytes]:
            try:
                async for audio_chunk in response.aiter_bytes():
                    yield audio_chunk
            except httpx.HTTPError:
                return
            finally:
                await response.aclose()

        return iterate_audio_chunks()
