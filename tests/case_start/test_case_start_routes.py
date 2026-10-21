import json
import sqlite3

import pytest

from case_start.conftest import (
    ScriptedNarrativeProvider,
    build_broken_case_specification,
    lighthouse_whisper_identifier,
    open_service_client,
    profile_headers,
    read_lighthouse_case_specification,
)

first_opening_key = "opening_key_0001"
private_material_markers = (
    "Elvira",
    "private_truth",
    "private_solution",
    "private_rule_checks",
    "chosen_symbols",
    "shift_positions",
    "free_text_intent_pattern_sources",
    "director_private_state",
    "specification_json",
    "prose_solution_pattern_sources",
    "death_became_the_tenth",
)


def read_rows(database_path, query_text):
    connection = sqlite3.connect(str(database_path))
    connection.row_factory = sqlite3.Row
    try:
        return connection.execute(query_text).fetchall()
    finally:
        connection.close()


def open_lighthouse_archive(test_client, opening_key=first_opening_key):
    return test_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": opening_key, "whisper_identifier": lighthouse_whisper_identifier},
    )


def test_offered_whispers_are_generated_once_and_stay_stable(case_start_client, profile_database_path):
    first_answer = case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    second_answer = case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    assert first_answer.status_code == 200
    assert first_answer.json() == second_answer.json()
    assert [offered_whisper["identifier"] for offered_whisper in first_answer.json()["offered_whispers"]][0] == (
        lighthouse_whisper_identifier
    )
    assert len(first_answer.json()["offered_whispers"]) == 4
    assert [offered_whisper["ordinal_label"] for offered_whisper in first_answer.json()["offered_whispers"]] == [
        "Primer susurro",
        "Segundo susurro",
        "Tercer susurro",
        "Cuarto susurro",
    ]
    assert first_answer.json()["chosen_whisper_identifier"] is None
    interaction_rows = read_rows(profile_database_path, "SELECT purpose_name, outcome_name FROM ai_interaction")
    assert [tuple(interaction_row) for interaction_row in interaction_rows] == [("whisper_offer_generation", "succeeded")]


def test_opening_an_archive_persists_everything_before_answering(case_start_client, profile_database_path, data_directory):
    offer_batch_identifier = case_start_client.get("/api/case-start/whispers", headers=profile_headers).json()[
        "offer_batch_identifier"
    ]
    opening_answer = open_lighthouse_archive(case_start_client)
    assert opening_answer.status_code == 200
    opening_payload = opening_answer.json()
    assert opening_payload["archive"]["archive_number_label"] == "01"
    assert opening_payload["archive"]["whisper_identifier"] == lighthouse_whisper_identifier
    assert opening_payload["archive_run"]["state_version"] == 1
    opening_resolution = opening_payload["opening_resolution"]
    assert opening_resolution["opening_entries"][0]["voice"] == "director_narration"
    assert len(opening_resolution["opening_entries"][0]["marked_paragraphs"]) == 4
    first_scene_presentation = opening_resolution["first_scene_presentation"]
    assert first_scene_presentation["scene_identifier"] == "pier_arrival"
    assert [present_person["is_name_known"] for present_person in first_scene_presentation["present_persons"]] == [
        False,
        False,
    ]
    assert first_scene_presentation["suggested_actions"]
    assert all("Renata" not in suggested_action["visible_text"] for suggested_action in first_scene_presentation["suggested_actions"])
    assert len(opening_resolution["initial_relationship_levels"]) == 4
    assert opening_resolution["initial_relationship_levels"][0]["fictional_date_label"].startswith("Archivo 01")

    archive_case_rows = read_rows(profile_database_path, "SELECT * FROM archive_case")
    assert len(archive_case_rows) == 1
    assert archive_case_rows[0]["lifecycle_status_name"] == "open"
    assert archive_case_rows[0]["offer_batch_identifier"] == offer_batch_identifier
    specification_row = read_rows(profile_database_path, "SELECT * FROM case_specification")[0]
    assert json.loads(specification_row["specification_json"]) == read_lighthouse_case_specification()
    assert specification_row["rules_version"].startswith("rulebook_sha256_")
    assert specification_row["accepted_attempt_number"] == 1
    generation_interaction_row = read_rows(
        profile_database_path,
        "SELECT * FROM ai_interaction WHERE interaction_identifier = "
        f"'{specification_row['generation_interaction_identifier']}'",
    )[0]
    assert generation_interaction_row["purpose_name"] == "case_generation"
    assert generation_interaction_row["outcome_name"] == "succeeded"
    recorded_response_body = json.loads(
        (
            data_directory / "profiles" / "first_investigator" / "ai_interactions"
            / generation_interaction_row["response_body_file_name"]
        ).read_text(encoding="utf-8")
    )
    assert recorded_response_body["structured_response"]["case_specification"]["whisper_identifier"] == (
        lighthouse_whisper_identifier
    )
    offered_whisper_rows = read_rows(profile_database_path, "SELECT * FROM offered_whisper ORDER BY ordinal_number")
    assert [offered_whisper_row["was_chosen"] for offered_whisper_row in offered_whisper_rows] == [1, 0, 0, 0]
    assert {offered_whisper_row["archive_case_identifier"] for offered_whisper_row in offered_whisper_rows} == {
        archive_case_rows[0]["archive_case_identifier"]
    }
    archive_run_row = read_rows(profile_database_path, "SELECT * FROM archive_run")[0]
    assert archive_run_row["state_version"] == 1
    assert archive_run_row["initial_run_json"] == archive_run_row["current_run_json"]
    assert archive_run_row["archive_run_identifier"] == opening_payload["archive_run"]["archive_run_identifier"]
    assert json.loads(archive_run_row["initial_run_json"])["public_state"]["operational_funds"] == 1800
    attempt_rows = read_rows(profile_database_path, "SELECT * FROM case_generation_attempt")
    assert [(attempt_row["attempt_number"], attempt_row["outcome_name"]) for attempt_row in attempt_rows] == [
        (1, "accepted")
    ]


