import json
from pathlib import Path

from the_void_files.narrative.context_builder import DirectorTurnContext, build_adjudication_request
from the_void_files.narrative.orchestration.decision_matrix import score_logical_courses
from the_void_files.narrative.orchestration.distance_field import measure_course_to_named_place
from the_void_files.narrative.orchestration.reality_ledger import build_controlled_variable_legend


def read_lighthouse_specification() -> dict:
    specification_path = (
        Path(__file__).resolve().parents[2]
        / "content"
        / "synthetic_cases"
        / "lighthouse_counts_one_more"
        / "case_specification.json"
    )
    return json.loads(specification_path.read_text(encoding="utf-8"))


def test_distance_field_walks_to_the_lighthouse_foot_by_a_cardinal():
    specification = read_lighthouse_specification()
    course = measure_course_to_named_place(
        specification, "pier_arrival", "Camino hasta el pie del faro"
    )
    assert course is not None
    assert course["can_enter"] is True
    assert course["to_scene_identifier"] == "tower_foot"
    assert course["to_place_name"] == "Punta Ánimas · Pie del faro"
    assert course["travel_minutes"] == 5
    assert course["cardinal"] in {"norte", "este", "sur", "oeste"}


def test_leave_verb_returns_along_the_passage_just_used():
    specification = read_lighthouse_specification()
    course = measure_course_to_named_place(specification, "tower_foot", "salgo", "pier_arrival")
    assert course is not None
    assert course["can_enter"] is True
    assert course["to_scene_identifier"] == "pier_arrival"
    assert course["travel_minutes"] == 4


def test_committed_facts_are_the_only_snapshot_the_narrator_may_use():
    from the_void_files.narrative.orchestration.narration_contract import (
        read_committed_narration_facts,
        review_narration_against_committed_facts,
    )
    from the_void_files.narrative.orchestration.reality_ledger import build_committed_facts

    public_state = {
        "place_name": "Punta Ánimas · Muelle viejo",
        "world_clock_minutes": 1205,
        "operational_funds": 1800,
        "serious_wound_count": 0,
        "belonging_units": [{"belonging_identifier": "hand_lantern", "units": 1}],
        "active_conditions": [],
    }
    committed_facts = build_committed_facts(public_state, {"nombre": "Akyrion"})
    assert committed_facts["values"]["heridas"] == "0"
    assert committed_facts["values"]["herida_causa"] == "ninguna"
    assert committed_facts["values"]["condicion"] == "ninguna"
    assert committed_facts["heridas"] == 0
    errors = review_narration_against_committed_facts(
        ["El investigador queda herido junto al muelle."],
        read_committed_narration_facts(public_state, read_lighthouse_specification()),
    )
    assert [error.error_name for error in errors] == ["narration_contradicts_committed_wound"]
    conditioned = read_committed_narration_facts(
        {**public_state, "active_conditions": [{"visible_name": "Amnesia selectiva"}]},
        read_lighthouse_specification(),
    )
    missing_name = review_narration_against_committed_facts(
        ["El investigador sigue en el muelle."],
        conditioned,
    )
    assert any(error.error_name == "narration_contradicts_committed_condition" for error in missing_name)


def test_a_mental_attack_may_lie_in_one_paragraph_and_nowhere_else():
    from the_void_files.narrative.orchestration.narration_contract import (
        read_anchored_status_lies,
        read_committed_narration_facts,
        review_narration_against_committed_facts,
    )

    facts = read_committed_narration_facts(
        {
            "place_name": "Punta Ánimas · Muelle viejo",
            "world_clock_minutes": 1205,
            "operational_funds": 1800,
            "serious_wound_count": 0,
            "belonging_units": [],
            "active_conditions": [],
        },
        read_lighthouse_specification(),
    )
    lies = read_anchored_status_lies(
        [{"voice": "director_narration", "marked_paragraphs": ["primero", "A las 03:12 la torre miente."]}],
        [
            {
                "kind": "mental_attack",
                "anchor_director_entry_index": 0,
                "anchor_paragraph_index": 1,
                "falsified_status_reading": {"status_field_name": "world_clock", "false_visible_text": "03:12"},
            }
        ],
    )
    assert review_narration_against_committed_facts(
        ["El muelle sigue igual.", "A las 03:12 la torre miente."],
        facts,
        lies,
    ) == []
    leaked = review_narration_against_committed_facts(
        ["A las 03:12 el muelle miente.", "Después nada."],
        facts,
        lies,
    )
    assert any(error.error_name == "narration_contradicts_committed_clock" for error in leaked)
    assert facts["clock_label"] == "20:05"


def test_reality_ledger_records_only_values_the_engine_changed():
    from the_void_files.narrative.orchestration.reality_ledger import diff_reality_ledger

    ledger = diff_reality_ledger(
        {"place_name": "Muelle", "world_clock_minutes": 1200, "operational_funds": 1800, "serious_wound_count": 0, "belonging_units": [{"belonging_identifier": "hand_lantern", "units": 1}]},
        {"place_name": "Pie del faro", "world_clock_minutes": 1205, "operational_funds": 1800, "serious_wound_count": 0, "belonging_units": [{"belonging_identifier": "hand_lantern", "units": 1}]},
    )
    changed_names = {write["variable_name"] for write in ledger["writes"]}
    assert changed_names == {"lugar", "hora"}
    assert all(write["writer"] == "engine" for write in ledger["writes"])


