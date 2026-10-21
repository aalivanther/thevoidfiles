import copy
import re
from typing import Any

from the_void_files.application.generated_markup_text import decode_generated_markup_in_value
from the_void_files.narrative.case_generator import canonical_belonging_identifiers
from the_void_files.narrative.orchestration.pattern_calculus import (
    repair_private_solution,
    spread_colliding_signal_versions,
)

identifier_disallowed_character_pattern = re.compile(r"[^a-z0-9]+")
repeated_underscore_pattern = re.compile(r"_+")
maximum_identifier_character_count = 96
fallback_identifier_text = "unnamed"
canonical_belonging_identifier_set = frozenset(canonical_belonging_identifiers)
canonical_belonging_alias_by_normalized_name = {
    "linterna_de_mano": "hand_lantern",
    "linterna": "hand_lantern",
    "bengala": "signal_flare",
    "bengala_de_senal": "signal_flare",
    "bolsa_de_pruebas": "sealed_evidence_bag",
    "bolsa_de_evidencia": "sealed_evidence_bag",
}

identifier_scalar_key_names = frozenset(
    {
        "whisper_identifier",
        "case_archetype_identifier",
        "damage_model_identifier",
        "scene_identifier",
        "next_scene_identifier",
        "person_identifier",
        "speaker_person_identifier",
        "belonging_identifier",
        "interactive_piece_identifier",
        "objective_identifier",
        "ending_identifier",
        "archive_ending_identifier",
        "branch_identifier",
        "condition_identifier",
        "piece_identifier",
        "other_piece_identifier",
        "dial_identifier",
        "selection_request_identifier",
        "symbol_name",
    }
)
identifier_list_key_names = frozenset(
    {
        "required_lived_experience_flag_names",
        "forbidden_lived_experience_flag_names",
        "granted_lived_experience_flag_names",
        "resolution_flag_names",
        "excluded_scene_identifiers",
        "person_identifiers_becoming_known",
        "presented_interactive_piece_identifiers",
        "condition_identifiers_ended",
        "additional_witnessed_origin_identifiers",
        "ordered_piece_identifiers",
        "initial_order_piece_identifiers",
        "required_active_condition_identifiers",
    }
)


def normalize_identifier_text(raw_text: str) -> str:
    lowered_text = raw_text.strip().lower()
    underscored_text = identifier_disallowed_character_pattern.sub("_", lowered_text)
    collapsed_text = repeated_underscore_pattern.sub("_", underscored_text).strip("_")
    if collapsed_text == "":
        return fallback_identifier_text
    return collapsed_text[:maximum_identifier_character_count]


def normalize_identifier_fields_in_value(value: Any) -> Any:
    if isinstance(value, list):
        return [normalize_identifier_fields_in_value(item) for item in value]
    if not isinstance(value, dict):
        return value
    normalized_mapping: dict[str, Any] = {}
    for field_name, field_value in value.items():
        if field_name in identifier_scalar_key_names and isinstance(field_value, str):
            normalized_mapping[field_name] = normalize_identifier_text(field_value)
            continue
        if field_name in identifier_list_key_names and isinstance(field_value, list):
            normalized_mapping[field_name] = [
                normalize_identifier_text(item) if isinstance(item, str) else item for item in field_value
            ]
            continue
        if field_name == "issued_belonging_units" and isinstance(field_value, list):
            normalized_mapping[field_name] = [
                replace_unknown_belonging_identifier(normalize_identifier_fields_in_value(issued_belonging))
                if isinstance(issued_belonging, dict)
                else issued_belonging
                for issued_belonging in field_value
            ]
            continue
        normalized_mapping[field_name] = normalize_identifier_fields_in_value(field_value)
    return normalized_mapping


