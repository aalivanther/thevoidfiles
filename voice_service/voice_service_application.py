import re
from contextlib import asynccontextmanager
from dataclasses import asdict

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, SecretStr
from starlette.middleware.trustedhost import TrustedHostMiddleware

import access_key_vault
from access_key_vault import AccessKeyVaultUnavailableError
from elevenlabs_speech_client import ElevenLabsSpeechClient, SpeechProviderError

allowed_browser_origins = ["http://127.0.0.1:5173", "http://localhost:5173"]
allowed_host_names = ["127.0.0.1", "localhost"]
maximum_speech_text_length = 2500
minimum_access_key_length = 20
maximum_access_key_length = 200
access_key_pattern = re.compile(r"^[\x21-\x7e]+$")
voice_identifier_pattern = re.compile(r"^[A-Za-z0-9]{1,64}$")


class AccessKeySubmission(BaseModel):
    access_key: SecretStr


class SpeechSynthesisRequest(BaseModel):
    text: str
    voice_identifier: str


def build_failure_response(failure_name: str, response_status_code: int) -> JSONResponse:
    return JSONResponse({"failure_name": failure_name}, status_code=response_status_code)


def create_voice_service_application(elevenlabs_transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    @asynccontextmanager
    async def manage_application_lifespan(application: FastAPI):
        application.state.speech_client = ElevenLabsSpeechClient(transport=elevenlabs_transport)
        yield
        await application.state.speech_client.close()

    application = FastAPI(
        title="The Void Files voice service",
        lifespan=manage_application_lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_browser_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type"],
    )
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_host_names)

    @application.middleware("http")
    async def reject_foreign_browser_origins(request: Request, call_next):
        request_origin = request.headers.get("origin")
        if request_origin is not None and request_origin not in allowed_browser_origins:
            return build_failure_response("origin_not_allowed", 403)
        return await call_next(request)

    @application.exception_handler(RequestValidationError)
    async def answer_invalid_request(request: Request, validation_error: RequestValidationError):
        return build_failure_response("request_invalid", 422)

    @application.exception_handler(AccessKeyVaultUnavailableError)
    async def answer_unavailable_vault(request: Request, vault_error: AccessKeyVaultUnavailableError):
        return build_failure_response("access_key_vault_unavailable", 503)

    @application.exception_handler(SpeechProviderError)
    async def answer_speech_provider_error(request: Request, provider_error: SpeechProviderError):
        return build_failure_response(provider_error.failure_name, provider_error.response_status_code)

    @application.get("/service-status")
    async def report_service_status():
        return {
            "is_service_running": True,
            "is_access_key_stored": access_key_vault.read_stored_access_key() is not None,
            "maximum_speech_text_length": maximum_speech_text_length,
        }

    @application.post("/access-key")
    async def save_access_key(access_key_submission: AccessKeySubmission):
        submitted_access_key = access_key_submission.access_key.get_secret_value().strip()
        is_access_key_well_formed = (
            minimum_access_key_length <= len(submitted_access_key) <= maximum_access_key_length
            and access_key_pattern.fullmatch(submitted_access_key) is not None
        )
        if not is_access_key_well_formed:
            return build_failure_response("access_key_malformed", 422)
        access_key_vault.store_access_key(submitted_access_key)
        return {"is_access_key_stored": True}

    @application.delete("/access-key")
    async def remove_access_key():
        access_key_vault.delete_stored_access_key()
        return {"is_access_key_stored": False}

    @application.get("/voices")
    async def list_voices(request: Request):
        stored_access_key = access_key_vault.read_stored_access_key()
        if stored_access_key is None:
            return build_failure_response("access_key_missing", 409)
        available_voices = await request.app.state.speech_client.list_available_voices(stored_access_key)
        return {"voices": [asdict(available_voice) for available_voice in available_voices]}

    @application.post("/speech")
    async def synthesize_speech(request: Request, speech_synthesis_request: SpeechSynthesisRequest):
        speech_text = speech_synthesis_request.text.strip()
        if not speech_text:
            return build_failure_response("speech_text_empty", 422)
        if len(speech_text) > maximum_speech_text_length:
            return build_failure_response("speech_text_too_long", 413)
        if voice_identifier_pattern.fullmatch(speech_synthesis_request.voice_identifier) is None:
            return build_failure_response("voice_identifier_malformed", 422)
        stored_access_key = access_key_vault.read_stored_access_key()
        if stored_access_key is None:
            return build_failure_response("access_key_missing", 409)
        speech_audio_stream = await request.app.state.speech_client.open_speech_audio_stream(
            stored_access_key, speech_synthesis_request.voice_identifier, speech_text
        )
        return StreamingResponse(
            speech_audio_stream,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-store"},
        )

    return application


application = create_voice_service_application()
