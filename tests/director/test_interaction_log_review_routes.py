import json

from case_start.conftest import profile_headers
from conftest import well_formed_access_key
from director.conftest import containment_path_identifier, death_path_identifier

stored_gemini_access_key = "placeholder_gemini_access_key_for_tests_0003"


def run_simulation(director_client, scripted_path_identifier, injected_failures=()):
    return director_client.post(
        "/api/director/simulations",
        headers=profile_headers,
        json={"scripted_path_identifier": scripted_path_identifier, "injected_failures": list(injected_failures)},
    ).json()


def list_interactions(director_client, **query_parameters):
    answer = director_client.get("/api/director/interactions", headers=profile_headers, params=query_parameters)
    assert answer.status_code == 200, answer.text
    return answer.json()["interactions"]


def test_interactions_are_listed_with_filters(director_client):
    first_report = run_simulation(
        director_client,
        death_path_identifier,
        [
            {"step_number": 1, "purpose_name": "adjudication", "failure_mode_name": "invalid_json"},
            {"step_number": 2, "purpose_name": "narration", "failure_mode_name": "timeout"},
        ],
    )
    second_report = run_simulation(director_client, containment_path_identifier)
    every_interaction = list_interactions(director_client, maximum_count=500)
    assert len(every_interaction) == first_report["recorded_interaction_count"] + second_report["recorded_interaction_count"]
    assert [interaction["sequence_number"] for interaction in every_interaction] == sorted(
        interaction["sequence_number"] for interaction in every_interaction
    )
    assert {interaction["purpose_name"] for interaction in list_interactions(director_client, purpose_name="narration")} == {
        "narration"
    }
    assert {
        interaction["provider_name"] for interaction in list_interactions(director_client, provider_name="synthetic_speech")
    } == {"synthetic_speech"}
    assert list_interactions(director_client, provider_mode_name="real") == []
    assert len(list_interactions(director_client, provider_mode_name="synthetic", maximum_count=500)) == len(
        every_interaction
    )
    failed_interactions = list_interactions(director_client, are_failures_only=True)
    assert sorted(
        (interaction["purpose_name"], interaction["outcome_name"], interaction["was_answer_rejected_by_validation"])
        for interaction in failed_interactions
    ) == [("adjudication", "succeeded", True), ("narration", "failed", False)]
    rejected_interaction = next(
        interaction for interaction in failed_interactions if interaction["was_answer_rejected_by_validation"]
    )
    assert rejected_interaction["generation_attempts"][0]["validation_errors"][0]["error_name"] == (
        "structured_response_missing"
    )
    first_case_identifier = first_report["case_start"]["archive_case_identifier"]
    first_case_interactions = list_interactions(
        director_client, archive_case_identifier=first_case_identifier, maximum_count=500
    )
    first_case_purposes = {interaction["purpose_name"] for interaction in first_case_interactions}
    assert {"whisper_offer_generation", "case_generation", "adjudication", "narration"} <= first_case_purposes
    assert {interaction["purpose_name"] for interaction in every_interaction if interaction["purpose_name"] == "narration_speech"} == {
        "narration_speech"
    }
    assert first_report["case_start"]["spoken_paragraphs"]
    assert 0 < len(first_case_interactions) < len(every_interaction)
    narrated_turn_identifier = first_report["steps"][0]["turn_identifier"]
    assert {
        interaction["purpose_name"]
        for interaction in list_interactions(director_client, turn_identifier=narrated_turn_identifier)
    } == {"narration"}
    boundary_moment = second_report["started_at_utc"]
    later_interactions = list_interactions(director_client, started_from_utc=boundary_moment, maximum_count=500)
    earlier_interactions = list_interactions(director_client, started_until_utc=boundary_moment, maximum_count=500)
    assert len(later_interactions) + len(earlier_interactions) >= len(every_interaction)
    assert 0 < len(later_interactions) < len(every_interaction)
    assert len(list_interactions(director_client, maximum_count=3, skipped_count=2)) == 3
    malformed_range = director_client.get(
        "/api/director/interactions", headers=profile_headers, params={"started_from_utc": "yesterday"}
    )
    assert malformed_range.json() == {"failure_name": "interaction_time_range_malformed"}


