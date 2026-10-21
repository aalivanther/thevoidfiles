from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError

from the_void_files.application.use_cases.case_start_specification_models import (
    BranchCondition,
    CaseActionBranch,
    CaseBranchOutcome,
    CaseInteractivePiece,
    CaseSceneDefinition,
    CaseSpecification,
    CipherWheelPublicState,
    CipherWheelSolution,
    CombinationDialsPublicState,
    CombinationDialsSolution,
    OrderedPositionsPublicState,
    OrderedPositionsSolution,
    ScriptedDialogueEntry,
)

maximum_reported_validation_error_count = 40
required_assistance_level_names = ("gentle", "medium", "direct")


class CaseValidationError(BaseModel):
    error_name: str
    location_text: str
    detail_text: str


@dataclass(frozen=True)
class CaseReview:
    accepted_specification: CaseSpecification | None
    validation_errors: list[CaseValidationError]

    @property
    def is_accepted(self) -> bool:
        return self.accepted_specification is not None


@dataclass(frozen=True)
class LocatedOutcome:
    location_text: str
    scene_identifier: str | None
    outcome: CaseBranchOutcome


@dataclass(frozen=True)
class LocatedCondition:
    location_text: str
    condition: BranchCondition


def read_branches_of_scene(
    case_specification: CaseSpecification, scene_definition: CaseSceneDefinition
) -> list[CaseActionBranch]:
    return list(scene_definition.action_branches) + [
        shared_action_branch.action_branch
        for shared_action_branch in case_specification.shared_action_branches
        if scene_definition.scene_identifier not in shared_action_branch.excluded_scene_identifiers
    ]


def iterate_branch_outcomes(
    action_branch: CaseActionBranch, branch_location_text: str, scene_identifier: str | None
) -> Iterator[LocatedOutcome]:
    yield LocatedOutcome(f"{branch_location_text}.default_outcome", scene_identifier, action_branch.default_outcome)
    if action_branch.repeated_outcome is not None:
        yield LocatedOutcome(f"{branch_location_text}.repeated_outcome", scene_identifier, action_branch.repeated_outcome)
    for outcome_index, conditional_outcome in enumerate(action_branch.conditional_outcomes):
        yield LocatedOutcome(
            f"{branch_location_text}.conditional_outcomes.{outcome_index}.outcome",
            scene_identifier,
            conditional_outcome.outcome,
        )


def iterate_scene_outcomes(
    case_specification: CaseSpecification, scene_definition: CaseSceneDefinition
) -> Iterator[LocatedOutcome]:
    scene_location_text = f"scenes.{scene_definition.scene_identifier}"
    for action_branch in read_branches_of_scene(case_specification, scene_definition):
        yield from iterate_branch_outcomes(
            action_branch,
            f"{scene_location_text}.action_branches.{action_branch.branch_identifier}",
            scene_definition.scene_identifier,
        )
    yield LocatedOutcome(
        f"{scene_location_text}.free_text_fallback_outcome",
        scene_definition.scene_identifier,
        scene_definition.free_text_fallback_outcome,
    )
    for solved_outcome in scene_definition.interactive_piece_solved_outcomes:
        yield LocatedOutcome(
            f"{scene_location_text}.interactive_piece_solved_outcomes.{solved_outcome.interactive_piece_identifier}",
            scene_definition.scene_identifier,
            solved_outcome.outcome,
        )


def iterate_all_outcomes(case_specification: CaseSpecification) -> Iterator[LocatedOutcome]:
    for scene_definition in case_specification.scenes:
        yield from iterate_scene_outcomes(case_specification, scene_definition)


def iterate_all_conditions(case_specification: CaseSpecification) -> Iterator[LocatedCondition]:
    for scene_definition in case_specification.scenes:
        scene_location_text = f"scenes.{scene_definition.scene_identifier}"
        for present_person in scene_definition.present_persons:
            if present_person.presence_condition is not None:
                yield LocatedCondition(
                    f"{scene_location_text}.present_persons.{present_person.person_identifier}.presence_condition",
                    present_person.presence_condition,
                )
        for action_branch in read_branches_of_scene(case_specification, scene_definition):
            branch_location_text = f"{scene_location_text}.action_branches.{action_branch.branch_identifier}"
            if action_branch.visibility_condition is not None:
                yield LocatedCondition(f"{branch_location_text}.visibility_condition", action_branch.visibility_condition)
            for outcome_index, conditional_outcome in enumerate(action_branch.conditional_outcomes):
                yield LocatedCondition(
                    f"{branch_location_text}.conditional_outcomes.{outcome_index}.condition",
                    conditional_outcome.condition,
                )


