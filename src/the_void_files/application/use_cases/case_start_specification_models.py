from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

SceneTensionTierName = Literal["calm", "uneasy", "threatening", "lethal"]
PersonSilhouetteName = Literal["close_figure", "seated_figure", "long_coat_figure", "capped_figure"]
RelationshipDirectionName = Literal["from_investigator", "toward_investigator_as_perceived"]
RelationshipDimensionName = Literal["kinship", "employment", "debt", "affection"]
InteractivePieceLifecycleStatusName = Literal["presented", "in_progress", "resolved", "set_aside", "broken"]
InteractivePieceFamilyName = Literal[
    "logic", "fictional_cryptography", "spatial_mechanical", "temporal", "investigative", "social", "ritual"
]
AssistanceLevelName = Literal["gentle", "medium", "direct"]
CharacterDialogueDeliveryName = Literal["spoken", "whispered", "shouted", "heard_from_afar"]
InnerThoughtOriginName = Literal["own_reasoning", "legitimate_memory", "intrusive_perception"]

NonEmptyText = Annotated[str, Field(min_length=1)]
IdentifierText = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9_]{0,95}$")]


class SpecificationModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class BelongingResourceCost(SpecificationModel):
    kind: Literal["belonging"]
    belonging_identifier: IdentifierText
    units: int = Field(ge=1)


class OperationalFundsResourceCost(SpecificationModel):
    kind: Literal["operational_funds"]
    amount: int = Field(ge=1)


ResourceCost = Annotated[BelongingResourceCost | OperationalFundsResourceCost, Field(discriminator="kind")]


class RequiredInteractivePieceStatus(SpecificationModel):
    interactive_piece_identifier: IdentifierText
    lifecycle_status_name: InteractivePieceLifecycleStatusName


class MinimumRelationshipLevel(SpecificationModel):
    person_identifier: IdentifierText
    direction_name: RelationshipDirectionName
    minimum_level: int


class BranchCondition(SpecificationModel):
    required_lived_experience_flag_names: list[IdentifierText]
    forbidden_lived_experience_flag_names: list[IdentifierText]
    required_interactive_piece_statuses: list[RequiredInteractivePieceStatus]
    minimum_relationship_levels: list[MinimumRelationshipLevel]
    required_active_condition_identifiers: list[IdentifierText]
    minimum_serious_wound_count: int = Field(ge=0, le=5)


class ScriptedNarrationEntry(SpecificationModel):
    voice: Literal["director_narration"]
    marked_paragraphs: list[NonEmptyText] = Field(min_length=1)


class ScriptedDialogueEntry(SpecificationModel):
    voice: Literal["character_dialogue"]
    speaker_person_identifier: IdentifierText
    delivery_name: CharacterDialogueDeliveryName
    marked_paragraphs: list[NonEmptyText] = Field(min_length=1)


class ScriptedThoughtEntry(SpecificationModel):
    voice: Literal["inner_thought"]
    thought_origin_name: InnerThoughtOriginName
    marked_paragraphs: list[NonEmptyText] = Field(min_length=1)


ScriptedDirectorEntry = Annotated[
    ScriptedNarrationEntry | ScriptedDialogueEntry | ScriptedThoughtEntry, Field(discriminator="voice")
]


class ScriptedRelationshipChange(SpecificationModel):
    person_identifier: IdentifierText
    direction_name: RelationshipDirectionName
    dimension_name: RelationshipDimensionName | None
    level_change: int
    perceptible_cause_text: NonEmptyText


class FalsifiedStatusReading(SpecificationModel):
    status_field_name: Literal["world_clock", "place_name"]
    false_visible_text: NonEmptyText


class RewrittenPastPhrase(SpecificationModel):
    original_phrase_text: NonEmptyText
    false_phrase_text: NonEmptyText


class ScriptedPlainStagingEvent(SpecificationModel):
    kind: Literal["attack_received", "attack_delivered", "critical_failure", "anomaly_manifested"]
    anchor_entry_index: int = Field(ge=0)
    anchor_paragraph_index: int = Field(ge=0)


class ScriptedMentalAttackStagingEvent(SpecificationModel):
    kind: Literal["mental_attack"]
    anchor_entry_index: int = Field(ge=0)
    anchor_paragraph_index: int = Field(ge=0)
    falsified_status_reading: FalsifiedStatusReading | None
    rewritten_past_phrase: RewrittenPastPhrase | None


