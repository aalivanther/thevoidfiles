import copy

import pytest

snapshot_path = "/api/profiles/first_profile/chronicle-snapshot"
closed_chronicles_path = "/api/profiles/first_profile/closed-chronicles"


def build_chronicle_state():
    return {
        "storageFormatVersion": 5,
        "hasAiConfigurationBeenHandled": False,
        "aiConfiguration": None,
        "investigatorProgression": {"level": 1},
        "moduleRecords": {"case_journal": {"entries": ["Primera nota"]}},
        "confirmedTurnCount": 0,
        "archiveRun": {"logEntries": []},
        "chronicleClosure": None,
        "narrationEntries": [],
        "investigator": {"seriousWounds": 0},
    }


def build_closure_record(closure_identifier):
    return {"closureIdentifier": closure_identifier, "investigatorFullName": "Elena Ruiz", "level": 2}


def build_submission(expected_state_version, chronicle_state):
    return {
        "expected_state_version": expected_state_version,
        "storage_format_version": 5,
        "chronicle_state": chronicle_state,
    }


@pytest.fixture
def profile_service_client(synthetic_mode_service_client):
    synthetic_mode_service_client.post(
        "/api/profiles", json={"display_name": "Primera", "profile_identifier": "first_profile"}
    )
    synthetic_mode_service_client.post(
        "/api/profiles", json={"display_name": "Segunda", "profile_identifier": "second_profile"}
    )
    return synthetic_mode_service_client


def test_profile_without_snapshot_answers_the_empty_marker(profile_service_client):
    snapshot_response = profile_service_client.get(snapshot_path)
    assert snapshot_response.status_code == 200
    assert snapshot_response.json() == {
        "has_snapshot": False,
        "state_version": 0,
        "storage_format_version": None,
        "content_hash": None,
        "first_saved_at_utc": None,
        "last_saved_at_utc": None,
        "chronicle_state": None,
    }


def test_snapshot_is_saved_and_read_back_with_module_records(profile_service_client):
    chronicle_state = build_chronicle_state()
    saving_response = profile_service_client.put(snapshot_path, json=build_submission(0, chronicle_state))
    stored_snapshot = profile_service_client.get(snapshot_path).json()
    assert saving_response.status_code == 200
    assert saving_response.json()["state_version"] == 1
    assert stored_snapshot["has_snapshot"] is True
    assert stored_snapshot["state_version"] == 1
    assert stored_snapshot["storage_format_version"] == 5
    assert stored_snapshot["chronicle_state"] == chronicle_state
    assert stored_snapshot["chronicle_state"]["moduleRecords"]["case_journal"] == {"entries": ["Primera nota"]}
    assert stored_snapshot["content_hash"] == saving_response.json()["content_hash"]


def test_state_version_advances_and_stale_writers_are_rejected(profile_service_client):
    first_state = build_chronicle_state()
    second_state = copy.deepcopy(first_state)
    second_state["confirmedTurnCount"] = 1
    stale_state = copy.deepcopy(first_state)
    stale_state["confirmedTurnCount"] = 99
    profile_service_client.put(snapshot_path, json=build_submission(0, first_state))
    second_response = profile_service_client.put(snapshot_path, json=build_submission(1, second_state))
    stale_response = profile_service_client.put(snapshot_path, json=build_submission(1, stale_state))
    ahead_response = profile_service_client.put(snapshot_path, json=build_submission(7, stale_state))
    stored_snapshot = profile_service_client.get(snapshot_path).json()
    assert second_response.json()["state_version"] == 2
    assert stale_response.status_code == 409
    assert stale_response.json() == {"failure_name": "chronicle_snapshot_version_conflict"}
    assert ahead_response.json() == {"failure_name": "chronicle_snapshot_version_conflict"}
    assert stored_snapshot["state_version"] == 2
    assert stored_snapshot["chronicle_state"]["confirmedTurnCount"] == 1
    assert stored_snapshot["first_saved_at_utc"] <= stored_snapshot["last_saved_at_utc"]


def test_first_save_with_a_nonzero_expected_version_is_a_conflict(profile_service_client):
    conflict_response = profile_service_client.put(snapshot_path, json=build_submission(1, build_chronicle_state()))
    assert conflict_response.json() == {"failure_name": "chronicle_snapshot_version_conflict"}
    assert profile_service_client.get(snapshot_path).json()["has_snapshot"] is False


def test_snapshots_of_different_profiles_stay_apart(profile_service_client):
    profile_service_client.put(snapshot_path, json=build_submission(0, build_chronicle_state()))
    assert profile_service_client.get("/api/profiles/second_profile/chronicle-snapshot").json()["has_snapshot"] is False


@pytest.mark.parametrize(
    "removed_key_name", ["storageFormatVersion", "narrationEntries", "archiveRun", "investigator", "investigatorProgression"]
)
def test_chronicle_state_missing_a_required_key_is_unusable(profile_service_client, removed_key_name):
    chronicle_state = build_chronicle_state()
    del chronicle_state[removed_key_name]
    rejection_response = profile_service_client.put(snapshot_path, json=build_submission(0, chronicle_state))
    assert rejection_response.status_code == 422
    assert rejection_response.json() == {"failure_name": "chronicle_state_unusable"}