def find_duplicated_values(candidate_values: list[str]) -> list[str]:
    seen_values: set[str] = set()
    duplicated_values: list[str] = []
    for candidate_value in candidate_values:
        if candidate_value in seen_values and candidate_value not in duplicated_values:
            duplicated_values.append(candidate_value)
        seen_values.add(candidate_value)
    return duplicated_values


def find_unsatisfied_rule_texts(interactive_piece: CaseInteractivePiece) -> list[str]:
    private_solution = interactive_piece.private_solution
    if not isinstance(private_solution, OrderedPositionsSolution):
        return []
    from the_void_files.narrative.orchestration.pattern_calculus import pair_rule_is_satisfied, piece_identifier_positions

    ordered_piece_identifiers = private_solution.ordered_piece_identifiers
    unsatisfied_rule_texts: list[str] = []
    for rule_check in interactive_piece.private_rule_checks:
        if rule_check.rule_kind_name in ("exact_combination", "exact_shift"):
            continue
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
            unsatisfied_rule_texts.append(rule_check.visible_rule_text)
    return unsatisfied_rule_texts


def review_interactive_piece(interactive_piece: CaseInteractivePiece) -> list[CaseValidationError]:
    piece_identifier = interactive_piece.public_definition.interactive_piece_identifier
    piece_location_text = f"interactive_pieces.{piece_identifier}"
    public_state = interactive_piece.public_definition.public_state
    private_solution = interactive_piece.private_solution
    validation_errors: list[CaseValidationError] = []

    def report(error_name: str, detail_text: str) -> None:
        validation_errors.append(
            CaseValidationError(error_name=error_name, location_text=piece_location_text, detail_text=detail_text)
        )

    if public_state.widget_kind_name != private_solution.widget_kind_name:
        report("interactive_piece_solution_kind_mismatch", private_solution.widget_kind_name)
        return validation_errors
    if isinstance(public_state, CombinationDialsPublicState) and isinstance(private_solution, CombinationDialsSolution):
        if len(private_solution.chosen_symbols) != len(public_state.dials):
            report("interactive_piece_solution_length_mismatch", str(len(private_solution.chosen_symbols)))
        else:
            for dial, chosen_symbol in zip(public_state.dials, private_solution.chosen_symbols):
                if chosen_symbol not in dial.symbols:
                    report("interactive_piece_solution_symbol_unavailable", dial.dial_identifier)
    if isinstance(public_state, CipherWheelPublicState) and isinstance(private_solution, CipherWheelSolution):
        from the_void_files.narrative.orchestration.pattern_calculus import caesar_wheel_letters

        if not 0 < private_solution.shift_positions < len(caesar_wheel_letters(list(public_state.alphabet_letters))):
            report("interactive_piece_solution_shift_out_of_range", str(private_solution.shift_positions))
    if isinstance(public_state, OrderedPositionsPublicState) and isinstance(private_solution, OrderedPositionsSolution):
        public_piece_identifiers = sorted(piece.piece_identifier for piece in public_state.pieces)
        if sorted(private_solution.ordered_piece_identifiers) != public_piece_identifiers:
            report("interactive_piece_solution_is_not_a_permutation", ",".join(private_solution.ordered_piece_identifiers))
        if sorted(public_state.initial_order_piece_identifiers) != public_piece_identifiers:
            report("interactive_piece_initial_order_is_not_a_permutation", ",".join(public_state.initial_order_piece_identifiers))
        if len(public_state.position_labels) != len(public_state.pieces):
            report("interactive_piece_position_label_count_mismatch", str(len(public_state.position_labels)))
        if private_solution.ordered_piece_identifiers == public_state.initial_order_piece_identifiers:
            report("interactive_piece_starts_already_solved", piece_identifier)
    for unsatisfied_rule_text in find_unsatisfied_rule_texts(interactive_piece):
        report("interactive_piece_solution_breaks_visible_rule", unsatisfied_rule_text)
    for rule_check in interactive_piece.private_rule_checks:
        if rule_check.visible_rule_text not in interactive_piece.public_definition.visible_rule_texts:
            report("interactive_piece_rule_check_without_visible_rule", rule_check.visible_rule_text)
    offered_level_names = sorted(assistance_text.level_name for assistance_text in interactive_piece.assistance_texts)
    if offered_level_names != sorted(required_assistance_level_names):
        report("interactive_piece_assistance_levels_incomplete", ",".join(offered_level_names))
    return validation_errors


