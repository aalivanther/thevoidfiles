import json
from pathlib import Path

from the_void_files.narrative.context_builder import DirectorTurnContext, build_adjudication_request


def read_lighthouse_specification() -> dict:
    specification_path = (
        Path(__file__).resolve().parents[2]
        / "content"
        / "synthetic_cases"
        / "lighthouse_counts_one_more"
        / "case_specification.json"
    )
    return json.loads(specification_path.read_text(encoding="utf-8"))


def build_pier_turn_context() -> DirectorTurnContext:
    return DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key_0001",
        state_version=1,
        rules_version="1",
        case_specification=read_lighthouse_specification(),
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


def read_controlled_name(request) -> str:
    legend = json.loads(request.context_blocks[1].content_text)
    named_variables = [
        variable for variable in legend["variables"] if variable.get("placeholder") == "{{nombre}}"
    ]
    assert len(named_variables) == 1
    return named_variables[0]["current_value"]


def test_a_generation_request_without_a_registered_name_uses_the_investigator():
    request = build_adjudication_request(
        build_pier_turn_context(),
        {
            "action_kind_name": "investigator_action",
            "request": {"remaining_plan_steps": [{"action_text": "Camino hasta el pie del faro"}]},
        },
    )
    assert request.context_blocks[1].authority_label_name == "controlled_variables"
    assert read_controlled_name(request) == "el Investigador"


def test_a_generation_request_uses_the_registered_short_name():
    request = build_adjudication_request(
        build_pier_turn_context(),
        {
            "action_kind_name": "investigator_action",
            "request": {"remaining_plan_steps": [{"action_text": "Camino hasta el pie del faro"}]},
        },
        investigator_placeholder_texts={"nombre": "Ana"},
    )
    assert read_controlled_name(request) == "Ana"
