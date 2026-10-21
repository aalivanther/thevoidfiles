import copy

from case_start.conftest import lighthouse_whisper_identifier, read_lighthouse_case_specification
from the_void_files.narrative.case_reviewer import review_case_specification_proposal


def review_changed_specification(change_specification):
    changed_specification = copy.deepcopy(read_lighthouse_case_specification())
    change_specification(changed_specification)
    case_review = review_case_specification_proposal(changed_specification, lighthouse_whisper_identifier)
    return case_review, {validation_error.error_name for validation_error in case_review.validation_errors}


def test_a_dead_end_fallback_and_a_case_without_a_condition_are_rejected():
    def break_the_opening(specification):
        specification["scenes"][0]["free_text_fallback_outcome"]["director_entries"] = [
            {"voice": "director_narration", "marked_paragraphs": ["No."]}
        ]
        specification["scenes"][0]["free_text_fallback_outcome"]["elapsed_minutes"] = 0
        for scene in specification["scenes"]:
            for branch in scene.get("action_branches", []):
                outcome = branch.get("default_outcome")
                if isinstance(outcome, dict):
                    outcome["conditions_gained"] = []
                for conditional_outcome in branch.get("conditional_outcomes", []):
                    nested_outcome = conditional_outcome.get("outcome")
                    if isinstance(nested_outcome, dict):
                        nested_outcome["conditions_gained"] = []

    _case_review, error_names = review_changed_specification(break_the_opening)
    assert "free_text_fallback_is_a_dead_end" in error_names
    assert "condition_gain_missing" in error_names


def test_lighthouse_fixture_is_accepted():
    case_review = review_case_specification_proposal(read_lighthouse_case_specification(), lighthouse_whisper_identifier)
    assert case_review.is_accepted
    assert case_review.validation_errors == []


def test_a_case_without_an_entropy_signal_is_rejected():
    def clear_entropy_signals(specification):
        specification["clocks"]["entropy_signals"] = []

    _, error_names = review_changed_specification(clear_entropy_signals)
    assert "entropy_signal_missing" in error_names


def test_specification_for_another_whisper_is_rejected():
    case_review = review_case_specification_proposal(read_lighthouse_case_specification(), "night_shift_fourth_floor")
    assert [validation_error.error_name for validation_error in case_review.validation_errors] == [
        "whisper_identifier_mismatch"
    ]


def test_structure_errors_are_located_without_echoing_content():
    def remove_private_truth(specification):
        del specification["private_truth"]
        specification["unexpected_field"] = "Texto secreto"

    case_review, error_names = review_changed_specification(remove_private_truth)
    assert not case_review.is_accepted
    assert error_names == {"structure_invalid"}
    assert {validation_error.location_text for validation_error in case_review.validation_errors} == {
        "private_truth",
        "unexpected_field",
    }
    assert all("secreto" not in validation_error.detail_text for validation_error in case_review.validation_errors)


def test_impossible_references_are_rejected():
    def break_references(specification):
        first_outcome = specification["scenes"][0]["action_branches"][0]["default_outcome"]
        first_outcome["person_identifiers_becoming_known"] = ["absent_person"]
        first_outcome["presented_interactive_piece_identifiers"] = ["absent_piece"]
        first_outcome["archive_ending_identifier"] = "absent_ending"
        specification["scenes"][0]["action_branches"][1]["visibility_condition"] = {
            "required_lived_experience_flag_names": ["flag_nobody_grants"],
            "forbidden_lived_experience_flag_names": [],
            "required_interactive_piece_statuses": [],
            "minimum_relationship_levels": [],
            "required_active_condition_identifiers": [],
            "minimum_serious_wound_count": 0,
        }
        specification["initial_state"]["issued_belonging_units"][0]["belonging_identifier"] = "absent_belonging"

    _, error_names = review_changed_specification(break_references)
    assert error_names == {
        "person_reference_unknown",
        "interactive_piece_reference_unknown",
        "ending_reference_unknown",
        "required_flag_is_never_granted",
        "belonging_reference_unknown",
    }


def test_unreachable_scene_and_duplicated_identifier_are_rejected():
    def add_orphan_scene(specification):
        orphan_scene = copy.deepcopy(specification["scenes"][1])
        orphan_scene["scene_identifier"] = "orphan_scene"
        specification["scenes"].append(orphan_scene)

    _, error_names = review_changed_specification(add_orphan_scene)
    assert error_names == {"scene_is_unreachable", "identifier_duplicated"}


def test_interactive_piece_must_be_solvable_by_its_visible_rules():
    def break_plate_order(specification):
        plate_frame = specification["interactive_pieces"][2]
        plate_frame["private_solution"]["ordered_piece_identifiers"].reverse()

    _, error_names = review_changed_specification(break_plate_order)
    assert error_names == {"interactive_piece_solution_breaks_visible_rule"}


