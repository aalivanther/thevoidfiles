from dataclasses import dataclass
from typing import Any

from the_void_files.application.content_hashing import build_canonical_json_text, compute_text_content_hash
from the_void_files.application.use_cases.profiles_failures import (
    ChronicleClosureRecordUnusableError,
    ChronicleSnapshotTooLargeError,
    ChronicleStateUnusableError,
    ChronicleStorageFormatVersionMismatchedError,
)

maximum_chronicle_state_text_length = 8_000_000
maximum_closure_record_text_length = 64_000
maximum_closure_identifier_length = 128
required_object_key_names = ("archiveRun", "investigator", "investigatorProgression")
optional_object_key_names = ("moduleRecords",)


@dataclass(frozen=True)
class ChronicleSnapshot:
    state_version: int
    storage_format_version: int
    chronicle_state: dict[str, Any]
    content_hash: str
    first_saved_at_utc: str
    last_saved_at_utc: str


@dataclass(frozen=True)
class ChronicleSnapshotReceipt:
    state_version: int
    storage_format_version: int
    content_hash: str
    last_saved_at_utc: str


@dataclass(frozen=True)
class PreparedChronicleSnapshot:
    expected_state_version: int
    storage_format_version: int
    chronicle_state_text: str
    content_hash: str
    closure_identifier: str | None
    closure_record_text: str | None


@dataclass(frozen=True)
class ClosedChronicle:
    closure_identifier: str
    closure_record: dict[str, Any]
    first_saved_at_utc: str
    last_saved_at_utc: str


def is_whole_number(candidate: Any) -> bool:
    return isinstance(candidate, int) and not isinstance(candidate, bool)


def require_usable_chronicle_state(chronicle_state: dict[str, Any], storage_format_version: int) -> None:
    stored_format_version = chronicle_state.get("storageFormatVersion")
    if not is_whole_number(stored_format_version):
        raise ChronicleStateUnusableError()
    if stored_format_version != storage_format_version:
        raise ChronicleStorageFormatVersionMismatchedError()
    if not isinstance(chronicle_state.get("narrationEntries"), list):
        raise ChronicleStateUnusableError()
    for required_object_key_name in required_object_key_names:
        if not isinstance(chronicle_state.get(required_object_key_name), dict):
            raise ChronicleStateUnusableError()
    for optional_object_key_name in optional_object_key_names:
        if optional_object_key_name in chronicle_state and not isinstance(
            chronicle_state[optional_object_key_name], dict
        ):
            raise ChronicleStateUnusableError()
    if not isinstance(chronicle_state["archiveRun"].get("logEntries"), list):
        raise ChronicleStateUnusableError()


def require_usable_closure_record(closure_record: Any) -> str:
    if not isinstance(closure_record, dict):
        raise ChronicleClosureRecordUnusableError()
    closure_identifier = closure_record.get("closureIdentifier")
    if (
        not isinstance(closure_identifier, str)
        or not closure_identifier
        or len(closure_identifier) > maximum_closure_identifier_length
    ):
        raise ChronicleClosureRecordUnusableError()
    return closure_identifier


def build_closure_record_text(closure_record: dict[str, Any]) -> str:
    closure_record_text = build_canonical_json_text(closure_record)
    if len(closure_record_text) > maximum_closure_record_text_length:
        raise ChronicleClosureRecordUnusableError()
    return closure_record_text


def prepare_chronicle_snapshot(
    expected_state_version: int, storage_format_version: int, chronicle_state: dict[str, Any]
) -> PreparedChronicleSnapshot:
    require_usable_chronicle_state(chronicle_state, storage_format_version)
    chronicle_state_text = build_canonical_json_text(chronicle_state)
    if len(chronicle_state_text) > maximum_chronicle_state_text_length:
        raise ChronicleSnapshotTooLargeError()
    chronicle_closure = chronicle_state.get("chronicleClosure")
    closure_identifier = None
    closure_record_text = None
    if chronicle_closure is not None:
        closure_identifier = require_usable_closure_record(chronicle_closure)
        closure_record_text = build_closure_record_text(chronicle_closure)
    return PreparedChronicleSnapshot(
        expected_state_version=expected_state_version,
        storage_format_version=storage_format_version,
        chronicle_state_text=chronicle_state_text,
        content_hash=compute_text_content_hash(chronicle_state_text),
        closure_identifier=closure_identifier,
        closure_record_text=closure_record_text,
    )
