from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from the_void_files.application.use_cases.case_start_abandon_archive import abandon_current_archive
from the_void_files.application.use_cases.case_start_case_material_provider import (
    choose_recorded_case_material_provider,
    is_curated_case_material_in_force,
)
from the_void_files.application.use_cases.case_start_failures import ProfileIdentifierRequiredError
from the_void_files.application.use_cases.case_start_offer_whispers import (
    build_public_whisper_offer,
    read_or_create_whisper_offer,
)
from the_void_files.application.use_cases.case_start_open_archive import open_archive
from the_void_files.application.use_cases.case_start_read_archives import (
    list_public_archive_summaries,
    read_current_public_archive,
)
from the_void_files.application.use_cases.case_start_reset_case_material import (
    reset_case_material_keeping_investigator_identity,
)
from the_void_files.infrastructure.database.sqlite_archive_case_repository import SqliteArchiveCaseRepository
from the_void_files.interfaces.http.request_context import (
    read_requested_profile_identifier,
    read_service_dependencies,
)
from the_void_files.service_dependencies import ServiceDependencies

case_start_router = APIRouter(prefix="/api/case-start")


class ArchiveOpeningRequestBody(BaseModel):
    opening_key: str = Field(min_length=1, max_length=200)
    whisper_identifier: str = Field(min_length=1, max_length=200)


class ArchiveAbandonmentRequestBody(BaseModel):
    abandon_key: str = Field(min_length=1, max_length=200)


def require_profile_identifier(request: Request) -> str:
    profile_identifier = read_requested_profile_identifier(request)
    if profile_identifier is None:
        raise ProfileIdentifierRequiredError()
    return profile_identifier


def open_archive_case_repository(
    service_dependencies: ServiceDependencies, profile_identifier: str
) -> SqliteArchiveCaseRepository:
    return SqliteArchiveCaseRepository(
        service_dependencies.profile_data_store_locator.open_profile_data_store(profile_identifier).transaction_manager
    )


@case_start_router.get("/whispers")
async def read_offered_whispers(
    request: Request, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    profile_identifier = require_profile_identifier(request)
    are_all_offered_whispers_openable = (
        service_dependencies.service_settings.case_material_source_name == "generated"
        and service_dependencies.narrative_provider.provider_mode_name == "real"
    )
    whisper_offer_batch = await read_or_create_whisper_offer(
        choose_recorded_case_material_provider(service_dependencies),
        open_archive_case_repository(service_dependencies, profile_identifier),
        profile_identifier,
        is_curated_material_required=is_curated_case_material_in_force(service_dependencies),
        must_offer_single_playable_whisper=False,
    )
    return build_public_whisper_offer(
        whisper_offer_batch, are_all_offered_whispers_openable=are_all_offered_whispers_openable
    )


@case_start_router.post("/archives")
async def open_archive_for_chosen_whisper(
    request: Request,
    opening_request_body: ArchiveOpeningRequestBody,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    profile_identifier = require_profile_identifier(request)
    stored_archive_opening = await open_archive(
        choose_recorded_case_material_provider(service_dependencies),
        open_archive_case_repository(service_dependencies, profile_identifier),
        profile_identifier,
        opening_request_body.opening_key,
        opening_request_body.whisper_identifier,
    )
    return stored_archive_opening.opening_public_payload


@case_start_router.get("/archives/current")
def read_current_archive(
    request: Request, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    profile_identifier = require_profile_identifier(request)
    return {
        "current_archive": read_current_public_archive(
            open_archive_case_repository(service_dependencies, profile_identifier)
        )
    }


@case_start_router.get("/archives/{archive_case_identifier}/recovery")
def read_archive_for_recovery(
    archive_case_identifier: str,
    request: Request,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    profile_identifier = require_profile_identifier(request)
    return {"current_archive": read_current_public_archive(
        open_archive_case_repository(service_dependencies, profile_identifier), archive_case_identifier
    )}


@case_start_router.post("/archives/current/abandon")
def abandon_current_open_archive(
    request: Request,
    abandonment_request_body: ArchiveAbandonmentRequestBody,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    profile_identifier = require_profile_identifier(request)
    return abandon_current_archive(
        open_archive_case_repository(service_dependencies, profile_identifier), abandonment_request_body.abandon_key
    )


@case_start_router.post("/case-material/reset")
def reset_case_material_for_profile(
    request: Request, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    profile_identifier = require_profile_identifier(request)
    return reset_case_material_keeping_investigator_identity(
        open_archive_case_repository(service_dependencies, profile_identifier)
    )


@case_start_router.get("/archives")
def list_archives(request: Request, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    profile_identifier = require_profile_identifier(request)
    return {
        "archives": list_public_archive_summaries(open_archive_case_repository(service_dependencies, profile_identifier))
    }