def replace_unknown_belonging_identifier(issued_belonging: dict[str, Any]) -> dict[str, Any]:
    belonging_identifier = issued_belonging.get("belonging_identifier")
    if not isinstance(belonging_identifier, str):
        return issued_belonging
    if belonging_identifier in canonical_belonging_identifier_set:
        return issued_belonging
    normalized_belonging_identifier = belonging_identifier.replace("-", "_")
    if normalized_belonging_identifier in canonical_belonging_identifier_set:
        replaced_belonging = dict(issued_belonging)
        replaced_belonging["belonging_identifier"] = normalized_belonging_identifier
        return replaced_belonging
    aliased_belonging_identifier = canonical_belonging_alias_by_normalized_name.get(normalized_belonging_identifier)
    if aliased_belonging_identifier is None:
        return issued_belonging
    replaced_belonging = dict(issued_belonging)
    replaced_belonging["belonging_identifier"] = aliased_belonging_identifier
    return replaced_belonging


def align_interactive_piece_private_rule_checks(interactive_piece: dict[str, Any]) -> dict[str, Any]:
    public_definition = interactive_piece.get("public_definition")
    visible_rule_texts = (
        public_definition.get("visible_rule_texts") if isinstance(public_definition, dict) else None
    )
    if not isinstance(visible_rule_texts, list):
        visible_rule_texts = []
    visible_rule_text_set = {rule_text for rule_text in visible_rule_texts if isinstance(rule_text, str)}
    private_rule_checks = interactive_piece.get("private_rule_checks")
    if not isinstance(private_rule_checks, list):
        return interactive_piece
    aligned_rule_checks: list[Any] = []
    for rule_check in private_rule_checks:
        if not isinstance(rule_check, dict):
            continue
        visible_rule_text = rule_check.get("visible_rule_text")
        if visible_rule_text in visible_rule_text_set:
            aligned_rule_checks.append(rule_check)
    aligned_piece = dict(interactive_piece)
    aligned_piece["private_rule_checks"] = aligned_rule_checks
    return aligned_piece


def read_interactive_piece_identifier(interactive_piece: dict[str, Any]) -> str | None:
    public_definition = interactive_piece.get("public_definition")
    if not isinstance(public_definition, dict):
        return None
    piece_identifier = public_definition.get("interactive_piece_identifier")
    return piece_identifier if isinstance(piece_identifier, str) else None


gentle_assistance_hint_text = "La pieza admite un primer intento más lento."
direct_assistance_hint_text = "La solución está en lo que la pieza ya muestra."
unknown_medium_assistance_hint_text = "Lo que la pieza muestra se puede comprobar a simple vista."
medium_assistance_hint_by_widget_kind_name = {
    "ordered_positions": "Hay un orden que se puede comprobar a simple vista.",
    "combination_dials": "Los signos de cada dial ya están a la vista y se pueden cotejar.",
    "cipher_wheel": "Las letras y el texto cifrado ya están a la vista y se pueden cotejar.",
}


def missing_assistance_hints(interactive_piece: dict[str, Any]) -> dict[str, str]:
    public_definition = interactive_piece.get("public_definition")
    public_state = public_definition.get("public_state") if isinstance(public_definition, dict) else None
    widget_kind_name = public_state.get("widget_kind_name") if isinstance(public_state, dict) else None
    medium_hint_text = medium_assistance_hint_by_widget_kind_name.get(
        widget_kind_name, unknown_medium_assistance_hint_text
    )
    return {
        "gentle": gentle_assistance_hint_text,
        "medium": medium_hint_text,
        "direct": direct_assistance_hint_text,
    }