ScriptedStagingEvent = Annotated[
    ScriptedPlainStagingEvent | ScriptedMentalAttackStagingEvent, Field(discriminator="kind")
]


class InvestigatorCondition(SpecificationModel):
    condition_identifier: IdentifierText
    visible_name: NonEmptyText
    origin_text: NonEmptyText
    effect_text: NonEmptyText
    exit_text: NonEmptyText


class InteractivePieceStatusChange(SpecificationModel):
    interactive_piece_identifier: IdentifierText
    resulting_lifecycle_status_name: InteractivePieceLifecycleStatusName
    broken_reason_public_text: str | None


class CaseBranchOutcome(SpecificationModel):
    director_entries: list[ScriptedDirectorEntry]
    elapsed_minutes: int = Field(ge=0)
    new_place_name: str | None
    serious_wound_cause_text: str | None
    critical_failure_cause_text: str | None
    perception_clarification_text: str | None
    conditions_gained: list[InvestigatorCondition]
    condition_identifiers_ended: list[IdentifierText]
    person_identifiers_becoming_known: list[IdentifierText]
    relationship_changes: list[ScriptedRelationshipChange]
    staging_events: list[ScriptedStagingEvent]
    granted_lived_experience_flag_names: list[IdentifierText]
    presented_interactive_piece_identifiers: list[IdentifierText]
    interactive_piece_status_changes: list[InteractivePieceStatusChange]
    should_update_journal: bool
    additional_witnessed_origin_identifiers: list[IdentifierText]
    next_scene_identifier: IdentifierText | None
    archive_ending_identifier: IdentifierText | None
    threat_capability_text: str | None = None
    threat_capability_texts: list[str] = Field(default_factory=list)
    threat_was_defeated: bool = False


SuggestedActionGroupName = Literal["speak", "examine", "use_or_spend", "move", "withdraw"]


class ConditionalOutcome(SpecificationModel):
    condition: BranchCondition
    outcome: CaseBranchOutcome


class CaseActionBranch(SpecificationModel):
    branch_identifier: IdentifierText
    visible_text: NonEmptyText
    resource_cost: ResourceCost | None
    visibility_condition: BranchCondition | None
    is_repeatable: bool
    free_text_intent_pattern_sources: list[NonEmptyText]
    conditional_outcomes: list[ConditionalOutcome]
    default_outcome: CaseBranchOutcome
    repeated_outcome: CaseBranchOutcome | None
    action_group_name: SuggestedActionGroupName | None = None


class ScenePresentPersonDefinition(SpecificationModel):
    person_identifier: IdentifierText
    presence_text: NonEmptyText
    presence_condition: BranchCondition | None


class PerceivedPointOfInterest(SpecificationModel):
    identifier: IdentifierText
    visible_name: NonEmptyText


class InteractivePieceSolvedOutcome(SpecificationModel):
    interactive_piece_identifier: IdentifierText
    outcome: CaseBranchOutcome


class CaseSceneDefinition(SpecificationModel):
    scene_identifier: IdentifierText
    place_name: NonEmptyText
    tension_tier_name: SceneTensionTierName
    present_persons: list[ScenePresentPersonDefinition]
    perceived_points_of_interest: list[PerceivedPointOfInterest]
    arrival_entries: list[ScriptedDirectorEntry]
    action_branches: list[CaseActionBranch]
    free_text_fallback_outcome: CaseBranchOutcome
    interactive_piece_solved_outcomes: list[InteractivePieceSolvedOutcome]


class SharedActionBranch(SpecificationModel):
    excluded_scene_identifiers: list[IdentifierText]
    action_branch: CaseActionBranch


class PersonNameConcealment(SpecificationModel):
    concealed_name_texts: list[NonEmptyText] = Field(min_length=1)
    replacement_at_sentence_start: NonEmptyText
    replacement_inside_sentence: NonEmptyText


class CasePersonDefinition(SpecificationModel):
    person_identifier: IdentifierText
    known_name: NonEmptyText
    alias_before_name_is_known: NonEmptyText
    silhouette_name: PersonSilhouetteName
    initial_level_from_investigator: int = Field(ge=0)
    initial_level_toward_investigator: int = Field(ge=0)
    is_relationship_established_at_opening: bool
    opening_relationship_cause_text: str | None
    name_concealment: PersonNameConcealment | None


