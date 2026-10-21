from typing import Literal, Protocol

from pydantic import BaseModel


class AvailableVoice(BaseModel):
    voice_identifier: str
    visible_name: str
    speaks_spanish: bool


class VoiceListingRequest(BaseModel):
    profile_identifier: str | None = None


class VoiceListingResponse(BaseModel):
    provider_name: str
    voices: list[AvailableVoice]
    interaction_identifier: str | None = None


class SpeechSynthesisRequest(BaseModel):
    profile_identifier: str | None = None
    turn_identifier: str | None = None
    text: str
    voice_identifier: str


class SpeechSynthesisResponse(BaseModel):
    provider_name: str
    speech_model_identifier: str
    media_type_name: str
    audio_bytes: bytes
    interaction_identifier: str | None = None


class SpeechProvider(Protocol):
    provider_name: str
    provider_mode_name: Literal["synthetic", "real"]
    speech_model_identifier: str

    async def list_available_voices(self, listing_request: VoiceListingRequest) -> VoiceListingResponse: ...

    async def synthesize_speech(self, synthesis_request: SpeechSynthesisRequest) -> SpeechSynthesisResponse: ...

    async def close(self) -> None: ...
