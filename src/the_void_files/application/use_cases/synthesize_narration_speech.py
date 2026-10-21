import re

from the_void_files.application.content_hashing import compute_json_content_hash
from the_void_files.application.ports.narration_audio_library import (
    NarrationAudioLibrary,
    NarrationAudioToStore,
    StoredNarrationAudio,
)
from the_void_files.application.ports.speech_provider import SpeechProvider, SpeechSynthesisRequest
from the_void_files.application.service_failures import (
    ServiceFailure,
    SpeechTextEmptyError,
    SpeechTextTooLongError,
    VoiceIdentifierMalformedError,
)

maximum_speech_text_length = 2500
voice_identifier_pattern = re.compile(r"^[A-Za-z0-9]{1,64}$")


class SpeechInteractionNotRecordedError(ServiceFailure):
    failure_name = "speech_interaction_not_recorded"
    response_status_code = 500


def compute_narration_content_hash(
    provider_name: str, speech_model_identifier: str, voice_identifier: str, speech_text: str
) -> str:
    return compute_json_content_hash(
        {
            "provider_name": provider_name,
            "speech_model_identifier": speech_model_identifier,
            "voice_identifier": voice_identifier,
            "text": speech_text,
        }
    )


async def synthesize_narration_speech(
    speech_provider: SpeechProvider,
    narration_audio_library: NarrationAudioLibrary,
    synthesis_request: SpeechSynthesisRequest,
) -> StoredNarrationAudio:
    speech_text = synthesis_request.text.strip()
    if not speech_text:
        raise SpeechTextEmptyError()
    if len(speech_text) > maximum_speech_text_length:
        raise SpeechTextTooLongError()
    if voice_identifier_pattern.fullmatch(synthesis_request.voice_identifier) is None:
        raise VoiceIdentifierMalformedError()
    content_hash = compute_narration_content_hash(
        speech_provider.provider_name,
        speech_provider.speech_model_identifier,
        synthesis_request.voice_identifier,
        speech_text,
    )
    stored_audio = narration_audio_library.find_stored_audio(synthesis_request.profile_identifier, content_hash)
    if stored_audio is not None:
        return stored_audio
    synthesis_response = await speech_provider.synthesize_speech(
        synthesis_request.model_copy(update={"text": speech_text})
    )
    if synthesis_response.interaction_identifier is None:
        raise SpeechInteractionNotRecordedError()
    narration_audio_library.store_audio(
        NarrationAudioToStore(
            profile_identifier=synthesis_request.profile_identifier,
            content_hash=content_hash,
            provider_name=synthesis_response.provider_name,
            speech_model_identifier=synthesis_response.speech_model_identifier,
            voice_identifier=synthesis_request.voice_identifier,
            media_type_name=synthesis_response.media_type_name,
            audio_bytes=synthesis_response.audio_bytes,
            text_character_count=len(speech_text),
            interaction_identifier=synthesis_response.interaction_identifier,
        )
    )
    return StoredNarrationAudio(
        content_hash=content_hash,
        media_type_name=synthesis_response.media_type_name,
        audio_bytes=synthesis_response.audio_bytes,
        was_found_in_library=False,
    )
