from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from the_void_files.application.use_cases.case_start_failures import ProfileIdentifierRequiredError
from the_void_files.application.use_cases.director_case_simulation import (
    CaseSimulationCollaborators,
    CaseSimulationRequest,
    list_public_scripted_paths,
    simulate_complete_case,
)
from the_void_files.application.use_cases.director_failures import (
    SimulationRunNotFoundError,
    StoryProviderSelectionRejectedError,
)
from the_void_files.application.use_cases.director_interaction_log_review import (
    AiInteractionFilter,
    default_listed_interaction_count,
    list_public_interactions,
    maximum_listed_interaction_count,
    read_public_interaction,
    summarize_interactions,
)
from the_void_files.infrastructure.ai.sqlite_director_record_repository import SqliteDirectorRecordRepository
from the_void_files.infrastructure.database.sqlite_archive_case_repository import SqliteArchiveCaseRepository
from the_void_files.infrastructure.database.sqlite_chronicle_snapshot_repository import (
    SqliteChronicleSnapshotRepository,
)
from the_void_files.infrastructure.database.sqlite_confirmed_turn_repository import SqliteConfirmedTurnRepository
from the_void_files.interfaces.http.request_context import (
    read_requested_profile_identifier,
    read_service_dependencies,
)
from the_void_files.application.ports.access_key_vault import read_narrative_access_key_name
from the_void_files.application.use_cases.story_provider_catalog import (
    build_public_story_provider_catalog,
    default_model_identifier_by_provider_name,
    is_story_provider_selection_allowed,
)
from the_void_files.application.use_cases.story_provider_runtime import (
    apply_story_provider_selection,
    read_story_model_identifier,
)
from the_void_files.infrastructure.ai.story_provider_selection_store import StoryProviderSelection
from the_void_files.narrative.context_builder import build_connection_check_request
from the_void_files.narrative.tool_registry import connection_check_response_schema_name
from the_void_files.service_dependencies import ServiceDependencies

director_router = APIRouter(prefix="/api/director")


class StoryProviderSelectionSubmission(BaseModel):
    provider_name: str
    model_identifier: str


def require_profile_identifier(request: Request) -> str:
    profile_identifier = read_requested_profile_identifier(request)
    if profile_identifier is None:
        raise ProfileIdentifierRequiredError()
    return profile_identifier


def open_director_record_repository(
    request: Request, service_dependencies: ServiceDependencies
) -> SqliteDirectorRecordRepository:
    return SqliteDirectorRecordRepository(
        service_dependencies.profile_data_store_locator.open_profile_data_store(
            read_requested_profile_identifier(request)
        )
    )


def read_interaction_filter(
    purpose_name: str | None = Query(default=None, min_length=1, max_length=200),
    provider_name: str | None = Query(default=None, min_length=1, max_length=200),
    provider_mode_name: str | None = Query(default=None, pattern="^(synthetic|real)$"),
    provider_kind_name: str | None = Query(default=None, pattern="^(narrative|speech)$"),
    are_failures_only: bool = Query(default=False),
    archive_case_identifier: str | None = Query(default=None, min_length=1, max_length=200),
    turn_identifier: str | None = Query(default=None, min_length=1, max_length=200),
    started_from_utc: str | None = Query(default=None, min_length=1, max_length=64),
    started_until_utc: str | None = Query(default=None, min_length=1, max_length=64),
) -> AiInteractionFilter:
    return AiInteractionFilter(
        purpose_name=purpose_name,
        provider_name=provider_name,
        provider_mode_name=provider_mode_name,
        provider_kind_name=provider_kind_name,
        are_failures_only=are_failures_only,
        archive_case_identifier=archive_case_identifier,
        turn_identifier=turn_identifier,
        started_from_utc=started_from_utc,
        started_until_utc=started_until_utc,
    )


