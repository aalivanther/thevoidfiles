import json

from the_void_files.application.use_cases.case_start_public_opening import apply_carried_investigator_attributes
from the_void_files.application.use_cases.consequence_case_state import WorkingCaseState
from the_void_files.application.use_cases.consequence_turn_resolution import (
    TurnDraft,
    apply_attribute_pace,
    refuse_action_without_effort,
    restore_effort_after_scene_change,
)
from the_void_files.narrative.context_builder import DirectorTurnContext, build_canonical_character_state_block
from the_void_files.narrative.orchestration.effort import (
    adjusted_elapsed_minutes,
    case_effort_maximum,
    does_text_spend_effort,
    no_effort_remaining_text,
    read_investigator_attributes,
)
from the_void_files.narrative.orchestration.reality_ledger import (
    build_controlled_variable_legend,
    diff_reality_ledger,
)


def build_working_state(**overrides) -> WorkingCaseState:
    working_state = WorkingCaseState(
        scene_identifier="pier_arrival",
        place_name="Muelle",
        world_clock_minutes=100,
        operational_funds=100,
        belonging_units={},
        serious_wound_count=0,
        lived_experience_flag_names=[],
        active_conditions=[],
        known_person_identifiers=[],
        witnessed_origin_identifiers=[],
        interactive_piece_status_by_identifier={},
        relationship_level_by_key={},
        relationship_dimension_by_key={},
        executed_branch_identifiers=[],
        given_entropy_signal_flag_names=[],
        effort_remaining=case_effort_maximum,
        investigator_attributes={"im": 4, "if": 4, "c": 4, "o": 4, "co": 4, "m": 4, "s": 4},
    )
    for field_name, field_value in overrides.items():
        setattr(working_state, field_name, field_value)
    return working_state


def test_attributes_change_minutes_without_a_roll():
    assert adjusted_elapsed_minutes(10, 8) == 8
    assert adjusted_elapsed_minutes(1, 8) == 1
    assert adjusted_elapsed_minutes(10, 4) == 10
    assert adjusted_elapsed_minutes(10, 2) == 12
    strong_state = build_working_state(
        world_clock_minutes=110,
        investigator_attributes={"im": 4, "if": 8, "c": 4, "o": 4, "co": 4, "m": 4, "s": 4},
    )
    strong_draft = TurnDraft(elapsed_minutes=10)
    apply_attribute_pace("Empujo el marco con el hombro", strong_state, strong_draft)
    assert strong_draft.elapsed_minutes == 8
    assert strong_state.world_clock_minutes == 108
    weak_state = build_working_state(
        world_clock_minutes=110,
        investigator_attributes={"im": 4, "if": 1, "c": 4, "o": 4, "co": 4, "m": 4, "s": 4},
    )
    weak_draft = TurnDraft(elapsed_minutes=10)
    apply_attribute_pace("Empujo el marco con el hombro", weak_state, weak_draft)
    assert weak_draft.elapsed_minutes == 12
    assert weak_state.world_clock_minutes == 112


def test_effort_words_are_whole_words_and_zero_refuses_the_action():
    assert does_text_spend_effort("Fuerzo el marco con el hombro") is True
    assert does_text_spend_effort("Con esfuerzo empujo el marco") is False
    assert does_text_spend_effort("Hablo con la mujer") is False
    spent_state = build_working_state(effort_remaining=1)
    spent_draft = TurnDraft()
    assert refuse_action_without_effort("Fuerzo el marco con el hombro", spent_state, spent_draft) is False
    assert spent_state.effort_remaining == 0
    assert spent_draft.ordered_effects == [{"kind": "effort_spent", "amount": 1, "resulting_effort": 0}]
    refused_draft = TurnDraft()
    assert refuse_action_without_effort("Fuerzo el marco con el hombro", spent_state, refused_draft) is True
    assert spent_state.effort_remaining == 0
    assert refused_draft.ordered_effects == []
    assert refused_draft.director_entries[0]["marked_paragraphs"] == [no_effort_remaining_text]


def test_a_new_scene_restores_effort_and_says_so():
    working_state = build_working_state(effort_remaining=2)
    turn_draft = TurnDraft()
    restore_effort_after_scene_change(working_state, turn_draft)
    assert working_state.effort_remaining == case_effort_maximum
    assert turn_draft.ordered_effects == [
        {"kind": "effort_spent", "amount": 0, "resulting_effort": case_effort_maximum}
    ]
    restore_effort_after_scene_change(working_state, turn_draft)
    assert len(turn_draft.ordered_effects) == 1


