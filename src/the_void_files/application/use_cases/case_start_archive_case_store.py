from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class WhisperOfferBatch:
    offer_batch_identifier: str
    offered_whisper_cards: list[dict[str, Any]]
    chosen_whisper_identifier: str | None
    archive_case_identifier: str | None


@dataclass(frozen=True)
class ArchiveCaseSummary:
    archive_case_identifier: str
    opening_key: str
    archive_number: int
    whisper_identifier: str
    offer_batch_identifier: str
    archive_title: str
    sanction_label: str
    lifecycle_status_name: str
    opened_at_utc: str
    closed_at_utc: str | None


@dataclass(frozen=True)
class StoredArchiveOpening:
    archive_case_summary: ArchiveCaseSummary
    opening_public_payload: dict[str, Any]


@dataclass(frozen=True)
class ActiveArchiveRun:
    archive_run_identifier: str
    run_number: int
    state_version: int
    current_run: dict[str, Any]


@dataclass(frozen=True)
class PreparedArchiveOpening:
    opening_public_payload: dict[str, Any]
    initial_run: dict[str, Any]


@dataclass(frozen=True)
class AcceptedCaseGeneration:
    specification: dict[str, Any]
    specification_format_version: int
    generation_interaction_identifier: str
    accepted_attempt_number: int
    provider_name: str
    provider_mode_name: str
    model_identifier: str
    rules_version: str


@dataclass(frozen=True)
class ArchiveOpeningToPersist:
    opening_key: str
    whisper_identifier: str
    offer_batch_identifier: str
    archive_case_identifier: str
    archive_run_identifier: str
    archive_title: str
    sanction_label: str
    opened_at_utc: str
    accepted_case_generation: AcceptedCaseGeneration
    prepare_archive_opening: Callable[[int], PreparedArchiveOpening]


class ArchiveCaseStore(Protocol):
    def read_investigator_generation_context(self) -> dict[str, Any]: ...

    def read_archive_opening_by_identifier(self, archive_case_identifier: str) -> StoredArchiveOpening | None: ...

    def read_open_archive_opening(self) -> StoredArchiveOpening | None: ...

    def read_archive_opening_by_opening_key(self, opening_key: str) -> StoredArchiveOpening | None: ...

    def list_archive_case_summaries(self) -> list[ArchiveCaseSummary]: ...

    def read_pending_whisper_offer_batch(self) -> WhisperOfferBatch | None: ...

    def read_whisper_offer_batch(self, offer_batch_identifier: str) -> WhisperOfferBatch | None: ...

    def save_whisper_offer_batch_unless_one_is_pending(
        self,
        offer_batch_identifier: str,
        generation_interaction_identifier: str,
        rules_version: str,
        offered_whisper_cards: list[dict[str, Any]],
        created_at_utc: str,
        superseded_offer_batch_identifier: str | None = None,
    ) -> WhisperOfferBatch: ...

    def read_whisper_offer_batch_provider_mode_name(self, offer_batch_identifier: str) -> str | None: ...

    def record_case_generation_attempt(
        self,
        opening_key: str,
        whisper_identifier: str,
        attempt_number: int,
        interaction_identifier: str,
        validation_errors: list[dict[str, str]],
        created_at_utc: str,
    ) -> None: ...

    def persist_archive_opening(self, archive_opening: ArchiveOpeningToPersist) -> StoredArchiveOpening: ...

    def read_active_archive_run(self, archive_case_identifier: str, include_ended: bool = False) -> ActiveArchiveRun | None: ...