class ChronicleDeathOutcome(SpecificationModel):
    kind: Literal["chronicle_closed_by_death"]
    death_nature_name: Literal["physical", "psychological"]
    death_cause_name: Literal["critical_failure", "fifth_serious_wound"]
    perceptible_cause_text: NonEmptyText
    epitaph_rewrite_text: str | None
    intrusive_option_text: str | None


class CaseEndingDefinition(SpecificationModel):
    ending_identifier: IdentifierText
    closing_entries: list[ScriptedDirectorEntry]
    death_outcome: ChronicleDeathOutcome | None


class EndingSelectionRule(SpecificationModel):
    required_lived_experience_flag_name: IdentifierText
    ending_identifier: IdentifierText


class EndingSelection(SpecificationModel):
    selection_request_identifier: IdentifierText
    rules: list[EndingSelectionRule]
    default_ending_identifier: IdentifierText


class CombinationDial(SpecificationModel):
    dial_identifier: IdentifierText
    visible_label: NonEmptyText
    symbols: list[NonEmptyText] = Field(min_length=2)


class CombinationDialsPublicState(SpecificationModel):
    widget_kind_name: Literal["combination_dials"]
    dials: list[CombinationDial] = Field(min_length=1)


class CipherWheelPublicState(SpecificationModel):
    widget_kind_name: Literal["cipher_wheel"]
    alphabet_letters: list[NonEmptyText] = Field(min_length=2)
    ciphered_text: NonEmptyText
    wheel_inscription_text: str


class OrderedPositionsPiece(SpecificationModel):
    piece_identifier: IdentifierText
    visible_name: NonEmptyText
    symbol_name: IdentifierText


class OrderedPositionsPublicState(SpecificationModel):
    widget_kind_name: Literal["ordered_positions"]
    pieces: list[OrderedPositionsPiece] = Field(min_length=2)
    initial_order_piece_identifiers: list[IdentifierText]
    position_labels: list[NonEmptyText]


InteractivePiecePublicState = Annotated[
    CombinationDialsPublicState | CipherWheelPublicState | OrderedPositionsPublicState,
    Field(discriminator="widget_kind_name"),
]


class InteractivePiecePublicDefinition(SpecificationModel):
    interactive_piece_identifier: IdentifierText
    family_name: InteractivePieceFamilyName
    visible_title: NonEmptyText
    diegetic_purpose_text: NonEmptyText
    visible_rule_texts: list[NonEmptyText] = Field(min_length=1)
    public_state: InteractivePiecePublicState
    attempt_elapsed_minutes: int = Field(ge=0)
    is_free_text_answer_allowed: Literal[True]


class CombinationDialsSolution(SpecificationModel):
    widget_kind_name: Literal["combination_dials"]
    chosen_symbols: list[NonEmptyText]


class CipherWheelSolution(SpecificationModel):
    widget_kind_name: Literal["cipher_wheel"]
    shift_positions: int


class OrderedPositionsSolution(SpecificationModel):
    widget_kind_name: Literal["ordered_positions"]
    ordered_piece_identifiers: list[IdentifierText]


InteractivePiecePrivateSolution = Annotated[
    CombinationDialsSolution | CipherWheelSolution | OrderedPositionsSolution,
    Field(discriminator="widget_kind_name"),
]


class ExactSolutionRuleCheck(SpecificationModel):
    rule_kind_name: Literal["exact_combination", "exact_shift"]
    visible_rule_text: NonEmptyText


class PieceAtPositionRuleCheck(SpecificationModel):
    rule_kind_name: Literal["piece_at_position"]
    piece_identifier: IdentifierText
    position_index: int = Field(ge=0)
    visible_rule_text: NonEmptyText


class PiecePairRuleCheck(SpecificationModel):
    rule_kind_name: Literal["piece_immediately_before", "pieces_not_adjacent", "piece_after"]
    piece_identifier: IdentifierText
    other_piece_identifier: IdentifierText
    visible_rule_text: NonEmptyText


InteractivePieceRuleCheck = Annotated[
    ExactSolutionRuleCheck | PieceAtPositionRuleCheck | PiecePairRuleCheck, Field(discriminator="rule_kind_name")
]