def test_decision_matrix_spends_the_lantern_before_wandering():
    ranked = score_logical_courses(
        "Enciendo la linterna de mano",
        [{"identifier": "hand_lantern", "visible_name": "Linterna de mano", "units": 1}],
        None,
    )
    assert ranked["chosen_course"]["course_name"] == "spend_held_kit"
    assert ranked["chosen_course"]["belonging_identifier"] == "hand_lantern"


def test_variable_legend_lists_placeholders_before_values():
    legend = build_controlled_variable_legend(
        {
            "place_name": "Punta Ánimas · Muelle viejo",
            "world_clock_minutes": 125,
            "operational_funds": 1800,
            "serious_wound_count": 0,
        },
        {"nombre": "Akyrion"},
        [{"identifier": "hand_lantern", "visible_name": "Linterna de mano", "units": 1}],
    )
    placeholders = [variable["placeholder"] for variable in legend["variables"]]
    assert placeholders[:5] == ["{{lugar}}", "{{hora}}", "{{nombre}}", "{{fondos}}", "{{heridas}}"]
    assert "{{kit_hand_lantern}}" in placeholders
    assert legend["variables"][0]["current_value"] == "Punta Ánimas · Muelle viejo"
    assert legend["variables"][1]["current_value"] == "02:05"


def test_narration_that_invents_another_hour_or_place_is_rejected_then_rewritten():
    from the_void_files.narrative.narration_guard import salvage_player_facing_narration
    from the_void_files.narrative.orchestration.narration_contract import read_committed_narration_facts
    from the_void_files.narrative.tool_registry import NarrationDraft

    committed_facts = read_committed_narration_facts(
        {
            "place_name": "Punta Ánimas · Muelle viejo",
            "world_clock_minutes": 1205,
            "operational_funds": 1800,
            "serious_wound_count": 0,
            "belonging_units": [],
        },
        read_lighthouse_specification(),
    )
    narration_draft = NarrationDraft(
        marked_paragraphs=["A las 03:12 el investigador ya está en el cuarto de la linterna."]
    )
    validation_errors = salvage_player_facing_narration(
        narration_draft,
        ["A las 03:12 el investigador ya está en el cuarto de la linterna."],
        [],
        [],
        read_lighthouse_specification(),
        [],
        committed_facts,
    )
    assert validation_errors == []
    assert "{{hora}}" in narration_draft.marked_paragraphs[0]
    assert "{{lugar}}" in narration_draft.marked_paragraphs[0]
    assert "03:12" not in narration_draft.marked_paragraphs[0]
    assert "cuarto de la linterna" not in narration_draft.marked_paragraphs[0].lower()


def test_adjudication_prompt_opens_with_controlled_variables():
    specification = read_lighthouse_specification()
    turn_context = DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key_0001",
        state_version=1,
        rules_version="1",
        case_specification=specification,
        current_run={
            "public_state": {
                "place_name": "Punta Ánimas · Muelle viejo",
                "world_clock_minutes": 1200,
                "operational_funds": 1800,
                "serious_wound_count": 0,
                "belonging_units": [{"belonging_identifier": "hand_lantern", "units": 1}],
                "known_person_identifiers": [],
                "current_scene_presentation": {
                    "scene_identifier": "pier_arrival",
                    "place_name": "Punta Ánimas · Muelle viejo",
                    "suggested_actions": [],
                },
            }
        },
    )
    request = build_adjudication_request(
        turn_context,
        {
            "action_kind_name": "investigator_action",
            "request": {
                "remaining_plan_steps": [{"action_text": "Camino hasta el pie del faro"}],
            },
        },
    )
    labels = [block.authority_label_name for block in request.context_blocks]
    assert labels[:3] == ["control", "controlled_variables", "ranked_decision"]
    assert "distance_course" in labels
    legend = json.loads(request.context_blocks[1].content_text)
    assert legend["variables"][0]["placeholder"] == "{{lugar}}"


def test_named_travel_stays_on_an_open_direct_passage():
    specification = read_lighthouse_specification()
    locked_from_the_pier = measure_course_to_named_place(
        specification, "pier_arrival", "voy al cuarto de máquinas"
    )
    assert locked_from_the_pier is not None
    assert locked_from_the_pier["can_enter"] is False
    assert "to_scene_identifier" not in locked_from_the_pier
    same_pier = measure_course_to_named_place(specification, "pier_arrival", "muelle viejo")
    assert same_pier is not None
    assert same_pier["can_enter"] is False
    assert same_pier.get("to_scene_identifier") != "dawn_pier"
    assert "to_scene_identifier" not in same_pier
    closed_door = measure_course_to_named_place(
        specification, "tower_foot", "cuarto de máquinas", None, lived_flag_names=set()
    )
    assert closed_door is not None
    assert closed_door["can_enter"] is False
    assert "to_scene_identifier" not in closed_door
    open_door = measure_course_to_named_place(
        specification,
        "tower_foot",
        "cuarto de máquinas",
        None,
        lived_flag_names={"machine_room_is_open"},
    )
    assert open_door is not None
    assert open_door["can_enter"] is True
    assert open_door["to_scene_identifier"] == "machine_room"
    assert open_door["travel_minutes"] == 2
