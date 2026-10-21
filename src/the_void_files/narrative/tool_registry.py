from typing import Any, Literal, get_args

from pydantic import BaseModel, ConfigDict, Field, ValidationError

adjudication_purpose_name = "adjudication"
narration_purpose_name = "narration"
piece_assistance_purpose_name = "piece_assistance"
chapter_summary_purpose_name = "chapter_summary"
connection_check_purpose_name = "connection_check"

adjudication_response_schema_name = "adjudication_proposal"
narration_response_schema_name = "narration_draft"
piece_assistance_response_schema_name = "piece_assistance_draft"
chapter_summary_response_schema_name = "chapter_summary_draft"
connection_check_response_schema_name = "connection_check_answer"

maximum_narration_paragraph_count = 24
maximum_narration_paragraph_length = 2500
maximum_effect_proposal_count = 16
maximum_effect_quantity = 100000

EffectKindName = Literal[
    "world_clock_advanced",
    "belonging_consumed",
    "belonging_gained",
    "operational_funds_spent",
    "personal_funds_spent",
    "scene_changed",
    "place_changed",
    "serious_wound_suffered",
    "relationship_changed",
    "knowledge_gained",
    "person_became_known",
    "condition_gained",
    "interactive_piece_presented",
    "interactive_piece_status_changed",
    "archive_outcome_reached",
]

known_effect_kind_names: tuple[str, ...] = get_args(EffectKindName)
effect_kind_aliases: dict[str, str | None] = {
    "advance_world_clock": "world_clock_advanced",
    "advance_world_clock_minutes": "world_clock_advanced",
    "grant_lived_experience_flag": "knowledge_gained",
    "record_executed_branch": None,
}


def normalize_effect_kind_name(effect_kind_name: str) -> str | None:
    if effect_kind_name in effect_kind_aliases:
        return effect_kind_aliases[effect_kind_name]
    return effect_kind_name


def normalize_effect_proposal(effect_proposal: "EffectProposal") -> "EffectProposal | None":
    normalized_kind_name = normalize_effect_kind_name(effect_proposal.effect_kind_name)
    if normalized_kind_name is None:
        return None
    if normalized_kind_name == effect_proposal.effect_kind_name:
        return effect_proposal
    return effect_proposal.model_copy(update={"effect_kind_name": normalized_kind_name})
effect_kind_names_needing_belonging_target = ("belonging_consumed",)
effect_kind_names_needing_positive_quantity = (
    "world_clock_advanced",
    "belonging_consumed",
    "belonging_gained",
    "operational_funds_spent",
    "personal_funds_spent",
    "serious_wound_suffered",
)


class DirectorContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EffectProposal(DirectorContractModel):
    effect_kind_name: str = Field(min_length=1, max_length=200)
    target_identifier: str | None = Field(default=None, max_length=200)
    quantity: int | None = None
    unit_name: str | None = Field(default=None, max_length=200)
    condition_origin_text: str | None = Field(default=None, max_length=400)
    condition_effect_text: str | None = Field(default=None, max_length=400)
    condition_exit_text: str | None = Field(default=None, max_length=400)
    threat_capability_text: str | None = Field(default=None, max_length=400)


class AdjudicationProposal(DirectorContractModel):
    action_key: str = Field(min_length=1, max_length=200)
    expected_state_version: int
    disposition_name: Literal["clarify", "impossible", "proposed"]
    interpreted_intent_text: str = Field(min_length=1, max_length=2000)
    feasibility_class_name: Literal["trivial", "plausible", "risky", "impossible"]
    concise_ruling_text: str = Field(min_length=1, max_length=2000)
    supporting_fact_identifiers: list[str] = Field(default_factory=list, max_length=64)
    effect_proposals: list[EffectProposal] = Field(default_factory=list, max_length=maximum_effect_proposal_count)
    requested_clarification_text: str | None = Field(default=None, max_length=2000)


class SuggestedNextAction(DirectorContractModel):
    identifier: str = Field(min_length=1, max_length=96)
    visible_text: str = Field(min_length=8, max_length=400)
    action_group_name: Literal["speak", "examine", "use_or_spend", "move", "withdraw"] | None = None