class InteractivePieceAssistanceText(SpecificationModel):
    level_name: AssistanceLevelName
    public_hint_text: NonEmptyText


class CaseInteractivePiece(SpecificationModel):
    public_definition: InteractivePiecePublicDefinition
    private_solution: InteractivePiecePrivateSolution
    private_rule_checks: list[InteractivePieceRuleCheck] = Field(min_length=1)
    prose_solution_pattern_sources: list[NonEmptyText]
    failed_attempt_narration_paragraphs: list[NonEmptyText] = Field(min_length=1)
    assistance_texts: list[InteractivePieceAssistanceText]


class CaseObjective(SpecificationModel):
    objective_identifier: IdentifierText
    visible_text: NonEmptyText
    required_lived_experience_flag_names: list[IdentifierText]
    forbidden_lived_experience_flag_names: list[IdentifierText]


class IssuedBelongingUnits(SpecificationModel):
    belonging_identifier: IdentifierText
    units: int = Field(ge=0)


class CaseInitialState(SpecificationModel):
    first_scene_identifier: IdentifierText
    world_clock_minutes: int = Field(ge=0, lt=1440)
    issued_operational_funds: int = Field(ge=0)
    issued_belonging_units: list[IssuedBelongingUnits]


class EntropySignal(SpecificationModel):
    signal_flag_name: IdentifierText
    minimum_state_version: int = Field(ge=2)
    marked_paragraph: NonEmptyText
    threat_capability_text: str | None = None


class CaseClocks(SpecificationModel):
    dawn_world_clock_minutes: int = Field(ge=0)
    last_spare_time_world_clock_minutes: int = Field(ge=0)
    entropy_signals: list[EntropySignal]


class BelongingDefinition(SpecificationModel):
    identifier: IdentifierText
    visible_name: NonEmptyText
    visible_unit_description: NonEmptyText


class CaseThreat(SpecificationModel):
    threat_scale_name: IdentifierText
    nature_text: NonEmptyText
    capability_texts: list[NonEmptyText] = Field(min_length=1)
    limit_texts: list[NonEmptyText] = Field(min_length=1)
    damage_model_identifier: IdentifierText
    defeat_condition_texts: list[NonEmptyText] = Field(min_length=1)


class CasePrivateTruth(SpecificationModel):
    summary_text: NonEmptyText
    causal_chronology_texts: list[NonEmptyText] = Field(min_length=1)
    threat: CaseThreat
    non_lethal_route_texts: list[NonEmptyText] = Field(min_length=1)
    emergent_authorship_scope_text: NonEmptyText


class CaseSpecification(SpecificationModel):
    specification_format_version: Literal[1]
    whisper_identifier: IdentifierText
    case_archetype_identifier: IdentifierText
    archive_title: NonEmptyText
    sanction_label: NonEmptyText
    fictional_date_label_template: NonEmptyText
    opening_narration_paragraphs: list[NonEmptyText] = Field(min_length=1)
    private_truth: CasePrivateTruth
    objectives: list[CaseObjective] = Field(min_length=1)
    initial_state: CaseInitialState
    clocks: CaseClocks
    belongings: list[BelongingDefinition]
    persons: list[CasePersonDefinition]
    scenes: list[CaseSceneDefinition] = Field(min_length=1)
    shared_action_branches: list[SharedActionBranch]
    interactive_pieces: list[CaseInteractivePiece]
    endings: list[CaseEndingDefinition] = Field(min_length=1)
    ending_selection: EndingSelection
    resolution_flag_names: list[IdentifierText]
    essential_conclusion_flag_names: list[IdentifierText]


suggested_action_group_names_in_offer_order: tuple[SuggestedActionGroupName, ...] = (
    "speak",
    "examine",
    "use_or_spend",
    "move",
    "withdraw",
)
offer_rank_of_branch_without_action_group = suggested_action_group_names_in_offer_order.index("use_or_spend")


def order_branches_by_action_group(action_branches: list[CaseActionBranch]) -> list[CaseActionBranch]:
    return sorted(
        action_branches,
        key=lambda action_branch: (
            suggested_action_group_names_in_offer_order.index(action_branch.action_group_name)
            if action_branch.action_group_name is not None
            else offer_rank_of_branch_without_action_group
        ),
    )
