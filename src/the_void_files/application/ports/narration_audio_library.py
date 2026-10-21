from typing import Protocol

from pydantic import BaseModel


class StoredNarrationAudio(BaseModel):
    content_hash: str
    media_type_name: str
    audio_bytes: bytes
    was_found_in_library: bool


class NarrationAudioToStore(BaseModel):
    profile_identifier: str | None
    content_hash: str
    provider_name: str
    speech_model_identifier: str
    voice_identifier: str
    media_type_name: str
    audio_bytes: bytes
    text_character_count: int
    interaction_identifier: str


class NarrationAudioLibrary(Protocol):
    def find_stored_audio(self, profile_identifier: str | None, content_hash: str) -> StoredNarrationAudio | None: ...

    def store_audio(self, narration_audio: NarrationAudioToStore) -> None: ...
