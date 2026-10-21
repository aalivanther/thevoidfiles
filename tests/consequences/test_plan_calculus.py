import json
from pathlib import Path

from the_void_files.narrative.context_builder import DirectorTurnContext, build_adjudication_request
from the_void_files.narrative.orchestration.decision_matrix import score_logical_courses
from the_void_files.narrative.orchestration.plan_calculus import (
    calculate_declared_plan,
    confirm_feasibility_class_name,
    names_travel,
)


def read_lighthouse_specification() -> dict:
    specification_path = (
        Path(__file__).resolve().parents[2]
        / "content"
        / "synthetic_cases"
        / "lighthouse_counts_one_more"
        / "case_specification.json"
    )
    return json.loads(specification_path.read_text(encoding="utf-8"))


def test_the_engine_confirms_the_plan_word_without_a_roll():
    assert confirm_feasibility_class_name("plausible", "Examino la puerta", {"o": 6}) == "plausible"
    assert confirm_feasibility_class_name("plausible", "Huelo el óxido", {}) == "risky"
    assert confirm_feasibility_class_name("impossible", "Examino la puerta", {"o": 6}) == "impossible"
    lantern_plan = calculate_declared_plan(
        [{"step_identifier": "encender", "action_text": "Enciendo la linterna de mano"}],
        {},
        {},
        None,
        [{"identifier": "hand_lantern", "visible_name": "Linterna de mano", "units": 1}],
        None,
    )
    assert lantern_plan["steps"][0]["course_name"] == "spend_held_kit"
    assert lantern_plan["public_sentence"] == "El plan es sencillo y pide unos 10 minutos."
    assert "%" not in lantern_plan["public_sentence"]
    assert "dado" not in lantern_plan["public_sentence"].casefold()


def test_a_two_step_plan_adds_its_minutes_and_names_the_pattern():
    declared_plan = calculate_declared_plan(
        [
            {"step_identifier": "mirar", "action_text": "Examino el marco"},
            {"step_identifier": "caminar", "action_text": "Camino hasta el pie del faro"},
        ],
        {},
        read_lighthouse_specification(),
        "pier_arrival",
        [],
        None,
    )
    assert declared_plan["pattern_name"] == "remain_and_inquire,enter_place"
    assert declared_plan["minute_estimate"] == 15
    assert declared_plan["public_sentence"] == (
        "El plan tiene 2 pasos y pide unos 15 minutos. El primero es arriesgado."
    )
    assert declared_plan["steps"][1]["minute_estimate"] == 5
    assert declared_plan["steps"][1]["feasibility_word"] == "sencillo"


def test_the_adjudication_prompt_carries_the_calculated_plan():
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
                "current_scene_presentation": {"scene_identifier": "pier_arrival"},
            }
        },
    )
    request = build_adjudication_request(
        turn_context,
        {
            "action_kind_name": "investigator_action",
            "request": {
                "remaining_plan_steps": [
                    {"step_identifier": "bajar", "action_text": "Camino hasta el pie del faro"},
                    {"step_identifier": "mirar", "action_text": "Examino el marco"},
                ]
            },
        },
    )
    plan_block = next(block for block in request.context_blocks if block.authority_label_name == "calculated_plan")
    calculated_plan = json.loads(plan_block.content_text)
    assert calculated_plan["step_count"] == 2
    assert calculated_plan["pattern_name"] == "enter_place,remain_and_inquire"
    assert calculated_plan["steps"][0]["minute_estimate"] == 5
    assert "%" not in calculated_plan["public_sentence"]


def test_travel_verbs_match_at_a_letter_boundary():
    assert names_travel("Miro la puerta") is False
    assert names_travel("Decir el nombre") is False
    assert names_travel("Voy al muelle") is True
    assert confirm_feasibility_class_name("plausible", "Miro la puerta", {}) == "risky"
    looked_at_a_door = score_logical_courses(
        "Miro la puerta",
        [],
        {"can_enter": True, "travel_minutes": 5, "to_scene_identifier": "tower_foot", "to_place_name": "Pie del faro"},
    )
    assert looked_at_a_door["chosen_course"]["factors"]["travel_verb"] == 0
    assert looked_at_a_door["chosen_course"]["commits_logistics"] is False
    walked = calculate_declared_plan(
        [{"step_identifier": "caminar", "action_text": "Camino hasta el pie del faro"}],
        {},
        read_lighthouse_specification(),
        "pier_arrival",
        [],
        None,
    )
    assert walked["steps"][0]["course_name"] == "enter_place"
    assert walked["steps"][0]["minute_estimate"] == 5
    lantern_plan = calculate_declared_plan(
        [{"step_identifier": "encender", "action_text": "Enciendo la linterna de mano"}],
        {},
        {},
        None,
        [{"identifier": "hand_lantern", "visible_name": "Linterna de mano", "units": 1}],
        None,
    )
    assert lantern_plan["steps"][0]["course_name"] == "spend_held_kit"
