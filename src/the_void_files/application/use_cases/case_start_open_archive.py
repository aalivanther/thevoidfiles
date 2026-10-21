import re
import uuid
from typing import Any

from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.application.use_cases.case_start_archive_case_store import (
    AcceptedCaseGeneration,
    ArchiveCaseStore,
    ArchiveOpeningToPersist,
    StoredArchiveOpening,
)
from the_void_files.application.use_cases.case_start_failures import (
    ArchiveAlreadyOpenError,
    CaseGenerationInteractionNotRecordedError,
    CaseGenerationRejectedError,
    OpeningKeyMalformedError,
    OpeningKeyReusedForOtherWhisperError,
    WhisperNotOfferedError,
)
from the_void_files.application.use_cases.case_start_public_opening import prepare_archive_opening
from the_void_files.narrative.case_generator import (
    build_case_generation_request,
    case_specification_response_schema_name,
    read_rules_version,
)
from the_void_files.narrative.case_reviewer import CaseReview, review_case_specification_proposal
from the_void_files.narrative.case_specification_preparation import prepare_case_specification_proposal

maximum_case_generation_attempt_count = 3
opening_key_pattern = re.compile(r"^[A-Za-z0-9_-]{8,128}$")


def require_well_formed_opening_key(opening_key: str) -> str:
    if opening_key_pattern.fullmatch(opening_key) is None:
        raise OpeningKeyMalformedError()
    return opening_key


def read_already_stored_opening(
    archive_case_store: ArchiveCaseStore, opening_key: str, whisper_identifier: str
) -> StoredArchiveOpening | None:
    already_stored_opening = archive_case_store.read_archive_opening_by_opening_key(opening_key)
    if already_stored_opening is None:
        return None
    if already_stored_opening.archive_case_summary.whisper_identifier != whisper_identifier:
        raise OpeningKeyReusedForOtherWhisperError()
    return already_stored_opening


def read_offered_whisper_card(
    archive_case_store: ArchiveCaseStore, whisper_identifier: str
) -> tuple[str, dict[str, Any]]:
    pending_offer_batch = archive_case_store.read_pending_whisper_offer_batch()
    if pending_offer_batch is None:
        raise WhisperNotOfferedError()
    for offered_whisper_card in pending_offer_batch.offered_whisper_cards:
        if offered_whisper_card["identifier"] == whisper_identifier:
            return pending_offer_batch.offer_batch_identifier, offered_whisper_card
    raise WhisperNotOfferedError()


async def open_archive(
    case_material_provider: RecordingNarrativeProvider,
    archive_case_store: ArchiveCaseStore,
    profile_identifier: str,
    opening_key: str,
    whisper_identifier: str,
) -> StoredArchiveOpening:
    require_well_formed_opening_key(opening_key)
    already_stored_opening = read_already_stored_opening(archive_case_store, opening_key, whisper_identifier)
    if already_stored_opening is not None:
        return already_stored_opening
    if archive_case_store.read_open_archive_opening() is not None:
        raise ArchiveAlreadyOpenError()
    offer_batch_identifier, chosen_whisper_card = read_offered_whisper_card(archive_case_store, whisper_identifier)
    rules_version = read_rules_version()
    previous_validation_errors: list[dict[str, str]] = []
    for repair_attempt_number in range(maximum_case_generation_attempt_count):
        generation_response = await case_material_provider.generate_narrative(
            build_case_generation_request(
                profile_identifier=profile_identifier,
                opening_key=opening_key,
                rules_version=rules_version,
                chosen_whisper_card=chosen_whisper_card,
                repair_attempt_number=repair_attempt_number,
                previous_validation_errors=previous_validation_errors,
                investigator_context=archive_case_store.read_investigator_generation_context(),
            )
        )
        if generation_response.interaction_identifier is None:
            raise CaseGenerationInteractionNotRecordedError()
        case_review: CaseReview = review_case_specification_proposal(
            prepare_case_specification_proposal(
                (generation_response.structured_response or {}).get(case_specification_response_schema_name),
                whisper_identifier,
            ),
            whisper_identifier,
        )
        previous_validation_errors = [
            validation_error.model_dump(mode="json") for validation_error in case_review.validation_errors
        ]
        archive_case_store.record_case_generation_attempt(
            opening_key=opening_key,
            whisper_identifier=whisper_identifier,
            attempt_number=repair_attempt_number + 1,
            interaction_identifier=generation_response.interaction_identifier,
            validation_errors=previous_validation_errors,
            created_at_utc=read_current_utc_timestamp(),
        )
        accepted_specification = case_review.accepted_specification
        if accepted_specification is None:
            continue
        archive_case_identifier = uuid.uuid4().hex
        archive_run_identifier = uuid.uuid4().hex
        opened_at_utc = read_current_utc_timestamp()
        return archive_case_store.persist_archive_opening(
            ArchiveOpeningToPersist(
                opening_key=opening_key,
                whisper_identifier=whisper_identifier,
                offer_batch_identifier=offer_batch_identifier,
                archive_case_identifier=archive_case_identifier,
                archive_run_identifier=archive_run_identifier,
                archive_title=accepted_specification.archive_title,
                sanction_label=accepted_specification.sanction_label,
                opened_at_utc=opened_at_utc,
                accepted_case_generation=AcceptedCaseGeneration(
                    specification=accepted_specification.model_dump(mode="json", exclude_unset=True),
                    specification_format_version=accepted_specification.specification_format_version,
                    generation_interaction_identifier=generation_response.interaction_identifier,
                    accepted_attempt_number=repair_attempt_number + 1,
                    provider_name=generation_response.provider_name,
                    provider_mode_name=case_material_provider.provider_mode_name,
                    model_identifier=generation_response.model_identifier,
                    rules_version=rules_version,
                ),
                prepare_archive_opening=lambda archive_number: prepare_archive_opening(
                    accepted_specification, archive_case_identifier, archive_run_identifier, opened_at_utc, archive_number
                ),
            )
        )
    raise CaseGenerationRejectedError()
