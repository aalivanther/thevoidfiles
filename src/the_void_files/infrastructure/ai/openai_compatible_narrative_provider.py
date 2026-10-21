import asyncio
import json
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from the_void_files.application.ports.access_key_vault import AccessKeyName, AccessKeyVault
from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest, NarrativeGenerationResponse
from the_void_files.application.use_cases.director_failures import (
    NarrativeAccessKeyMissingError,
    NarrativeAccessKeyRejectedError,
    NarrativeProviderTimedOutError,
    NarrativeProviderUnreachableError,
    NarrativeRequestTooLargeError,
    NarrativeResponseBlockedError,
    NarrativeResponseEmptyError,
)
from the_void_files.infrastructure.ai.gemini_provider import (
    build_error_for_provider_response,
    build_prompt_text,
    gemini_block_authority_notice_text,
    read_structured_response,
    read_whole_number,
)
from the_void_files.narrative.context_builder import build_connection_check_request
from the_void_files.narrative.tool_registry import (
    connection_check_response_schema_name,
    read_registered_response_json_schema,
)

chat_completions_path = "/chat/completions"
compatible_request_timeout_seconds = 240.0
compatible_connect_timeout_seconds = 10.0
compatible_default_maximum_transport_attempt_count = 3
compatible_highest_maximum_transport_attempt_count = 4
compatible_retry_pause_seconds = 1.5
compatible_maximum_completion_token_count = 32768
json_instruction_text = "Answer with one JSON value only. The word json is required and the answer must be valid JSON."


def read_candidate_text(parsed_body: dict[str, Any]) -> str:
    choices = parsed_body.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise NarrativeResponseEmptyError()
    first_choice = choices[0]
    if first_choice.get("finish_reason") == "content_filter":
        raise NarrativeResponseBlockedError()
    message = first_choice.get("message")
    candidate_text = message.get("content") if isinstance(message, dict) else None
    if not isinstance(candidate_text, str) or not candidate_text.strip():
        raise NarrativeResponseEmptyError()
    return candidate_text


def does_response_indicate_token_limit(response: httpx.Response) -> bool:
    if response.status_code == 413:
        return True
    try:
        parsed_body = response.json()
    except ValueError:
        return False
    error_record = parsed_body.get("error") if isinstance(parsed_body, dict) else None
    if not isinstance(error_record, dict):
        return False
    error_code_name = error_record.get("code")
    error_message_text = str(error_record.get("message") or "")
    return error_code_name == "rate_limit_exceeded" and (
        "TPM" in error_message_text or "reduce your message size" in error_message_text.lower()
    )


def does_refusal_mention_access_key(response_body: bytes) -> bool:
    try:
        parsed_body = json.loads(response_body)
    except ValueError:
        return False
    error_record = parsed_body.get("error") if isinstance(parsed_body, dict) else None
    if not isinstance(error_record, dict):
        return False
    error_type_name = error_record.get("type")
    error_code_name = error_record.get("code")
    return error_type_name in {"authentication_error", "invalid_request_error"} or error_code_name in {
        "invalid_api_key",
        "invalid_request_error",
    }


