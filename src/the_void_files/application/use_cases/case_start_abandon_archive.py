import re
from dataclasses import dataclass
from typing import Any, Protocol

from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.service_failures import ServiceFailure

abandon_key_pattern = re.compile(r"^[A-Za-z0-9_-]{8,128}$")


class AbandonKeyMalformedError(ServiceFailure):
    failure_name = "abandon_key_malformed"
    response_status_code = 422


@dataclass(frozen=True)
class StoredArchiveAbandonment:
    abandon_key: str
    archive_case_identifier: str | None
    archive_run_identifier: str | None
    state_version_at_abandonment: int | None
    abandoned_at_utc: str


class ArchiveAbandonmentStore(Protocol):
    def abandon_open_archive(self, abandon_key: str, abandoned_at_utc: str) -> StoredArchiveAbandonment: ...


def build_public_archive_abandonment(stored_archive_abandonment: StoredArchiveAbandonment) -> dict[str, Any]:
    return {
        "was_anything_abandoned": stored_archive_abandonment.archive_case_identifier is not None,
        "abandon_key": stored_archive_abandonment.abandon_key,
        "archive_case_identifier": stored_archive_abandonment.archive_case_identifier,
        "archive_run_identifier": stored_archive_abandonment.archive_run_identifier,
        "state_version_at_abandonment": stored_archive_abandonment.state_version_at_abandonment,
        "abandoned_at_utc": stored_archive_abandonment.abandoned_at_utc,
    }


def abandon_current_archive(archive_abandonment_store: ArchiveAbandonmentStore, abandon_key: str) -> dict[str, Any]:
    if abandon_key_pattern.fullmatch(abandon_key) is None:
        raise AbandonKeyMalformedError()
    return build_public_archive_abandonment(
        archive_abandonment_store.abandon_open_archive(abandon_key, read_current_utc_timestamp())
    )
