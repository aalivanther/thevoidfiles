from typing import Any

from the_void_files.application.use_cases.consequence_confirmed_turn_store import (
    ArchiveRunReference,
    ConfirmedTurnStore,
)


def build_public_archive_run_reference(archive_run_reference: ArchiveRunReference) -> dict[str, Any]:
    return {
        "archive_case_identifier": archive_run_reference.archive_case_identifier,
        "archive_run_identifier": archive_run_reference.archive_run_identifier,
        "run_number": archive_run_reference.run_number,
        "lifecycle_status_name": archive_run_reference.lifecycle_status_name,
        "state_version": archive_run_reference.state_version,
    }


def read_public_turn_history(
    confirmed_turn_store: ConfirmedTurnStore, archive_case_identifier: str | None
) -> dict[str, Any]:
    archive_run_reference = confirmed_turn_store.read_archive_run_reference(archive_case_identifier)
    if archive_run_reference is None:
        return {"archive_run": None, "turns": []}
    return {
        "archive_run": build_public_archive_run_reference(archive_run_reference),
        "turns": [
            {
                "turn_identifier": stored_turn.turn_identifier,
                "action_key": stored_turn.action_key,
                "turn_kind_name": stored_turn.turn_kind_name,
                "disposition_name": stored_turn.disposition_name,
                "state_version_before": stored_turn.state_version_before,
                "state_version_after": stored_turn.state_version_after,
                "confirmed_at_utc": stored_turn.confirmed_at_utc,
                "resolution": stored_turn.response_payload,
            }
            for stored_turn in confirmed_turn_store.list_stored_turns(archive_run_reference.archive_run_identifier)
        ],
    }


def read_public_log_entries(
    confirmed_turn_store: ConfirmedTurnStore, archive_case_identifier: str | None
) -> dict[str, Any]:
    archive_run_reference = confirmed_turn_store.read_archive_run_reference(archive_case_identifier)
    if archive_run_reference is None:
        return {"archive_run": None, "log_entries": []}
    return {
        "archive_run": build_public_archive_run_reference(archive_run_reference),
        "log_entries": [
            {
                **stored_log_entry.entry_content,
                "identifier": stored_log_entry.log_entry_identifier,
                "turn_identifier": stored_log_entry.turn_identifier,
                "scene_identifier": stored_log_entry.scene_identifier,
                "world_clock_minutes": stored_log_entry.world_clock_minutes,
            }
            for stored_log_entry in confirmed_turn_store.list_stored_log_entries(
                archive_run_reference.archive_run_identifier
            )
        ],
    }
