import json

from case_start.conftest import profile_headers
from director.conftest import containment_path_identifier, death_path_identifier, read_rows


def run_simulation(director_client, scripted_path_identifier, **request_fields):
    return director_client.post(
        "/api/director/simulations",
        headers=profile_headers,
        json={"scripted_path_identifier": scripted_path_identifier, **request_fields},
    )


def test_containment_path_is_played_end_to_end(director_client, profile_database_path, profile_directory):
    answer = run_simulation(director_client, containment_path_identifier)
    assert answer.status_code == 200
    report = answer.json()
    assert report["outcome_name"] == "completed"
    assert report["failures"] == []
    assert report["reached_archive_outcome_kind_name"] == "archive_ended_alive"
    assert report["is_archive_closed"] is True
    assert report["played_step_count"] == report["scripted_step_count"] == 10
    resolved_versions = [
        step["state_version_after"] for step in report["steps"] if step["disposition_name"] == "resolved"
    ]
    assert resolved_versions == sorted(resolved_versions)
    assert len(set(resolved_versions)) == len(resolved_versions)
    assert report["generated_audio_count"] > 0
    assert report["case_start"]["spoken_paragraphs"]
    assert all(step["spoken_paragraphs"] == [] for step in report["steps"])
    purposes = {
        interaction_row["purpose_name"]
        for interaction_row in read_rows(profile_database_path, "SELECT purpose_name FROM ai_interaction")
    }
    assert {
        "whisper_offer_generation",
        "case_generation",
        "adjudication",
        "narration",
        "piece_assistance",
        "chapter_summary",
        "narration_speech",
    } <= purposes
    audio_rows = read_rows(profile_database_path, "SELECT audio_file_name FROM narration_audio")
    assert len(audio_rows) == report["generated_audio_count"]
    for audio_row in audio_rows:
        assert (profile_directory / "narration_audio" / audio_row["audio_file_name"]).is_file()
    for step in report["steps"]:
        assert step["generations"], step
        for generation in step["generations"]:
            assert generation["was_accepted"] is True
    stored_runs = director_client.get("/api/director/simulations", headers=profile_headers).json()["simulations"]
    assert [stored_run["simulation_run_identifier"] for stored_run in stored_runs] == [
        report["simulation_run_identifier"]
    ]
    stored_report = director_client.get(
        f"/api/director/simulations/{report['simulation_run_identifier']}", headers=profile_headers
    ).json()
    assert stored_report == report


def test_death_path_closes_the_chronicle(director_client, profile_database_path):
    report = run_simulation(director_client, death_path_identifier).json()
    assert report["outcome_name"] == "completed"
    assert report["reached_archive_outcome_kind_name"] == "chronicle_closed_by_death"
    assert report["failures"] == []
    assert read_rows(profile_database_path, "SELECT lifecycle_status_name FROM archive_case")[0][
        "lifecycle_status_name"
    ] == "closed"


def test_second_run_is_reproducible_and_served_from_cache(director_client, profile_database_path):
    first_report = run_simulation(director_client, containment_path_identifier).json()
    second_report = run_simulation(director_client, containment_path_identifier).json()
    assert second_report["outcome_name"] == "completed"
    assert second_report["generated_audio_count"] == 0
    assert second_report["cached_audio_count"] == first_report["generated_audio_count"] + first_report["cached_audio_count"]
    assert second_report["state_versions"] == first_report["state_versions"]
    assert [step["spoken_paragraphs"] for step in second_report["steps"]] == [
        [{**spoken_paragraph, "was_served_from_cache": True} for spoken_paragraph in step["spoken_paragraphs"]]
        for step in first_report["steps"]
    ]
    assert second_report["case_start"]["archive_number"] == 2
    assert len(read_rows(profile_database_path, "SELECT 1 FROM director_simulation_run")) == 2