def salvage_interactive_piece(interactive_piece: dict[str, Any]) -> dict[str, Any]:
    salvaged_piece = align_interactive_piece_private_rule_checks(interactive_piece)
    public_definition = salvaged_piece.get("public_definition")
    if isinstance(public_definition, dict):
        visible_rule_texts = public_definition.get("visible_rule_texts")
        if not isinstance(visible_rule_texts, list) or len(visible_rule_texts) == 0:
            private_rule_checks = salvaged_piece.get("private_rule_checks")
            copied_rule_texts = [
                rule_check.get("visible_rule_text")
                for rule_check in private_rule_checks
                if isinstance(private_rule_checks, list)
                and isinstance(rule_check, dict)
                and isinstance(rule_check.get("visible_rule_text"), str)
            ]
            if copied_rule_texts:
                replaced_public_definition = dict(public_definition)
                replaced_public_definition["visible_rule_texts"] = copied_rule_texts
                salvaged_piece = dict(salvaged_piece)
                salvaged_piece["public_definition"] = replaced_public_definition
    assistance_texts = salvaged_piece.get("assistance_texts")
    if not isinstance(assistance_texts, list):
        assistance_texts = []
    offered_level_names = {
        assistance_text.get("level_name")
        for assistance_text in assistance_texts
        if isinstance(assistance_text, dict)
    }
    completed_assistance_texts = list(assistance_texts)
    for level_name, public_hint_text in missing_assistance_hints(salvaged_piece).items():
        if level_name not in offered_level_names:
            completed_assistance_texts.append({"level_name": level_name, "public_hint_text": public_hint_text})
    salvaged_piece = dict(salvaged_piece)
    salvaged_piece["assistance_texts"] = completed_assistance_texts
    return repair_private_solution(salvaged_piece)


def is_interactive_piece_usable(interactive_piece: dict[str, Any]) -> bool:
    public_definition = interactive_piece.get("public_definition")
    if not isinstance(public_definition, dict):
        return False
    visible_rule_texts = public_definition.get("visible_rule_texts")
    if not isinstance(visible_rule_texts, list) or len(visible_rule_texts) == 0:
        return False
    private_rule_checks = interactive_piece.get("private_rule_checks")
    if not isinstance(private_rule_checks, list) or len(private_rule_checks) == 0:
        return False
    assistance_texts = interactive_piece.get("assistance_texts")
    if not isinstance(assistance_texts, list):
        return False
    offered_level_names = {
        assistance_text.get("level_name")
        for assistance_text in assistance_texts
        if isinstance(assistance_text, dict)
    }
    return offered_level_names >= {"gentle", "medium", "direct"}


def drop_unusable_interactive_pieces_and_references(specification: dict[str, Any]) -> dict[str, Any]:
    interactive_pieces = specification.get("interactive_pieces")
    if not isinstance(interactive_pieces, list):
        return specification
    usable_pieces = [
        salvaged_piece
        for salvaged_piece in (
            salvage_interactive_piece(interactive_piece)
            for interactive_piece in interactive_pieces
            if isinstance(interactive_piece, dict)
        )
        if is_interactive_piece_usable(salvaged_piece)
    ]
    kept_piece_identifiers = {
        read_interactive_piece_identifier(interactive_piece)
        for interactive_piece in usable_pieces
        if read_interactive_piece_identifier(interactive_piece) is not None
    }
    prepared_specification = dict(specification)
    prepared_specification["interactive_pieces"] = usable_pieces
    prepared_specification["scenes"] = [
        drop_unknown_piece_references_from_scene(scene, kept_piece_identifiers)
        for scene in specification.get("scenes", [])
        if isinstance(scene, dict)
    ]
    shared_action_branches = specification.get("shared_action_branches")
    if isinstance(shared_action_branches, list):
        prepared_specification["shared_action_branches"] = [
            drop_unknown_piece_references_from_shared_branch(shared_branch, kept_piece_identifiers)
            for shared_branch in shared_action_branches
            if isinstance(shared_branch, dict)
        ]
    return prepared_specification


def drop_unknown_piece_references_from_shared_branch(
    shared_branch: dict[str, Any], kept_piece_identifiers: set[str | None]
) -> dict[str, Any]:
    action_branch = shared_branch.get("action_branch")
    if not isinstance(action_branch, dict):
        return shared_branch
    replaced_shared_branch = dict(shared_branch)
    replaced_shared_branch["action_branch"] = drop_unknown_piece_references_from_branch(
        action_branch, kept_piece_identifiers
    )
    return replaced_shared_branch