def test_one_interaction_is_read_with_its_bodies(director_client):
    run_simulation(director_client, death_path_identifier)
    adjudication = list_interactions(director_client, purpose_name="adjudication")[0]
    detailed_answer = director_client.get(
        f"/api/director/interactions/{adjudication['interaction_identifier']}", headers=profile_headers
    )
    assert detailed_answer.status_code == 200
    detailed_interaction = detailed_answer.json()
    block_label_names = [
        context_block["authority_label_name"] for context_block in detailed_interaction["request_body"]["context_blocks"]
    ]
    assert block_label_names[:3] == ["control", "controlled_variables", "ranked_decision"]
    assert "retrieved_context" in block_label_names
    assert "relevant_rules" in block_label_names
    assert "canonical_character_state" in block_label_names
    assert "untrusted_player_action" in block_label_names
    assert block_label_names[-1] == "output_contract"
    assert detailed_interaction["response_body"]["structured_response"]["adjudication_proposal"]["disposition_name"] == (
        "proposed"
    )
    assert "request_body_file_name" not in detailed_interaction
    absent_answer = director_client.get("/api/director/interactions/absent_interaction", headers=profile_headers)
    assert absent_answer.status_code == 404
    assert absent_answer.json() == {"failure_name": "ai_interaction_not_found"}


def test_summary_counts_failures_repairs_latency_and_tokens(director_client):
    run_simulation(
        director_client,
        death_path_identifier,
        [
            {"step_number": 1, "purpose_name": "adjudication", "failure_mode_name": "impossible_effect"},
            {"step_number": 3, "purpose_name": "adjudication", "failure_mode_name": "timeout"},
        ],
    )
    summary = director_client.get("/api/director/interactions/summary", headers=profile_headers).json()
    assert summary["interaction_count"] == summary["succeeded_interaction_count"] + summary["failed_interaction_count"]
    assert summary["failed_interaction_count"] == 1
    assert summary["failure_counts_by_failure_name"] == {"narrative_provider_timed_out": 1}
    assert summary["rejected_answer_count"] == 1
    assert summary["repair_attempt_count"] == 2
    assert summary["validation_error_counts_by_error_name"] == {"effect_kind_not_allowed": 1}
    assert summary["interaction_counts_by_purpose_name"]["adjudication"] == 7 + 2
    assert set(summary["latency_milliseconds"]) == {"total", "average", "median", "highest"}
    assert (summary["input_token_count"], summary["output_token_count"], summary["unreadable_body_count"]) == (0, 0, 0)
    narration_summary = director_client.get(
        "/api/director/interactions/summary", headers=profile_headers, params={"purpose_name": "narration"}
    ).json()
    assert set(narration_summary["interaction_counts_by_purpose_name"]) == {"narration"}


def test_context_never_reaches_another_profile(director_client, data_directory):
    director_client.app.state.service_dependencies.profile_catalogue.register_profile(
        "second_investigator", "Second investigator"
    )
    run_simulation(director_client, death_path_identifier)
    other_headers = {"X-Profile-Identifier": "second_investigator"}
    assert director_client.get("/api/director/interactions", headers=other_headers).json() == {
        "stored_interaction_count": 0,
        "interactions": [],
    }
    assert list((data_directory / "profiles" / "second_investigator" / "ai_interactions").glob("*.json")) == []


def test_no_stored_body_or_answer_contains_a_key(director_client, access_key_vault, data_directory):
    access_key_vault.store_access_key("gemini", stored_gemini_access_key)
    access_key_vault.store_access_key("elevenlabs", well_formed_access_key)
    report = run_simulation(director_client, containment_path_identifier)
    director_client.post("/api/director/story-connection-check", headers=profile_headers)
    assert report["outcome_name"] == "completed"
    stored_paths = [stored_path for stored_path in data_directory.rglob("*") if stored_path.is_file()]
    assert len(stored_paths) > 50
    for stored_path in stored_paths:
        stored_bytes = stored_path.read_bytes()
        assert stored_gemini_access_key.encode("utf-8") not in stored_bytes, stored_path
        assert well_formed_access_key.encode("utf-8") not in stored_bytes, stored_path
    for interaction in list_interactions(director_client, maximum_count=500):
        detailed_text = director_client.get(
            f"/api/director/interactions/{interaction['interaction_identifier']}", headers=profile_headers
        ).text
        assert stored_gemini_access_key not in detailed_text
        assert well_formed_access_key not in detailed_text
    assert stored_gemini_access_key not in json.dumps(report)


def test_provider_status_and_connection_check(director_client, access_key_vault):
    access_key_vault.is_unavailable = True
    status = director_client.get("/api/director/provider-status").json()
    assert status["story"] == {
        "provider_name": "synthetic_narrative",
        "model_identifier": None,
        "provider_mode_name": "synthetic",
        "is_access_key_required": False,
        "is_access_key_stored": True,
    }
    assert status["voice"]["is_access_key_required"] is False
    connection_check = director_client.post("/api/director/story-connection-check", headers=profile_headers).json()
    assert connection_check["is_director_listening"] is True
    assert list_interactions(director_client, purpose_name="connection_check")[0]["interaction_identifier"] == (
        connection_check["interaction_identifier"]
    )
