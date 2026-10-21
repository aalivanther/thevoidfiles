from case_start.conftest import lighthouse_whisper_identifier, profile_headers, profile_identifier
from consequences.conftest import read_rows

from the_void_files.application.use_cases.case_start_reset_case_material import (
    build_chronicle_state_without_open_archive,
)

reset_route = "/api/case-start/case-material/reset"
snapshot_route = f"/api/profiles/{profile_identifier}/chronicle-snapshot"


def build_identity_preserving_chronicle_state(chosen_whisper_identifier):
    return {
        "storageFormatVersion": 5,
        "hasAiConfigurationBeenHandled": True,
        "aiConfiguration": {"story": "gemini", "wasSkipped": False},
        "investigatorProgression": {
            "level": 1,
            "unspentExperiencePoints": 0,
            "lifetimeExperiencePoints": 0,
            "resolvedArchiveCount": 2,
            "personalFunds": 420,
            "attributeImprovementCounts": {},
            "investigatedWhisperIdentifiers": [chosen_whisper_identifier],
        },
        "moduleRecords": {"case_journal": {"entries": ["Nota de Elena"]}},
        "investigatorRegistration": {
            "fullName": "Elena Ruiz",
            "gender": "feminine",
            "birthDate": {"day": 3, "month": 4, "year": 1988},
            "originPlace": "Valparaíso",
            "residencePlace": "Ciudad de México",
            "relationalAnchor": {"kind": "uprooted"},
        },
        "investigatorAttributes": {"im": 4, "if": 5, "c": 5, "o": 4, "co": 5, "m": 5, "s": 2},
        "hasOriginNarrationBeenWitnessed": True,
        "hasThresholdNarrationBeenWitnessed": True,
        "oicnauStance": "sanctioned_operative",
        "hasOicnauContactBeenConcluded": True,
        "chosenWhisperIdentifier": chosen_whisper_identifier,
        "confirmedTurnCount": 3,
        "archiveRun": {"logEntries": [{"voice": "director_narration"}], "stateVersion": 4},
        "chronicleClosure": None,
        "narrationEntries": [{"kind": "director"}],
        "investigator": {
            "investigatorName": "Elena",
            "level": 1,
            "seriousWoundsSuffered": 1,
            "operationalFunds": 900,
            "personalFunds": 420,
            "belongingUnits": {"signal_flare": 0, "hand_lantern": 1, "sealed_evidence_bag": 1},
            "placeName": "Depósito Subterráneo",
            "worldClockMinutes": 207,
        },
        "haveImprovementsBeenConfirmed": True,
    }


def save_snapshot(test_client, expected_state_version, chronicle_state):
    return test_client.put(
        snapshot_route,
        json={
            "expected_state_version": expected_state_version,
            "storage_format_version": 5,
            "chronicle_state": chronicle_state,
        },
    )


def test_build_chronicle_state_without_open_archive_keeps_the_investigator_identity():
    stripped_chronicle_state = build_chronicle_state_without_open_archive(
        build_identity_preserving_chronicle_state(lighthouse_whisper_identifier)
    )
    assert stripped_chronicle_state["chosenWhisperIdentifier"] is None
    assert stripped_chronicle_state["confirmedTurnCount"] == 0
    assert stripped_chronicle_state["archiveRun"]["logEntries"] == []
    assert stripped_chronicle_state["archiveRun"]["stateVersion"] == 0
    assert stripped_chronicle_state["narrationEntries"] == []
    assert stripped_chronicle_state["investigatorRegistration"]["fullName"] == "Elena Ruiz"
    assert stripped_chronicle_state["investigatorAttributes"]["if"] == 5
    assert stripped_chronicle_state["oicnauStance"] == "sanctioned_operative"
    assert stripped_chronicle_state["hasAiConfigurationBeenHandled"] is True
    assert stripped_chronicle_state["aiConfiguration"]["story"] == "gemini"
    assert stripped_chronicle_state["hasOriginNarrationBeenWitnessed"] is True
    assert stripped_chronicle_state["hasThresholdNarrationBeenWitnessed"] is True
    assert stripped_chronicle_state["hasOicnauContactBeenConcluded"] is True
    assert stripped_chronicle_state["moduleRecords"]["case_journal"]["entries"] == ["Nota de Elena"]
    assert stripped_chronicle_state["investigatorProgression"]["resolvedArchiveCount"] == 2
    assert stripped_chronicle_state["investigatorProgression"]["investigatedWhisperIdentifiers"] == []
    assert stripped_chronicle_state["investigator"]["seriousWoundsSuffered"] == 1
    assert stripped_chronicle_state["investigator"]["belongingUnits"]["signal_flare"] == 2
    assert stripped_chronicle_state["haveImprovementsBeenConfirmed"] is False


