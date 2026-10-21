import copy
import re
from dataclasses import dataclass, field
from typing import Any

from the_void_files.application.use_cases.case_start_specification_models import (
    BelongingResourceCost,
    OperationalFundsResourceCost,
    CaseActionBranch,
    CaseBranchOutcome,
    CaseInteractivePiece,
    CipherWheelPublicState,
    CipherWheelSolution,
    CombinationDialsPublicState,
    CombinationDialsSolution,
    InteractivePieceStatusChange,
    OrderedPositionsPublicState,
    ResourceCost,
)
from the_void_files.application.use_cases.consequence_case_state import (
    CaseResolutionContext,
    WorkingCaseState,
    create_director_spoken_entry,
    create_scene_presentation,
    create_working_case_state,
    has_archive_reached_resolution,
    is_branch_condition_met,
    is_person_present_in_scene,
    lifecycle_status_names_open_to_attempts,
    maximum_serious_wound_count,
    conceal_names_still_unknown,
    fold_comparable_person_name,
    has_informational_outcome_already_been_lived,
    prepare_scripted_text,
    read_current_scene,
    read_person_silhouette_name,
    read_person_visible_name,
    read_reachable_branches,
    read_relationship_level,
    solved_interactive_piece_origin_prefix,
)
from the_void_files.application.use_cases.consequence_adjudication_application import (
    build_outcome_from_adjudication_proposal,
    read_effect_quantity,
)
from the_void_files.application.use_cases.consequence_director_copy import PlanConditionDefinition, fill_copy_template
from the_void_files.narrative.case_specification_preparation import normalize_identifier_text
from the_void_files.narrative.tool_registry import AdjudicationProposal, normalize_effect_proposal
from the_void_files.application.use_cases.consequence_failures import (
    ArchiveRunAlreadyEndedError,
    AssistanceLevelUnavailableError,
    InteractivePieceNotOpenToAttemptsError,
    InteractivePieceUnknownError,
    SceneIdentifierMismatchedError,
    SubmittedValueUnusableError,
)
from the_void_files.application.use_cases.consequence_free_text_reading import (
    does_free_text_match_any_pattern,
    find_best_matching_intent,
    sanitize_quoted_player_text,
)
from the_void_files.application.use_cases.consequence_turn_requests import (
    CipherWheelSubmittedValue,
    CombinationDialsSubmittedValue,
    InteractivePieceAssistanceRequest,
    InteractivePieceAttemptRequest,
    InvestigatorActionRequest,
    OrderedPositionsSubmittedValue,
    PlannedActionStep,
)
from the_void_files.narrative.case_reviewer import read_branches_of_scene

maximum_plan_steps_executed_per_director_batch = 3
marked_span_pattern = re.compile(r"\[\[([^\[\]]{1,160})\]\]")
moving_effect_tag_names = ("temblor", "latido", "interferencia", "tinta", "reescrito")
interference_tag_name = "interferencia"
pause_tag_name = "pausa"
censorship_tag_name = "censura"
rewritten_tag_name = "reescrito"
maximum_marked_spans_per_turn = 6
maximum_moving_effects_per_turn = 2
maximum_interference_effects_per_turn = 1
maximum_pauses_per_turn = 3
relationship_band_minimum_levels = (
    (16, "unconditional"),
    (12, "close_ally"),
    (6, "trusted"),
    (3, "acquainted"),
)
lowest_relationship_band_name = "barely_known"


@dataclass
class TurnDraft:
    director_entries: list[dict[str, Any]] = field(default_factory=list)
    elapsed_minutes: int = 0
    resource_costs: list[dict[str, Any]] = field(default_factory=list)
    ordered_effects: list[dict[str, Any]] = field(default_factory=list)
    should_update_journal: bool = False
    relationship_changes: list[dict[str, Any]] = field(default_factory=list)
    staging_events: list[dict[str, Any]] = field(default_factory=list)
    presented_interactive_pieces: list[dict[str, Any]] = field(default_factory=list)
    interactive_piece_status_changes: list[dict[str, Any]] = field(default_factory=list)
    granted_lived_experience_flag_names: list[str] = field(default_factory=list)
    witnessed_origin_identifiers: list[str] = field(default_factory=list)
    archive_outcome: dict[str, Any] | None = None
    has_scene_changed: bool = False
    has_charged_directed_clock: bool = False
    heard_lines: list[str] = field(default_factory=list)
    threat_lines: list[str] = field(default_factory=list)


def remember_spoken_lines(
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    director_entries: list[dict[str, Any]],
    resolution_context: CaseResolutionContext,
    place_name: str | None = None,
) -> None:
    from the_void_files.narrative.context_builder import format_world_clock_label
    from the_void_files.narrative.orchestration.heard_exchanges import append_heard_exchange

    spoken_lines: list[dict[str, Any]] = []
    for director_entry in director_entries:
        if director_entry.get("voice") != "character_dialogue":
            continue
        speaker_person_identifier = director_entry.get("speaker_person_identifier")
        spoken_lines.append(
            {
                "speaker_person_identifier": speaker_person_identifier,
                "speaker_visible_name": director_entry.get("speaker_visible_name"),
                "marked_paragraphs": director_entry.get("marked_paragraphs"),
                "was_present": isinstance(speaker_person_identifier, str)
                and is_person_present_in_scene(speaker_person_identifier, working_state, resolution_context),
            }
        )
    spoken_place_name = place_name if isinstance(place_name, str) and place_name.strip() != "" else working_state.place_name
    updated_exchanges, sentences = append_heard_exchange(
        working_state.heard_exchanges,
        spoken_place_name,
        format_world_clock_label(working_state.world_clock_minutes),
        spoken_lines,
    )
    working_state.heard_exchanges = updated_exchanges
    turn_draft.heard_lines.extend(sentences)


def remember_threat_acts(
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    outcome: CaseBranchOutcome,
    resolution_context: CaseResolutionContext,
) -> None:
    from the_void_files.narrative.context_builder import format_world_clock_label
    from the_void_files.narrative.orchestration.threat_register import append_threat_acts, build_threat_rows

    capability_texts = [
        capability_text.strip()
        for capability_text in resolution_context.case_specification.private_truth.threat.capability_texts
    ]
    threat_rows = build_threat_rows(outcome, capability_texts)
    updated_acts, sentences = append_threat_acts(
        working_state.threat_acts,
        working_state.place_name,
        format_world_clock_label(working_state.world_clock_minutes),
        threat_rows,
    )
    working_state.threat_acts = updated_acts
    turn_draft.threat_lines.extend(sentences)
    if any(threat_row["kind"] == "derrota" for threat_row in threat_rows):
        working_state.threat_is_defeated = True


@dataclass
class ExecutableUnit:
    plan_step_index: int
    action_text: str
    condition_text: str | None
    branch_identifier: str | None
    composition_origin_name: str
    was_suggestion_edited_by_player: bool
    origin_identifier: str | None = None


@dataclass
class ResolvedTurn:
    turn_identifier: str
    disposition_name: str
    response_payload: dict[str, Any]
    next_run: dict[str, Any] | None
    confirmed_effects: list[dict[str, Any]]
    relationship_changes: list[dict[str, Any]]
    log_entries: list[dict[str, Any]]
    archive_outcome: dict[str, Any] | None


def append_narration_paragraph(turn_draft: TurnDraft, narration_paragraph: str) -> None:
    turn_draft.director_entries.append({"voice": "director_narration", "marked_paragraphs": [narration_paragraph]})


def can_afford_resource_cost(resource_cost: ResourceCost | None, working_state: WorkingCaseState) -> bool:
    if resource_cost is None:
        return True
    if isinstance(resource_cost, BelongingResourceCost):
        return working_state.belonging_units.get(resource_cost.belonging_identifier, 0) >= resource_cost.units
    return working_state.operational_funds >= resource_cost.amount


def apply_resource_cost(resource_cost: ResourceCost, working_state: WorkingCaseState, turn_draft: TurnDraft) -> None:
    turn_draft.resource_costs.append(resource_cost.model_dump(mode="json"))
    if isinstance(resource_cost, BelongingResourceCost):
        resulting_units = working_state.belonging_units.get(resource_cost.belonging_identifier, 0) - resource_cost.units
        working_state.belonging_units[resource_cost.belonging_identifier] = resulting_units
        turn_draft.ordered_effects.append(
            {
                "kind": "belonging_units_consumed",
                "belonging_identifier": resource_cost.belonging_identifier,
                "units": resource_cost.units,
                "resulting_units": resulting_units,
            }
        )
        return
    working_state.operational_funds -= resource_cost.amount
    turn_draft.ordered_effects.append(
        {
            "kind": "operational_funds_spent",
            "amount": resource_cost.amount,
            "resulting_amount": working_state.operational_funds,
        }
    )


def apply_directed_ledger_effects(
    adjudication_proposal: AdjudicationProposal | None,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
) -> None:
    if adjudication_proposal is None or adjudication_proposal.disposition_name != "proposed":
        return
    for effect_proposal in adjudication_proposal.effect_proposals:
        normalized_proposal = normalize_effect_proposal(effect_proposal)
        if normalized_proposal is None:
            continue
        if normalized_proposal.effect_kind_name == "belonging_consumed":
            belonging_identifier = normalized_proposal.target_identifier
            units = read_effect_quantity(normalized_proposal, 1)
            if (
                isinstance(belonging_identifier, str)
                and units > 0
                and working_state.belonging_units.get(belonging_identifier, 0) >= units
            ):
                apply_resource_cost(
                    BelongingResourceCost(kind="belonging", belonging_identifier=belonging_identifier, units=units),
                    working_state,
                    turn_draft,
                )
        elif normalized_proposal.effect_kind_name == "operational_funds_spent":
            amount = read_effect_quantity(normalized_proposal, 0)
            if amount > 0 and working_state.operational_funds >= amount:
                apply_resource_cost(
                    OperationalFundsResourceCost(kind="operational_funds", amount=amount),
                    working_state,
                    turn_draft,
                )
        elif normalized_proposal.effect_kind_name == "belonging_gained":
            belonging_identifier = normalized_proposal.target_identifier
            units = read_effect_quantity(normalized_proposal, 1)
            if not isinstance(belonging_identifier, str) or units <= 0:
                continue
            normalized_belonging_identifier = normalize_identifier_text(belonging_identifier)
            resulting_units = working_state.belonging_units.get(normalized_belonging_identifier, 0) + units
            working_state.belonging_units[normalized_belonging_identifier] = resulting_units
            visible_name = (
                normalized_proposal.unit_name.strip()
                if isinstance(normalized_proposal.unit_name, str) and normalized_proposal.unit_name.strip() != ""
                else normalized_belonging_identifier.replace("_", " ")
            )
            turn_draft.ordered_effects.append(
                {
                    "kind": "belonging_units_gained",
                    "belonging_identifier": normalized_belonging_identifier,
                    "visible_name": visible_name,
                    "units": units,
                    "resulting_units": resulting_units,
                }
            )
        elif normalized_proposal.effect_kind_name == "personal_funds_spent":
            amount = read_effect_quantity(normalized_proposal, 0)
            if amount <= 0:
                continue
            turn_draft.ordered_effects.append({"kind": "personal_funds_spent", "amount": amount})


kit_use_verb_texts = ("usar", "uso", "encender", "enciendo", "gastar", "gasto", "consumir", "consumo")