class OpenAICompatibleNarrativeProvider:
    provider_mode_name = "real"

    def __init__(
        self,
        access_key_vault: AccessKeyVault,
        *,
        provider_name: str,
        access_key_name: AccessKeyName,
        base_address: str,
        model_identifier: str,
        extra_generation_fields: dict[str, Any] | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
        maximum_transport_attempt_count: int = compatible_default_maximum_transport_attempt_count,
        pause_between_attempts: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self.access_key_vault = access_key_vault
        self.provider_name = provider_name
        self.access_key_name = access_key_name
        self.model_identifier = model_identifier
        self.extra_generation_fields = extra_generation_fields if extra_generation_fields is not None else {}
        self.maximum_transport_attempt_count = max(
            1, min(maximum_transport_attempt_count, compatible_highest_maximum_transport_attempt_count)
        )
        self.pause_between_attempts = pause_between_attempts
        self.http_client = httpx.AsyncClient(
            base_url=base_address,
            timeout=httpx.Timeout(compatible_request_timeout_seconds, connect=compatible_connect_timeout_seconds),
            transport=transport,
        )

    def build_generation_body(
        self, generation_request: NarrativeGenerationRequest, response_json_schema: dict[str, Any] | None
    ) -> dict[str, Any]:
        schema_text_for_prompt = (
            json.dumps(response_json_schema, sort_keys=True, ensure_ascii=False) if response_json_schema is not None else None
        )
        generation_body: dict[str, Any] = {
            "model": self.model_identifier,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"{generation_request.instruction_text}\n\n{gemini_block_authority_notice_text}\n\n"
                        f"{json_instruction_text}"
                    ),
                },
                {"role": "user", "content": build_prompt_text(generation_request, schema_text_for_prompt)},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": compatible_maximum_completion_token_count,
        }
        generation_body.update(self.extra_generation_fields)
        return generation_body

    async def close(self) -> None:
        await self.http_client.aclose()

    def read_required_access_key(self) -> str:
        stored_access_key = self.access_key_vault.read_access_key(self.access_key_name)
        if stored_access_key is None:
            raise NarrativeAccessKeyMissingError()
        return stored_access_key

    async def send_generation_body(self, access_key: str, generation_body: dict[str, Any]) -> httpx.Response:
        try:
            return await self.http_client.post(
                chat_completions_path,
                headers={"Authorization": f"Bearer {access_key}"},
                json=generation_body,
            )
        except httpx.TimeoutException as timeout_error:
            raise NarrativeProviderTimedOutError() from timeout_error
        except httpx.HTTPError as network_error:
            raise NarrativeProviderUnreachableError() from network_error

    async def send_generation_body_with_bounded_attempts(
        self, access_key: str, generation_body: dict[str, Any]
    ) -> httpx.Response:
        for attempt_number in range(1, self.maximum_transport_attempt_count + 1):
            is_last_attempt = attempt_number == self.maximum_transport_attempt_count
            try:
                response = await self.send_generation_body(access_key, generation_body)
            except (NarrativeProviderTimedOutError, NarrativeProviderUnreachableError):
                if is_last_attempt:
                    raise
                await self.pause_between_attempts(compatible_retry_pause_seconds * attempt_number)
                continue
            if response.status_code in (429, 500, 502, 503, 504) and not is_last_attempt:
                await self.pause_between_attempts(compatible_retry_pause_seconds * attempt_number)
                continue
            return response
        raise build_error_for_provider_response(503)

    async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
        access_key = self.read_required_access_key()
        response_json_schema = (
            generation_request.response_json_schema
            if generation_request.response_json_schema is not None
            else read_registered_response_json_schema(generation_request.response_schema_name)
        )
        response = await self.send_generation_body_with_bounded_attempts(
            access_key, self.build_generation_body(generation_request, response_json_schema)
        )
        if response.status_code in (401, 403) or (
            response.status_code == 400 and does_refusal_mention_access_key(response.content)
        ):
            raise NarrativeAccessKeyRejectedError()
        if does_response_indicate_token_limit(response):
            raise NarrativeRequestTooLargeError()
        if response.status_code != 200:
            raise build_error_for_provider_response(response.status_code)
        try:
            parsed_body = response.json()
        except ValueError as parsing_error:
            raise NarrativeResponseEmptyError() from parsing_error
        if not isinstance(parsed_body, dict):
            raise NarrativeResponseEmptyError()
        candidate_text = read_candidate_text(parsed_body)
        usage_record = parsed_body.get("usage") if isinstance(parsed_body.get("usage"), dict) else {}
        reported_model_identifier = parsed_body.get("model")
        return NarrativeGenerationResponse(
            provider_name=self.provider_name,
            model_identifier=(
                reported_model_identifier if isinstance(reported_model_identifier, str) else self.model_identifier
            ),
            response_text=candidate_text,
            structured_response=read_structured_response(candidate_text, generation_request.response_schema_name),
            input_token_count=read_whole_number(usage_record.get("prompt_tokens")),
            output_token_count=read_whole_number(usage_record.get("completion_tokens")),
        )

    async def check_connection(self, profile_identifier: str | None = None) -> bool:
        connection_check_response = await self.generate_narrative(build_connection_check_request(profile_identifier))
        connection_check_answer = (connection_check_response.structured_response or {}).get(
            connection_check_response_schema_name
        )
        return isinstance(connection_check_answer, dict) and connection_check_answer.get("is_director_listening") is True