def test_carried_dossier_attributes_enter_the_case_register():
    initial_run = {
        "public_state": {
            "place_name": "Muelle",
            "world_clock_minutes": 1200,
            "operational_funds": 100,
            "serious_wound_count": 0,
            "effort_remaining": 6,
            "investigator_attributes": {"im": 4, "if": 4, "c": 4, "o": 4, "co": 4, "m": 4, "s": 4},
            "belonging_units": [],
            "active_conditions": [],
        },
        "director_private_state": {"committed_facts": {}},
    }
    apply_carried_investigator_attributes(
        initial_run,
        {"im": 4, "if": 80, "c": 3, "o": True, "co": 4, "m": 4, "s": 1},
    )
    stored_attributes = initial_run["public_state"]["investigator_attributes"]
    assert stored_attributes["if"] == 50
    assert stored_attributes["o"] == 4
    assert stored_attributes["s"] == 1
    assert initial_run["director_private_state"]["committed_facts"]["atributos"]["if"] == 50
    assert initial_run["director_private_state"]["committed_facts"]["esfuerzo"] == 6
    assert read_investigator_attributes({"investigator_attributes": {"if": -3}})["if"] == 0


def test_the_prompt_names_effort_and_attributes_without_a_chance():
    legend = build_controlled_variable_legend(
        {
            "place_name": "Muelle",
            "world_clock_minutes": 1200,
            "operational_funds": 100,
            "serious_wound_count": 0,
            "effort_remaining": 5,
            "investigator_attributes": {"im": 4, "if": 8, "c": 4, "o": 4, "co": 4, "m": 4, "s": 4},
        },
        {"nombre": "Akyrion"},
        [],
    )
    placeholders = [variable["placeholder"] for variable in legend["variables"]]
    assert "{{esfuerzo}}" in placeholders
    assert legend["variables"][placeholders.index("{{esfuerzo}}")]["current_value"] == "5"
    assert legend["atributos"][1] == {"significado": "Capacidad física", "valor": 8}
    assert "%" not in legend["instruction"]
    ledger = diff_reality_ledger(
        {"place_name": "Muelle", "world_clock_minutes": 1200, "operational_funds": 100, "serious_wound_count": 0, "effort_remaining": 6, "belonging_units": []},
        {"place_name": "Muelle", "world_clock_minutes": 1200, "operational_funds": 100, "serious_wound_count": 0, "effort_remaining": 5, "belonging_units": []},
    )
    assert {write["variable_name"] for write in ledger["writes"]} == {"esfuerzo"}
    turn_context = DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key",
        state_version=1,
        rules_version="1",
        case_specification={"belongings": [], "persons": [], "scenes": []},
        current_run={
            "public_state": {
                "place_name": "Muelle",
                "world_clock_minutes": 1200,
                "effort_remaining": 3,
                "investigator_attributes": {"im": 4, "if": 8, "c": 4, "o": 4, "co": 4, "m": 4, "s": 4},
                "current_scene_presentation": {"scene_identifier": "pier_arrival"},
            }
        },
    )
    canonical_state = json.loads(build_canonical_character_state_block(turn_context).content_text)
    assert canonical_state["effort_remaining"] == 3
    assert canonical_state["investigator_attributes"]["if"] == 8


def test_forcing_spends_scene_effort_until_only_talk_or_leaving_remains(lighthouse_investigation):
    for remaining_effort in range(case_effort_maximum - 1, -1, -1):
        answer = lighthouse_investigation.write_own_words("Fuerzo el marco con el hombro")
        assert answer.status_code == 200
        assert answer.json()["disposition_name"] == "resolved"
        public_state = lighthouse_investigation.read_current_public_state()["public_state"]
        assert public_state["effort_remaining"] == remaining_effort
        assert public_state["current_scene_presentation"]["scene_identifier"] == "pier_arrival"
    refused_answer = lighthouse_investigation.write_own_words("Fuerzo el marco con el hombro")
    assert refused_answer.status_code == 200
    refused_turn = refused_answer.json()["confirmed_turn"]
    paragraphs = [
        paragraph
        for director_entry in refused_turn["director_entries"]
        for paragraph in director_entry.get("marked_paragraphs", [])
    ]
    assert no_effort_remaining_text in paragraphs
    assert all(effect["kind"] != "effort_spent" for effect in refused_turn["confirmed_effects"])
    assert lighthouse_investigation.read_current_public_state()["public_state"]["effort_remaining"] == 0
    lighthouse_investigation.take_suggested_action("walk_to_tower_foot")
    restored_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert restored_state["current_scene_presentation"]["scene_identifier"] == "tower_foot"
    assert restored_state["effort_remaining"] == case_effort_maximum
