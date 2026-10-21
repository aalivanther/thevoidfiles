import json

from case_start.conftest import read_lighthouse_case_specification
from consequences.conftest import read_rows, right_lock_value, right_plate_order_value, service_door_lock_identifier, shutter_plate_frame_identifier
from the_void_files.narrative.context_builder import DirectorTurnContext, build_investigation_record
from the_void_files.narrative.orchestration.journal_facts import build_journal_facts


def read_stored_run(profile_database_path):
    stored_run = read_rows(profile_database_path, "SELECT current_run_json FROM archive_run")[0]
    return json.loads(stored_run["current_run_json"])


def read_public_state(lighthouse_investigation):
    return lighthouse_investigation.read_current_public_state()["public_state"]


def build_record_for_stored_run(stored_run):
    return build_investigation_record(
        DirectorTurnContext(
            profile_identifier="main_chronicle",
            archive_case_identifier="archive_case",
            archive_run_identifier="archive_run",
            action_key="integration_probe",
            state_version=stored_run["public_state"]["confirmed_turn_count"] + 1,
            rules_version="1",
            case_specification=read_lighthouse_case_specification(),
            current_run=stored_run,
        )
    )


def test_the_twelve_integrations_hold_through_one_lighthouse_case(lighthouse_investigation, profile_database_path):
    opened_run = read_stored_run(profile_database_path)
    opened_facts = opened_run["director_private_state"]["committed_facts"]
    opened_state = opened_run["public_state"]
    assert "muelle" in opened_facts["values"]["lugar"].casefold()
    assert opened_facts["values"]["esfuerzo"] == "6"
    assert opened_facts["values"]["heridas"] == "0"
    assert opened_facts["atributos"].keys() == {"im", "if", "c", "o", "co", "m", "s"}
    assert opened_state["effort_remaining"] == 6
    assert {visited_place["place_name"] for visited_place in opened_state["visited_places"]} == {
        opened_state["place_name"]
    }
    assert "puerto cabral" not in opened_state["place_name"].casefold()
    assert isinstance(opened_state["operational_funds"], int)
    assert opened_state["belonging_units"]
    assert opened_state["serious_wound_count"] == 0

    lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    spoken_run = read_stored_run(profile_database_path)
    spoken_record = build_record_for_stored_run(spoken_run)
    relationship_lines = spoken_record["case_relationships"]
    assert relationship_lines
    assert "porcentaje" in spoken_record["case_relationships_instruction"]
    assert all(not any(character.isdigit() for character in line["visible_text"]) for line in relationship_lines)
    assert all("_" not in line["visible_text"] for line in relationship_lines)

    forced_answer = lighthouse_investigation.write_own_words("Fuerzo el marco con el hombro")
    assert forced_answer.status_code == 200
    assert read_public_state(lighthouse_investigation)["effort_remaining"] == 5

    lighthouse_investigation.walk_to_the_service_door_lock()
    walked_state = read_public_state(lighthouse_investigation)
    assert walked_state["effort_remaining"] == 6
    walked_place_names = [visited_place["place_name"] for visited_place in walked_state["visited_places"]]
    assert any("muelle" in place_name.casefold() for place_name in walked_place_names)
    assert any("faro" in place_name.casefold() for place_name in walked_place_names)
    assert len(walked_place_names) == len(set(walked_place_names))
    walked_journal = build_journal_facts(walked_state)
    assert any(fact["kind"] == "lugar" and "faro" in fact["visible_text"].casefold() for fact in walked_journal)

    assert lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value).status_code == 200
    solved_state = read_public_state(lighthouse_investigation)
    assert solved_state["revealed_facts"]
    assert all(revealed_fact["visible_name"].strip() for revealed_fact in solved_state["revealed_facts"])
    assert all("_" not in revealed_fact["visible_name"] for revealed_fact in solved_state["revealed_facts"])
    solved_journal = build_journal_facts(solved_state)
    assert any(fact["kind"] == "hecho" for fact in solved_journal)
    solved_record = build_record_for_stored_run(read_stored_run(profile_database_path))
    assert solved_record["journal_facts_instruction"].startswith("Estos hechos son los del diario")
    assert {fact["visible_text"] for fact in solved_record["journal_facts"]} >= {
        fact["visible_text"] for fact in solved_journal if fact["kind"] == "hecho"
    }

    lighthouse_investigation.take_suggested_action("take_shutter_plates")
    lighthouse_investigation.take_suggested_action("climb_service_staircase")
    lighthouse_investigation.take_suggested_action("mount_shutter_plates")
    assert (
        lighthouse_investigation.attempt_interactive_piece(shutter_plate_frame_identifier, right_plate_order_value).status_code
        == 200
    )
    ending_turn = lighthouse_investigation.take_suggested_action("sign_report_on_the_boat")
    closure_register = ending_turn["archive_outcome"]["closure_register"]
    closed_state = read_stored_run(profile_database_path)["public_state"]
    assert closure_register["place_name"] == closed_state["place_name"]
    assert closure_register["serious_wound_count"] == closed_state["serious_wound_count"]
    assert closure_register["serious_wound_count"] == 0
    assert closure_register["wound_cause_text"] is None
    assert closure_register["solved_piece_names"] == [
        revealed_fact["visible_name"] for revealed_fact in closed_state["revealed_facts"]
    ]
    assert closure_register["visited_place_names"] == list(
        dict.fromkeys(visited_place["place_name"] for visited_place in closed_state["visited_places"])
    )
    assert any("faro" in place_name.casefold() for place_name in closure_register["visited_place_names"])
    closing_paragraphs = [
        paragraph
        for director_entry in ending_turn["director_entries"]
        for paragraph in director_entry.get("marked_paragraphs", [])
    ]
    assert closing_paragraphs
    assert all("ileso" not in paragraph.casefold() for paragraph in closing_paragraphs)
    closed_record = build_record_for_stored_run(read_stored_run(profile_database_path))
    assert closed_record["case_relationships"]
    assert all(
        not any(character.isdigit() for character in line["visible_text"])
        for line in closed_record["case_relationships"]
    )