@director_router.get("/provider-status")
async def report_provider_status(service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    narrative_provider = service_dependencies.narrative_provider
    speech_provider = service_dependencies.speech_provider
    access_key_vault = service_dependencies.access_key_vault
    narrative_access_key_name = read_narrative_access_key_name(narrative_provider.provider_name)
    return {
        "case_material_source_name": service_dependencies.service_settings.case_material_source_name,
        "turn_adjudication_switch_name": service_dependencies.service_settings.turn_adjudication_switch_name,
        "story": {
            "provider_name": narrative_provider.provider_name,
            "model_identifier": (
                None
                if narrative_provider.provider_mode_name != "real"
                else read_story_model_identifier(service_dependencies.service_settings)
            ),
            "provider_mode_name": narrative_provider.provider_mode_name,
            "is_access_key_required": narrative_provider.provider_mode_name == "real",
            "is_access_key_stored": (
                narrative_provider.provider_mode_name != "real"
                or (
                    narrative_access_key_name is not None
                    and access_key_vault.read_access_key(narrative_access_key_name) is not None
                )
            ),
        },
        "voice": {
            "provider_name": speech_provider.provider_name,
            "provider_mode_name": speech_provider.provider_mode_name,
            "is_access_key_required": speech_provider.provider_mode_name == "real",
            "is_access_key_stored": (
                speech_provider.provider_mode_name != "real"
                or access_key_vault.read_access_key("elevenlabs") is not None
            ),
        },
    }


@director_router.get("/story-provider-catalog")
async def report_story_provider_catalog():
    return build_public_story_provider_catalog()


@director_router.get("/story-provider-selection")
async def report_story_provider_selection(
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    service_settings = service_dependencies.service_settings
    return {
        "provider_name": service_settings.story_provider_name,
        "model_identifier": read_story_model_identifier(service_settings),
        "default_model_identifier": default_model_identifier_by_provider_name[service_settings.story_provider_name],
    }


@director_router.put("/story-provider-selection")
async def save_story_provider_selection(
    request: Request, story_provider_selection_submission: StoryProviderSelectionSubmission
):
    if not is_story_provider_selection_allowed(
        story_provider_selection_submission.provider_name, story_provider_selection_submission.model_identifier
    ):
        raise StoryProviderSelectionRejectedError()
    await apply_story_provider_selection(
        request.app,
        StoryProviderSelection(
            provider_name=story_provider_selection_submission.provider_name,
            model_identifier=story_provider_selection_submission.model_identifier,
        ),
    )
    service_settings = request.app.state.service_dependencies.service_settings
    return {
        "provider_name": service_settings.story_provider_name,
        "model_identifier": read_story_model_identifier(service_settings),
        "default_model_identifier": default_model_identifier_by_provider_name[service_settings.story_provider_name],
    }


@director_router.post("/story-connection-check")
async def check_story_connection(
    request: Request, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    connection_check_response = await service_dependencies.narrative_provider.generate_narrative(
        build_connection_check_request(read_requested_profile_identifier(request))
    )
    connection_check_answer = (connection_check_response.structured_response or {}).get(
        connection_check_response_schema_name
    )
    return {
        "provider_name": connection_check_response.provider_name,
        "provider_mode_name": service_dependencies.narrative_provider.provider_mode_name,
        "model_identifier": connection_check_response.model_identifier,
        "interaction_identifier": connection_check_response.interaction_identifier,
        "is_director_listening": (
            isinstance(connection_check_answer, dict) and connection_check_answer.get("is_director_listening") is True
        ),
    }


@director_router.get("/scripted-paths")
def list_scripted_paths():
    return list_public_scripted_paths()


@director_router.post("/simulations")
async def simulate_case(
    request: Request,
    simulation_request: CaseSimulationRequest,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    profile_identifier = require_profile_identifier(request)
    profile_data_store = service_dependencies.profile_data_store_locator.open_profile_data_store(profile_identifier)
    chronicle_snapshot = SqliteChronicleSnapshotRepository(profile_data_store.transaction_manager).read_chronicle_snapshot()
    return await simulate_complete_case(
        CaseSimulationCollaborators(
            narrative_provider=service_dependencies.narrative_provider,
            speech_provider=service_dependencies.speech_provider,
            narration_audio_library=service_dependencies.narration_audio_library,
            archive_case_store=SqliteArchiveCaseRepository(profile_data_store.transaction_manager),
            confirmed_turn_store=SqliteConfirmedTurnRepository(profile_data_store.transaction_manager),
            director_record_store=SqliteDirectorRecordRepository(profile_data_store),
            chronicle_state=None if chronicle_snapshot is None else chronicle_snapshot.chronicle_state,
        ),
        profile_identifier,
        simulation_request,
    )


@director_router.get("/simulations")
def list_simulations(request: Request, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    require_profile_identifier(request)
    return {
        "simulations": [
            simulation_run_record.model_dump(mode="json", exclude={"report"})
            for simulation_run_record in open_director_record_repository(request, service_dependencies).list_simulation_runs()
        ]
    }


@director_router.get("/simulations/{simulation_run_identifier}")
def read_simulation(
    simulation_run_identifier: str,
    request: Request,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    require_profile_identifier(request)
    for simulation_run_record in open_director_record_repository(request, service_dependencies).list_simulation_runs():
        if simulation_run_record.simulation_run_identifier == simulation_run_identifier:
            return simulation_run_record.report
    raise SimulationRunNotFoundError()


@director_router.get("/interactions")
def list_interactions(
    request: Request,
    interaction_filter: AiInteractionFilter = Depends(read_interaction_filter),
    maximum_count: int = Query(default=default_listed_interaction_count, ge=1, le=maximum_listed_interaction_count),
    skipped_count: int = Query(default=0, ge=0),
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return list_public_interactions(
        open_director_record_repository(request, service_dependencies), interaction_filter, maximum_count, skipped_count
    )


@director_router.get("/interactions/summary")
def summarize_recorded_interactions(
    request: Request,
    interaction_filter: AiInteractionFilter = Depends(read_interaction_filter),
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return summarize_interactions(open_director_record_repository(request, service_dependencies), interaction_filter)


@director_router.get("/interactions/{interaction_identifier}")
def read_interaction(
    interaction_identifier: str,
    request: Request,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return read_public_interaction(
        open_director_record_repository(request, service_dependencies), interaction_identifier
    )
