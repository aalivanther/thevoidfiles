from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from the_void_files.application.ports.access_key_vault import AccessKeyVault
from the_void_files.application.ports.ai_interaction_recorder import AiInteractionRecorder
from the_void_files.application.ports.narrative_provider import NarrativeProvider
from the_void_files.application.ports.speech_provider import SpeechProvider
from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.application.recording.recording_speech_provider import RecordingSpeechProvider
from the_void_files.application.service_failures import ServiceFailure
from the_void_files.application.use_cases.story_provider_runtime import (
    build_unwrapped_narrative_provider,
    overlay_persisted_story_provider_selection,
)
from the_void_files.infrastructure.database.sqlite_profile_catalogue import SqliteProfileCatalogue
from the_void_files.infrastructure.secrets.keyring_access_key_vault import KeyringAccessKeyVault
from the_void_files.infrastructure.speech.elevenlabs_speech_provider import ElevenLabsSpeechProvider
from the_void_files.infrastructure.speech.sqlite_file_narration_audio_library import SqliteFileNarrationAudioLibrary
from the_void_files.infrastructure.speech.synthetic_speech_provider import SyntheticSpeechProvider
from the_void_files.infrastructure.storage.profile_data_store import ProfileDataStoreLocator
from the_void_files.infrastructure.storage.sqlite_file_ai_interaction_recorder import SqliteFileAiInteractionRecorder
from the_void_files.narrative.case_generator import FixtureBackedCaseMaterialProvider
from the_void_files.interfaces.http.access_key_routes import access_key_router
from the_void_files.interfaces.http.case_start_routes import case_start_router
from the_void_files.interfaces.http.consequence_routes import consequence_router
from the_void_files.interfaces.http.director_routes import director_router
from the_void_files.interfaces.http.frontend_distribution import (
    FrontendCacheControlMiddleware,
    FrontendDistributionFiles,
)
from the_void_files.interfaces.http.health_routes import health_router
from the_void_files.interfaces.http.profile_routes import profile_router
from the_void_files.interfaces.http.request_context import profile_identifier_header_name
from the_void_files.interfaces.http.voice_routes import voice_router
from the_void_files.service_dependencies import ServiceDependencies
from the_void_files.service_settings import (
    ProviderModeName,
    ServiceSettings,
    allowed_host_names,
    build_default_service_settings,
)


def build_failure_response(failure_name: str, response_status_code: int) -> JSONResponse:
    return JSONResponse({"failure_name": failure_name}, status_code=response_status_code)


def build_service_dependencies(
    service_settings: ServiceSettings,
    access_key_vault: AccessKeyVault | None,
    speech_transport: httpx.AsyncBaseTransport | None,
    narrative_provider: NarrativeProvider | None,
    speech_provider: SpeechProvider | None,
    interaction_recorder: AiInteractionRecorder | None,
    narrative_transport: httpx.AsyncBaseTransport | None = None,
) -> ServiceDependencies:
    service_settings.data_directory.mkdir(parents=True, exist_ok=True)
    chosen_access_key_vault = access_key_vault if access_key_vault is not None else KeyringAccessKeyVault()
    profile_catalogue = SqliteProfileCatalogue(service_settings.data_directory, service_settings.migrations_directory)
    profile_data_store_locator = ProfileDataStoreLocator(
        service_settings.data_directory, service_settings.migrations_directory, profile_catalogue
    )
    chosen_interaction_recorder = (
        interaction_recorder
        if interaction_recorder is not None
        else SqliteFileAiInteractionRecorder(profile_data_store_locator)
    )
    if narrative_provider is not None:
        chosen_narrative_provider = narrative_provider
    else:
        chosen_narrative_provider = build_unwrapped_narrative_provider(
            service_settings, chosen_access_key_vault, narrative_transport
        )
    if speech_provider is not None:
        chosen_speech_provider = speech_provider
    elif service_settings.chosen_voice_provider_mode_name == "synthetic":
        chosen_speech_provider = SyntheticSpeechProvider()
    else:
        chosen_speech_provider = ElevenLabsSpeechProvider(chosen_access_key_vault, transport=speech_transport)
    return ServiceDependencies(
        service_settings=service_settings,
        access_key_vault=chosen_access_key_vault,
        profile_catalogue=profile_catalogue,
        profile_data_store_locator=profile_data_store_locator,
        narrative_provider=RecordingNarrativeProvider(chosen_narrative_provider, chosen_interaction_recorder),
        curated_case_material_provider=RecordingNarrativeProvider(
            FixtureBackedCaseMaterialProvider(), chosen_interaction_recorder
        ),
        speech_provider=RecordingSpeechProvider(chosen_speech_provider, chosen_interaction_recorder),
        narration_audio_library=SqliteFileNarrationAudioLibrary(profile_data_store_locator),
    )


def create_application(
    service_settings: ServiceSettings | None = None,
    provider_mode_name: ProviderModeName | None = None,
    data_directory: Path | None = None,
    access_key_vault: AccessKeyVault | None = None,
    speech_transport: httpx.AsyncBaseTransport | None = None,
    narrative_provider: NarrativeProvider | None = None,
    speech_provider: SpeechProvider | None = None,
    interaction_recorder: AiInteractionRecorder | None = None,
    narrative_transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    chosen_service_settings = (
        service_settings
        if service_settings is not None
        else build_default_service_settings(
            provider_mode_name=provider_mode_name if provider_mode_name is not None else "synthetic",
            data_directory=data_directory,
        )
    )
    chosen_service_settings = overlay_persisted_story_provider_selection(chosen_service_settings)
    service_dependencies = build_service_dependencies(
        chosen_service_settings,
        access_key_vault,
        speech_transport,
        narrative_provider,
        speech_provider,
        interaction_recorder,
        narrative_transport,
    )
    allowed_browser_origins = chosen_service_settings.allowed_browser_origins

    @asynccontextmanager
    async def manage_application_lifespan(application: FastAPI):
        application.state.service_dependencies.profile_catalogue.apply_migrations_once()
        yield
        current_service_dependencies = application.state.service_dependencies
        await current_service_dependencies.speech_provider.close()
        await current_service_dependencies.narrative_provider.close()

    application = FastAPI(
        title="The Void Files game service",
        lifespan=manage_application_lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    application.state.service_dependencies = service_dependencies
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_browser_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", profile_identifier_header_name],
    )
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=list(allowed_host_names))
    application.add_middleware(FrontendCacheControlMiddleware)

    @application.middleware("http")
    async def reject_foreign_browser_origins(request: Request, call_next):
        request_origin = request.headers.get("origin")
        if request_origin is not None and request_origin not in allowed_browser_origins:
            return build_failure_response("origin_not_allowed", 403)
        return await call_next(request)

    @application.exception_handler(RequestValidationError)
    async def answer_invalid_request(request: Request, validation_error: RequestValidationError):
        return build_failure_response("request_invalid", 422)

    @application.exception_handler(ServiceFailure)
    async def answer_service_failure(request: Request, service_failure: ServiceFailure):
        return build_failure_response(service_failure.failure_name, service_failure.response_status_code)

    for feature_router in (
        health_router,
        access_key_router,
        voice_router,
        profile_router,
        case_start_router,
        consequence_router,
        director_router,
    ):
        application.include_router(feature_router)

    if chosen_service_settings.frontend_distribution_directory.is_dir():
        application.mount(
            "/",
            FrontendDistributionFiles(chosen_service_settings.frontend_distribution_directory),
            name="frontend_distribution",
        )

    return application