class NarrationDraft(DirectorContractModel):
    marked_paragraphs: list[str] = Field(min_length=1, max_length=maximum_narration_paragraph_count)
    introduced_fact_identifiers: list[str] = Field(default_factory=list, max_length=64)
    suggested_next_actions: list[SuggestedNextAction] = Field(
        default_factory=list,
        max_length=8,
        description="Four to six next investigator options that follow from this beat.",
    )


class PieceAssistanceDraft(DirectorContractModel):
    interactive_piece_identifier: str = Field(min_length=1, max_length=200)
    level_name: Literal["gentle", "medium", "direct"]
    public_hint_text: str = Field(min_length=1, max_length=maximum_narration_paragraph_length)


class ChapterSummaryDraft(DirectorContractModel):
    summary_paragraphs: list[str] = Field(min_length=1, max_length=maximum_narration_paragraph_count)
    open_thread_texts: list[str] = Field(default_factory=list, max_length=32)


class ConnectionCheckAnswer(DirectorContractModel):
    is_director_listening: bool


class ContractValidationError(BaseModel):
    error_name: str
    location_text: str


class AdjudicationDomainFacts(BaseModel):
    action_key: str
    state_version: int
    held_belonging_units_by_identifier: dict[str, int]
    operational_funds: int


director_contract_models_by_schema_name: dict[str, type[DirectorContractModel]] = {
    adjudication_response_schema_name: AdjudicationProposal,
    narration_response_schema_name: NarrationDraft,
    piece_assistance_response_schema_name: PieceAssistanceDraft,
    chapter_summary_response_schema_name: ChapterSummaryDraft,
    connection_check_response_schema_name: ConnectionCheckAnswer,
}

response_schema_names_by_purpose_name: dict[str, str] = {
    adjudication_purpose_name: adjudication_response_schema_name,
    narration_purpose_name: narration_response_schema_name,
    piece_assistance_purpose_name: piece_assistance_response_schema_name,
    chapter_summary_purpose_name: chapter_summary_response_schema_name,
    connection_check_purpose_name: connection_check_response_schema_name,
}


def read_registered_response_json_schema(response_schema_name: str | None) -> dict[str, Any] | None:
    if response_schema_name is None:
        return None
    director_contract_model = director_contract_models_by_schema_name.get(response_schema_name)
    if director_contract_model is not None:
        return director_contract_model.model_json_schema()
    if response_schema_name == "whisper_offer":
        from the_void_files.application.use_cases.case_start_offer_whispers import WhisperOffer

        return WhisperOffer.model_json_schema()
    if response_schema_name == "case_specification":
        from the_void_files.application.use_cases.case_start_specification_models import CaseSpecification

        return CaseSpecification.model_json_schema()
    return None


def read_structured_contract_content(structured_response: dict[str, Any] | None, response_schema_name: str) -> Any:
    if not isinstance(structured_response, dict):
        return None
    return structured_response.get(response_schema_name)


def validate_contract_structure(
    structured_response: dict[str, Any] | None, response_schema_name: str
) -> tuple[DirectorContractModel | None, list[ContractValidationError]]:
    contract_content = read_structured_contract_content(structured_response, response_schema_name)
    if contract_content is None:
        return None, [ContractValidationError(error_name="structured_response_missing", location_text=response_schema_name)]
    try:
        return director_contract_models_by_schema_name[response_schema_name].model_validate(contract_content), []
    except ValidationError as structure_error:
        return None, [
            ContractValidationError(
                error_name=f"structure_{error_detail['type']}",
                location_text=".".join(str(location_part) for location_part in error_detail["loc"]),
            )
            for error_detail in structure_error.errors()
        ]