def test_resetting_case_material_keeps_the_account_and_allows_a_new_opening(
    case_start_client, profile_database_path
):
    case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    opening_answer = case_start_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": "opening_key_before_reset", "whisper_identifier": lighthouse_whisper_identifier},
    )
    assert opening_answer.status_code == 200
    interaction_count_before_reset = len(read_rows(profile_database_path, "SELECT 1 FROM ai_interaction"))
    save_answer = save_snapshot(
        case_start_client, 0, build_identity_preserving_chronicle_state(lighthouse_whisper_identifier)
    )
    assert save_answer.status_code == 200
    reset_answer = case_start_client.post(reset_route, headers=profile_headers)
    assert reset_answer.status_code == 200
    reset_payload = reset_answer.json()
    assert reset_payload["cleared_archive_case_count"] == 1
    assert reset_payload["cleared_whisper_offer_batch_count"] == 1
    assert reset_payload["was_chronicle_snapshot_stripped"] is True
    assert reset_payload["kept_investigator_full_name"] == "Elena Ruiz"
    assert reset_payload["snapshot_state_version"] == 2
    assert case_start_client.get("/api/case-start/archives/current", headers=profile_headers).json() == {
        "current_archive": None
    }
    assert read_rows(profile_database_path, "SELECT 1 FROM archive_case") == []
    assert read_rows(profile_database_path, "SELECT 1 FROM whisper_offer_batch") == []
    assert read_rows(profile_database_path, "SELECT 1 FROM case_specification") == []
    assert read_rows(profile_database_path, "SELECT 1 FROM confirmed_turn") == []
    assert len(read_rows(profile_database_path, "SELECT 1 FROM ai_interaction")) == interaction_count_before_reset
    assert read_rows(
        profile_database_path, "SELECT name FROM sqlite_master WHERE name = 'archive_case_rejects_delete'"
    )
    stored_snapshot = case_start_client.get(snapshot_route).json()["chronicle_state"]
    assert stored_snapshot["chosenWhisperIdentifier"] is None
    assert stored_snapshot["investigatorRegistration"]["fullName"] == "Elena Ruiz"
    assert stored_snapshot["investigatorAttributes"]["c"] == 5
    assert stored_snapshot["oicnauStance"] == "sanctioned_operative"
    assert stored_snapshot["hasAiConfigurationBeenHandled"] is True
    assert stored_snapshot["archiveRun"]["stateVersion"] == 0
    new_offer = case_start_client.get("/api/case-start/whispers", headers=profile_headers)
    assert new_offer.status_code == 200
    new_opening = case_start_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": "opening_key_after_reset", "whisper_identifier": lighthouse_whisper_identifier},
    )
    assert new_opening.status_code == 200
    assert new_opening.json()["archive"]["archive_number_label"] == "01"
    repeated_reset = case_start_client.post(reset_route, headers=profile_headers)
    assert repeated_reset.status_code == 200
    assert repeated_reset.json()["cleared_archive_case_count"] == 1
    assert repeated_reset.json()["kept_investigator_full_name"] == "Elena Ruiz"


def test_resetting_without_case_material_still_answers(case_start_client):
    reset_answer = case_start_client.post(reset_route, headers=profile_headers)
    assert reset_answer.status_code == 200
    assert reset_answer.json() == {
        "cleared_archive_case_count": 0,
        "cleared_whisper_offer_batch_count": 0,
        "was_chronicle_snapshot_stripped": False,
        "kept_investigator_full_name": None,
        "snapshot_state_version": None,
    }
