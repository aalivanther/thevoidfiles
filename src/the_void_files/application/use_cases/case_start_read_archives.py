from typing import Any

from the_void_files.application.use_cases.case_start_archive_case_store import ArchiveCaseStore, ArchiveCaseSummary
from the_void_files.application.use_cases.case_start_public_opening import build_archive_number_label


def build_public_archive_summary(archive_case_summary: ArchiveCaseSummary) -> dict[str, Any]:
    return {
        "archive_case_identifier": archive_case_summary.archive_case_identifier,
        "archive_number": archive_case_summary.archive_number,
        "archive_number_label": build_archive_number_label(archive_case_summary.archive_number),
        "archive_title": archive_case_summary.archive_title,
        "sanction_label": archive_case_summary.sanction_label,
        "whisper_identifier": archive_case_summary.whisper_identifier,
        "lifecycle_status_name": archive_case_summary.lifecycle_status_name,
        "opened_at_utc": archive_case_summary.opened_at_utc,
        "closed_at_utc": archive_case_summary.closed_at_utc,
    }


def read_current_public_archive(archive_case_store: ArchiveCaseStore, archive_case_identifier: str | None = None) -> dict[str, Any] | None:
    open_archive_opening = (
        archive_case_store.read_archive_opening_by_identifier(archive_case_identifier)
        if archive_case_identifier is not None else archive_case_store.read_open_archive_opening()
    )
    if open_archive_opening is None:
        return None
    active_archive_run = archive_case_store.read_active_archive_run(
        open_archive_opening.archive_case_summary.archive_case_identifier, include_ended=archive_case_identifier is not None
    )
    return {
        "archive": build_public_archive_summary(open_archive_opening.archive_case_summary),
        "opening": open_archive_opening.opening_public_payload,
        "archive_run": (
            {
                "archive_run_identifier": active_archive_run.archive_run_identifier,
                "run_number": active_archive_run.run_number,
                "state_version": active_archive_run.state_version,
                "public_state": active_archive_run.current_run["public_state"],
            }
            if active_archive_run is not None
            else None
        ),
    }


def list_public_archive_summaries(archive_case_store: ArchiveCaseStore) -> list[dict[str, Any]]:
    return [
        build_public_archive_summary(archive_case_summary)
        for archive_case_summary in archive_case_store.list_archive_case_summaries()
    ]
