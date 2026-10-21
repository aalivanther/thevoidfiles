from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class StoredConfirmedTurn:
    turn_identifier: str
    action_key: str
    archive_run_identifier: str
    turn_kind_name: str
    disposition_name: str
    state_version_before: int
    state_version_after: int
    request_content_hash: str
    response_payload: dict[str, Any]
    confirmed_at_utc: str


@dataclass(frozen=True)
class ArchiveRunReference:
    archive_case_identifier: str
    archive_run_identifier: str
    run_number: int
    lifecycle_status_name: str
    state_version: int


@dataclass(frozen=True)
class OpenCaseResolutionMaterial:
    archive_case_identifier: str
    archive_number: int
    whisper_identifier: str
    specification: dict[str, Any]
    archive_run_identifier: str | None
    run_number: int | None
    state_version: int | None
    current_run: dict[str, Any] | None
    has_relational_anchor_person: bool
    placeholder_texts: dict[str, str]


@dataclass(frozen=True)
class StoredLogEntry:
    log_entry_identifier: str
    turn_identifier: str
    ordinal_number: int
    scene_identifier: str
    world_clock_minutes: int
    entry_content: dict[str, Any]


@dataclass(frozen=True)
class ConfirmedTurnToPersist:
    turn_identifier: str
    action_key: str
    archive_case_identifier: str
    archive_run_identifier: str
    turn_kind_name: str
    disposition_name: str
    state_version_before: int
    state_version_after: int
    request_content_hash: str
    request_record: dict[str, Any]
    response_payload: dict[str, Any]
    confirmed_effects: list[dict[str, Any]]
    relationship_changes: list[dict[str, Any]]
    log_entries: list[dict[str, Any]]
    scene_identifier: str
    next_run: dict[str, Any] | None
    does_turn_close_archive: bool
    confirmed_at_utc: str


class ConfirmedTurnStore(Protocol):
    def read_stored_turn_by_action_key(self, action_key: str) -> StoredConfirmedTurn | None: ...

    def read_open_case_resolution_material(self) -> OpenCaseResolutionMaterial | None: ...

    def persist_confirmed_turn(self, turn_to_persist: ConfirmedTurnToPersist) -> StoredConfirmedTurn: ...

    def read_archive_run_reference(self, archive_case_identifier: str | None) -> ArchiveRunReference | None: ...

    def list_stored_turns(self, archive_run_identifier: str) -> list[StoredConfirmedTurn]: ...

    def list_stored_log_entries(self, archive_run_identifier: str) -> list[StoredLogEntry]: ...