def drop_unknown_piece_references_from_scene(
    scene: dict[str, Any], kept_piece_identifiers: set[str | None]
) -> dict[str, Any]:
    replaced_scene = dict(scene)
    action_branches = scene.get("action_branches")
    if isinstance(action_branches, list):
        replaced_scene["action_branches"] = [
            drop_unknown_piece_references_from_branch(action_branch, kept_piece_identifiers)
            if isinstance(action_branch, dict)
            else action_branch
            for action_branch in action_branches
        ]
    fallback_outcome = scene.get("free_text_fallback_outcome")
    if isinstance(fallback_outcome, dict):
        replaced_scene["free_text_fallback_outcome"] = drop_unknown_piece_references_from_outcome(
            fallback_outcome, kept_piece_identifiers
        )
    solved_outcomes = scene.get("interactive_piece_solved_outcomes")
    if isinstance(solved_outcomes, list):
        replaced_scene["interactive_piece_solved_outcomes"] = [
            solved_outcome
            for solved_outcome in solved_outcomes
            if isinstance(solved_outcome, dict)
            and solved_outcome.get("interactive_piece_identifier") in kept_piece_identifiers
        ]
    present_persons = scene.get("present_persons")
    if isinstance(present_persons, list):
        replaced_scene["present_persons"] = [
            drop_unknown_piece_references_from_present_person(present_person, kept_piece_identifiers)
            if isinstance(present_person, dict)
            else present_person
            for present_person in present_persons
        ]
    return replaced_scene


def drop_unknown_piece_references_from_present_person(
    present_person: dict[str, Any], kept_piece_identifiers: set[str | None]
) -> dict[str, Any]:
    presence_condition = present_person.get("presence_condition")
    if not isinstance(presence_condition, dict):
        return present_person
    replaced_person = dict(present_person)
    replaced_person["presence_condition"] = drop_unknown_piece_statuses_from_condition(
        presence_condition, kept_piece_identifiers
    )
    return replaced_person


def drop_unknown_piece_references_from_branch(
    action_branch: dict[str, Any], kept_piece_identifiers: set[str | None]
) -> dict[str, Any]:
    replaced_branch = dict(action_branch)
    visibility_condition = action_branch.get("visibility_condition")
    if isinstance(visibility_condition, dict):
        replaced_branch["visibility_condition"] = drop_unknown_piece_statuses_from_condition(
            visibility_condition, kept_piece_identifiers
        )
    default_outcome = action_branch.get("default_outcome")
    if isinstance(default_outcome, dict):
        replaced_branch["default_outcome"] = drop_unknown_piece_references_from_outcome(
            default_outcome, kept_piece_identifiers
        )
    repeated_outcome = action_branch.get("repeated_outcome")
    if isinstance(repeated_outcome, dict):
        replaced_branch["repeated_outcome"] = drop_unknown_piece_references_from_outcome(
            repeated_outcome, kept_piece_identifiers
        )
    conditional_outcomes = action_branch.get("conditional_outcomes")
    if isinstance(conditional_outcomes, list):
        replaced_branch["conditional_outcomes"] = [
            drop_unknown_piece_references_from_conditional_outcome(conditional_outcome, kept_piece_identifiers)
            if isinstance(conditional_outcome, dict)
            else conditional_outcome
            for conditional_outcome in conditional_outcomes
        ]
    return replaced_branch


def drop_unknown_piece_references_from_conditional_outcome(
    conditional_outcome: dict[str, Any], kept_piece_identifiers: set[str | None]
) -> dict[str, Any]:
    replaced_conditional_outcome = dict(conditional_outcome)
    condition = conditional_outcome.get("condition")
    if isinstance(condition, dict):
        replaced_conditional_outcome["condition"] = drop_unknown_piece_statuses_from_condition(
            condition, kept_piece_identifiers
        )
    outcome = conditional_outcome.get("outcome")
    if isinstance(outcome, dict):
        replaced_conditional_outcome["outcome"] = drop_unknown_piece_references_from_outcome(
            outcome, kept_piece_identifiers
        )
    return replaced_conditional_outcome


