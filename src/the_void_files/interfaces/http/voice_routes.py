from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from pydantic import BaseModel, SecretStr

from the_void_files.application.access_key_description import normalize_submitted_access_key
from the_void_files.application.ports.speech_provider import SpeechSynthesisRequest, VoiceListingRequest
from the_void_files.application.use_cases.synthesize_narration_speech import (
    maximum_speech_text_length,
    synthesize_narration_speech,
)
from the_void_files.interfaces.http.request_context import (
    read_requested_profile_identifier,
    read_service_dependencies,
)
from the_void_files.service_dependencies import ServiceDependencies

voice_router = APIRouter()


class VoiceAccessKeySubmission(BaseModel):
    access_key: SecretStr


class SpeechRequestBody(BaseModel):
    text: str
    voice_identifier: str


@voice_router.get("/service-status")
async def report_service_status(service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    is_access_key_required = service_dependencies.speech_provider.provider_mode_name == "real"
    return {
        "is_service_running": True,
        "is_access_key_required": is_access_key_required,
        "is_access_key_stored": (
            not is_access_key_required
            or service_dependencies.access_key_vault.read_access_key("elevenlabs") is not None
        ),
        "maximum_speech_text_length": maximum_speech_text_length,
        "provider_mode_name": service_dependencies.speech_provider.provider_mode_name,
        "speech_provider_name": service_dependencies.speech_provider.provider_name,
    }


@voice_router.post("/access-key")
async def save_voice_access_key(
    access_key_submission: VoiceAccessKeySubmission,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    service_dependencies.access_key_vault.store_access_key(
        "elevenlabs", normalize_submitted_access_key(access_key_submission.access_key.get_secret_value())
    )
    return {"is_access_key_stored": True}


@voice_router.delete("/access-key")
async def remove_voice_access_key(service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    service_dependencies.access_key_vault.delete_access_key("elevenlabs")
    return {"is_access_key_stored": False}


@voice_router.get("/voices")
async def list_voices(request: Request, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    listing_response = await service_dependencies.speech_provider.list_available_voices(
        VoiceListingRequest(profile_identifier=read_requested_profile_identifier(request))
    )
    return {"voices": [available_voice.model_dump() for available_voice in listing_response.voices]}


@voice_router.post("/speech")
async def synthesize_speech(
    request: Request,
    speech_request_body: SpeechRequestBody,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    narration_audio = await synthesize_narration_speech(
        service_dependencies.speech_provider,
        service_dependencies.narration_audio_library,
        SpeechSynthesisRequest(
            profile_identifier=read_requested_profile_identifier(request),
            text=speech_request_body.text,
            voice_identifier=speech_request_body.voice_identifier,
        ),
    )
    return Response(
        content=narration_audio.audio_bytes,
        media_type=narration_audio.media_type_name,
        headers={"Cache-Control": "no-store"},
    )