def review_adjudication_proposal(
    adjudication_proposal: AdjudicationProposal, domain_facts: AdjudicationDomainFacts
) -> list[ContractValidationError]:
    validation_errors: list[ContractValidationError] = []
    if adjudication_proposal.action_key != domain_facts.action_key:
        validation_errors.append(ContractValidationError(error_name="action_key_mismatched", location_text="action_key"))
    if adjudication_proposal.expected_state_version != domain_facts.state_version:
        validation_errors.append(
            ContractValidationError(error_name="state_version_stale", location_text="expected_state_version")
        )
    if adjudication_proposal.disposition_name == "clarify" and not adjudication_proposal.requested_clarification_text:
        validation_errors.append(
            ContractValidationError(error_name="clarification_text_missing", location_text="requested_clarification_text")
        )
    if adjudication_proposal.disposition_name != "proposed" and adjudication_proposal.effect_proposals:
        validation_errors.append(
            ContractValidationError(error_name="effects_proposed_without_proposal", location_text="effect_proposals")
        )
    for effect_position, effect_proposal in enumerate(adjudication_proposal.effect_proposals):
        effect_location_text = f"effect_proposals.{effect_position}"
        normalized_proposal = normalize_effect_proposal(effect_proposal)
        if normalized_proposal is None:
            continue
        effect_proposal = normalized_proposal
        if effect_proposal.effect_kind_name not in known_effect_kind_names:
            validation_errors.append(
                ContractValidationError(error_name="effect_kind_not_allowed", location_text=effect_location_text)
            )
            continue
        if effect_proposal.quantity is not None and not 0 <= effect_proposal.quantity <= maximum_effect_quantity:
            validation_errors.append(
                ContractValidationError(error_name="effect_quantity_out_of_bounds", location_text=effect_location_text)
            )
            continue
        if effect_proposal.effect_kind_name in effect_kind_names_needing_positive_quantity and not effect_proposal.quantity:
            validation_errors.append(
                ContractValidationError(error_name="effect_quantity_missing", location_text=effect_location_text)
            )
            continue
        if effect_proposal.effect_kind_name == "condition_gained":
            visible_name = (effect_proposal.unit_name or "").strip()
            origin_text = (effect_proposal.condition_origin_text or "").strip()
            effect_text = (effect_proposal.condition_effect_text or "").strip()
            exit_text = (effect_proposal.condition_exit_text or "").strip()
            identifier_text = effect_proposal.target_identifier or ""
            if not exit_text:
                validation_errors.append(
                    ContractValidationError(error_name="condition_without_exit", location_text=effect_location_text)
                )
            elif not (identifier_text and visible_name and origin_text and effect_text):
                validation_errors.append(
                    ContractValidationError(error_name="condition_incomplete", location_text=effect_location_text)
                )
        if effect_proposal.effect_kind_name in effect_kind_names_needing_belonging_target:
            held_units = domain_facts.held_belonging_units_by_identifier.get(effect_proposal.target_identifier or "")
            if held_units is None:
                validation_errors.append(
                    ContractValidationError(error_name="effect_target_unknown", location_text=effect_location_text)
                )
            elif (effect_proposal.quantity or 0) > held_units:
                validation_errors.append(
                    ContractValidationError(error_name="effect_exceeds_held_units", location_text=effect_location_text)
                )
        if (
            effect_proposal.effect_kind_name == "operational_funds_spent"
            and (effect_proposal.quantity or 0) > domain_facts.operational_funds
        ):
            validation_errors.append(
                ContractValidationError(error_name="effect_exceeds_operational_funds", location_text=effect_location_text)
            )
    return validation_errors


def review_narration_draft(narration_draft: NarrationDraft) -> list[ContractValidationError]:
    validation_errors: list[ContractValidationError] = []
    for paragraph_position, marked_paragraph in enumerate(narration_draft.marked_paragraphs):
        paragraph_location_text = f"marked_paragraphs.{paragraph_position}"
        if not marked_paragraph.strip():
            validation_errors.append(
                ContractValidationError(error_name="narration_paragraph_empty", location_text=paragraph_location_text)
            )
        elif len(marked_paragraph) > maximum_narration_paragraph_length:
            validation_errors.append(
                ContractValidationError(error_name="narration_paragraph_too_long", location_text=paragraph_location_text)
            )
    return validation_errors