def drop_unknown_piece_statuses_from_condition(
    condition: dict[str, Any], kept_piece_identifiers: set[str | None]
) -> dict[str, Any]:
    required_statuses = condition.get("required_interactive_piece_statuses")
    if not isinstance(required_statuses, list):
        return condition
    replaced_condition = dict(condition)
    replaced_condition["required_interactive_piece_statuses"] = [
        required_status
        for required_status in required_statuses
        if isinstance(required_status, dict)
        and required_status.get("interactive_piece_identifier") in kept_piece_identifiers
    ]
    return replaced_condition


def drop_unknown_piece_references_from_outcome(
    outcome: dict[str, Any], kept_piece_identifiers: set[str | None]
) -> dict[str, Any]:
    replaced_outcome = dict(outcome)
    presented_identifiers = outcome.get("presented_interactive_piece_identifiers")
    if isinstance(presented_identifiers, list):
        replaced_outcome["presented_interactive_piece_identifiers"] = [
            piece_identifier
            for piece_identifier in presented_identifiers
            if piece_identifier in kept_piece_identifiers
        ]
    status_changes = outcome.get("interactive_piece_status_changes")
    if isinstance(status_changes, list):
        replaced_outcome["interactive_piece_status_changes"] = [
            status_change
            for status_change in status_changes
            if isinstance(status_change, dict)
            and status_change.get("interactive_piece_identifier") in kept_piece_identifiers
        ]
    return replaced_outcome


def clear_archive_ending_on_outcome(outcome: dict[str, Any]) -> dict[str, Any]:
    stripped_outcome = dict(outcome)
    stripped_outcome["archive_ending_identifier"] = None
    return stripped_outcome


def strip_archive_endings_from_opening_scene(specification: dict[str, Any]) -> dict[str, Any]:
    initial_state = specification.get("initial_state")
    first_scene_identifier = (
        initial_state.get("first_scene_identifier") if isinstance(initial_state, dict) else None
    )
    scenes = specification.get("scenes")
    if not isinstance(first_scene_identifier, str) or not isinstance(scenes, list):
        return specification
    stripped_specification = dict(specification)
    stripped_scenes: list[Any] = []
    for scene in scenes:
        if not isinstance(scene, dict) or scene.get("scene_identifier") != first_scene_identifier:
            stripped_scenes.append(scene)
            continue
        stripped_scene = dict(scene)
        action_branches = scene.get("action_branches")
        if isinstance(action_branches, list):
            stripped_branches: list[Any] = []
            for action_branch in action_branches:
                if not isinstance(action_branch, dict):
                    stripped_branches.append(action_branch)
                    continue
                stripped_branch = dict(action_branch)
                for outcome_field_name in ("default_outcome", "repeated_outcome"):
                    outcome = action_branch.get(outcome_field_name)
                    if isinstance(outcome, dict):
                        stripped_branch[outcome_field_name] = clear_archive_ending_on_outcome(outcome)
                stripped_branches.append(stripped_branch)
            stripped_scene["action_branches"] = stripped_branches
        fallback_outcome = scene.get("free_text_fallback_outcome")
        if isinstance(fallback_outcome, dict):
            stripped_scene["free_text_fallback_outcome"] = clear_archive_ending_on_outcome(fallback_outcome)
        stripped_scenes.append(stripped_scene)
    stripped_specification["scenes"] = stripped_scenes
    return stripped_specification


