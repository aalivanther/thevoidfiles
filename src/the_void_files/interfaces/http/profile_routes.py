from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, StrictInt

from the_void_files.application.use_cases.profiles_catalogue_management import (
    ProfileDescription,
    create_profile,
    normalize_profile_display_name,
)
from the_void_files.application.use_cases.profiles_chronicle_snapshot_keeping import (
    build_closure_record_text,
    prepare_chronicle_snapshot,
    require_usable_closure_record,
)
from the_void_files.application.use_cases.profiles_failures import ChronicleClosureRecordUnusableError
from the_void_files.infrastructure.database.sqlite_chronicle_snapshot_repository import (
    SqliteChronicleSnapshotRepository,
)
from the_void_files.infrastructure.database.sqlite_profile_catalogue import profile_identifier_pattern
from the_void_files.interfaces.http.request_context import read_service_dependencies
from the_void_files.service_dependencies import ServiceDependencies

profile_router = APIRouter(prefix="/api/profiles")


class ProfileCreationSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(max_length=400)
    profile_identifier: str | None = Field(default=None, pattern=profile_identifier_pattern.pattern)


class ProfileRenamingSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(max_length=400)


class ChronicleSnapshotSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_state_version: StrictInt = Field(ge=0)
    storage_format_version: StrictInt = Field(ge=1)
    chronicle_state: dict[str, Any]


class ClosedChronicleSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    closure_record: dict[str, Any]


def describe_profile(profile_description: ProfileDescription) -> dict[str, Any]:
    return {
        "profile_identifier": profile_description.profile_identifier,
        "display_name": profile_description.display_name,
        "created_at_utc": profile_description.created_at_utc,
        "last_opened_at_utc": profile_description.last_opened_at_utc,
        "archived_at_utc": profile_description.archived_at_utc,
        "is_archived": profile_description.is_archived,
    }


def open_chronicle_snapshot_repository(
    service_dependencies: ServiceDependencies, profile_identifier: str
) -> SqliteChronicleSnapshotRepository:
    profile_data_store = service_dependencies.profile_data_store_locator.open_profile_data_store(profile_identifier)
    return SqliteChronicleSnapshotRepository(profile_data_store.transaction_manager)


@profile_router.get("")
def list_profiles(
    include_archived: bool = False,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return {
        "profiles": [
            describe_profile(profile_description)
            for profile_description in service_dependencies.profile_catalogue.list_profile_descriptions(
                include_archived
            )
        ]
    }


@profile_router.post("", status_code=201)
def create_new_profile(
    profile_creation_submission: ProfileCreationSubmission,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return describe_profile(
        create_profile(
            service_dependencies.profile_catalogue,
            profile_creation_submission.display_name,
            profile_creation_submission.profile_identifier,
        )
    )


@profile_router.get("/{profile_identifier}")
def read_profile(
    profile_identifier: str, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    return describe_profile(service_dependencies.profile_catalogue.read_profile_description(profile_identifier))


@profile_router.patch("/{profile_identifier}")
def rename_profile(
    profile_identifier: str,
    profile_renaming_submission: ProfileRenamingSubmission,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    return describe_profile(
        service_dependencies.profile_catalogue.rename_profile(
            profile_identifier, normalize_profile_display_name(profile_renaming_submission.display_name)
        )
    )


@profile_router.post("/{profile_identifier}/open")
def open_profile(
    profile_identifier: str, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    profile_description = service_dependencies.profile_catalogue.mark_profile_opened(profile_identifier)
    service_dependencies.profile_data_store_locator.open_profile_data_store(profile_identifier)
    return describe_profile(profile_description)


@profile_router.delete("/{profile_identifier}")
def archive_profile(
    profile_identifier: str, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    return {
        **describe_profile(service_dependencies.profile_catalogue.archive_profile(profile_identifier)),
        "were_files_kept_on_disk": True,
    }


@profile_router.post("/{profile_identifier}/restore")
def restore_archived_profile(
    profile_identifier: str, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    return describe_profile(service_dependencies.profile_catalogue.restore_archived_profile(profile_identifier))


@profile_router.get("/{profile_identifier}/chronicle-snapshot")
def read_chronicle_snapshot(
    profile_identifier: str, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    chronicle_snapshot = open_chronicle_snapshot_repository(
        service_dependencies, profile_identifier
    ).read_chronicle_snapshot()
    if chronicle_snapshot is None:
        return {
            "has_snapshot": False,
            "state_version": 0,
            "storage_format_version": None,
            "content_hash": None,
            "first_saved_at_utc": None,
            "last_saved_at_utc": None,
            "chronicle_state": None,
        }
    return {
        "has_snapshot": True,
        "state_version": chronicle_snapshot.state_version,
        "storage_format_version": chronicle_snapshot.storage_format_version,
        "content_hash": chronicle_snapshot.content_hash,
        "first_saved_at_utc": chronicle_snapshot.first_saved_at_utc,
        "last_saved_at_utc": chronicle_snapshot.last_saved_at_utc,
        "chronicle_state": chronicle_snapshot.chronicle_state,
    }


@profile_router.put("/{profile_identifier}/chronicle-snapshot")
def save_chronicle_snapshot(
    profile_identifier: str,
    chronicle_snapshot_submission: ChronicleSnapshotSubmission,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    prepared_snapshot = prepare_chronicle_snapshot(
        chronicle_snapshot_submission.expected_state_version,
        chronicle_snapshot_submission.storage_format_version,
        chronicle_snapshot_submission.chronicle_state,
    )
    snapshot_receipt = open_chronicle_snapshot_repository(
        service_dependencies, profile_identifier
    ).save_chronicle_snapshot(prepared_snapshot)
    return {
        "state_version": snapshot_receipt.state_version,
        "storage_format_version": snapshot_receipt.storage_format_version,
        "content_hash": snapshot_receipt.content_hash,
        "last_saved_at_utc": snapshot_receipt.last_saved_at_utc,
    }


@profile_router.get("/{profile_identifier}/closed-chronicles")
def list_closed_chronicles(
    profile_identifier: str, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    return {
        "closed_chronicles": [
            {
                "closure_identifier": closed_chronicle.closure_identifier,
                "first_saved_at_utc": closed_chronicle.first_saved_at_utc,
                "last_saved_at_utc": closed_chronicle.last_saved_at_utc,
                "closure_record": closed_chronicle.closure_record,
            }
            for closed_chronicle in open_chronicle_snapshot_repository(
                service_dependencies, profile_identifier
            ).list_closed_chronicles()
        ]
    }


@profile_router.put("/{profile_identifier}/closed-chronicles/{closure_identifier}")
def save_closed_chronicle(
    profile_identifier: str,
    closure_identifier: str,
    closed_chronicle_submission: ClosedChronicleSubmission,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    if require_usable_closure_record(closed_chronicle_submission.closure_record) != closure_identifier:
        raise ChronicleClosureRecordUnusableError()
    open_chronicle_snapshot_repository(service_dependencies, profile_identifier).save_closed_chronicle(
        closure_identifier, build_closure_record_text(closed_chronicle_submission.closure_record)
    )
    return {"closure_identifier": closure_identifier, "was_saved": True}
