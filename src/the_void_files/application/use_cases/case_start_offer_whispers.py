import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from the_void_files.application.generated_markup_text import decode_generated_markup_in_value
from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.application.use_cases.case_start_archive_case_store import ArchiveCaseStore, WhisperOfferBatch
from the_void_files.application.use_cases.case_start_failures import (
    CaseGenerationInteractionNotRecordedError,
    WhisperOfferGenerationRejectedError,
)
from the_void_files.application.use_cases.case_start_specification_models import IdentifierText, NonEmptyText
from the_void_files.narrative.case_generator import (
    build_whisper_offer_generation_request,
    read_rules_version,
    single_playable_whisper_count,
    whisper_offer_response_schema_name,
)

curated_material_provider_mode_name = "synthetic"
whisper_ordinal_labels = (
    "Primer susurro",
    "Segundo susurro",
    "Tercer susurro",
    "Cuarto susurro",
    "Quinto susurro",
    "Sexto susurro",
    "Séptimo susurro",
    "Octavo susurro",
)


class WhisperCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    identifier: IdentifierText
    ordinal_label: NonEmptyText
    headline: NonEmptyText
    source_label: NonEmptyText
    rumor_text: NonEmptyText
    distance_text: NonEmptyText
    sphere_text: NonEmptyText
    tone_text: NonEmptyText
    threat_text: NonEmptyText
    reward_text: NonEmptyText
    is_encoded: bool
    is_case_material_available: bool


class WhisperOffer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offer_format_version: int
    offered_whispers: list[WhisperCard] = Field(min_length=1, max_length=8)


def does_whisper_offer_contain_one_playable_case(whisper_offer: WhisperOffer) -> bool:
    playable_whisper_cards = [
        whisper_card for whisper_card in whisper_offer.offered_whispers if whisper_card.is_case_material_available
    ]
    return len(playable_whisper_cards) == single_playable_whisper_count


def prepare_offered_whisper_card(whisper_card: dict[str, Any], card_index: int) -> dict[str, Any]:
    prepared_whisper_card = decode_generated_markup_in_value(whisper_card)
    if not isinstance(prepared_whisper_card, dict):
        return whisper_card
    if card_index < len(whisper_ordinal_labels):
        prepared_whisper_card["ordinal_label"] = whisper_ordinal_labels[card_index]
    return prepared_whisper_card


def build_public_whisper_offer(
    whisper_offer_batch: WhisperOfferBatch, are_all_offered_whispers_openable: bool = False
) -> dict[str, Any]:
    offered_whisper_cards = [
        prepare_offered_whisper_card(offered_whisper_card, card_index)
        for card_index, offered_whisper_card in enumerate(whisper_offer_batch.offered_whisper_cards)
    ]
    if are_all_offered_whispers_openable:
        for offered_whisper_card in offered_whisper_cards:
            offered_whisper_card["is_case_material_available"] = True
    return {
        "offer_batch_identifier": whisper_offer_batch.offer_batch_identifier,
        "offered_whispers": offered_whisper_cards,
        "chosen_whisper_identifier": whisper_offer_batch.chosen_whisper_identifier,
        "archive_case_identifier": whisper_offer_batch.archive_case_identifier,
    }


async def read_or_create_whisper_offer(
    case_material_provider: RecordingNarrativeProvider,
    archive_case_store: ArchiveCaseStore,
    profile_identifier: str,
    is_curated_material_required: bool = False,
    must_offer_single_playable_whisper: bool = False,
) -> WhisperOfferBatch:
    open_archive_opening = archive_case_store.read_open_archive_opening()
    if open_archive_opening is not None:
        settled_offer_batch = archive_case_store.read_whisper_offer_batch(
            open_archive_opening.archive_case_summary.offer_batch_identifier
        )
        if settled_offer_batch is not None:
            return settled_offer_batch
    pending_offer_batch = archive_case_store.read_pending_whisper_offer_batch()
    superseded_offer_batch_identifier: str | None = None
    if pending_offer_batch is not None:
        pending_provider_mode_name = archive_case_store.read_whisper_offer_batch_provider_mode_name(
            pending_offer_batch.offer_batch_identifier
        )
        is_pending_batch_from_other_provider_mode = (
            pending_provider_mode_name != case_material_provider.provider_mode_name
        )
        is_pending_batch_foreign_to_curated_material = (
            is_curated_material_required and pending_provider_mode_name != curated_material_provider_mode_name
        )
        if not is_pending_batch_from_other_provider_mode and not is_pending_batch_foreign_to_curated_material:
            return pending_offer_batch
        superseded_offer_batch_identifier = pending_offer_batch.offer_batch_identifier
    rules_version = read_rules_version()
    generation_response = await case_material_provider.generate_narrative(
        build_whisper_offer_generation_request(profile_identifier, rules_version, archive_case_store.read_investigator_generation_context())
    )
    if generation_response.interaction_identifier is None:
        raise CaseGenerationInteractionNotRecordedError()
    try:
        whisper_offer = WhisperOffer.model_validate(
            (generation_response.structured_response or {}).get(whisper_offer_response_schema_name)
        )
    except ValidationError as structure_error:
        raise WhisperOfferGenerationRejectedError() from structure_error
    offered_whisper_identifiers = [whisper_card.identifier for whisper_card in whisper_offer.offered_whispers]
    if len(set(offered_whisper_identifiers)) != len(offered_whisper_identifiers):
        raise WhisperOfferGenerationRejectedError()
    if must_offer_single_playable_whisper and not does_whisper_offer_contain_one_playable_case(whisper_offer):
        raise WhisperOfferGenerationRejectedError()
    return archive_case_store.save_whisper_offer_batch_unless_one_is_pending(
        offer_batch_identifier=uuid.uuid4().hex,
        generation_interaction_identifier=generation_response.interaction_identifier,
        rules_version=rules_version,
        offered_whisper_cards=[
            prepare_offered_whisper_card(whisper_card.model_dump(mode="json"), card_index)
            for card_index, whisper_card in enumerate(whisper_offer.offered_whispers)
        ],
        created_at_utc=read_current_utc_timestamp(),
        superseded_offer_batch_identifier=superseded_offer_batch_identifier,
    )