def test_injected_failures_are_recorded_and_repaired(director_client, profile_database_path):
    report = run_simulation(
        director_client,
        containment_path_identifier,
        injected_failures=[
            {"step_number": 1, "purpose_name": "adjudication", "failure_mode_name": "invalid_json"},
            {"step_number": 2, "purpose_name": "adjudication", "failure_mode_name": "impossible_effect"},
            {"step_number": 4, "purpose_name": "adjudication", "failure_mode_name": "stale_state_version"},
            {"step_number": 5, "purpose_name": "narration", "failure_mode_name": "timeout"},
            {"step_number": 6, "purpose_name": "narration", "failure_mode_name": "impossible_effect"},
        ],
    ).json()
    assert report["outcome_name"] == "completed"
    assert [(failure["step_number"], failure["failure_name"]) for failure in report["failures"]] == [
        (1, "director_answer_rejected"),
        (2, "director_answer_rejected"),
        (4, "director_answer_rejected"),
        (5, "narrative_provider_timed_out"),
        (6, "director_answer_rejected"),
    ]
    attempt_rows = read_rows(
        profile_database_path,
        "SELECT purpose_name, attempt_number, outcome_name, failure_name, validation_errors_json "
        "FROM director_generation_attempt WHERE outcome_name != 'accepted' ORDER BY sequence_number",
    )
    assert [(attempt_row["outcome_name"], attempt_row["failure_name"]) for attempt_row in attempt_rows] == [
        ("rejected", None),
        ("rejected", None),
        ("rejected", None),
        ("provider_failed", "narrative_provider_timed_out"),
        ("rejected", None),
    ]
    assert "structured_response_missing" in attempt_rows[0]["validation_errors_json"]
    assert "effect_kind_not_allowed" in attempt_rows[1]["validation_errors_json"]
    assert "state_version_stale" in attempt_rows[2]["validation_errors_json"]
    assert "extra_forbidden" in attempt_rows[4]["validation_errors_json"]
    failed_rows = read_rows(profile_database_path, "SELECT failure_name FROM ai_interaction WHERE outcome_name = 'failed'")
    assert [failed_row["failure_name"] for failed_row in failed_rows] == ["narrative_provider_timed_out"]
    repaired_step = report["steps"][0]["generations"][0]
    assert [attempt["outcome_name"] for attempt in repaired_step["attempts"]] == ["rejected", "accepted"]


def test_exhausted_adjudication_stops_the_run_without_confirming_the_turn(director_client, profile_database_path):
    report = run_simulation(
        director_client,
        containment_path_identifier,
        injected_failures=[
            {
                "step_number": 2,
                "purpose_name": "adjudication",
                "failure_mode_name": "impossible_effect",
                "failing_attempt_count": 3,
            }
        ],
    ).json()
    assert report["outcome_name"] == "failed"
    assert report["played_step_count"] == 2
    assert "director_adjudication_exhausted" in [failure["failure_name"] for failure in report["failures"]]
    assert len(read_rows(profile_database_path, "SELECT 1 FROM confirmed_turn")) == 1
    blocked_answer = run_simulation(director_client, containment_path_identifier)
    assert blocked_answer.status_code == 409
    assert blocked_answer.json() == {"failure_name": "simulation_needs_closed_archive"}


def test_exhausted_narration_falls_back_to_the_confirmed_text(director_client):
    report = run_simulation(
        director_client,
        death_path_identifier,
        injected_failures=[
            {"step_number": 1, "purpose_name": "narration", "failure_mode_name": "invalid_json", "failing_attempt_count": 3}
        ],
    ).json()
    assert report["outcome_name"] == "completed"
    assert report["steps"][0]["was_engine_text_used_as_fallback"] is True
    assert report["steps"][0]["spoken_paragraphs"] == []
    assert report["case_start"]["spoken_paragraphs"]


def test_requests_are_validated(director_client):
    assert run_simulation(director_client, "absent_path").json() == {"failure_name": "scripted_path_unknown"}
    assert director_client.post(
        "/api/director/simulations", json={"scripted_path_identifier": containment_path_identifier}
    ).json() == {"failure_name": "profile_identifier_required"}
    misplaced_injection = run_simulation(
        director_client,
        containment_path_identifier,
        injected_failures=[{"step_number": 1, "purpose_name": "narration", "failure_mode_name": "stale_state_version"}],
    )
    assert misplaced_injection.status_code == 422
    scripted_paths = director_client.get("/api/director/scripted-paths").json()
    assert [scripted_path["scripted_path_identifier"] for scripted_path in scripted_paths["scripted_paths"]] == [
        containment_path_identifier,
        death_path_identifier,
    ]


def test_spoken_text_uses_the_registered_name_without_markup(director_client, profile_directory):
    chronicle_state = {
        "storageFormatVersion": 1,
        "narrationEntries": [],
        "archiveRun": {"logEntries": []},
        "investigator": {},
        "investigatorProgression": {},
        "investigatorRegistration": {
            "fullName": "Elvira Montalbano Ruiz",
            "residencePlace": "Valparaíso",
            "originPlace": "Iquique",
            "birthDate": {"day": 3, "month": 5, "year": 1990},
            "relationalAnchor": {"kind": "none"},
        },
    }
    saved_snapshot = director_client.put(
        "/api/profiles/first_investigator/chronicle-snapshot",
        json={"expected_state_version": 0, "storage_format_version": 1, "chronicle_state": chronicle_state},
    )
    assert saved_snapshot.status_code == 200, saved_snapshot.text
    report = run_simulation(director_client, death_path_identifier).json()
    assert report["outcome_name"] == "completed"
    spoken_texts = [
        json.loads(request_path.read_text(encoding="utf-8"))["text"]
        for request_path in (profile_directory / "ai_interactions").glob("*_request.json")
        if '"voice_identifier"' in request_path.read_text(encoding="utf-8")
    ]
    assert spoken_texts
    assert any("Elvira" in spoken_text for spoken_text in spoken_texts)
    for spoken_text in spoken_texts:
        assert "{{" not in spoken_text and "[[" not in spoken_text and "]]" not in spoken_text
