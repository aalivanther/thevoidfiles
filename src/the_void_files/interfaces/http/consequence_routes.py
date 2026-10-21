from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from the_void_files.application.action_coordinator import (
    confirm_interactive_piece_assistance,
    confirm_interactive_piece_attempt,
    confirm_investigator_action,
)
from the_void_files.application.use_cases.case_start_failures import ProfileIdentifierRequiredError
from the_void_files.application.use_cases.consequence_directed_turn_confirmation import (
    DirectedTurnCollaborators,
    DirectedTurnRequest,
    confirm_directed_turn,
)
from the_void_files.application.use_cases.consequence_read_history import (
    read_public_log_entries,
    read_public_turn_history,
)
from the_void_files.application.use_cases.consequence_turn_requests import (
    InteractivePieceAssistanceRequest,
    InteractivePieceAttemptRequest,
    InvestigatorActionRequest,
)
from the_void_files.infrastructure.ai.sqlite_director_record_repository import SqliteDirectorRecordRepository
from the_void_files.infrastructure.database.sqlite_confirmed_turn_repository import SqliteConfirmedTurnRepository
from the_void_files.interfaces.http.request_context import (
    read_requested_profile_identifier,
    read_service_dependencies,
)
from the_void_files.service_dependencies import ServiceDependencies

consequence_router = APIRouter(prefix="/api/consequences")


def open_confirmed_turn_repository(
    request: Request, service_dependencies: ServiceDependencies
) -> SqliteConfirmedTurnRepository:
    profile_identifier = read_requested_profile_identifier(request)
    if profile_identifier is None:
        raise ProfileIdentifierRequiredError()
    return SqliteConfirmedTurnRepository(
        service_dependencies.profile_data_store_locator.open_profile_data_store(profile_identifier).transaction_manager
    )


async def confirm_turn_request(
    request: Request, service_dependencies: ServiceDependencies, turn_request: DirectedTurnRequest
) -> dict[str, Any]:
    profile_identifier = read_requested_profile_identifier(request)
    if profile_identifier is None:
        raise ProfileIdentifierRequiredError()
    profile_data_store = service_dependencies.profile_data_store_locator.open_profile_data_store(profile_identifier)
    confirmed_turn_repository = SqliteConfirmedTurnRepository(profile_data_store.transaction_manager)
    if service_dependencies.narrative_provider.provider_mode_name != "real":
        if isinstance(turn_request, InvestigatorActionRequest):
            return confirm_investigator_action(confirmed_turn_repository, turn_request)
        if isinstance(turn_request, InteractivePieceAttemptRequest):
            return confirm_interactive_piece_attempt(confirmed_turn_repository, turn_request)
        return confirm_interactive_piece_assistance(confirmed_turn_repository, turn_request)
    return await confirm_directed_turn(
        DirectedTurnCollaborators(
            narrative_provider=service_dependencies.narrative_provider,
            confirmed_turn_store=confirmed_turn_repository,
            director_record_store=SqliteDirectorRecordRepository(profile_data_store),
            profile_identifier=profile_identifier,
            is_turn_adjudication_enabled=service_dependencies.service_settings.is_turn_adjudication_enabled,
        ),
        turn_request,
    )


@consequence_router.post("/investigator-actions")
async def resolve_investigator_action(
    request: Request,
    action_request: InvestigatorActionRequest,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return await confirm_turn_request(request, service_dependencies, action_request)


@consequence_router.post("/interactive-piece-attempts")
async def attempt_interactive_piece(
    request: Request,
    attempt_request: InteractivePieceAttemptRequest,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return await confirm_turn_request(request, service_dependencies, attempt_request)


@consequence_router.post("/interactive-piece-assistance")
async def request_interactive_piece_assistance(
    request: Request,
    assistance_request: InteractivePieceAssistanceRequest,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return await confirm_turn_request(request, service_dependencies, assistance_request)


@consequence_router.get("/turns")
def list_confirmed_turns(
    request: Request,
    archive_case_identifier: str | None = Query(default=None, min_length=1, max_length=200),
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return read_public_turn_history(
        open_confirmed_turn_repository(request, service_dependencies), archive_case_identifier
    )


@consequence_router.get("/log-entries")
def list_log_entries(
    request: Request,
    archive_case_identifier: str | None = Query(default=None, min_length=1, max_length=200),
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return read_public_log_entries(open_confirmed_turn_repository(request, service_dependencies), archive_case_identifier)