def test_repeating_the_opening_key_returns_the_same_archive(case_start_client, profile_database_path):
    case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    first_answer = open_lighthouse_archive(case_start_client)
    interaction_count_after_first_opening = len(read_rows(profile_database_path, "SELECT 1 FROM ai_interaction"))
    second_answer = open_lighthouse_archive(case_start_client)
    assert second_answer.status_code == 200
    assert second_answer.json() == first_answer.json()
    assert len(read_rows(profile_database_path, "SELECT 1 FROM archive_case")) == 1
    assert len(read_rows(profile_database_path, "SELECT 1 FROM archive_run")) == 1
    assert len(read_rows(profile_database_path, "SELECT 1 FROM ai_interaction")) == interaction_count_after_first_opening

    other_whisper_answer = case_start_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": first_opening_key, "whisper_identifier": "night_shift_fourth_floor"},
    )
    assert (other_whisper_answer.status_code, other_whisper_answer.json()) == (
        409,
        {"failure_name": "opening_key_reused_for_other_whisper"},
    )
    other_key_answer = open_lighthouse_archive(case_start_client, "opening_key_0002")
    assert (other_key_answer.status_code, other_key_answer.json()) == (409, {"failure_name": "archive_already_open"})


def test_invalid_proposal_is_recorded_and_repaired(data_directory, access_key_vault, profile_database_path):
    scripted_provider = ScriptedNarrativeProvider([build_broken_case_specification(), read_lighthouse_case_specification()])
    with open_service_client(data_directory, access_key_vault, scripted_provider) as test_client:
        test_client.get("/api/case-start/whispers", headers=profile_headers)
        opening_answer = open_lighthouse_archive(test_client)
    assert opening_answer.status_code == 200
    attempt_rows = read_rows(profile_database_path, "SELECT * FROM case_generation_attempt ORDER BY attempt_number")
    assert [attempt_row["outcome_name"] for attempt_row in attempt_rows] == ["rejected", "accepted"]
    recorded_error_names = {
        validation_error["error_name"] for validation_error in json.loads(attempt_rows[0]["validation_errors_json"])
    }
    assert recorded_error_names == {"scene_reference_unknown", "interactive_piece_solution_length_mismatch"}
    case_generation_requests = [
        received_request
        for received_request in scripted_provider.received_requests
        if received_request.purpose_name == "case_generation"
    ]
    assert len(case_generation_requests) == 2
    repair_control_block = json.loads(case_generation_requests[1].context_blocks[0].content_text)
    assert repair_control_block["repair_attempt_number"] == 1
    assert [context_block.authority_label_name for context_block in case_generation_requests[0].context_blocks] == [
        "control",
        "chosen_whisper",
        "investigator_profile",
        "relevant_rules",
        "output_contract",
    ]
    assert case_generation_requests[1].context_blocks[-1].authority_label_name == "rejected_proposal_review"
    assert "absent_scene" in case_generation_requests[1].context_blocks[-1].content_text
    specification_row = read_rows(profile_database_path, "SELECT * FROM case_specification")[0]
    assert specification_row["accepted_attempt_number"] == 2
    assert specification_row["generation_interaction_identifier"] == attempt_rows[1]["interaction_identifier"]
    assert specification_row["provider_name"] == "scripted_narrative"
    interaction_rows = read_rows(profile_database_path, "SELECT purpose_name FROM ai_interaction ORDER BY sequence_number")
    assert [interaction_row["purpose_name"] for interaction_row in interaction_rows] == [
        "whisper_offer_generation",
        "case_generation",
        "case_generation",
    ]