def find_reachable_scene_identifiers(case_specification: CaseSpecification) -> set[str]:
    scenes_by_identifier = {
        scene_definition.scene_identifier: scene_definition for scene_definition in case_specification.scenes
    }
    pending_scene_identifiers = [case_specification.initial_state.first_scene_identifier]
    reachable_scene_identifiers: set[str] = set()
    while pending_scene_identifiers:
        scene_identifier = pending_scene_identifiers.pop()
        scene_definition = scenes_by_identifier.get(scene_identifier)
        if scene_definition is None or scene_identifier in reachable_scene_identifiers:
            continue
        reachable_scene_identifiers.add(scene_identifier)
        for located_outcome in iterate_scene_outcomes(case_specification, scene_definition):
            if located_outcome.outcome.next_scene_identifier is not None:
                pending_scene_identifiers.append(located_outcome.outcome.next_scene_identifier)
    return reachable_scene_identifiers


def review_references(case_specification: CaseSpecification, chosen_whisper_identifier: str) -> list[CaseValidationError]:
    validation_errors: list[CaseValidationError] = []

    def report(error_name: str, location_text: str, detail_text: str) -> None:
        validation_errors.append(
            CaseValidationError(error_name=error_name, location_text=location_text, detail_text=detail_text)
        )

    if case_specification.whisper_identifier != chosen_whisper_identifier:
        report("whisper_identifier_mismatch", "whisper_identifier", case_specification.whisper_identifier)

    scene_identifiers = [scene_definition.scene_identifier for scene_definition in case_specification.scenes]
    person_identifiers = [person_definition.person_identifier for person_definition in case_specification.persons]
    piece_identifiers = [
        interactive_piece.public_definition.interactive_piece_identifier
        for interactive_piece in case_specification.interactive_pieces
    ]
    ending_identifiers = [ending_definition.ending_identifier for ending_definition in case_specification.endings]
    belonging_identifiers = [belonging_definition.identifier for belonging_definition in case_specification.belongings]
    branch_identifiers = [
        action_branch.branch_identifier
        for scene_definition in case_specification.scenes
        for action_branch in scene_definition.action_branches
    ] + [shared_action_branch.action_branch.branch_identifier for shared_action_branch in case_specification.shared_action_branches]
    for collection_name, collected_identifiers in (
        ("scenes", scene_identifiers),
        ("persons", person_identifiers),
        ("interactive_pieces", piece_identifiers),
        ("endings", ending_identifiers),
        ("belongings", belonging_identifiers),
        ("action_branches", branch_identifiers),
        ("objectives", [case_objective.objective_identifier for case_objective in case_specification.objectives]),
    ):
        for duplicated_identifier in find_duplicated_values(collected_identifiers):
            report("identifier_duplicated", collection_name, duplicated_identifier)

    if case_specification.initial_state.first_scene_identifier not in scene_identifiers:
        report(
            "scene_reference_unknown",
            "initial_state.first_scene_identifier",
            case_specification.initial_state.first_scene_identifier,
        )
    for issued_belonging in case_specification.initial_state.issued_belonging_units:
        if issued_belonging.belonging_identifier not in belonging_identifiers:
            report("belonging_reference_unknown", "initial_state.issued_belonging_units", issued_belonging.belonging_identifier)
    for person_definition in case_specification.persons:
        if person_definition.is_relationship_established_at_opening and not person_definition.opening_relationship_cause_text:
            report("opening_relationship_cause_missing", f"persons.{person_definition.person_identifier}", "")

    located_outcomes = list(iterate_all_outcomes(case_specification))
    for shared_action_branch in case_specification.shared_action_branches:
        for excluded_scene_identifier in shared_action_branch.excluded_scene_identifiers:
            if excluded_scene_identifier not in scene_identifiers:
                report(
                    "scene_reference_unknown",
                    f"shared_action_branches.{shared_action_branch.action_branch.branch_identifier}",
                    excluded_scene_identifier,
                )

    if not case_specification.clocks.entropy_signals:
        report("entropy_signal_missing", "clocks.entropy_signals", "")
    granted_flag_names: set[str] = {
        entropy_signal.signal_flag_name for entropy_signal in case_specification.clocks.entropy_signals
    }
    gained_condition_identifiers: set[str] = set()
    presented_piece_identifiers: set[str] = set()
    referenced_ending_identifiers: set[str] = set()
    for located_outcome in located_outcomes:
        granted_flag_names.update(located_outcome.outcome.granted_lived_experience_flag_names)
        gained_condition_identifiers.update(
            gained_condition.condition_identifier for gained_condition in located_outcome.outcome.conditions_gained
        )
        presented_piece_identifiers.update(located_outcome.outcome.presented_interactive_piece_identifiers)

    for located_outcome in located_outcomes:
        outcome = located_outcome.outcome
        location_text = located_outcome.location_text
        referenced_person_identifiers = (
            [
                director_entry.speaker_person_identifier
                for director_entry in outcome.director_entries
                if isinstance(director_entry, ScriptedDialogueEntry)
            ]
            + list(outcome.person_identifiers_becoming_known)
            + [relationship_change.person_identifier for relationship_change in outcome.relationship_changes]
        )
        for referenced_person_identifier in referenced_person_identifiers:
            if referenced_person_identifier not in person_identifiers:
                report("person_reference_unknown", location_text, referenced_person_identifier)
        if outcome.next_scene_identifier is not None and outcome.next_scene_identifier not in scene_identifiers:
            report("scene_reference_unknown", location_text, outcome.next_scene_identifier)
        if outcome.next_scene_identifier is not None and outcome.elapsed_minutes < 1:
            report("travel_time_missing", location_text, outcome.next_scene_identifier)
        if outcome.archive_ending_identifier is not None:
            referenced_ending_identifiers.add(outcome.archive_ending_identifier)
            if (
                outcome.archive_ending_identifier not in ending_identifiers
                and outcome.archive_ending_identifier != case_specification.ending_selection.selection_request_identifier
            ):
                report("ending_reference_unknown", location_text, outcome.archive_ending_identifier)
        for referenced_piece_identifier in list(outcome.presented_interactive_piece_identifiers) + [
            status_change.interactive_piece_identifier for status_change in outcome.interactive_piece_status_changes
        ]:
            if referenced_piece_identifier not in piece_identifiers:
                report("interactive_piece_reference_unknown", location_text, referenced_piece_identifier)
        for ended_condition_identifier in outcome.condition_identifiers_ended:
            if ended_condition_identifier not in gained_condition_identifiers:
                report("condition_reference_unknown", location_text, ended_condition_identifier)
        for staging_event in outcome.staging_events:
            if staging_event.anchor_entry_index >= len(outcome.director_entries):
                report("staging_anchor_out_of_range", location_text, str(staging_event.anchor_entry_index))
            elif staging_event.anchor_paragraph_index >= len(
                outcome.director_entries[staging_event.anchor_entry_index].marked_paragraphs
            ):
                report("staging_anchor_out_of_range", location_text, str(staging_event.anchor_paragraph_index))

    for scene_definition in case_specification.scenes:
        scene_location_text = f"scenes.{scene_definition.scene_identifier}"
        for present_person in scene_definition.present_persons:
            if present_person.person_identifier not in person_identifiers:
                report("person_reference_unknown", f"{scene_location_text}.present_persons", present_person.person_identifier)
        for arrival_entry in scene_definition.arrival_entries:
            if isinstance(arrival_entry, ScriptedDialogueEntry) and arrival_entry.speaker_person_identifier not in person_identifiers:
                report("person_reference_unknown", f"{scene_location_text}.arrival_entries", arrival_entry.speaker_person_identifier)
        for solved_outcome in scene_definition.interactive_piece_solved_outcomes:
            if solved_outcome.interactive_piece_identifier not in piece_identifiers:
                report(
                    "interactive_piece_reference_unknown",
                    f"{scene_location_text}.interactive_piece_solved_outcomes",
                    solved_outcome.interactive_piece_identifier,
                )
        for action_branch in scene_definition.action_branches:
            resource_cost = action_branch.resource_cost
            if (
                resource_cost is not None
                and resource_cost.kind == "belonging"
                and resource_cost.belonging_identifier not in belonging_identifiers
            ):
                report(
                    "belonging_reference_unknown",
                    f"{scene_location_text}.action_branches.{action_branch.branch_identifier}",
                    resource_cost.belonging_identifier,
                )

    for located_condition in iterate_all_conditions(case_specification):
        condition = located_condition.condition
        for required_flag_name in condition.required_lived_experience_flag_names:
            if required_flag_name not in granted_flag_names:
                report("required_flag_is_never_granted", located_condition.location_text, required_flag_name)
        for required_piece_status in condition.required_interactive_piece_statuses:
            if required_piece_status.interactive_piece_identifier not in piece_identifiers:
                report(
                    "interactive_piece_reference_unknown",
                    located_condition.location_text,
                    required_piece_status.interactive_piece_identifier,
                )
        for minimum_relationship_level in condition.minimum_relationship_levels:
            if minimum_relationship_level.person_identifier not in person_identifiers:
                report("person_reference_unknown", located_condition.location_text, minimum_relationship_level.person_identifier)
        for required_condition_identifier in condition.required_active_condition_identifiers:
            if required_condition_identifier not in gained_condition_identifiers:
                report("condition_reference_unknown", located_condition.location_text, required_condition_identifier)

    for case_objective in case_specification.objectives:
        for required_flag_name in case_objective.required_lived_experience_flag_names:
            if required_flag_name not in granted_flag_names:
                report("required_flag_is_never_granted", f"objectives.{case_objective.objective_identifier}", required_flag_name)

    solved_piece_identifiers = {
        solved_outcome.interactive_piece_identifier
        for scene_definition in case_specification.scenes
        for solved_outcome in scene_definition.interactive_piece_solved_outcomes
    }
    listed_capability_texts = {
        capability_text.strip() for capability_text in case_specification.private_truth.threat.capability_texts
    }
    for capability_index, capability_text in enumerate(case_specification.private_truth.threat.capability_texts):
        if len(capability_text.strip()) < 12:
            report("threat_capability_too_thin", f"private_truth.threat.capability_texts.{capability_index}", "")
    seen_outcome_ids: set[int] = set()
    for located_outcome in iterate_all_outcomes(case_specification):
        outcome_identity = id(located_outcome.outcome)
        if outcome_identity in seen_outcome_ids:
            continue
        seen_outcome_ids.add(outcome_identity)
        named_capability_text = located_outcome.outcome.threat_capability_text
        named_capability = named_capability_text.strip() if isinstance(named_capability_text, str) else ""
        harm_needs_a_capability = (
            isinstance(located_outcome.outcome.serious_wound_cause_text, str)
            and located_outcome.outcome.serious_wound_cause_text.strip() != ""
        ) or any(
            staging_event.kind in ("mental_attack", "attack_received")
            for staging_event in located_outcome.outcome.staging_events
        )
        if named_capability != "" and named_capability not in listed_capability_texts:
            report("threat_capability_unknown", located_outcome.location_text, "")
        elif harm_needs_a_capability and named_capability == "":
            report("threat_capability_missing", located_outcome.location_text, "")
        for extra_capability_text in located_outcome.outcome.threat_capability_texts:
            if extra_capability_text.strip() not in listed_capability_texts:
                report("threat_capability_unknown", located_outcome.location_text, "")
                break
    opening_scene = next(
        (
            scene_definition
            for scene_definition in case_specification.scenes
            if scene_definition.scene_identifier == case_specification.initial_state.first_scene_identifier
        ),
        None,
    )
    if opening_scene is not None and not 5 <= len(opening_scene.action_branches) <= 12:
        report(
            "opening_branch_count_out_of_range",
            f"scenes.{opening_scene.scene_identifier}",
            str(len(opening_scene.action_branches)),
        )
    has_a_gained_condition = False
    has_a_flag_gated_branch = False
    for scene_definition in case_specification.scenes:
        for located_outcome in iterate_scene_outcomes(case_specification, scene_definition):
            if located_outcome.outcome.conditions_gained:
                has_a_gained_condition = True
        for action_branch in scene_definition.action_branches:
            visibility_condition = action_branch.visibility_condition
            if visibility_condition is not None and visibility_condition.required_lived_experience_flag_names:
                has_a_flag_gated_branch = True
        fallback_outcome = scene_definition.free_text_fallback_outcome
        narration_paragraphs = [
            marked_paragraph.strip()
            for director_entry in fallback_outcome.director_entries
            if director_entry.voice == "director_narration"
            for marked_paragraph in director_entry.marked_paragraphs
            if marked_paragraph.strip() != ""
        ]
        if (
            fallback_outcome.elapsed_minutes < 1
            or not narration_paragraphs
            or max(len(narration_paragraph) for narration_paragraph in narration_paragraphs) < 40
        ):
            report("free_text_fallback_is_a_dead_end", f"scenes.{scene_definition.scene_identifier}", "")
    if not has_a_gained_condition:
        report("condition_gain_missing", "scenes", "")
    if not has_a_flag_gated_branch:
        report("flag_gated_branch_missing", "scenes", "")
    for scene_definition in case_specification.scenes:
        has_timed_exit = False
        has_ending = False
        for located_outcome in iterate_scene_outcomes(case_specification, scene_definition):
            if (
                located_outcome.outcome.next_scene_identifier is not None
                and located_outcome.outcome.elapsed_minutes >= 1
            ):
                has_timed_exit = True
            if located_outcome.outcome.archive_ending_identifier is not None:
                has_ending = True
        if not has_timed_exit and not has_ending:
            report("scene_exit_missing", f"scenes.{scene_definition.scene_identifier}", scene_definition.scene_identifier)
    for interactive_piece in case_specification.interactive_pieces:
        piece_identifier = interactive_piece.public_definition.interactive_piece_identifier
        if interactive_piece.public_definition.attempt_elapsed_minutes < 1:
            report("piece_attempt_time_missing", f"interactive_pieces.{piece_identifier}", piece_identifier)
        if piece_identifier not in presented_piece_identifiers:
            report("interactive_piece_is_never_presented", f"interactive_pieces.{piece_identifier}", piece_identifier)
        if piece_identifier not in solved_piece_identifiers:
            report("interactive_piece_has_no_solved_outcome", f"interactive_pieces.{piece_identifier}", piece_identifier)
        validation_errors.extend(review_interactive_piece(interactive_piece))

    ending_selection = case_specification.ending_selection
    for selected_ending_identifier in [selection_rule.ending_identifier for selection_rule in ending_selection.rules] + [
        ending_selection.default_ending_identifier
    ]:
        if selected_ending_identifier not in ending_identifiers:
            report("ending_reference_unknown", "ending_selection", selected_ending_identifier)
    for selection_rule in ending_selection.rules:
        if selection_rule.required_lived_experience_flag_name not in granted_flag_names:
            report("required_flag_is_never_granted", "ending_selection", selection_rule.required_lived_experience_flag_name)
    for resolution_flag_name in case_specification.resolution_flag_names:
        if resolution_flag_name not in granted_flag_names:
            report("required_flag_is_never_granted", "resolution_flag_names", resolution_flag_name)
    if ending_selection.selection_request_identifier in ending_identifiers:
        report("identifier_duplicated", "ending_selection", ending_selection.selection_request_identifier)
    surviving_ending_identifiers = {
        ending_definition.ending_identifier
        for ending_definition in case_specification.endings
        if ending_definition.death_outcome is None
    }
    can_archive_end_alive = bool(surviving_ending_identifiers & referenced_ending_identifiers) or (
        ending_selection.selection_request_identifier in referenced_ending_identifiers
        and ending_selection.default_ending_identifier in surviving_ending_identifiers
    )
    if not can_archive_end_alive:
        report("no_surviving_ending_is_reachable", "endings", "")

    reachable_scene_identifiers = find_reachable_scene_identifiers(case_specification)
    for scene_identifier in scene_identifiers:
        if scene_identifier not in reachable_scene_identifiers:
            report("scene_is_unreachable", f"scenes.{scene_identifier}", scene_identifier)
    return validation_errors


def review_case_specification_proposal(proposed_specification: Any, chosen_whisper_identifier: str) -> CaseReview:
    if not isinstance(proposed_specification, dict):
        return CaseReview(
            accepted_specification=None,
            validation_errors=[
                CaseValidationError(
                    error_name="case_specification_missing",
                    location_text="structured_response.case_specification",
                    detail_text=type(proposed_specification).__name__,
                )
            ],
        )
    try:
        case_specification = CaseSpecification.model_validate(proposed_specification)
    except ValidationError as structure_error:
        return CaseReview(
            accepted_specification=None,
            validation_errors=[
                CaseValidationError(
                    error_name="structure_invalid",
                    location_text=".".join(str(location_part) for location_part in error_details["loc"]),
                    detail_text=error_details["type"],
                )
                for error_details in structure_error.errors(include_input=False, include_url=False)[
                    :maximum_reported_validation_error_count
                ]
            ],
        )
    validation_errors = review_references(case_specification, chosen_whisper_identifier)
    if validation_errors:
        return CaseReview(
            accepted_specification=None,
            validation_errors=validation_errors[:maximum_reported_validation_error_count],
        )
    return CaseReview(accepted_specification=case_specification, validation_errors=[])
