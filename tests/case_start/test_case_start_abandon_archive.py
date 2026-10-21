from case_start.conftest import lighthouse_whisper_identifier, profile_headers
from consequences.conftest import LighthouseInvestigation, read_rows

abandon_route = "/api/case-start/archives/current/abandon"


def abandon_archive(test_client, abandon_key):
    return test_client.post(abandon_route, headers=profile_headers, json={"abandon_key": abandon_key})


def play_two_turns(test_client):
    investigation = LighthouseInvestigation(test_client)
    investigation.open_lighthouse_archive()
    investigation.walk_to_the_service_door_lock()
    return investigation


def test_abandoning_allows_a_new_offer_and_a_new_opening(case_start_client, profile_database_path):
    investigation = play_two_turns(case_start_client)
    first_offer_batch_identifier = read_rows(profile_database_path, "SELECT offer_batch_identifier FROM archive_case")[
        0
    ]["offer_batch_identifier"]
    answer = abandon_archive(case_start_client, "abandon_key_0001")
    assert answer.status_code == 200
    abandonment = answer.json()
    assert abandonment["was_anything_abandoned"] is True
    assert abandonment["state_version_at_abandonment"] == investigation.state_version
    assert case_start_client.get("/api/case-start/archives/current", headers=profile_headers).json() == {
        "current_archive": None
    }
    stored_case = read_rows(profile_database_path, "SELECT * FROM archive_case")[0]
    assert stored_case["lifecycle_status_name"] == "closed"
    assert stored_case["closed_at_utc"] == abandonment["abandoned_at_utc"]
    stored_run = read_rows(profile_database_path, "SELECT * FROM archive_run")[0]
    assert stored_run["lifecycle_status_name"] == "ended"
    assert stored_run["archive_run_identifier"] == abandonment["archive_run_identifier"]
    new_offer = case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    assert new_offer.status_code == 200
    stored_batches = read_rows(profile_database_path, "SELECT offer_batch_identifier FROM whisper_offer_batch")
    assert len(stored_batches) == 2
    new_opening = case_start_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": "opening_key_after_abandon", "whisper_identifier": lighthouse_whisper_identifier},
    )
    assert new_opening.status_code == 200
    stored_cases = read_rows(profile_database_path, "SELECT * FROM archive_case ORDER BY archive_number")
    assert [stored_case["lifecycle_status_name"] for stored_case in stored_cases] == ["closed", "open"]
    assert stored_cases[1]["offer_batch_identifier"] != first_offer_batch_identifier
    listed_archives = case_start_client.get("/api/case-start/archives", headers=profile_headers).json()["archives"]
    assert len(listed_archives) == 2


def test_repeating_the_abandon_key_returns_the_stored_answer(case_start_client, profile_database_path):
    play_two_turns(case_start_client)
    first_answer = abandon_archive(case_start_client, "abandon_key_0001")
    case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    assert (
        case_start_client.post(
            "/api/case-start/archives",
            headers=profile_headers,
            json={"opening_key": "opening_key_after_abandon", "whisper_identifier": lighthouse_whisper_identifier},
        ).status_code
        == 200
    )
    repeated_answer = abandon_archive(case_start_client, "abandon_key_0001")
    assert repeated_answer.status_code == 200
    assert repeated_answer.json() == first_answer.json()
    assert len(read_rows(profile_database_path, "SELECT 1 FROM archive_case_abandonment")) == 1
    assert (
        len(read_rows(profile_database_path, "SELECT 1 FROM archive_case WHERE lifecycle_status_name = 'open'")) == 1
    )


def test_nothing_is_abandoned_without_an_open_archive(case_start_client, profile_database_path):
    answer = abandon_archive(case_start_client, "abandon_key_0001")
    assert answer.status_code == 200
    assert answer.json()["was_anything_abandoned"] is False
    assert answer.json()["archive_case_identifier"] is None
    assert abandon_archive(case_start_client, "abandon_key_0001").json() == answer.json()
    assert abandon_archive(case_start_client, "short").status_code == 422
    assert abandon_archive(case_start_client, "short").json() == {"failure_name": "abandon_key_malformed"}
    assert case_start_client.post(abandon_route, json={"abandon_key": "abandon_key_0001"}).json() == {
        "failure_name": "profile_identifier_required"
    }


def test_turns_and_interactions_survive_the_abandonment(case_start_client, profile_database_path):
    play_two_turns(case_start_client)
    counted_table_names = ["confirmed_turn", "log_entry", "run_checkpoint", "ai_interaction", "case_specification"]
    row_counts_before = {
        table_name: len(read_rows(profile_database_path, f"SELECT 1 FROM {table_name}"))
        for table_name in counted_table_names
    }
    assert row_counts_before["confirmed_turn"] == 2
    assert row_counts_before["ai_interaction"] > 0
    assert abandon_archive(case_start_client, "abandon_key_0001").json()["was_anything_abandoned"] is True
    assert {
        table_name: len(read_rows(profile_database_path, f"SELECT 1 FROM {table_name}"))
        for table_name in counted_table_names
    } == row_counts_before
    rejected_action = LighthouseInvestigation(case_start_client)
    rejected_action.state_version = 3
    rejected_action.scene_identifier = "unknown_scene"
    assert rejected_action.send_action_request(
        rejected_action.build_action_request([rejected_action.build_plan_step(1, action_text="look around")])
    ).status_code != 200
    assert len(read_rows(profile_database_path, "SELECT 1 FROM confirmed_turn")) == 2


def test_abandonment_works_with_director_simulation_rows_present(case_start_client, profile_database_path):
    simulation_answer = case_start_client.post(
        "/api/director/simulations",
        headers=profile_headers,
        json={"scripted_path_identifier": "lighthouse_containment_ending"},
    )
    assert simulation_answer.status_code == 200
    simulation_run_count = len(read_rows(profile_database_path, "SELECT 1 FROM director_simulation_run"))
    assert simulation_run_count == 1
    closed_case_count = len(read_rows(profile_database_path, "SELECT 1 FROM archive_case"))
    investigation = play_two_turns(case_start_client)
    abandonment = abandon_archive(case_start_client, "abandon_key_0001").json()
    assert abandonment["was_anything_abandoned"] is True
    assert abandonment["state_version_at_abandonment"] == investigation.state_version
    assert len(read_rows(profile_database_path, "SELECT 1 FROM director_simulation_run")) == simulation_run_count
    stored_cases = read_rows(profile_database_path, "SELECT lifecycle_status_name FROM archive_case")
    assert len(stored_cases) == closed_case_count + 1
    assert {stored_case["lifecycle_status_name"] for stored_case in stored_cases} == {"closed"}
    assert len(read_rows(profile_database_path, "SELECT 1 FROM archive_case_abandonment")) == 1