def test_optional_pieces_still_require_valid_references_capabilities_and_timed_exits():
    def remove_pieces(specification):
        specification["interactive_pieces"] = []

    _, missing_piece_errors = review_changed_specification(remove_pieces)
    assert "interactive_piece_missing" not in missing_piece_errors
    assert "interactive_piece_reference_unknown" in missing_piece_errors

    def thin_capability(specification):
        specification["private_truth"]["threat"]["capability_texts"] = ["Corta"]

    _, thin_capability_errors = review_changed_specification(thin_capability)
    assert "threat_capability_too_thin" in thin_capability_errors

    def remove_the_only_exit_from_dawn(specification):
        for scene in specification["scenes"]:
            if scene["scene_identifier"] != "dawn_pier":
                continue
            for action_branch in scene["action_branches"]:
                action_branch["default_outcome"]["next_scene_identifier"] = None
                action_branch["default_outcome"]["archive_ending_identifier"] = None
                action_branch["default_outcome"]["elapsed_minutes"] = 0
            scene["free_text_fallback_outcome"]["next_scene_identifier"] = None
            scene["free_text_fallback_outcome"]["archive_ending_identifier"] = None
            for solved_outcome in scene["interactive_piece_solved_outcomes"]:
                solved_outcome["outcome"]["next_scene_identifier"] = None
                solved_outcome["outcome"]["archive_ending_identifier"] = None
        for shared_action_branch in specification["shared_action_branches"]:
            shared_action_branch["excluded_scene_identifiers"].append("dawn_pier")

    _, exit_errors = review_changed_specification(remove_the_only_exit_from_dawn)
    assert "scene_exit_missing" in exit_errors

    def remove_piece_attempt_time(specification):
        specification["interactive_pieces"][0]["public_definition"]["attempt_elapsed_minutes"] = 0

    _, attempt_time_errors = review_changed_specification(remove_piece_attempt_time)
    assert "piece_attempt_time_missing" in attempt_time_errors


def test_case_generation_allows_optional_pieces_and_requires_capabilities_and_timed_exits():
    from the_void_files.narrative.case_generator import (
        build_case_generation_request,
        output_contract_authority_label_name,
        read_context_block_content,
    )

    generation_request = build_case_generation_request(
        "main_chronicle",
        "opening_key_0001",
        "rules",
        {"identifier": "lighthouse_counts_one_more"},
        0,
        [],
    )
    output_contract = read_context_block_content(generation_request, output_contract_authority_label_name)
    assert "prefer_empty_interactive_pieces" not in output_contract
    assert output_contract["minimum_interactive_piece_count"] == 0
    assert output_contract["minimum_threat_capability_count"] == 1
    assert output_contract["minimum_travel_minutes"] == 1
    assert output_contract["minimum_piece_attempt_minutes"] == 1
    assert "elapsed_minutes" in generation_request.instruction_text


def test_generation_instruction_does_not_promise_to_rewrite_a_combination_lock():
    from the_void_files.narrative.case_generator import build_case_generation_request

    entropy_sentence = (
        "An entropy version stays when it is a non-boolean integer of at least 2 and not already used; "
        "any other version moves to the next free version, skipping a taken one by the same seeded 4-to-8 gap, "
        "and if none qualify every signal is still spread from 2."
    )
    dial_sentence = (
        "An illegal piece order and an out-of-range cipher shift are still replaced by a calculated pattern, "
        "but a private solution already marked combination_dials is not rewritten."
    )
    replaced_sentence = "A piece solution that breaks its visible rules is replaced by a pattern calculated from those rules."
    for repair_attempt_number in (0, 1):
        generation_request = build_case_generation_request(
            "main_chronicle",
            "opening_key_0001",
            "rules",
            {"identifier": "lighthouse_counts_one_more"},
            repair_attempt_number,
            [],
        )
        assert entropy_sentence in generation_request.instruction_text
        assert dial_sentence in generation_request.instruction_text
        assert replaced_sentence not in generation_request.instruction_text


def test_archive_needs_an_ending_the_investigator_survives():
    def make_every_ending_lethal(specification):
        lethal_outcome = next(
            ending["death_outcome"] for ending in specification["endings"] if ending["death_outcome"] is not None
        )
        for ending in specification["endings"]:
            ending["death_outcome"] = lethal_outcome

    _, error_names = review_changed_specification(make_every_ending_lethal)
    assert error_names == {"no_surviving_ending_is_reachable"}


def test_a_branch_and_flag_investigation_can_open_without_widgets():
    specification = copy.deepcopy(read_lighthouse_case_specification())

    def remove_widget_references(value):
        if isinstance(value, dict):
            for key in list(value):
                if key in ('interactive_pieces', 'interactive_piece_solved_outcomes',
                           'presented_interactive_piece_identifiers', 'required_interactive_piece_statuses',
                           'required_lived_experience_flag_names', 'interactive_piece_status_changes', 'resolution_flag_names'):
                    value[key] = []
                else:
                    remove_widget_references(value[key])
        elif isinstance(value, list):
            for item in value:
                remove_widget_references(item)

    remove_widget_references(specification)
    specification['scenes'][0]['free_text_fallback_outcome']['granted_lived_experience_flag_names'].append('resolution_by_containment')
    specification['scenes'][1]['action_branches'][0]['visibility_condition'] = {
        'required_lived_experience_flag_names': ['resolution_by_containment'],
        'forbidden_lived_experience_flag_names': [],
        'required_interactive_piece_statuses': [],
        'minimum_relationship_levels': [],
        'required_active_condition_identifiers': [],
        'minimum_serious_wound_count': 0,
    }
    surviving_ending = next(ending['ending_identifier'] for ending in specification['endings'] if ending['death_outcome'] is None)
    for position, scene in enumerate(specification['scenes']):
        outcome = scene['free_text_fallback_outcome']
        outcome['elapsed_minutes'] = 1
        outcome['next_scene_identifier'] = specification['scenes'][position + 1]['scene_identifier'] if position + 1 < len(specification['scenes']) else None
        outcome['archive_ending_identifier'] = surviving_ending if outcome['next_scene_identifier'] is None else None
    review = review_case_specification_proposal(specification, lighthouse_whisper_identifier)
    assert review.is_accepted, [error.model_dump() for error in review.validation_errors]