def test_chronicle_state_with_wrongly_shaped_parts_is_unusable(profile_service_client):
    state_without_log_entries = build_chronicle_state()
    state_without_log_entries["archiveRun"] = {}
    state_with_listed_module_records = build_chronicle_state()
    state_with_listed_module_records["moduleRecords"] = []
    state_with_unusable_closure = build_chronicle_state()
    state_with_unusable_closure["chronicleClosure"] = {"closureIdentifier": ""}
    assert profile_service_client.put(snapshot_path, json=build_submission(0, state_without_log_entries)).json() == {
        "failure_name": "chronicle_state_unusable"
    }
    assert profile_service_client.put(
        snapshot_path, json=build_submission(0, state_with_listed_module_records)
    ).json() == {"failure_name": "chronicle_state_unusable"}
    assert profile_service_client.put(snapshot_path, json=build_submission(0, state_with_unusable_closure)).json() == {
        "failure_name": "chronicle_closure_record_unusable"
    }


def test_storage_format_version_must_match_the_chronicle_state(profile_service_client):
    chronicle_state = build_chronicle_state()
    chronicle_state["storageFormatVersion"] = 4
    mismatch_response = profile_service_client.put(snapshot_path, json=build_submission(0, chronicle_state))
    assert mismatch_response.json() == {"failure_name": "chronicle_storage_format_version_mismatched"}


def test_malformed_envelopes_are_rejected(profile_service_client):
    chronicle_state = build_chronicle_state()
    malformed_submissions = [
        {"storage_format_version": 5, "chronicle_state": chronicle_state},
        {"expected_state_version": -1, "storage_format_version": 5, "chronicle_state": chronicle_state},
        {"expected_state_version": "0", "storage_format_version": 5, "chronicle_state": chronicle_state},
        {"expected_state_version": 0, "storage_format_version": 5, "chronicle_state": []},
        {"expected_state_version": 0, "storage_format_version": 5, "chronicle_state": chronicle_state, "extra": 1},
    ]
    for malformed_submission in malformed_submissions:
        rejection_response = profile_service_client.put(snapshot_path, json=malformed_submission)
        assert rejection_response.status_code == 422
        assert rejection_response.json() == {"failure_name": "request_invalid"}


def test_snapshot_routes_name_absent_and_malformed_profiles(profile_service_client):
    assert profile_service_client.get("/api/profiles/absent_profile/chronicle-snapshot").json() == {
        "failure_name": "profile_not_found"
    }
    assert profile_service_client.put(
        "/api/profiles/Not-Valid/chronicle-snapshot", json=build_submission(0, build_chronicle_state())
    ).json() == {"failure_name": "profile_identifier_malformed"}


def test_closure_inside_a_snapshot_joins_the_closed_chronicles_and_survives_a_new_chronicle(profile_service_client):
    closed_state = build_chronicle_state()
    closed_state["chronicleClosure"] = build_closure_record("closure_0001")
    profile_service_client.put(snapshot_path, json=build_submission(0, closed_state))
    witnessed_state = copy.deepcopy(closed_state)
    witnessed_state["chronicleClosure"]["hasClosureSequenceBeenWitnessed"] = True
    profile_service_client.put(snapshot_path, json=build_submission(1, witnessed_state))
    profile_service_client.put(snapshot_path, json=build_submission(2, build_chronicle_state()))
    closed_chronicles = profile_service_client.get(closed_chronicles_path).json()["closed_chronicles"]
    assert len(closed_chronicles) == 1
    assert closed_chronicles[0]["closure_identifier"] == "closure_0001"
    assert closed_chronicles[0]["closure_record"] == witnessed_state["chronicleClosure"]
    assert profile_service_client.get("/api/profiles/second_profile/closed-chronicles").json() == {
        "closed_chronicles": []
    }


def test_rejected_snapshot_does_not_record_its_closure(profile_service_client):
    closed_state = build_chronicle_state()
    closed_state["chronicleClosure"] = build_closure_record("closure_0001")
    profile_service_client.put(snapshot_path, json=build_submission(3, closed_state))
    assert profile_service_client.get(closed_chronicles_path).json() == {"closed_chronicles": []}


def test_closed_chronicles_are_saved_directly_in_order(profile_service_client):
    for closure_identifier in ("closure_0001", "closure_0002"):
        saving_response = profile_service_client.put(
            f"{closed_chronicles_path}/{closure_identifier}",
            json={"closure_record": build_closure_record(closure_identifier)},
        )
        assert saving_response.json() == {"closure_identifier": closure_identifier, "was_saved": True}
    closed_chronicles = profile_service_client.get(closed_chronicles_path).json()["closed_chronicles"]
    assert [closed_chronicle["closure_identifier"] for closed_chronicle in closed_chronicles] == [
        "closure_0001",
        "closure_0002",
    ]


def test_closed_chronicle_with_a_different_identifier_is_unusable(profile_service_client):
    rejection_response = profile_service_client.put(
        f"{closed_chronicles_path}/closure_0001", json={"closure_record": build_closure_record("closure_0002")}
    )
    assert rejection_response.status_code == 422
    assert rejection_response.json() == {"failure_name": "chronicle_closure_record_unusable"}