def ensure_opening_scene_has_a_present_person(specification: dict[str, Any]) -> dict[str, Any]:
    persons = specification.get("persons")
    initial_state = specification.get("initial_state")
    first_scene_identifier = (
        initial_state.get("first_scene_identifier") if isinstance(initial_state, dict) else None
    )
    scenes = specification.get("scenes")
    if not isinstance(persons, list) or not persons or not isinstance(first_scene_identifier, str) or not isinstance(scenes, list):
        return specification
    first_person = persons[0]
    if not isinstance(first_person, dict) or not isinstance(first_person.get("person_identifier"), str):
        return specification
    presence_text = first_person.get("alias_before_name_is_known")
    if not isinstance(presence_text, str) or presence_text.strip() == "":
        presence_text = "Alguien permanece a la vista."
    stripped_specification = dict(specification)
    stripped_scenes: list[Any] = []
    for scene in scenes:
        if not isinstance(scene, dict) or scene.get("scene_identifier") != first_scene_identifier:
            stripped_scenes.append(scene)
            continue
        present_persons = scene.get("present_persons")
        if isinstance(present_persons, list) and len(present_persons) > 0:
            stripped_scenes.append(scene)
            continue
        stripped_scene = dict(scene)
        stripped_scene["present_persons"] = [
            {
                "person_identifier": first_person["person_identifier"],
                "presence_text": presence_text,
                "presence_condition": None,
            }
        ]
        stripped_scenes.append(stripped_scene)
    stripped_specification["scenes"] = stripped_scenes
    return stripped_specification


def strip_archive_ending_from_free_text_fallback_outcomes(specification: dict[str, Any]) -> dict[str, Any]:
    scenes = specification.get("scenes")
    if not isinstance(scenes, list):
        return specification
    stripped_specification = dict(specification)
    stripped_scenes: list[Any] = []
    for scene in scenes:
        if not isinstance(scene, dict):
            stripped_scenes.append(scene)
            continue
        fallback_outcome = scene.get("free_text_fallback_outcome")
        if not isinstance(fallback_outcome, dict):
            stripped_scenes.append(scene)
            continue
        stripped_fallback_outcome = dict(fallback_outcome)
        stripped_fallback_outcome["archive_ending_identifier"] = None
        stripped_scene = dict(scene)
        stripped_scene["free_text_fallback_outcome"] = stripped_fallback_outcome
        stripped_scenes.append(stripped_scene)
    stripped_specification["scenes"] = stripped_scenes
    return stripped_specification


def prepare_case_specification_proposal(proposed_specification: Any, chosen_whisper_identifier: str) -> Any:
    if not isinstance(proposed_specification, dict):
        return proposed_specification
    prepared_specification = normalize_identifier_fields_in_value(copy.deepcopy(proposed_specification))
    prepared_specification["whisper_identifier"] = normalize_identifier_text(chosen_whisper_identifier)
    prepared_specification = decode_generated_markup_in_value(prepared_specification)
    interactive_pieces = prepared_specification.get("interactive_pieces")
    if isinstance(interactive_pieces, list):
        prepared_specification["interactive_pieces"] = [
            align_interactive_piece_private_rule_checks(interactive_piece)
            if isinstance(interactive_piece, dict)
            else interactive_piece
            for interactive_piece in interactive_pieces
        ]
    prepared_specification = drop_unusable_interactive_pieces_and_references(prepared_specification)
    prepared_specification = strip_archive_ending_from_free_text_fallback_outcomes(prepared_specification)
    prepared_specification = strip_archive_endings_from_opening_scene(prepared_specification)
    prepared_specification = ensure_opening_scene_has_a_present_person(prepared_specification)
    clocks = prepared_specification.get("clocks")
    whisper_identifier = prepared_specification.get("whisper_identifier")
    if isinstance(clocks, dict) and isinstance(clocks.get("entropy_signals"), list):
        replaced_clocks = dict(clocks)
        replaced_clocks["entropy_signals"] = spread_colliding_signal_versions(
            clocks["entropy_signals"],
            whisper_identifier if isinstance(whisper_identifier, str) else "caso",
        )
        prepared_specification["clocks"] = replaced_clocks
    return prepared_specification