def test_archive_is_not_opened_when_every_proposal_is_invalid(data_directory, access_key_vault, profile_database_path):
    scripted_provider = ScriptedNarrativeProvider([build_broken_case_specification(), {"scenes": []}, None])
    with open_service_client(data_directory, access_key_vault, scripted_provider) as test_client:
        test_client.get("/api/case-start/whispers", headers=profile_headers)
        opening_answer = open_lighthouse_archive(test_client)
        current_answer = test_client.get("/api/case-start/archives/current", headers=profile_headers)
    assert (opening_answer.status_code, opening_answer.json()) == (502, {"failure_name": "case_generation_rejected"})
    assert current_answer.json() == {"current_archive": None}
    assert read_rows(profile_database_path, "SELECT 1 FROM archive_case") == []
    assert read_rows(profile_database_path, "SELECT 1 FROM archive_run") == []
    attempt_rows = read_rows(profile_database_path, "SELECT outcome_name FROM case_generation_attempt")
    assert [attempt_row["outcome_name"] for attempt_row in attempt_rows] == ["rejected", "rejected", "rejected"]
    assert len(read_rows(profile_database_path, "SELECT 1 FROM ai_interaction WHERE purpose_name = 'case_generation'")) == 3


def test_private_director_material_never_leaves_the_service(case_start_client):
    answers = [
        case_start_client.get("/api/case-start/whispers", headers=profile_headers),
        open_lighthouse_archive(case_start_client),
        case_start_client.get("/api/case-start/whispers", headers=profile_headers),
        case_start_client.get("/api/case-start/archives/current", headers=profile_headers),
        case_start_client.get("/api/case-start/archives", headers=profile_headers),
    ]
    for answer in answers:
        assert answer.status_code == 200
        for private_material_marker in private_material_markers:
            assert private_material_marker not in answer.text
    assert answers[2].json()["chosen_whisper_identifier"] == lighthouse_whisper_identifier
    current_archive = answers[3].json()["current_archive"]
    assert current_archive["opening"] == answers[1].json()
    assert current_archive["archive_run"]["state_version"] == 1
    assert current_archive["archive_run"]["public_state"]["current_scene_presentation"]["scene_identifier"] == "pier_arrival"
    assert [archive["archive_title"] for archive in answers[4].json()["archives"]] == [
        answers[1].json()["archive"]["archive_title"]
    ]


def test_requests_are_refused_with_named_failures(case_start_client, profile_database_path):
    assert case_start_client.get("/api/case-start/whispers").json() == {"failure_name": "profile_identifier_required"}
    absent_profile_answer = case_start_client.get(
        "/api/case-start/archives", headers={"X-Profile-Identifier": "absent_profile"}
    )
    assert (absent_profile_answer.status_code, absent_profile_answer.json()) == (404, {"failure_name": "profile_not_found"})
    before_offer_answer = open_lighthouse_archive(case_start_client)
    assert (before_offer_answer.status_code, before_offer_answer.json()) == (409, {"failure_name": "whisper_not_offered"})
    case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    malformed_key_answer = open_lighthouse_archive(case_start_client, "short")
    assert (malformed_key_answer.status_code, malformed_key_answer.json()) == (422, {"failure_name": "opening_key_malformed"})
    unknown_whisper_answer = case_start_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": first_opening_key, "whisper_identifier": "absent_whisper"},
    )
    assert (unknown_whisper_answer.status_code, unknown_whisper_answer.json()) == (409, {"failure_name": "whisper_not_offered"})
    missing_material_answer = case_start_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": first_opening_key, "whisper_identifier": "night_shift_fourth_floor"},
    )
    assert (missing_material_answer.status_code, missing_material_answer.json()) == (
        409,
        {"failure_name": "synthetic_case_material_missing"},
    )
    failed_interaction_rows = read_rows(profile_database_path, "SELECT failure_name FROM ai_interaction WHERE outcome_name = 'failed'")
    assert [failed_interaction_row["failure_name"] for failed_interaction_row in failed_interaction_rows] == [
        "synthetic_case_material_missing"
    ]
    assert read_rows(profile_database_path, "SELECT 1 FROM archive_case") == []


def test_stored_specification_and_initial_run_are_immutable(case_start_client, profile_database_path):
    case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    open_lighthouse_archive(case_start_client)
    connection = sqlite3.connect(str(profile_database_path))
    try:
        for forbidden_statement in (
            "UPDATE case_specification SET specification_json = '{}'",
            "DELETE FROM case_specification",
            "UPDATE archive_run SET initial_run_json = '{}'",
            "UPDATE archive_run SET state_version = 0",
            "DELETE FROM archive_case",
            "UPDATE offered_whisper SET was_chosen = 1",
        ):
            with pytest.raises(sqlite3.IntegrityError):
                connection.execute(forbidden_statement)
        connection.execute("UPDATE archive_run SET current_run_json = '{}', state_version = 2")
        connection.commit()
    finally:
        connection.close()