def infer_kit_consumption_from_action_text(
    action_text: str,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> None:
    folded_action_text = fold_comparable_person_name(action_text)
    if not any(verb_text in folded_action_text for verb_text in kit_use_verb_texts):
        return
    already_consumed_identifiers = {
        ordered_effect.get("belonging_identifier")
        for ordered_effect in turn_draft.ordered_effects
        if ordered_effect.get("kind") == "belonging_units_consumed"
    }
    for belonging_definition in resolution_context.case_specification.belongings:
        belonging_identifier = belonging_definition.identifier
        if belonging_identifier in already_consumed_identifiers:
            continue
        if working_state.belonging_units.get(belonging_identifier, 0) < 1:
            continue
        folded_visible_name = fold_comparable_person_name(belonging_definition.visible_name)
        folded_identifier = belonging_identifier.replace("_", " ")
        if folded_visible_name not in folded_action_text and folded_identifier not in folded_action_text:
            continue
        apply_resource_cost(
            BelongingResourceCost(kind="belonging", belonging_identifier=belonging_identifier, units=1),
            working_state,
            turn_draft,
        )
        return


def apply_ranked_travel(
    action_text: str,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> None:
    from the_void_files.narrative.orchestration.decision_matrix import score_logical_courses
    from the_void_files.narrative.orchestration.distance_field import measure_course_to_named_place

    if turn_draft.has_scene_changed:
        return
    distance_course = measure_course_to_named_place(
        resolution_context.case_specification.model_dump(mode="json"),
        working_state.scene_identifier,
        action_text,
        working_state.previous_scene_identifier,
        lived_flag_names=set(working_state.lived_experience_flag_names),
        operational_funds=working_state.operational_funds,
        belonging_units=working_state.belonging_units,
    )
    held_kit = [
        {
            "identifier": belonging_definition.identifier,
            "visible_name": belonging_definition.visible_name,
            "units": working_state.belonging_units.get(belonging_definition.identifier, 0),
        }
        for belonging_definition in resolution_context.case_specification.belongings
    ]
    chosen_course = score_logical_courses(action_text, held_kit, distance_course)["chosen_course"]
    if chosen_course.get("course_name") != "enter_place" or chosen_course.get("commits_logistics") is not True:
        return
    target_scene_identifier = chosen_course.get("to_scene_identifier")
    if not isinstance(target_scene_identifier, str):
        return
    target_scene = resolution_context.scenes_by_identifier.get(target_scene_identifier)
    if target_scene is None:
        return
    working_state.previous_scene_identifier = working_state.scene_identifier
    working_state.scene_identifier = target_scene.scene_identifier
    restore_effort_after_scene_change(working_state, turn_draft)
    working_state.place_name = target_scene.place_name
    turn_draft.has_scene_changed = True
    turn_draft.staging_events.append({"kind": "scene_changed", "resulting_place_name": target_scene.place_name})
    travel_minutes = chosen_course.get("travel_minutes")
    if isinstance(travel_minutes, int) and travel_minutes > turn_draft.elapsed_minutes:
        advance_world_clock(working_state, turn_draft, travel_minutes - turn_draft.elapsed_minutes)
    arrival_start = len(turn_draft.director_entries)
    for arrival_entry in target_scene.arrival_entries:
        turn_draft.director_entries.append(
            create_director_spoken_entry(arrival_entry, working_state, resolution_context)
        )
    remember_spoken_lines(
        working_state,
        turn_draft,
        turn_draft.director_entries[arrival_start:],
        resolution_context,
    )


def choose_archive_ending_identifier(
    requested_ending_identifier: str, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> str:
    ending_selection = resolution_context.case_specification.ending_selection
    if requested_ending_identifier != ending_selection.selection_request_identifier:
        return requested_ending_identifier
    for selection_rule in ending_selection.rules:
        if selection_rule.required_lived_experience_flag_name in working_state.lived_experience_flag_names:
            return selection_rule.ending_identifier
    return ending_selection.default_ending_identifier


def rate_performance(achieved_objective_count: int, objective_count: int) -> str:
    if achieved_objective_count >= objective_count:
        return "excellent"
    return "satisfactory" if achieved_objective_count * 2 >= objective_count else "disappointing"


def create_archive_ended_alive_outcome(
    ending_identifier: str, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> dict[str, Any]:
    objective_results = [
        {
            "visible_text": case_objective.visible_text,
            "was_achieved": all(
                flag_name in working_state.lived_experience_flag_names
                for flag_name in case_objective.required_lived_experience_flag_names
            )
            and all(
                flag_name not in working_state.lived_experience_flag_names
                for flag_name in case_objective.forbidden_lived_experience_flag_names
            ),
        }
        for case_objective in resolution_context.case_specification.objectives
    ]
    return {
        "kind": "archive_ended_alive",
        "ending_identifier": ending_identifier,
        "performance_rating_name": rate_performance(
            len([objective_result for objective_result in objective_results if objective_result["was_achieved"]]),
            len(objective_results),
        ),
        "objective_results": objective_results,
        "counts_as_sanctioned_closure": True,
    }


def mark_person_as_known(
    person_identifier: str,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> None:
    if person_identifier in working_state.known_person_identifiers:
        return
    person_definition = resolution_context.persons_by_identifier.get(person_identifier)
    if person_definition is None:
        return
    working_state.known_person_identifiers.append(person_identifier)
    turn_draft.ordered_effects.append(
        {
            "kind": "person_became_known",
            "person_identifier": person_identifier,
            "visible_name": person_definition.known_name,
        }
    )


def reveal_persons_named_in_action_text(
    action_text: str,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> None:
    folded_action_text = fold_comparable_person_name(action_text)
    if folded_action_text == "":
        return
    for person_definition in resolution_context.case_specification.persons:
        folded_known_name = fold_comparable_person_name(person_definition.known_name)
        if folded_known_name != "" and folded_known_name in folded_action_text:
            mark_person_as_known(
                person_definition.person_identifier, working_state, turn_draft, resolution_context
            )


def apply_outcome(
    outcome: CaseBranchOutcome,
    origin_identifier: str | None,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
    turn_identifier: str,
) -> None:
    for person_identifier in outcome.person_identifiers_becoming_known:
        mark_person_as_known(person_identifier, working_state, turn_draft, resolution_context)
    first_entry_index_of_outcome = len(turn_draft.director_entries)
    for scripted_entry in outcome.director_entries:
        speaker_person_identifier = getattr(scripted_entry, "speaker_person_identifier", None)
        if getattr(scripted_entry, "voice", None) == "character_dialogue" and isinstance(
            speaker_person_identifier, str
        ):
            mark_person_as_known(speaker_person_identifier, working_state, turn_draft, resolution_context)
        turn_draft.director_entries.append(create_director_spoken_entry(scripted_entry, working_state, resolution_context))
    elapsed_minutes = outcome.elapsed_minutes
    if outcome.next_scene_identifier in resolution_context.dawn_scene_identifiers:
        elapsed_minutes = max(
            elapsed_minutes,
            resolution_context.case_specification.clocks.dawn_world_clock_minutes - working_state.world_clock_minutes,
        )
    working_state.world_clock_minutes += elapsed_minutes
    turn_draft.elapsed_minutes += elapsed_minutes
    remember_spoken_lines(
        working_state,
        turn_draft,
        turn_draft.director_entries[first_entry_index_of_outcome:],
        resolution_context,
    )
    remember_threat_acts(working_state, turn_draft, outcome, resolution_context)
    if outcome.new_place_name:
        working_state.place_name = outcome.new_place_name
    if outcome.serious_wound_cause_text:
        working_state.serious_wound_count = min(maximum_serious_wound_count, working_state.serious_wound_count + 1)
        working_state.last_serious_wound_cause_text = outcome.serious_wound_cause_text
        turn_draft.ordered_effects.append(
            {
                "kind": "serious_wound_suffered",
                "perceptible_cause_text": outcome.serious_wound_cause_text,
                "resulting_serious_wound_count": working_state.serious_wound_count,
            }
        )
    if outcome.critical_failure_cause_text:
        turn_draft.ordered_effects.append(
            {"kind": "critical_failure_recorded", "perceptible_cause_text": outcome.critical_failure_cause_text}
        )
    if outcome.perception_clarification_text:
        turn_draft.ordered_effects.append(
            {"kind": "perception_was_altered", "clarification_text": outcome.perception_clarification_text}
        )
    for gained_condition in outcome.conditions_gained:
        gained_condition_record = gained_condition.model_dump(mode="json")
        working_state.active_conditions = [
            active_condition
            for active_condition in working_state.active_conditions
            if active_condition["condition_identifier"] != gained_condition.condition_identifier
        ] + [gained_condition_record]
        turn_draft.ordered_effects.append({"kind": "condition_gained", "condition": gained_condition_record})
    for ended_condition_identifier in outcome.condition_identifiers_ended:
        ended_conditions = [
            active_condition
            for active_condition in working_state.active_conditions
            if active_condition["condition_identifier"] == ended_condition_identifier
        ]
        if ended_conditions:
            working_state.active_conditions = [
                active_condition
                for active_condition in working_state.active_conditions
                if active_condition["condition_identifier"] != ended_condition_identifier
            ]
            turn_draft.ordered_effects.append(
                {
                    "kind": "condition_ended",
                    "condition_identifier": ended_condition_identifier,
                    "visible_name": ended_conditions[0].get("visible_name", ""),
                }
            )
    for scripted_change in outcome.relationship_changes:
        if scripted_change.person_identifier not in resolution_context.persons_by_identifier:
            continue
        relationship_key = (scripted_change.person_identifier, scripted_change.direction_name)
        resulting_level = max(
            0,
            read_relationship_level(
                working_state, resolution_context, scripted_change.person_identifier, scripted_change.direction_name
            )
            + scripted_change.level_change,
        )
        working_state.relationship_level_by_key[relationship_key] = resulting_level
        working_state.relationship_dimension_by_key[relationship_key] = scripted_change.dimension_name
        turn_draft.relationship_changes.append(
            {
                "identifier": f"relationship_change_{turn_identifier}_{len(turn_draft.relationship_changes) + 1}",
                "person_identifier": scripted_change.person_identifier,
                "person_visible_name": read_person_visible_name(
                    scripted_change.person_identifier, working_state, resolution_context
                ),
                "person_silhouette_name": read_person_silhouette_name(
                    scripted_change.person_identifier, resolution_context
                ),
                "direction_name": scripted_change.direction_name,
                "dimension_name": scripted_change.dimension_name,
                "level_change": scripted_change.level_change,
                "resulting_level": resulting_level,
                "perceptible_cause_text": conceal_names_still_unknown(
                    scripted_change.perceptible_cause_text, working_state, resolution_context
                ),
                "fictional_date_label": resolution_context.fictional_date_label,
            }
        )
    for scripted_staging_event in outcome.staging_events:
        staging_event: dict[str, Any] = {
            "kind": scripted_staging_event.kind,
            "anchor_director_entry_index": first_entry_index_of_outcome + scripted_staging_event.anchor_entry_index,
            "anchor_paragraph_index": scripted_staging_event.anchor_paragraph_index,
        }
        if scripted_staging_event.kind == "mental_attack":
            staging_event["falsified_status_reading"] = (
                scripted_staging_event.falsified_status_reading.model_dump(mode="json")
                if scripted_staging_event.falsified_status_reading is not None
                else None
            )
            staging_event["rewritten_past_phrase"] = (
                scripted_staging_event.rewritten_past_phrase.model_dump(mode="json")
                if scripted_staging_event.rewritten_past_phrase is not None
                else None
            )
        elif scripted_staging_event.kind == "attack_received":
            staging_event["caused_serious_wound"] = outcome.serious_wound_cause_text is not None
        turn_draft.staging_events.append(staging_event)
    for granted_flag_name in outcome.granted_lived_experience_flag_names:
        if granted_flag_name not in working_state.lived_experience_flag_names:
            working_state.lived_experience_flag_names.append(granted_flag_name)
            turn_draft.granted_lived_experience_flag_names.append(granted_flag_name)
    for presented_piece_identifier in outcome.presented_interactive_piece_identifiers:
        presented_piece = resolution_context.interactive_pieces_by_identifier.get(presented_piece_identifier)
        if (
            presented_piece is not None
            and presented_piece_identifier not in working_state.interactive_piece_status_by_identifier
        ):
            working_state.interactive_piece_status_by_identifier[presented_piece_identifier] = "presented"
            turn_draft.presented_interactive_pieces.append(presented_piece.public_definition.model_dump(mode="json"))
    for status_change in outcome.interactive_piece_status_changes:
        if status_change.interactive_piece_identifier in working_state.interactive_piece_status_by_identifier:
            working_state.interactive_piece_status_by_identifier[status_change.interactive_piece_identifier] = (
                status_change.resulting_lifecycle_status_name
            )
            turn_draft.interactive_piece_status_changes.append(status_change.model_dump(mode="json"))
    if outcome.should_update_journal:
        turn_draft.should_update_journal = True
    for witnessed_origin_identifier in [
        *([origin_identifier] if origin_identifier else []),
        *outcome.additional_witnessed_origin_identifiers,
    ]:
        if witnessed_origin_identifier not in working_state.witnessed_origin_identifiers:
            working_state.witnessed_origin_identifiers.append(witnessed_origin_identifier)
            turn_draft.witnessed_origin_identifiers.append(witnessed_origin_identifier)
    if outcome.next_scene_identifier and outcome.next_scene_identifier != working_state.scene_identifier:
        working_state.scene_identifier = outcome.next_scene_identifier
        restore_effort_after_scene_change(working_state, turn_draft)
        turn_draft.has_scene_changed = True
        arrival_scene = read_current_scene(working_state, resolution_context)
        if outcome.new_place_name is None:
            working_state.place_name = arrival_scene.place_name
        turn_draft.staging_events.append({"kind": "scene_changed", "resulting_place_name": working_state.place_name})
        arrival_start = len(turn_draft.director_entries)
        for arrival_entry in arrival_scene.arrival_entries:
            turn_draft.director_entries.append(create_director_spoken_entry(arrival_entry, working_state, resolution_context))
        remember_spoken_lines(
            working_state,
            turn_draft,
            turn_draft.director_entries[arrival_start:],
            resolution_context,
            arrival_scene.place_name,
        )
    if outcome.archive_ending_identifier and is_alive_ending_allowed(
        outcome.archive_ending_identifier, working_state, resolution_context
    ):
        apply_archive_ending(outcome.archive_ending_identifier, working_state, turn_draft, resolution_context)
    mark_spent_informational_branches(working_state, turn_draft, resolution_context)


def mark_spent_informational_branches(
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> None:
    seen_branch_identifiers: set[str] = set()
    for scene_definition in resolution_context.case_specification.scenes:
        for action_branch in read_branches_of_scene(resolution_context.case_specification, scene_definition):
            if action_branch.branch_identifier in seen_branch_identifiers:
                continue
            seen_branch_identifiers.add(action_branch.branch_identifier)
            if not has_informational_outcome_already_been_lived(action_branch, working_state):
                continue
            if action_branch.branch_identifier not in working_state.witnessed_origin_identifiers:
                working_state.witnessed_origin_identifiers.append(action_branch.branch_identifier)
                turn_draft.witnessed_origin_identifiers.append(action_branch.branch_identifier)
            if action_branch.branch_identifier not in working_state.executed_branch_identifiers:
                working_state.executed_branch_identifiers.append(action_branch.branch_identifier)


minimum_executed_branches_before_alive_ending = 3


def is_alive_ending_allowed(
    requested_ending_identifier: str,
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
) -> bool:
    ending_definition = next(
        (
            candidate_ending
            for candidate_ending in resolution_context.case_specification.endings
            if candidate_ending.ending_identifier == requested_ending_identifier
        ),
        None,
    )
    if ending_definition is not None and ending_definition.death_outcome is not None:
        return True
    if working_state.scene_identifier != resolution_context.case_specification.initial_state.first_scene_identifier:
        return True
    if len(working_state.executed_branch_identifiers) >= minimum_executed_branches_before_alive_ending:
        return True
    resolution_flag_names = resolution_context.case_specification.resolution_flag_names
    return any(flag_name in working_state.lived_experience_flag_names for flag_name in resolution_flag_names)


def bind_closing_entries_to_the_register(
    turn_draft: TurnDraft,
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
    closing_entry_start: int,
) -> None:
    from the_void_files.narrative.orchestration.closure_guard import (
        build_truthful_closure_paragraph,
        guard_closing_paragraphs,
    )
    from the_void_files.narrative.orchestration.narration_contract import read_committed_narration_facts

    solved_piece_names: list[str] = []
    for revealed_fact in working_state.revealed_facts:
        visible_name = revealed_fact.get("visible_name") if isinstance(revealed_fact, dict) else None
        if isinstance(visible_name, str) and visible_name.strip() != "" and visible_name.strip() not in solved_piece_names:
            solved_piece_names.append(visible_name.strip())
    committed_facts = read_committed_narration_facts(
        {
            "place_name": working_state.place_name,
            "world_clock_minutes": working_state.world_clock_minutes,
            "serious_wound_count": working_state.serious_wound_count,
            "last_serious_wound_cause_text": working_state.last_serious_wound_cause_text,
            "active_conditions": working_state.active_conditions,
            "operational_funds": working_state.operational_funds,
            "belonging_units": [],
        },
        resolution_context.case_specification.model_dump(mode="json"),
    )
    truthful_paragraph = build_truthful_closure_paragraph(
        working_state.place_name,
        working_state.serious_wound_count,
        working_state.last_serious_wound_cause_text,
        solved_piece_names,
    )
    for director_entry in turn_draft.director_entries[closing_entry_start:]:
        marked_paragraphs = director_entry.get("marked_paragraphs")
        if not isinstance(marked_paragraphs, list):
            continue
        director_entry["marked_paragraphs"] = guard_closing_paragraphs(
            [marked_paragraph for marked_paragraph in marked_paragraphs if isinstance(marked_paragraph, str)],
            committed_facts,
            solved_piece_names,
            truthful_paragraph,
        )


def apply_archive_ending(
    requested_ending_identifier: str,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> None:
    ending_identifier = choose_archive_ending_identifier(requested_ending_identifier, working_state, resolution_context)
    ending_definition = next(
        (
            candidate_ending
            for candidate_ending in resolution_context.case_specification.endings
            if candidate_ending.ending_identifier == ending_identifier
        ),
        None,
    )
    if ending_definition is None:
        return
    if (
        working_state.serious_wound_count >= maximum_serious_wound_count
        and ending_definition.death_outcome is None
    ):
        perceptible_cause_text = working_state.last_serious_wound_cause_text or ""
        if perceptible_cause_text.strip() != "":
            append_narration_paragraph(turn_draft, perceptible_cause_text)
        turn_draft.archive_outcome = {
            "kind": "chronicle_closed_by_death",
            "death_nature_name": "physical",
            "death_cause_name": "fifth_serious_wound",
            "perceptible_cause_text": perceptible_cause_text,
            "epitaph_rewrite_text": None,
            "intrusive_option_text": None,
        }
        return
    closing_entry_start = len(turn_draft.director_entries)
    for closing_entry in ending_definition.closing_entries:
        turn_draft.director_entries.append(create_director_spoken_entry(closing_entry, working_state, resolution_context))
    if ending_definition.death_outcome is not None:
        bind_closing_entries_to_the_register(turn_draft, working_state, resolution_context, closing_entry_start)
        remember_spoken_lines(
            working_state,
            turn_draft,
            turn_draft.director_entries[closing_entry_start:],
            resolution_context,
        )
        turn_draft.archive_outcome = ending_definition.death_outcome.model_dump(mode="json")
        return
    case_supplement = resolution_context.case_supplement
    for conditional_closing_entry in case_supplement.alive_ending_closing_entries if case_supplement is not None else []:
        if is_branch_condition_met(conditional_closing_entry.condition, working_state, resolution_context):
            turn_draft.director_entries.append(
                create_director_spoken_entry(conditional_closing_entry.entry, working_state, resolution_context)
            )
            break
    bind_closing_entries_to_the_register(turn_draft, working_state, resolution_context, closing_entry_start)
    remember_spoken_lines(
        working_state,
        turn_draft,
        turn_draft.director_entries[closing_entry_start:],
        resolution_context,
    )
    turn_draft.archive_outcome = create_archive_ended_alive_outcome(ending_identifier, working_state, resolution_context)


def choose_branch_outcome(
    action_branch: CaseActionBranch, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> CaseBranchOutcome:
    for conditional_outcome in action_branch.conditional_outcomes:
        if is_branch_condition_met(conditional_outcome.condition, working_state, resolution_context):
            return conditional_outcome.outcome
    return action_branch.default_outcome


def is_plain_plan_condition_true(
    condition_definition: PlanConditionDefinition,
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
) -> bool:
    if condition_definition.evaluation_name == "time_remains":
        return (
            working_state.world_clock_minutes
            < resolution_context.case_specification.clocks.last_spare_time_world_clock_minutes
        )
    if condition_definition.evaluation_name == "person_is_present":
        return condition_definition.person_identifier is not None and is_person_present_in_scene(
            condition_definition.person_identifier, working_state, resolution_context
        )
    if condition_definition.evaluation_name == "any_branch_condition_is_met":
        return any(
            is_branch_condition_met(satisfying_condition, working_state, resolution_context)
            for satisfying_condition in condition_definition.satisfying_branch_conditions
        )
    if condition_definition.evaluation_name == "investigator_is_wounded":
        return working_state.serious_wound_count > 0
    return read_current_scene(working_state, resolution_context).tension_tier_name in ("calm", "uneasy")


def judge_plan_condition(
    condition_text: str, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> tuple[bool, str, bool]:
    classified_condition = resolution_context.free_text_reader.classify_plan_condition(condition_text)
    condition_definition = classified_condition.condition_definition
    if condition_definition is None:
        return True, "", False
    is_plain_condition_true = is_plain_plan_condition_true(condition_definition, working_state, resolution_context)
    if classified_condition.is_negated:
        return not is_plain_condition_true, condition_definition.unmet_reason_when_negated_text, True
    return is_plain_condition_true, condition_definition.unmet_reason_text, True


def read_composition_origin_name(plan_step: PlannedActionStep) -> str:
    if plan_step.origin_suggested_action_identifier is None:
        return "own_words"
    return "edited_suggestion" if plan_step.was_text_edited_by_player else "suggested_action"


def is_unusable_plan_step_text(action_text: str) -> bool:
    stripped_action_text = action_text.strip()
    if stripped_action_text == "":
        return True
    if stripped_action_text.isdigit() and len(stripped_action_text) <= 2:
        return True
    letter_count = sum(1 for character in stripped_action_text if character.isalpha())
    return letter_count < 4


def expand_plan_steps_into_units(
    action_request: InvestigatorActionRequest,
    suggested_branches: list[CaseActionBranch],
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
) -> list[ExecutableUnit]:
    free_text_reader = resolution_context.free_text_reader
    executable_units: list[ExecutableUnit] = []
    for plan_step_index, plan_step in enumerate(action_request.remaining_plan_steps):
        if plan_step.origin_suggested_action_identifier is not None:
            matching_suggested_branch = next(
                (
                    suggested_branch
                    for suggested_branch in suggested_branches
                    if suggested_branch.branch_identifier == plan_step.origin_suggested_action_identifier
                ),
                None,
            )
            executable_units.append(
                ExecutableUnit(
                    plan_step_index=plan_step_index,
                    action_text=plan_step.action_text,
                    condition_text=plan_step.condition_text,
                    branch_identifier=(
                        matching_suggested_branch.branch_identifier if matching_suggested_branch is not None else None
                    ),
                    composition_origin_name=read_composition_origin_name(plan_step),
                    was_suggestion_edited_by_player=plan_step.was_text_edited_by_player,
                    origin_identifier=plan_step.origin_suggested_action_identifier,
                )
            )
            continue
        does_text_carry_mechanism_value = (
            action_request.referenced_interactive_piece_identifier is not None
            or free_text_reader.does_text_carry_mechanism_value(plan_step.action_text)
        )
        plan_segments = (
            []
            if does_text_carry_mechanism_value
            else free_text_reader.split_free_text_into_plan_segments(plan_step.action_text, len(suggested_branches))
        )
        has_suggestion_reference = any(
            plan_segment.kind_name == "suggestion_reference" for plan_segment in plan_segments
        )
        if len(plan_segments) <= 1 and not has_suggestion_reference:
            executable_units.append(
                ExecutableUnit(
                    plan_step_index=plan_step_index,
                    action_text=plan_step.action_text,
                    condition_text=plan_step.condition_text,
                    branch_identifier=None,
                    composition_origin_name="own_words",
                    was_suggestion_edited_by_player=False,
                )
            )
            continue
        for plan_segment in plan_segments:
            segment_condition_text = (
                plan_segment.condition_text if plan_segment.condition_text is not None else plan_step.condition_text
            )
            if plan_segment.kind_name == "suggestion_reference" and plan_segment.suggestion_number is not None:
                referenced_branch = suggested_branches[plan_segment.suggestion_number - 1]
                executable_units.append(
                    ExecutableUnit(
                        plan_step_index=plan_step_index,
                        action_text=conceal_names_still_unknown(
                            referenced_branch.visible_text, working_state, resolution_context
                        ),
                        condition_text=segment_condition_text,
                        branch_identifier=referenced_branch.branch_identifier,
                        composition_origin_name="suggested_action",
                        was_suggestion_edited_by_player=False,
                    )
                )
            else:
                executable_units.append(
                    ExecutableUnit(
                        plan_step_index=plan_step_index,
                        action_text=plan_segment.action_text or "",
                        condition_text=segment_condition_text,
                        branch_identifier=None,
                        composition_origin_name="own_words",
                        was_suggestion_edited_by_player=False,
                    )
                )
    return executable_units


def find_prose_solved_interactive_piece_identifier(
    action_text: str,
    referenced_interactive_piece_identifier: str | None,
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
) -> str | None:
    for solved_outcome in read_current_scene(working_state, resolution_context).interactive_piece_solved_outcomes:
        piece_identifier = solved_outcome.interactive_piece_identifier
        if (
            working_state.interactive_piece_status_by_identifier.get(piece_identifier)
            not in lifecycle_status_names_open_to_attempts
        ):
            continue
        if (
            referenced_interactive_piece_identifier is not None
            and referenced_interactive_piece_identifier != piece_identifier
        ):
            continue
        interactive_piece = resolution_context.interactive_pieces_by_identifier.get(piece_identifier)
        if interactive_piece is None:
            continue
        mentions_mechanism = (
            referenced_interactive_piece_identifier == piece_identifier
            or resolution_context.free_text_reader.does_text_mention_mechanism(action_text)
        )
        if mentions_mechanism and does_free_text_match_any_pattern(
            action_text, interactive_piece.prose_solution_pattern_sources
        ):
            return piece_identifier
    return None


def resolve_solved_interactive_piece(
    piece_identifier: str,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
    turn_identifier: str,
) -> None:
    solved_outcome = next(
        (
            candidate_outcome.outcome
            for candidate_outcome in read_current_scene(working_state, resolution_context).interactive_piece_solved_outcomes
            if candidate_outcome.interactive_piece_identifier == piece_identifier
        ),
        None,
    )
    if solved_outcome is None:
        return
    interactive_piece = resolution_context.interactive_pieces_by_identifier.get(piece_identifier)
    fact_identifier = (
        solved_outcome.granted_lived_experience_flag_names[0]
        if solved_outcome.granted_lived_experience_flag_names
        else f"piece_{piece_identifier}_resolved"
    )
    visible_name = (
        interactive_piece.public_definition.visible_title if interactive_piece is not None else piece_identifier
    )
    if fact_identifier not in working_state.lived_experience_flag_names:
        working_state.lived_experience_flag_names.append(fact_identifier)
        turn_draft.granted_lived_experience_flag_names.append(fact_identifier)
    revealed_fact = {
        "fact_identifier": fact_identifier,
        "visible_name": visible_name,
        "source_piece_identifier": piece_identifier,
    }
    if not any(
        existing_fact.get("fact_identifier") == fact_identifier for existing_fact in working_state.revealed_facts
    ):
        working_state.revealed_facts.append(revealed_fact)
        turn_draft.ordered_effects.append({"kind": "knowledge_gained", **revealed_fact})
    apply_outcome(
        solved_outcome.model_copy(
            update={
                "interactive_piece_status_changes": [
                    *solved_outcome.interactive_piece_status_changes,
                    InteractivePieceStatusChange(
                        interactive_piece_identifier=piece_identifier,
                        resulting_lifecycle_status_name="resolved",
                        broken_reason_public_text=None,
                    ),
                ]
            }
        ),
        f"{solved_interactive_piece_origin_prefix}{piece_identifier}",
        working_state,
        turn_draft,
        resolution_context,
        turn_identifier,
    )


def restore_effort_after_scene_change(working_state: WorkingCaseState, turn_draft: TurnDraft) -> None:
    from the_void_files.narrative.orchestration.effort import case_effort_maximum

    if working_state.effort_remaining >= case_effort_maximum:
        working_state.effort_remaining = case_effort_maximum
        return
    working_state.effort_remaining = case_effort_maximum
    turn_draft.ordered_effects.append(
        {"kind": "effort_spent", "amount": 0, "resulting_effort": case_effort_maximum}
    )


def refuse_action_without_effort(
    action_text: str, working_state: WorkingCaseState, turn_draft: TurnDraft
) -> bool:
    from the_void_files.narrative.orchestration.effort import does_text_spend_effort, no_effort_remaining_text

    if not does_text_spend_effort(action_text):
        return False
    if working_state.effort_remaining > 0:
        working_state.effort_remaining -= 1
        turn_draft.ordered_effects.append(
            {
                "kind": "effort_spent",
                "amount": 1,
                "resulting_effort": working_state.effort_remaining,
            }
        )
        return False
    append_narration_paragraph(turn_draft, no_effort_remaining_text)
    return True


def apply_attribute_pace(action_text: str, working_state: WorkingCaseState, turn_draft: TurnDraft) -> None:
    from the_void_files.narrative.orchestration.effort import adjusted_elapsed_minutes, read_consulted_attribute_name

    attribute_name = read_consulted_attribute_name(action_text)
    if attribute_name is None or turn_draft.elapsed_minutes <= 0:
        return
    attribute_value = working_state.investigator_attributes.get(attribute_name, 4)
    paced_minutes = adjusted_elapsed_minutes(turn_draft.elapsed_minutes, attribute_value)
    minute_delta = paced_minutes - turn_draft.elapsed_minutes
    if minute_delta == 0:
        return
    working_state.world_clock_minutes += minute_delta
    turn_draft.elapsed_minutes = paced_minutes


def advance_world_clock(working_state: WorkingCaseState, turn_draft: TurnDraft, elapsed_minutes: int) -> None:
    working_state.world_clock_minutes += elapsed_minutes
    turn_draft.elapsed_minutes += elapsed_minutes


def fit_directed_outcome_to_this_unit(
    directed_outcome: CaseBranchOutcome,
    action_text: str,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> CaseBranchOutcome:
    from the_void_files.narrative.orchestration.distance_field import measure_course_to_named_place

    updates: dict[str, Any] = {}
    if turn_draft.has_charged_directed_clock:
        updates["elapsed_minutes"] = 0
    else:
        turn_draft.has_charged_directed_clock = True
    next_scene_identifier = directed_outcome.next_scene_identifier
    if isinstance(next_scene_identifier, str) and next_scene_identifier != "":
        distance_course = measure_course_to_named_place(
            resolution_context.case_specification.model_dump(mode="json"),
            working_state.scene_identifier,
            action_text,
            working_state.previous_scene_identifier,
            lived_flag_names=set(working_state.lived_experience_flag_names),
            operational_funds=working_state.operational_funds,
            belonging_units=working_state.belonging_units,
        )
        if (
            distance_course.get("can_enter") is not True
            or distance_course.get("to_scene_identifier") != next_scene_identifier
        ):
            updates["next_scene_identifier"] = None
    if not updates:
        return directed_outcome
    return directed_outcome.model_copy(update=updates)


def restore_effort_spent_on_a_skipped_unit(
    working_state: WorkingCaseState, turn_draft: TurnDraft, effort_before_this_unit: int
) -> None:
    if working_state.effort_remaining >= effort_before_this_unit:
        return
    spent_down_to = working_state.effort_remaining
    working_state.effort_remaining = effort_before_this_unit
    kept_effects: list[dict[str, Any]] = []
    has_removed_the_spend = False
    for ordered_effect in reversed(turn_draft.ordered_effects):
        if (
            not has_removed_the_spend
            and ordered_effect.get("kind") == "effort_spent"
            and isinstance(ordered_effect.get("amount"), int)
            and ordered_effect["amount"] > 0
            and ordered_effect.get("resulting_effort") == spent_down_to
        ):
            has_removed_the_spend = True
            continue
        kept_effects.append(ordered_effect)
    turn_draft.ordered_effects = list(reversed(kept_effects))


def execute_unit(
    executable_unit: ExecutableUnit,
    action_request: InvestigatorActionRequest,
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
    turn_identifier: str,
    director_adjudication: AdjudicationProposal | None = None,
) -> str:
    director_copy = resolution_context.director_copy
    free_text_reader = resolution_context.free_text_reader
    quoted_action_text = sanitize_quoted_player_text(executable_unit.action_text)
    effort_before_this_unit = working_state.effort_remaining

    def skip_this_unit(skip_reason_name: str) -> str:
        restore_effort_spent_on_a_skipped_unit(working_state, turn_draft, effort_before_this_unit)
        return skip_reason_name

    reveal_persons_named_in_action_text(
        executable_unit.action_text, working_state, turn_draft, resolution_context
    )
    if refuse_action_without_effort(executable_unit.action_text, working_state, turn_draft):
        return skip_this_unit("skipped_for_no_effort")
    if executable_unit.condition_text:
        quoted_condition_text = sanitize_quoted_player_text(executable_unit.condition_text)
        is_condition_met, unmet_reason_text, was_condition_recognized = judge_plan_condition(
            executable_unit.condition_text, working_state, resolution_context
        )
        if not is_condition_met:
            append_narration_paragraph(
                turn_draft,
                fill_copy_template(
                    director_copy.condition_was_unmet_paragraph_template,
                    action_text=quoted_action_text,
                    condition_text=quoted_condition_text,
                    reason_text=unmet_reason_text,
                ),
            )
            return skip_this_unit("skipped_because_condition_was_unmet")
        append_narration_paragraph(
            turn_draft,
            (
                fill_copy_template(
                    director_copy.condition_was_met_paragraph_template,
                    action_text=quoted_action_text,
                    condition_text=quoted_condition_text,
                )
                if was_condition_recognized
                else fill_copy_template(
                    director_copy.unrecognized_condition_paragraph_template, condition_text=quoted_condition_text
                )
            ),
        )

    reachable_branches = read_reachable_branches(working_state, resolution_context)
    chosen_branch: CaseActionBranch | None = None
    if executable_unit.branch_identifier is not None:
        chosen_branch = next(
            (
                action_branch
                for action_branch in reachable_branches
                if action_branch.branch_identifier == executable_unit.branch_identifier
            ),
            None,
        )
        if chosen_branch is None:
            append_narration_paragraph(
                turn_draft,
                fill_copy_template(director_copy.action_out_of_reach_paragraph_template, action_text=quoted_action_text),
            )
            return skip_this_unit("skipped_out_of_reach")
    else:
        prose_solved_piece_identifier = find_prose_solved_interactive_piece_identifier(
            executable_unit.action_text,
            action_request.referenced_interactive_piece_identifier,
            working_state,
            resolution_context,
        )
        if prose_solved_piece_identifier is not None:
            if working_state.effort_remaining <= 0:
                from the_void_files.narrative.orchestration.effort import no_effort_remaining_text

                append_narration_paragraph(turn_draft, no_effort_remaining_text)
                return skip_this_unit("skipped_for_no_effort")
            append_narration_paragraph(turn_draft, director_copy.piece_solved_in_prose_paragraph)
            advance_world_clock(
                working_state,
                turn_draft,
                resolution_context.interactive_pieces_by_identifier[
                    prose_solved_piece_identifier
                ].public_definition.attempt_elapsed_minutes,
            )
            resolve_solved_interactive_piece(
                prose_solved_piece_identifier, working_state, turn_draft, resolution_context, turn_identifier
            )
            return "executed"
        if free_text_reader.is_action_text_without_method(executable_unit.action_text):
            append_narration_paragraph(
                turn_draft,
                fill_copy_template(
                    director_copy.action_without_method_inside_plan_paragraph_template, action_text=quoted_action_text
                ),
            )
            return skip_this_unit("skipped_without_method")
        mentioned_impossible_object = free_text_reader.find_mention_of_object_never_carried(executable_unit.action_text)
        if mentioned_impossible_object is not None:
            append_narration_paragraph(
                turn_draft,
                fill_copy_template(
                    director_copy.insisted_impossible_action_paragraph_template,
                    mentioned_object_text=mentioned_impossible_object,
                ),
            )
            advance_world_clock(working_state, turn_draft, director_copy.insisted_impossible_action_elapsed_minutes)
            return "executed"
        matched_branch_identifier = find_best_matching_intent(
            executable_unit.action_text,
            [
                (action_branch.branch_identifier, action_branch.free_text_intent_pattern_sources)
                for action_branch in reachable_branches
            ],
        )
        chosen_branch = next(
            (
                action_branch
                for action_branch in reachable_branches
                if action_branch.branch_identifier == matched_branch_identifier
            ),
            None,
        )
        if chosen_branch is None:
            if free_text_reader.is_preparation_text(executable_unit.action_text):
                append_narration_paragraph(turn_draft, director_copy.preparation_paragraph)
                advance_world_clock(working_state, turn_draft, director_copy.preparation_elapsed_minutes)
                return "executed"
            directed_outcome = build_outcome_from_adjudication_proposal(
                director_adjudication,
                resolution_context,
                executable_unit.action_text,
                working_state.investigator_attributes,
                working_state.scene_identifier,
                working_state.belonging_units,
                working_state.previous_scene_identifier,
            )
            if directed_outcome is not None:
                directed_outcome = fit_directed_outcome_to_this_unit(
                    directed_outcome,
                    executable_unit.action_text,
                    working_state,
                    turn_draft,
                    resolution_context,
                )
            apply_outcome(
                directed_outcome
                if directed_outcome is not None
                else read_current_scene(working_state, resolution_context).free_text_fallback_outcome,
                None,
                working_state,
                turn_draft,
                resolution_context,
                turn_identifier,
            )
            apply_directed_ledger_effects(director_adjudication, working_state, turn_draft)
            infer_kit_consumption_from_action_text(
                executable_unit.action_text, working_state, turn_draft, resolution_context
            )
            apply_ranked_travel(executable_unit.action_text, working_state, turn_draft, resolution_context)
            return "executed"

    was_branch_already_witnessed = chosen_branch.branch_identifier in working_state.witnessed_origin_identifiers
    if was_branch_already_witnessed and not chosen_branch.is_repeatable:
        if chosen_branch.repeated_outcome is not None:
            apply_outcome(
                chosen_branch.repeated_outcome, None, working_state, turn_draft, resolution_context, turn_identifier
            )
            return "executed"
        append_narration_paragraph(
            turn_draft,
            fill_copy_template(director_copy.action_already_done_paragraph_template, action_text=quoted_action_text),
        )
        return skip_this_unit("skipped_already_done")
    if not can_afford_resource_cost(chosen_branch.resource_cost, working_state):
        append_narration_paragraph(
            turn_draft,
            fill_copy_template(director_copy.unaffordable_cost_paragraph_template, action_text=quoted_action_text),
        )
        return skip_this_unit("skipped_unaffordable")
    if executable_unit.was_suggestion_edited_by_player:
        turn_draft.director_entries.append(
            {
                "voice": "system_notice",
                "notice_kind_name": "demonstration_limit",
                "plain_paragraphs": [director_copy.edited_suggestion_notice_text],
            }
        )
    if chosen_branch.resource_cost is not None:
        apply_resource_cost(chosen_branch.resource_cost, working_state, turn_draft)
    if chosen_branch.branch_identifier not in working_state.executed_branch_identifiers:
        working_state.executed_branch_identifiers.append(chosen_branch.branch_identifier)
    chosen_outcome = choose_branch_outcome(chosen_branch, working_state, resolution_context)
    already_lived_granted_flags = [
        flag_name
        for flag_name in chosen_outcome.granted_lived_experience_flag_names
        if flag_name in working_state.lived_experience_flag_names
    ]
    if (
        was_branch_already_witnessed
        and chosen_branch.is_repeatable
        and chosen_branch.repeated_outcome is None
        and chosen_outcome.granted_lived_experience_flag_names
        and len(already_lived_granted_flags) == len(chosen_outcome.granted_lived_experience_flag_names)
    ):
        directed_outcome = build_outcome_from_adjudication_proposal(
            director_adjudication,
            resolution_context,
            executable_unit.action_text,
            working_state.investigator_attributes,
            working_state.scene_identifier,
            working_state.belonging_units,
            working_state.previous_scene_identifier,
        )
        if directed_outcome is not None:
            directed_outcome = fit_directed_outcome_to_this_unit(
                directed_outcome,
                executable_unit.action_text,
                working_state,
                turn_draft,
                resolution_context,
            )
            apply_outcome(
                directed_outcome,
                chosen_branch.branch_identifier,
                working_state,
                turn_draft,
                resolution_context,
                turn_identifier,
            )
            apply_directed_ledger_effects(director_adjudication, working_state, turn_draft)
            infer_kit_consumption_from_action_text(
                executable_unit.action_text, working_state, turn_draft, resolution_context
            )
            apply_ranked_travel(executable_unit.action_text, working_state, turn_draft, resolution_context)
            return "executed"
    apply_outcome(
        chosen_outcome,
        chosen_branch.branch_identifier,
        working_state,
        turn_draft,
        resolution_context,
        turn_identifier,
    )
    return "executed"


def read_plain_text_of_marked_span(span_content: str) -> str:
    separator_index = span_content.find(":")
    if separator_index < 0:
        return span_content
    tag_names = span_content[:separator_index].lower().split("+")
    if pause_tag_name in tag_names or censorship_tag_name in tag_names:
        return ""
    span_text = span_content[separator_index + 1 :]
    if rewritten_tag_name in tag_names:
        span_text_parts = span_text.split("|")
        return span_text_parts[1] if len(span_text_parts) > 1 else span_text
    return span_text


def enforce_narrative_markup_budget(director_entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    used_budget = {"marked_span_count": 0, "moving_effect_count": 0, "interference_effect_count": 0, "pause_count": 0}

    def choose_span_replacement(span_match: re.Match[str]) -> str:
        span_content = span_match.group(1)
        separator_index = span_content.find(":")
        tag_names = [] if separator_index < 0 else span_content[:separator_index].lower().split("+")
        if pause_tag_name in tag_names:
            used_budget["pause_count"] += 1
            return "" if used_budget["pause_count"] > maximum_pauses_per_turn else span_match.group(0)
        is_moving_effect = any(tag_name in moving_effect_tag_names for tag_name in tag_names)
        is_interference = interference_tag_name in tag_names
        if (
            used_budget["marked_span_count"] >= maximum_marked_spans_per_turn
            or (is_moving_effect and used_budget["moving_effect_count"] >= maximum_moving_effects_per_turn)
            or (is_interference and used_budget["interference_effect_count"] >= maximum_interference_effects_per_turn)
        ):
            return read_plain_text_of_marked_span(span_content)
        used_budget["marked_span_count"] += 1
        used_budget["moving_effect_count"] += 1 if is_moving_effect else 0
        used_budget["interference_effect_count"] += 1 if is_interference else 0
        return span_match.group(0)

    return [
        (
            director_entry
            if director_entry["voice"] == "system_notice"
            else {
                **director_entry,
                "marked_paragraphs": [
                    marked_span_pattern.sub(choose_span_replacement, marked_paragraph)
                    for marked_paragraph in director_entry["marked_paragraphs"]
                ],
            }
        )
        for director_entry in director_entries
    ]


def append_entropy_signal_if_due(
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
    resulting_state_version: int,
) -> None:
    if (
        turn_draft.archive_outcome is not None
        or working_state.threat_is_defeated
        or has_archive_reached_resolution(working_state, resolution_context)
        or working_state.scene_identifier in resolution_context.dawn_scene_identifiers
    ):
        return
    entropy_signals = sorted(
        resolution_context.case_specification.clocks.entropy_signals,
        key=lambda entropy_signal: entropy_signal.minimum_state_version,
        reverse=True,
    )
    due_signal = next(
        (
            entropy_signal
            for entropy_signal in entropy_signals
            if resulting_state_version >= entropy_signal.minimum_state_version
            and entropy_signal.signal_flag_name not in working_state.lived_experience_flag_names
        ),
        None,
    )
    if due_signal is None:
        return
    append_narration_paragraph(
        turn_draft, prepare_scripted_text(due_signal.marked_paragraph, working_state, resolution_context)
    )
    from the_void_files.narrative.orchestration.threat_register import (
        append_threat_acts,
        match_listed_capability,
        used_capability_texts,
    )
    from the_void_files.narrative.context_builder import format_world_clock_label

    capability_texts = [
        capability_text.strip()
        for capability_text in resolution_context.case_specification.private_truth.threat.capability_texts
    ]
    for entropy_signal in entropy_signals:
        if entropy_signal.minimum_state_version > due_signal.minimum_state_version:
            continue
        matched_capability_text = match_listed_capability(entropy_signal.threat_capability_text, capability_texts)
        if matched_capability_text == "" or matched_capability_text in used_capability_texts(working_state.threat_acts):
            continue
        updated_acts, sentences = append_threat_acts(
            working_state.threat_acts,
            working_state.place_name,
            format_world_clock_label(working_state.world_clock_minutes),
            [{"kind": "anomalia", "detail": "", "capability_text": matched_capability_text}],
        )
        working_state.threat_acts = updated_acts
        turn_draft.threat_lines.extend(sentences)
    for entropy_signal in entropy_signals:
        if entropy_signal.minimum_state_version > due_signal.minimum_state_version:
            continue
        if entropy_signal.signal_flag_name not in working_state.lived_experience_flag_names:
            working_state.lived_experience_flag_names.append(entropy_signal.signal_flag_name)
            turn_draft.granted_lived_experience_flag_names.append(entropy_signal.signal_flag_name)
        if entropy_signal.signal_flag_name not in working_state.given_entropy_signal_flag_names:
            working_state.given_entropy_signal_flag_names.append(entropy_signal.signal_flag_name)


def compose_confirmed_effects(
    current_run: dict[str, Any], working_state: WorkingCaseState, turn_draft: TurnDraft
) -> list[dict[str, Any]]:
    public_state = current_run["public_state"]
    confirmed_effects: list[dict[str, Any]] = []
    if turn_draft.elapsed_minutes > 0:
        confirmed_effects.append(
            {
                "kind": "world_clock_advanced",
                "elapsed_minutes": turn_draft.elapsed_minutes,
                "resulting_world_clock_minutes": public_state["world_clock_minutes"] + turn_draft.elapsed_minutes,
            }
        )
    if working_state.place_name != public_state["place_name"]:
        confirmed_effects.append({"kind": "place_changed", "resulting_place_name": working_state.place_name})
    confirmed_effects.extend(turn_draft.ordered_effects)
    if turn_draft.should_update_journal:
        confirmed_effects.append({"kind": "journal_updated"})
    return confirmed_effects


def read_relationship_qualitative_band_name(relationship_level: int) -> str:
    for minimum_level, band_name in relationship_band_minimum_levels:
        if relationship_level >= minimum_level:
            return band_name
    return lowest_relationship_band_name


def create_relationship_pulse(relationship_change: dict[str, Any]) -> dict[str, Any]:
    level_change = relationship_change["level_change"]
    return {
        "identifier": relationship_change["identifier"],
        "person_identifier": relationship_change["person_identifier"],
        "person_visible_name": relationship_change["person_visible_name"],
        "person_silhouette_name": relationship_change["person_silhouette_name"],
        "direction_name": relationship_change["direction_name"],
        "dimension_name": relationship_change["dimension_name"],
        "tendency_name": "strengthens" if level_change > 0 else ("cools" if level_change < 0 else "unchanged"),
        "resulting_qualitative_band_name": read_relationship_qualitative_band_name(
            relationship_change["resulting_level"]
        ),
        "perceptible_cause_text": relationship_change["perceptible_cause_text"],
        "fictional_date_label": relationship_change["fictional_date_label"],
    }


def build_next_run(
    current_run: dict[str, Any],
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    confirmed_turn: dict[str, Any],
    pending_action_plan: dict[str, Any] | None,
    attempt_record: dict[str, Any] | None,
    attempted_interactive_piece_identifier: str | None,
    submitted_value: dict[str, Any] | None,
) -> dict[str, Any]:
    next_run = copy.deepcopy(current_run)
    public_state = next_run["public_state"]
    confirmed_effect_kind_names = [confirmed_effect["kind"] for confirmed_effect in confirmed_turn["confirmed_effects"]]
    known_belonging_identifiers = [
        issued_belonging["belonging_identifier"] for issued_belonging in public_state["belonging_units"]
    ]
    public_state["place_name"] = working_state.place_name
    public_state["world_clock_minutes"] = working_state.world_clock_minutes
    public_state["operational_funds"] = working_state.operational_funds
    public_state["belonging_units"] = [
        {"belonging_identifier": belonging_identifier, "units": working_state.belonging_units[belonging_identifier]}
        for belonging_identifier in [
            *known_belonging_identifiers,
            *[
                belonging_identifier
                for belonging_identifier in working_state.belonging_units
                if belonging_identifier not in known_belonging_identifiers
            ],
        ]
    ]
    public_state["serious_wound_count"] = working_state.serious_wound_count
    public_state["revealed_facts"] = list(working_state.revealed_facts)
    completed_objective_texts = confirmed_turn.get("completed_objective_texts")
    public_state["completed_objective_texts"] = (
        list(completed_objective_texts) if isinstance(completed_objective_texts, list) else []
    )
    public_state["heard_exchanges"] = list(working_state.heard_exchanges)
    public_state["threat_acts"] = [
        {act_key: act_value for act_key, act_value in threat_act.items() if act_key != "capability_text"}
        for threat_act in working_state.threat_acts
        if isinstance(threat_act, dict)
    ]
    public_state["threat_is_defeated"] = working_state.threat_is_defeated
    public_state["effort_remaining"] = working_state.effort_remaining
    public_state["investigator_attributes"] = dict(working_state.investigator_attributes)
    public_state["last_serious_wound_cause_text"] = working_state.last_serious_wound_cause_text
    public_state["last_confirmed_action_key"] = confirmed_turn["action_key"]
    public_state["confirmed_turn_count"] = public_state["confirmed_turn_count"] + 1
    next_scene_presentation = confirmed_turn["next_scene_presentation"]
    if next_scene_presentation is not None:
        public_state["current_scene_presentation"] = next_scene_presentation
        if next_scene_presentation["scene_identifier"] not in public_state["visited_scene_identifiers"]:
            public_state["visited_scene_identifiers"].append(next_scene_presentation["scene_identifier"])
    from the_void_files.application.use_cases.case_start_public_opening import remember_visited_place

    remember_visited_place(public_state, working_state.scene_identifier, working_state.place_name)
    public_state["witnessed_origins"].extend(
        {
            "origin_identifier": origin_identifier,
            "place_name": working_state.place_name,
            "world_clock_minutes": working_state.world_clock_minutes,
        }
        for origin_identifier in turn_draft.witnessed_origin_identifiers
    )
    public_state["lived_experience_flag_names"] = list(working_state.lived_experience_flag_names)
    public_state["known_person_identifiers"] = list(working_state.known_person_identifiers)
    public_state["relationship_levels"] = [
        {
            "person_identifier": person_identifier,
            "direction_name": direction_name,
            "dimension_name": working_state.relationship_dimension_by_key.get((person_identifier, direction_name)),
            "level": relationship_level,
        }
        for (person_identifier, direction_name), relationship_level in working_state.relationship_level_by_key.items()
    ]
    public_state["active_conditions"] = list(working_state.active_conditions)
    public_state["interactive_piece_public_definitions"].extend(turn_draft.presented_interactive_pieces)
    for presented_interactive_piece in turn_draft.presented_interactive_pieces:
        public_state["interactive_piece_runtime_states"].append(
            {
                "interactive_piece_identifier": presented_interactive_piece["interactive_piece_identifier"],
                "lifecycle_status_name": "presented",
                "working_value": None,
                "attempts": [],
                "assistance_given": [],
                "broken_reason_public_text": None,
            }
        )
    for runtime_state in public_state["interactive_piece_runtime_states"]:
        for status_change in turn_draft.interactive_piece_status_changes:
            if status_change["interactive_piece_identifier"] == runtime_state["interactive_piece_identifier"]:
                runtime_state["lifecycle_status_name"] = status_change["resulting_lifecycle_status_name"]
                runtime_state["broken_reason_public_text"] = status_change["broken_reason_public_text"]
        if (
            attempt_record is not None
            and runtime_state["interactive_piece_identifier"] == attempted_interactive_piece_identifier
        ):
            runtime_state["attempts"].append(attempt_record)
            runtime_state["working_value"] = submitted_value
            if runtime_state["lifecycle_status_name"] in ("presented", "set_aside"):
                runtime_state["lifecycle_status_name"] = "in_progress"
    public_state["pending_action_plan"] = None if confirmed_turn["archive_outcome"] is not None else pending_action_plan
    public_state["unanswered_director_question"] = (
        confirmed_turn["plan_continuation_question"] if public_state["pending_action_plan"] is not None else None
    )
    if "journal_updated" in confirmed_effect_kind_names:
        public_state["journal_update_count"] = public_state["journal_update_count"] + 1
    public_state["archive_outcome"] = confirmed_turn["archive_outcome"]
    director_private_state = next_run["director_private_state"]
    director_private_state["threat_capability_acts"] = [dict(threat_act) for threat_act in working_state.threat_acts]
    director_private_state["executed_branch_identifiers"] = list(working_state.executed_branch_identifiers)
    director_private_state["given_entropy_signal_flag_names"] = list(working_state.given_entropy_signal_flag_names)
    from the_void_files.narrative.orchestration.turn_orchestrator import commit_reality_ledger

    commit_reality_ledger(
        current_run,
        next_run,
        working_state.previous_scene_identifier,
        working_state.scene_identifier,
        working_state.place_name,
    )
    return next_run


def build_turn_log_entries(
    confirmed_turn: dict[str, Any], world_clock_minutes_before: int, world_clock_minutes_after: int
) -> list[dict[str, Any]]:
    log_entries: list[dict[str, Any]] = [
        {"world_clock_minutes": world_clock_minutes_before, "content": confirmed_turn["investigator_entry"]}
    ]
    entry_contents_after_investigator: list[dict[str, Any]] = list(confirmed_turn["director_entries"])
    if confirmed_turn["confirmed_effects"]:
        entry_contents_after_investigator.append(
            {"voice": "consequence_receipt", "confirmed_effects": confirmed_turn["confirmed_effects"]}
        )
    for relationship_change in confirmed_turn["relationship_changes"]:
        entry_contents_after_investigator.append(
            {"voice": "relationship_pulse", "relationship_pulse": create_relationship_pulse(relationship_change)}
        )
    for presented_interactive_piece in confirmed_turn["presented_interactive_pieces"]:
        entry_contents_after_investigator.append(
            {
                "voice": "interactive_piece_anchor",
                "interactive_piece_identifier": presented_interactive_piece["interactive_piece_identifier"],
            }
        )
    if confirmed_turn["plan_continuation_question"] is not None:
        entry_contents_after_investigator.append(confirmed_turn["plan_continuation_question"])
    log_entries.extend(
        {"world_clock_minutes": world_clock_minutes_after, "content": entry_content}
        for entry_content in entry_contents_after_investigator
    )
    return log_entries


def read_completed_objective_texts(
    working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> list[str]:
    lived_flag_names = set(working_state.lived_experience_flag_names)
    completed_texts: list[str] = []
    for case_objective in resolution_context.case_specification.objectives:
        required_flag_names = case_objective.required_lived_experience_flag_names
        if not required_flag_names:
            continue
        if any(flag_name not in lived_flag_names for flag_name in required_flag_names):
            continue
        if any(flag_name in lived_flag_names for flag_name in case_objective.forbidden_lived_experience_flag_names):
            continue
        visible_text = case_objective.visible_text.strip()
        if visible_text == "" or "_" in visible_text or visible_text in completed_texts:
            continue
        completed_texts.append(visible_text)
    return completed_texts


def compose_resolved_turn(
    turn_identifier: str,
    action_key: str,
    expected_state_version: int,
    investigator_entry: dict[str, Any],
    plan_step_dispositions: list[dict[str, Any]],
    plan_continuation_question: dict[str, Any] | None,
    pending_action_plan: dict[str, Any] | None,
    current_run: dict[str, Any],
    working_state: WorkingCaseState,
    turn_draft: TurnDraft,
    resolution_context: CaseResolutionContext,
) -> dict[str, Any]:
    resulting_state_version = expected_state_version + 1
    append_entropy_signal_if_due(working_state, turn_draft, resolution_context, resulting_state_version)
    archive_outcome = turn_draft.archive_outcome
    if working_state.serious_wound_count >= maximum_serious_wound_count and (
        archive_outcome is None or archive_outcome["kind"] != "chronicle_closed_by_death"
    ):
        archive_outcome = {
            "kind": "chronicle_closed_by_death",
            "death_nature_name": "physical",
            "death_cause_name": "fifth_serious_wound",
            "perceptible_cause_text": working_state.last_serious_wound_cause_text or "",
            "epitaph_rewrite_text": None,
            "intrusive_option_text": None,
        }
    if isinstance(archive_outcome, dict):
        from the_void_files.narrative.orchestration.closure_guard import build_closure_register

        public_state = current_run.get("public_state") if isinstance(current_run.get("public_state"), dict) else {}
        archive_outcome["closure_register"] = build_closure_register(
            public_state,
            working_state.place_name,
            working_state.serious_wound_count,
            working_state.last_serious_wound_cause_text,
            working_state.revealed_facts,
        )
    return {
        "turn_identifier": turn_identifier,
        "action_key": action_key,
        "resulting_state_version": resulting_state_version,
        "witnessed_origin_identifiers": turn_draft.witnessed_origin_identifiers,
        "investigator_entry": investigator_entry,
        "director_entries": enforce_narrative_markup_budget(turn_draft.director_entries),
        "plan_step_dispositions": plan_step_dispositions,
        "plan_continuation_question": (
            None if archive_outcome is not None or pending_action_plan is None else plan_continuation_question
        ),
        "resource_costs": turn_draft.resource_costs,
        "confirmed_effects": compose_confirmed_effects(current_run, working_state, turn_draft),
        "heard_lines": list(turn_draft.heard_lines),
        "threat_lines": list(turn_draft.threat_lines),
        "completed_objective_texts": read_completed_objective_texts(working_state, resolution_context),
        "relationship_changes": turn_draft.relationship_changes,
        "staging_events": turn_draft.staging_events,
        "presented_interactive_pieces": turn_draft.presented_interactive_pieces,
        "interactive_piece_status_changes": turn_draft.interactive_piece_status_changes,
        "granted_lived_experience_flag_names": turn_draft.granted_lived_experience_flag_names,
        "next_scene_presentation": (
            None if archive_outcome is not None else create_scene_presentation(working_state, resolution_context)
        ),
        "archive_outcome": archive_outcome,
    }


def create_single_answer_question(
    question_kind_name: str, plain_paragraphs: list[str], answer_options: list[tuple[str, str]]
) -> dict[str, Any]:
    return {
        "voice": "director_question",
        "question_kind_name": question_kind_name,
        "plain_paragraphs": plain_paragraphs,
        "answer_options": [
            {"identifier": answer_effect_name, "visible_text": visible_text, "answer_effect_name": answer_effect_name}
            for answer_effect_name, visible_text in answer_options
        ],
        "answered_option_identifier": None,
    }


def require_run_still_open(current_run: dict[str, Any]) -> None:
    public_state = current_run["public_state"]
    if public_state["archive_outcome"] is not None or public_state["current_scene_presentation"] is None:
        raise ArchiveRunAlreadyEndedError()


def build_plan_continuation_paragraphs(
    resolution_context: CaseResolutionContext,
    executed_step_count: int,
    skipped_step_count: int,
    pending_step_count: int,
    next_action_text: str,
) -> list[str]:
    plan_continuation_copy = resolution_context.director_copy.plan_continuation
    executed_clause = (
        plan_continuation_copy.executed_clause_for_single_step
        if executed_step_count == 1
        else fill_copy_template(
            plan_continuation_copy.executed_clause_for_several_steps_template, step_count=str(executed_step_count)
        )
    )
    skipped_clause = ""
    if skipped_step_count > 0:
        skipped_clause = (
            plan_continuation_copy.skipped_clause_for_single_step
            if skipped_step_count == 1
            else fill_copy_template(
                plan_continuation_copy.skipped_clause_for_several_steps_template, step_count=str(skipped_step_count)
            )
        )
    pending_clause = (
        plan_continuation_copy.pending_clause_for_single_step
        if pending_step_count == 1
        else fill_copy_template(
            plan_continuation_copy.pending_clause_for_several_steps_template, step_count=str(pending_step_count)
        )
    )
    return [
        fill_copy_template(
            plan_continuation_copy.first_paragraph_template,
            executed_clause=executed_clause,
            skipped_clause=skipped_clause,
            pending_clause=pending_clause,
            next_action_text=next_action_text,
        ),
        plan_continuation_copy.second_paragraph,
    ]


def resolve_investigator_action(
    action_request: InvestigatorActionRequest,
    current_run: dict[str, Any],
    resolution_context: CaseResolutionContext,
    turn_identifier: str,
    director_adjudication: AdjudicationProposal | None = None,
) -> ResolvedTurn:
    require_run_still_open(current_run)
    public_state = current_run["public_state"]
    if action_request.scene_identifier != public_state["current_scene_presentation"]["scene_identifier"]:
        raise SceneIdentifierMismatchedError()
    director_copy = resolution_context.director_copy
    free_text_reader = resolution_context.free_text_reader
    working_state = create_working_case_state(current_run, resolution_context)
    turn_draft = TurnDraft()
    usable_plan_steps = [
        plan_step
        for plan_step in action_request.remaining_plan_steps
        if not is_unusable_plan_step_text(plan_step.action_text)
    ]
    if not usable_plan_steps:
        investigator_entry = {
            "voice": "investigator_entry",
            "attempted_steps": [
                {
                    "step_number": action_request.already_executed_step_count + 1,
                    "action_text": action_request.remaining_plan_steps[0].action_text
                    if action_request.remaining_plan_steps
                    else "",
                    "condition_text": None,
                    "composition_origin_name": "own_words",
                }
            ],
            "declared_plan_step_count": None,
        }
        confirmed_turn = compose_resolved_turn(
            turn_identifier,
            action_request.action_key,
            action_request.expected_state_version,
            investigator_entry,
            [],
            None,
            None,
            current_run,
            working_state,
            turn_draft,
            resolution_context,
        )
        return ResolvedTurn(
            turn_identifier=turn_identifier,
            disposition_name="resolved",
            response_payload={"disposition_name": "resolved", "confirmed_turn": confirmed_turn},
            next_run=build_next_run(current_run, working_state, turn_draft, confirmed_turn, None, None, None, None),
            confirmed_effects=confirmed_turn["confirmed_effects"],
            relationship_changes=confirmed_turn["relationship_changes"],
            log_entries=build_turn_log_entries(
                confirmed_turn, public_state["world_clock_minutes"], working_state.world_clock_minutes
            ),
            archive_outcome=confirmed_turn["archive_outcome"],
        )
    if usable_plan_steps != list(action_request.remaining_plan_steps):
        action_request = action_request.model_copy(update={"remaining_plan_steps": usable_plan_steps})
    scene_branches_by_identifier = {
        action_branch.branch_identifier: action_branch
        for action_branch in read_branches_of_scene(
            resolution_context.case_specification, read_current_scene(working_state, resolution_context)
        )
    }
    suggested_branches_at_declaration = [
        scene_branches_by_identifier[suggested_action["identifier"]]
        for suggested_action in public_state["current_scene_presentation"]["suggested_actions"]
        if suggested_action["identifier"] in scene_branches_by_identifier
    ]
    executable_units = expand_plan_steps_into_units(
        action_request, suggested_branches_at_declaration, working_state, resolution_context
    )

    def create_entry_step(executable_unit: ExecutableUnit, unit_index: int) -> dict[str, Any]:
        entry_step = {
            "step_number": action_request.already_executed_step_count + unit_index + 1,
            "action_text": executable_unit.action_text,
            "condition_text": executable_unit.condition_text,
            "composition_origin_name": executable_unit.composition_origin_name,
        }
        origin_identifier = executable_unit.origin_identifier or executable_unit.branch_identifier
        if origin_identifier is not None:
            entry_step["origin_identifier"] = origin_identifier
        return entry_step

    declared_plan_step_count = max(action_request.declared_plan_step_count, len(executable_units))
    declared_plan_step_count_for_entry = declared_plan_step_count if declared_plan_step_count > 1 else None
    first_unit = executable_units[0]
    if (
        first_unit.branch_identifier is None
        and first_unit.composition_origin_name == "own_words"
        and not action_request.is_player_insisting_after_director_veto
    ):
        question_investigator_entry = {
            "voice": "investigator_entry",
            "attempted_steps": [create_entry_step(first_unit, 0)],
            "declared_plan_step_count": declared_plan_step_count_for_entry,
        }
        is_solving_piece_in_prose = (
            find_prose_solved_interactive_piece_identifier(
                first_unit.action_text,
                action_request.referenced_interactive_piece_identifier,
                working_state,
                resolution_context,
            )
            is not None
        )
        question_entry: dict[str, Any] | None = None
        if not is_solving_piece_in_prose and free_text_reader.is_action_text_without_method(first_unit.action_text):
            question_entry = create_single_answer_question(
                "method_clarification",
                list(director_copy.method_clarification_paragraphs),
                [("return_to_reply_desk", director_copy.describe_method_answer_text)],
            )
        elif (
            director_adjudication is not None
            and director_adjudication.disposition_name == "clarify"
            and director_adjudication.requested_clarification_text
        ):
            question_entry = create_single_answer_question(
                "method_clarification",
                [director_adjudication.requested_clarification_text],
                [("return_to_reply_desk", director_copy.describe_method_answer_text)],
            )
        else:
            mentioned_impossible_object = free_text_reader.find_mention_of_object_never_carried(first_unit.action_text)
            if mentioned_impossible_object is not None:
                question_entry = create_single_answer_question(
                    "illogical_action_veto",
                    [
                        fill_copy_template(paragraph_template, mentioned_object_text=mentioned_impossible_object)
                        for paragraph_template in director_copy.illogical_action_veto_paragraph_templates
                    ],
                    [
                        ("return_to_reply_desk", director_copy.rethink_action_answer_text),
                        ("proceed_with_pending_action", director_copy.insist_on_action_answer_text),
                    ],
                )
        if question_entry is not None:
            return ResolvedTurn(
                turn_identifier=turn_identifier,
                disposition_name="question_asked",
                response_payload={
                    "disposition_name": "question_asked",
                    "investigator_entry": question_investigator_entry,
                    "question_entry": question_entry,
                },
                next_run=None,
                confirmed_effects=[],
                relationship_changes=[],
                log_entries=[
                    {"world_clock_minutes": working_state.world_clock_minutes, "content": question_investigator_entry},
                    {"world_clock_minutes": working_state.world_clock_minutes, "content": question_entry},
                ],
                archive_outcome=None,
            )

    unit_disposition_names = ["pending" for _ in executable_units]
    executed_unit_count = 0
    for unit_index, executable_unit in enumerate(executable_units):
        if (
            executed_unit_count >= maximum_plan_steps_executed_per_director_batch
            or turn_draft.has_scene_changed
            or turn_draft.archive_outcome is not None
            or working_state.serious_wound_count >= maximum_serious_wound_count
        ):
            break
        unit_disposition_names[unit_index] = execute_unit(
            executable_unit,
            action_request,
            working_state,
            turn_draft,
            resolution_context,
            turn_identifier,
            director_adjudication,
        )
        if (
            unit_disposition_names[unit_index] == "executed"
            and executable_unit.origin_identifier
            and executable_unit.origin_identifier not in working_state.witnessed_origin_identifiers
        ):
            working_state.witnessed_origin_identifiers.append(executable_unit.origin_identifier)
            turn_draft.witnessed_origin_identifiers.append(executable_unit.origin_identifier)
        if unit_disposition_names[unit_index] == "executed":
            apply_attribute_pace(executable_unit.action_text, working_state, turn_draft)
        executed_unit_count += 1 if unit_disposition_names[unit_index] == "executed" else 0

    plan_step_dispositions: list[dict[str, Any]] = []
    for plan_step_index, plan_step in enumerate(action_request.remaining_plan_steps):
        disposition_names_of_step = [
            unit_disposition_names[unit_index]
            for unit_index, executable_unit in enumerate(executable_units)
            if executable_unit.plan_step_index == plan_step_index
        ]
        if not disposition_names_of_step or all(
            disposition_name == "pending" for disposition_name in disposition_names_of_step
        ):
            step_disposition_name = "left_pending"
        elif "executed" in disposition_names_of_step:
            step_disposition_name = "executed"
        else:
            skip_names = [
                disposition_name
                for disposition_name in disposition_names_of_step
                if disposition_name != "pending"
            ]
            step_disposition_name = skip_names[0]
        plan_step_dispositions.append(
            {"step_identifier": plan_step.step_identifier, "disposition_name": step_disposition_name}
        )

    is_archive_still_open = (
        turn_draft.archive_outcome is None and working_state.serious_wound_count < maximum_serious_wound_count
    )
    leftover_units_inside_handled_steps = [
        executable_unit
        for unit_index, executable_unit in enumerate(executable_units)
        if unit_disposition_names[unit_index] == "pending"
        and plan_step_dispositions[executable_unit.plan_step_index]["disposition_name"] != "left_pending"
    ]
    if is_archive_still_open and leftover_units_inside_handled_steps:
        if turn_draft.has_scene_changed:
            append_narration_paragraph(turn_draft, director_copy.scene_changed_mid_plan_paragraph)
        append_narration_paragraph(
            turn_draft,
            fill_copy_template(
                director_copy.leftover_steps_paragraph_template,
                leftover_action_texts=director_copy.leftover_action_text_separator.join(
                    fill_copy_template(
                        director_copy.leftover_action_text_quote_template,
                        action_text=sanitize_quoted_player_text(leftover_unit.action_text),
                    )
                    for leftover_unit in leftover_units_inside_handled_steps
                ),
            ),
        )

    pending_plan_steps = [
        plan_step
        for plan_step_index, plan_step in enumerate(action_request.remaining_plan_steps)
        if plan_step_dispositions[plan_step_index]["disposition_name"] == "left_pending"
        and not is_unusable_plan_step_text(plan_step.action_text)
    ]
    handled_step_count = len(action_request.remaining_plan_steps) - len(pending_plan_steps)
    plan_continuation_question = None
    pending_action_plan = None
    if pending_plan_steps:
        plan_continuation_question = create_single_answer_question(
            "plan_continuation",
            build_plan_continuation_paragraphs(
                resolution_context,
                len([step for step in plan_step_dispositions if step["disposition_name"] == "executed"]),
                len(
                    [
                        step
                        for step in plan_step_dispositions
                        if step["disposition_name"] == "skipped_because_condition_was_unmet"
                    ]
                ),
                len(pending_plan_steps),
                sanitize_quoted_player_text(pending_plan_steps[0].action_text),
            ),
            [
                ("continue_pending_plan", director_copy.continue_plan_answer_text),
                ("modify_pending_plan", director_copy.modify_plan_answer_text),
                ("discard_pending_plan", director_copy.discard_plan_answer_text),
            ],
        )
        pending_action_plan = {
            "remaining_steps": [pending_plan_step.model_dump(mode="json") for pending_plan_step in pending_plan_steps],
            "declared_plan_step_count": declared_plan_step_count,
            "already_executed_step_count": action_request.already_executed_step_count + handled_step_count,
        }

    attempted_steps = [
        create_entry_step(executable_unit, unit_index)
        for unit_index, executable_unit in enumerate(executable_units)
        if unit_disposition_names[unit_index] != "pending"
    ]
    investigator_entry = {
        "voice": "investigator_entry",
        "attempted_steps": attempted_steps if attempted_steps else [create_entry_step(executable_units[0], 0)],
        "declared_plan_step_count": declared_plan_step_count_for_entry,
    }
    confirmed_turn = compose_resolved_turn(
        turn_identifier,
        action_request.action_key,
        action_request.expected_state_version,
        investigator_entry,
        plan_step_dispositions,
        plan_continuation_question,
        pending_action_plan,
        current_run,
        working_state,
        turn_draft,
        resolution_context,
    )
    return ResolvedTurn(
        turn_identifier=turn_identifier,
        disposition_name="resolved",
        response_payload={"disposition_name": "resolved", "confirmed_turn": confirmed_turn},
        next_run=build_next_run(
            current_run, working_state, turn_draft, confirmed_turn, pending_action_plan, None, None, None
        ),
        confirmed_effects=confirmed_turn["confirmed_effects"],
        relationship_changes=confirmed_turn["relationship_changes"],
        log_entries=build_turn_log_entries(
            confirmed_turn, public_state["world_clock_minutes"], working_state.world_clock_minutes
        ),
        archive_outcome=confirmed_turn["archive_outcome"],
    )


def require_usable_submitted_value(interactive_piece: CaseInteractivePiece, submitted_value: Any) -> None:
    public_state = interactive_piece.public_definition.public_state
    if public_state.widget_kind_name != submitted_value.widget_kind_name:
        raise SubmittedValueUnusableError()
    if isinstance(public_state, CombinationDialsPublicState) and isinstance(
        submitted_value, CombinationDialsSubmittedValue
    ):
        if len(submitted_value.chosen_symbols) != len(public_state.dials) or any(
            chosen_symbol not in combination_dial.symbols
            for chosen_symbol, combination_dial in zip(submitted_value.chosen_symbols, public_state.dials)
        ):
            raise SubmittedValueUnusableError()
    if isinstance(public_state, OrderedPositionsPublicState) and isinstance(
        submitted_value, OrderedPositionsSubmittedValue
    ):
        if sorted(submitted_value.ordered_piece_identifiers) != sorted(
            ordered_piece.piece_identifier for ordered_piece in public_state.pieces
        ):
            raise SubmittedValueUnusableError()


def find_violated_visible_rule_texts(interactive_piece: CaseInteractivePiece, submitted_value: Any) -> list[str]:
    from the_void_files.narrative.orchestration.pattern_calculus import (
        caesar_wheel_letters,
        pair_rule_is_satisfied,
        piece_identifier_positions,
    )

    private_solution = interactive_piece.private_solution
    public_state = interactive_piece.public_definition.public_state
    violated_rule_texts: list[str] = []
    for rule_check in interactive_piece.private_rule_checks:
        if rule_check.rule_kind_name == "exact_combination":
            is_rule_satisfied = (
                isinstance(private_solution, CombinationDialsSolution)
                and isinstance(submitted_value, CombinationDialsSubmittedValue)
                and list(submitted_value.chosen_symbols) == list(private_solution.chosen_symbols)
            )
        elif rule_check.rule_kind_name == "exact_shift":
            wheel_length = (
                len(caesar_wheel_letters(list(public_state.alphabet_letters)))
                if isinstance(public_state, CipherWheelPublicState)
                else 0
            )
            is_rule_satisfied = (
                isinstance(private_solution, CipherWheelSolution)
                and isinstance(public_state, CipherWheelPublicState)
                and isinstance(submitted_value, CipherWheelSubmittedValue)
                and wheel_length > 0
                and submitted_value.shift_positions % wheel_length == private_solution.shift_positions % wheel_length
            )
        elif not isinstance(submitted_value, OrderedPositionsSubmittedValue):
            is_rule_satisfied = False
        else:
            ordered_piece_identifiers = submitted_value.ordered_piece_identifiers
            positions = piece_identifier_positions(ordered_piece_identifiers, rule_check.piece_identifier)
            if rule_check.rule_kind_name == "piece_at_position":
                is_rule_satisfied = len(positions) == 1 and positions[0] == rule_check.position_index
            else:
                is_rule_satisfied = pair_rule_is_satisfied(
                    rule_check.rule_kind_name,
                    positions,
                    piece_identifier_positions(ordered_piece_identifiers, rule_check.other_piece_identifier),
                )
        if not is_rule_satisfied:
            violated_rule_texts.append(rule_check.visible_rule_text)
    return violated_rule_texts


def describe_submitted_value(
    interactive_piece: CaseInteractivePiece, submitted_value: Any, resolution_context: CaseResolutionContext
) -> str:
    attempt_copy = resolution_context.director_copy.attempt_action_text
    if isinstance(submitted_value, CombinationDialsSubmittedValue):
        return fill_copy_template(
            attempt_copy.combination_dials_template,
            chosen_symbols=attempt_copy.chosen_symbol_separator.join(submitted_value.chosen_symbols),
        )
    if isinstance(submitted_value, CipherWheelSubmittedValue):
        return fill_copy_template(
            (
                attempt_copy.cipher_wheel_single_letter_template
                if submitted_value.shift_positions == 1
                else attempt_copy.cipher_wheel_several_letters_template
            ),
            shift_positions=str(submitted_value.shift_positions),
        )
    public_state = interactive_piece.public_definition.public_state
    visible_name_by_piece_identifier = (
        {ordered_piece.piece_identifier: ordered_piece.visible_name for ordered_piece in public_state.pieces}
        if isinstance(public_state, OrderedPositionsPublicState)
        else {}
    )
    return fill_copy_template(
        attempt_copy.ordered_positions_template,
        ordered_visible_names=attempt_copy.ordered_visible_name_separator.join(
            visible_name_by_piece_identifier.get(piece_identifier, "")
            for piece_identifier in submitted_value.ordered_piece_identifiers
        ),
    )


def read_presented_runtime_state(current_run: dict[str, Any], interactive_piece_identifier: str) -> dict[str, Any]:
    for runtime_state in current_run["public_state"]["interactive_piece_runtime_states"]:
        if runtime_state["interactive_piece_identifier"] == interactive_piece_identifier:
            return runtime_state
    raise InteractivePieceUnknownError()


def resolve_interactive_piece_attempt(
    attempt_request: InteractivePieceAttemptRequest,
    current_run: dict[str, Any],
    resolution_context: CaseResolutionContext,
    turn_identifier: str,
) -> ResolvedTurn:
    require_run_still_open(current_run)
    runtime_state = read_presented_runtime_state(current_run, attempt_request.interactive_piece_identifier)
    interactive_piece = resolution_context.interactive_pieces_by_identifier.get(
        attempt_request.interactive_piece_identifier
    )
    if interactive_piece is None:
        raise InteractivePieceUnknownError()
    if runtime_state["lifecycle_status_name"] not in lifecycle_status_names_open_to_attempts:
        raise InteractivePieceNotOpenToAttemptsError()
    require_usable_submitted_value(interactive_piece, attempt_request.submitted_value)
    director_copy = resolution_context.director_copy
    working_state = create_working_case_state(current_run, resolution_context)
    turn_draft = TurnDraft()
    is_mechanism_within_reach = any(
        solved_outcome.interactive_piece_identifier == attempt_request.interactive_piece_identifier
        for solved_outcome in read_current_scene(working_state, resolution_context).interactive_piece_solved_outcomes
    )
    violated_visible_rule_texts = (
        find_violated_visible_rule_texts(interactive_piece, attempt_request.submitted_value)
        if is_mechanism_within_reach
        else [director_copy.piece_out_of_reach_rule_text]
    )
    from the_void_files.narrative.orchestration.effort import no_effort_remaining_text

    was_accepted = not violated_visible_rule_texts
    counts_as_attempt = True
    if is_mechanism_within_reach and working_state.effort_remaining <= 0:
        was_accepted = False
        counts_as_attempt = False
        append_narration_paragraph(turn_draft, no_effort_remaining_text)
    elif is_mechanism_within_reach:
        working_state.effort_remaining -= 1
        turn_draft.ordered_effects.append(
            {"kind": "effort_spent", "amount": 1, "resulting_effort": working_state.effort_remaining}
        )
        advance_world_clock(working_state, turn_draft, interactive_piece.public_definition.attempt_elapsed_minutes)
    if was_accepted:
        resolve_solved_interactive_piece(
            attempt_request.interactive_piece_identifier, working_state, turn_draft, resolution_context, turn_identifier
        )
    elif is_mechanism_within_reach and counts_as_attempt:
        failed_narrations = interactive_piece.failed_attempt_narration_paragraphs
        append_narration_paragraph(
            turn_draft,
            prepare_scripted_text(
                failed_narrations[len(runtime_state["attempts"]) % len(failed_narrations)],
                working_state,
                resolution_context,
            ),
        )
    elif not is_mechanism_within_reach:
        append_narration_paragraph(turn_draft, director_copy.piece_out_of_reach_paragraph)
    submitted_value_record = attempt_request.submitted_value.model_dump(mode="json")
    investigator_entry = {
        "voice": "investigator_entry",
        "attempted_steps": [
            {
                "step_number": 1,
                "action_text": describe_submitted_value(
                    interactive_piece, attempt_request.submitted_value, resolution_context
                ),
                "condition_text": None,
                "composition_origin_name": "interactive_piece_attempt",
            }
        ],
        "declared_plan_step_count": None,
    }
    confirmed_turn = compose_resolved_turn(
        turn_identifier,
        attempt_request.action_key,
        attempt_request.expected_state_version,
        investigator_entry,
        [],
        None,
        None,
        current_run,
        working_state,
        turn_draft,
        resolution_context,
    )
    attempt_record = {
        "attempt_identifier": f"interactive_piece_attempt_{turn_identifier}",
        "turn_identifier": turn_identifier,
        "submitted_value": submitted_value_record,
        "was_accepted": was_accepted,
        "violated_visible_rule_texts": violated_visible_rule_texts,
    }
    if not counts_as_attempt:
        attempt_record["counts_as_attempt"] = False
    return ResolvedTurn(
        turn_identifier=turn_identifier,
        disposition_name="resolved",
        response_payload={
            "interactive_piece_identifier": attempt_request.interactive_piece_identifier,
            "attempt_record": attempt_record,
            "confirmed_turn": confirmed_turn,
        },
        next_run=build_next_run(
            current_run,
            working_state,
            turn_draft,
            confirmed_turn,
            current_run["public_state"]["pending_action_plan"],
            attempt_record if counts_as_attempt else None,
            attempt_request.interactive_piece_identifier if counts_as_attempt else None,
            submitted_value_record if counts_as_attempt else None,
        ),
        confirmed_effects=confirmed_turn["confirmed_effects"],
        relationship_changes=confirmed_turn["relationship_changes"],
        log_entries=build_turn_log_entries(
            confirmed_turn, current_run["public_state"]["world_clock_minutes"], working_state.world_clock_minutes
        ),
        archive_outcome=confirmed_turn["archive_outcome"],
    )


def resolve_interactive_piece_assistance(
    assistance_request: InteractivePieceAssistanceRequest,
    current_run: dict[str, Any],
    resolution_context: CaseResolutionContext,
    turn_identifier: str,
    state_version: int,
) -> ResolvedTurn:
    require_run_still_open(current_run)
    runtime_state = read_presented_runtime_state(current_run, assistance_request.interactive_piece_identifier)
    interactive_piece = resolution_context.interactive_pieces_by_identifier.get(
        assistance_request.interactive_piece_identifier
    )
    if interactive_piece is None:
        raise InteractivePieceUnknownError()
    if runtime_state["lifecycle_status_name"] not in lifecycle_status_names_open_to_attempts:
        raise InteractivePieceNotOpenToAttemptsError()
    public_hint_text = next(
        (
            assistance_text.public_hint_text
            for assistance_text in interactive_piece.assistance_texts
            if assistance_text.level_name == assistance_request.requested_level_name
        ),
        None,
    )
    if public_hint_text is None:
        raise AssistanceLevelUnavailableError()
    working_state = create_working_case_state(current_run, resolution_context)
    assistance_record = {
        "level_name": assistance_request.requested_level_name,
        "public_hint_text": prepare_scripted_text(public_hint_text, working_state, resolution_context),
    }
    was_already_given = any(
        given_assistance["level_name"] == assistance_request.requested_level_name
        for given_assistance in runtime_state["assistance_given"]
    )
    next_run = copy.deepcopy(current_run)
    if not was_already_given:
        for next_runtime_state in next_run["public_state"]["interactive_piece_runtime_states"]:
            if next_runtime_state["interactive_piece_identifier"] == assistance_request.interactive_piece_identifier:
                next_runtime_state["assistance_given"].append(assistance_record)
    return ResolvedTurn(
        turn_identifier=turn_identifier,
        disposition_name="assistance_given",
        response_payload={
            "interactive_piece_identifier": assistance_request.interactive_piece_identifier,
            "assistance_record": assistance_record,
            "was_already_given": was_already_given,
            "state_version": state_version,
        },
        next_run=next_run,
        confirmed_effects=[],
        relationship_changes=[],
        log_entries=[],
        archive_outcome=None,
    )
