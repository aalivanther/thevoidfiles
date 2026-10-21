import json
import sqlite3

import pytest

from case_start.conftest import profile_headers, read_lighthouse_case_specification
from consequences.conftest import (
    execute_statement,
    read_rows,
    right_lock_value,
    right_plate_order_value,
    service_door_lock_identifier,
    shutter_plate_frame_identifier,
    wrong_lock_value,
    wrong_plate_order_value,
)

private_material_markers = (
    "Elvira",
    "private_truth",
    "private_solution",
    "private_rule_checks",
    "free_text_intent_pattern_sources",
    "prose_solution_pattern_sources",
    "director_private_state",
    "executed_branch_identifiers",
    "given_entropy_signal_flag_names",
    "hidden_notes",
    "specification_json",
    "request_content_hash",
    "death_became_the_tenth",
    "death_gallery_fall",
    "conditional_outcomes",
)


def count_rows(database_path, table_name):
    return read_rows(database_path, f"SELECT COUNT(*) AS row_count FROM {table_name}")[0]["row_count"]


def test_several_turns_are_confirmed_with_resulting_values(lighthouse_investigation, profile_database_path):
    first_turn = lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    second_turn = lighthouse_investigation.take_suggested_action("pay_boatman_to_wait")
    third_answer = lighthouse_investigation.write_own_words("Voy caminando hasta el pie del faro")
    third_turn = third_answer.json()["confirmed_turn"]

    assert [first_turn["resulting_state_version"], second_turn["resulting_state_version"]] == [2, 3]
    assert third_turn["resulting_state_version"] == 4
    assert [confirmed_effect["kind"] for confirmed_effect in first_turn["confirmed_effects"]] == [
        "world_clock_advanced",
        "person_became_known",
        "journal_updated",
    ]
    assert len(first_turn["relationship_changes"]) == 2
    assert first_turn["investigator_entry"]["attempted_steps"][0]["composition_origin_name"] == "suggested_action"
    assert third_turn["investigator_entry"]["attempted_steps"][0]["composition_origin_name"] == "own_words"
    assert third_turn["next_scene_presentation"]["scene_identifier"] == "tower_foot"
    assert {"kind": "scene_changed", "resulting_place_name": third_turn["next_scene_presentation"]["place_name"]} in (
        third_turn["staging_events"]
    )
    funds_effect = next(
        confirmed_effect
        for confirmed_effect in second_turn["confirmed_effects"]
        if confirmed_effect["kind"] == "operational_funds_spent"
    )
    assert second_turn["resource_costs"] == [{"kind": "operational_funds", "amount": funds_effect["amount"]}]

    archive_run = lighthouse_investigation.read_current_public_state()
    public_state = archive_run["public_state"]
    clock_effect = third_turn["confirmed_effects"][0]
    assert archive_run["state_version"] == 4
    assert public_state["operational_funds"] == funds_effect["resulting_amount"]
    assert public_state["world_clock_minutes"] == clock_effect["resulting_world_clock_minutes"]
    assert public_state["place_name"] == third_turn["next_scene_presentation"]["place_name"]
    assert public_state["confirmed_turn_count"] == 3
    assert public_state["last_confirmed_action_key"] == third_turn["action_key"]
    assert public_state["current_scene_presentation"] == third_turn["next_scene_presentation"]
    assert "renata_oquendo" in public_state["known_person_identifiers"]
    assert {relationship_level["level"] for relationship_level in public_state["relationship_levels"]} >= {
        relationship_change["resulting_level"] for relationship_change in first_turn["relationship_changes"]
    }

    turn_rows = read_rows(
        profile_database_path,
        "SELECT turn_identifier, state_version_before, state_version_after, disposition_name FROM confirmed_turn "
        "ORDER BY sequence_number",
    )
    assert [(turn_row["state_version_before"], turn_row["state_version_after"]) for turn_row in turn_rows] == [
        (1, 2),
        (2, 3),
        (3, 4),
    ]
    effect_rows = read_rows(
        profile_database_path,
        "SELECT ordinal_number, effect_kind_name FROM confirmed_effect WHERE turn_identifier = ? ORDER BY ordinal_number",
        (first_turn["turn_identifier"],),
    )
    assert [(effect_row["ordinal_number"], effect_row["effect_kind_name"]) for effect_row in effect_rows] == [
        (1, "world_clock_advanced"),
        (2, "person_became_known"),
        (3, "journal_updated"),
    ]
    assert count_rows(profile_database_path, "relationship_change") == len(first_turn["relationship_changes"]) + len(
        second_turn["relationship_changes"]
    ) + len(third_turn["relationship_changes"])
    checkpoint_rows = read_rows(
        profile_database_path,
        "SELECT state_version, parent_checkpoint_identifier, public_state_json, director_private_state_json "
        "FROM run_checkpoint ORDER BY state_version",
    )
    assert [checkpoint_row["state_version"] for checkpoint_row in checkpoint_rows] == [2, 3, 4]
    assert checkpoint_rows[0]["parent_checkpoint_identifier"] is None
    assert checkpoint_rows[2]["parent_checkpoint_identifier"] is not None
    assert json.loads(checkpoint_rows[2]["public_state_json"]) == public_state
    assert "walk_to_tower_foot" in json.loads(checkpoint_rows[2]["director_private_state_json"])[
        "executed_branch_identifiers"
    ]


def test_same_action_key_returns_the_stored_turn_and_charges_once(lighthouse_investigation, profile_database_path):
    action_request = lighthouse_investigation.build_action_request(
        [lighthouse_investigation.build_plan_step(1, suggested_action_identifier="pay_boatman_to_wait")]
    )
    first_answer = lighthouse_investigation.send_action_request(action_request)
    funds_after_first_answer = lighthouse_investigation.read_current_public_state()["public_state"]["operational_funds"]
    repeated_answer = lighthouse_investigation.send_action_request(action_request)

    assert first_answer.status_code == 200
    assert repeated_answer.status_code == 200
    assert repeated_answer.json() == first_answer.json()
    assert count_rows(profile_database_path, "confirmed_turn") == 1
    archive_run = lighthouse_investigation.read_current_public_state()
    assert archive_run["state_version"] == 2
    assert archive_run["public_state"]["operational_funds"] == funds_after_first_answer


def test_stale_state_version_is_a_conflict_without_rows(lighthouse_investigation, profile_database_path):
    lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    stale_answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [lighthouse_investigation.build_plan_step(1, suggested_action_identifier="pay_boatman_to_wait")],
            expected_state_version=1,
        )
    )
    assert stale_answer.status_code == 409
    assert stale_answer.json() == {"failure_name": "state_version_conflict"}
    assert count_rows(profile_database_path, "confirmed_turn") == 1
    assert lighthouse_investigation.read_current_public_state()["state_version"] == 2


def test_action_key_reused_for_other_request_is_a_conflict(lighthouse_investigation, profile_database_path):
    first_request = lighthouse_investigation.build_action_request(
        [lighthouse_investigation.build_plan_step(1, suggested_action_identifier="speak_with_waiting_woman")]
    )
    assert lighthouse_investigation.send_action_request(first_request).status_code == 200
    other_request = lighthouse_investigation.build_action_request(
        [lighthouse_investigation.build_plan_step(1, suggested_action_identifier="pay_boatman_to_wait")],
        action_key=first_request["action_key"],
    )
    conflicting_answer = lighthouse_investigation.send_action_request(other_request)
    attempt_answer = lighthouse_investigation.attempt_interactive_piece(
        service_door_lock_identifier, right_lock_value, action_key=first_request["action_key"]
    )
    assert conflicting_answer.status_code == 409
    assert conflicting_answer.json() == {"failure_name": "action_key_reused_for_other_request"}
    assert attempt_answer.status_code == 409
    assert count_rows(profile_database_path, "confirmed_turn") == 1


def test_malformed_requests_and_missing_archive_are_refused(consequence_client, lighthouse_investigation):
    short_key_answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [lighthouse_investigation.build_plan_step(1, suggested_action_identifier="speak_with_waiting_woman")],
            action_key="short",
        )
    )
    empty_plan_answer = lighthouse_investigation.send_action_request(lighthouse_investigation.build_action_request([]))
    headerless_answer = consequence_client.get("/api/consequences/turns")
    other_scene_request = lighthouse_investigation.build_action_request(
        [lighthouse_investigation.build_plan_step(1, suggested_action_identifier="speak_with_waiting_woman")]
    )
    other_scene_request["scene_identifier"] = "lantern_room"
    assert short_key_answer.json() == {"failure_name": "action_key_malformed"}
    assert empty_plan_answer.json() == {"failure_name": "request_invalid"}
    assert headerless_answer.json() == {"failure_name": "profile_identifier_required"}
    assert lighthouse_investigation.send_action_request(other_scene_request).json() == {
        "failure_name": "scene_identifier_mismatched"
    }


def test_turn_without_open_archive_is_refused(consequence_client):
    answer = consequence_client.post(
        "/api/consequences/investigator-actions",
        headers=profile_headers,
        json={
            "action_key": "archive_action_key_0001",
            "expected_state_version": 1,
            "scene_identifier": "pier_arrival",
            "remaining_plan_steps": [{"step_identifier": "plan_step_1", "action_text": "Mirar el faro"}],
            "declared_plan_step_count": 1,
            "already_executed_step_count": 0,
        },
    )
    assert answer.status_code == 409
    assert answer.json() == {"failure_name": "archive_not_open"}


def test_interactive_piece_is_attempted_wrong_and_then_right(lighthouse_investigation, profile_database_path):
    unknown_piece_answer = lighthouse_investigation.attempt_interactive_piece(
        service_door_lock_identifier, right_lock_value
    )
    presenting_turn = lighthouse_investigation.walk_to_the_service_door_lock()
    unusable_answer = lighthouse_investigation.attempt_interactive_piece(
        service_door_lock_identifier, {"widget_kind_name": "combination_dials", "chosen_symbols": ["3", "1"]}
    )
    wrong_answer = lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, wrong_lock_value)
    right_answer = lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value)
    closed_piece_answer = lighthouse_investigation.attempt_interactive_piece(
        service_door_lock_identifier, right_lock_value
    )

    assert unknown_piece_answer.json() == {"failure_name": "interactive_piece_unknown"}
    assert [
        presented_piece["interactive_piece_identifier"]
        for presented_piece in presenting_turn["presented_interactive_pieces"]
    ] == [service_door_lock_identifier]
    assert unusable_answer.json() == {"failure_name": "submitted_value_unusable"}
    assert wrong_answer.json()["attempt_record"]["was_accepted"] is False
    assert len(wrong_answer.json()["attempt_record"]["violated_visible_rule_texts"]) == 1
    assert wrong_answer.json()["confirmed_turn"]["interactive_piece_status_changes"] == []
    assert wrong_answer.json()["confirmed_turn"]["confirmed_effects"][0]["kind"] == "world_clock_advanced"
    assert right_answer.json()["attempt_record"]["was_accepted"] is True
    assert right_answer.json()["attempt_record"]["violated_visible_rule_texts"] == []
    assert right_answer.json()["confirmed_turn"]["interactive_piece_status_changes"] == [
        {
            "interactive_piece_identifier": service_door_lock_identifier,
            "resulting_lifecycle_status_name": "resolved",
            "broken_reason_public_text": None,
        }
    ]
    assert right_answer.json()["confirmed_turn"]["next_scene_presentation"]["scene_identifier"] == "machine_room"
    assert closed_piece_answer.json() == {"failure_name": "interactive_piece_not_open_to_attempts"}
    runtime_state = lighthouse_investigation.read_current_public_state()["public_state"][
        "interactive_piece_runtime_states"
    ][0]
    assert runtime_state["lifecycle_status_name"] == "resolved"
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert public_state["revealed_facts"][0]["fact_identifier"] == "machine_room_is_open"
    assert public_state["revealed_facts"][0]["visible_name"]
    assert "machine_room_is_open" in public_state["lived_experience_flag_names"]
    assert any(
        effect["kind"] == "knowledge_gained" and effect["fact_identifier"] == "machine_room_is_open"
        for effect in right_answer.json()["confirmed_turn"]["confirmed_effects"]
    )
    assert [attempt_record["was_accepted"] for attempt_record in runtime_state["attempts"]] == [False, True]


def test_ordered_piece_reports_every_violated_visible_rule(lighthouse_investigation):
    lighthouse_investigation.walk_to_the_service_door_lock()
    lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value)
    lighthouse_investigation.take_suggested_action("take_shutter_plates")
    lighthouse_investigation.take_suggested_action("climb_service_staircase")
    lighthouse_investigation.take_suggested_action("mount_shutter_plates")
    wrong_answer = lighthouse_investigation.attempt_interactive_piece(
        shutter_plate_frame_identifier, wrong_plate_order_value
    )
    repeated_piece_answer = lighthouse_investigation.attempt_interactive_piece(
        shutter_plate_frame_identifier,
        {
            "widget_kind_name": "ordered_positions",
            "ordered_piece_identifiers": ["shutter_plate_a"] * 5,
        },
    )
    assert len(wrong_answer.json()["attempt_record"]["violated_visible_rule_texts"]) == 3
    assert repeated_piece_answer.json() == {"failure_name": "submitted_value_unusable"}


def test_assistance_is_recorded_without_advancing_the_state_version(lighthouse_investigation, profile_database_path):
    lighthouse_investigation.walk_to_the_service_door_lock()
    version_before_assistance = lighthouse_investigation.state_version
    world_clock_minutes_before_assistance = lighthouse_investigation.read_current_public_state()["public_state"][
        "world_clock_minutes"
    ]
    first_answer = lighthouse_investigation.request_assistance(
        service_door_lock_identifier, "gentle", action_key="assistance_action_key_0001"
    )
    repeated_answer = lighthouse_investigation.request_assistance(
        service_door_lock_identifier, "gentle", action_key="assistance_action_key_0001"
    )
    same_level_answer = lighthouse_investigation.request_assistance(service_door_lock_identifier, "gentle")
    unknown_piece_answer = lighthouse_investigation.request_assistance(shutter_plate_frame_identifier, "gentle")

    assert first_answer.status_code == 200
    assert first_answer.json()["assistance_record"]["level_name"] == "gentle"
    assert first_answer.json()["assistance_record"]["public_hint_text"]
    assert first_answer.json()["was_already_given"] is False
    assert first_answer.json()["state_version"] == version_before_assistance
    assert repeated_answer.json() == first_answer.json()
    assert same_level_answer.json()["was_already_given"] is True
    assert unknown_piece_answer.json() == {"failure_name": "interactive_piece_unknown"}
    archive_run = lighthouse_investigation.read_current_public_state()
    assert archive_run["state_version"] == version_before_assistance
    assert archive_run["public_state"]["interactive_piece_runtime_states"][0]["assistance_given"] == [
        first_answer.json()["assistance_record"]
    ]
    assert archive_run["public_state"]["world_clock_minutes"] == world_clock_minutes_before_assistance
    assistance_rows = read_rows(
        profile_database_path,
        "SELECT state_version_before, state_version_after FROM confirmed_turn "
        "WHERE disposition_name = 'assistance_given'",
    )
    assert [tuple(assistance_row) for assistance_row in assistance_rows] == [
        (version_before_assistance, version_before_assistance),
        (version_before_assistance, version_before_assistance),
    ]
    assert lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value).status_code == 200


def test_director_questions_change_nothing_and_insisting_costs_time(lighthouse_investigation, profile_database_path):
    method_answer = lighthouse_investigation.write_own_words("Ataco")
    veto_answer = lighthouse_investigation.write_own_words("Saco la pistola y disparo al faro")
    insisting_answer = lighthouse_investigation.write_own_words("Saco la pistola y disparo al faro", is_insisting=True)

    assert method_answer.json()["disposition_name"] == "question_asked"
    assert method_answer.json()["question_entry"]["question_kind_name"] == "method_clarification"
    assert veto_answer.json()["question_entry"]["question_kind_name"] == "illogical_action_veto"
    assert [
        answer_option["answer_effect_name"] for answer_option in veto_answer.json()["question_entry"]["answer_options"]
    ] == ["return_to_reply_desk", "proceed_with_pending_action"]
    assert insisting_answer.json()["disposition_name"] == "resolved"
    assert insisting_answer.json()["confirmed_turn"]["resulting_state_version"] == 2
    assert [
        confirmed_effect["kind"] for confirmed_effect in insisting_answer.json()["confirmed_turn"]["confirmed_effects"]
    ] == ["world_clock_advanced"]
    question_rows = read_rows(
        profile_database_path,
        "SELECT state_version_before, state_version_after FROM confirmed_turn WHERE disposition_name = 'question_asked'",
    )
    assert [tuple(question_row) for question_row in question_rows] == [(1, 1), (1, 1)]
    assert count_rows(profile_database_path, "run_checkpoint") == 1


def test_long_plan_is_cut_and_continuation_is_asked(lighthouse_investigation):
    plan_steps = [
        lighthouse_investigation.build_plan_step(step_number, suggested_action_identifier=suggested_action_identifier)
        for step_number, suggested_action_identifier in enumerate(
            [
                "speak_with_waiting_woman",
                "listen_to_boatman_warning",
                "count_flashes_from_boat",
                "ask_boatman_about_the_shipwreck_year",
            ],
            start=1,
        )
    ]
    answer = lighthouse_investigation.send_action_request(lighthouse_investigation.build_action_request(plan_steps))
    confirmed_turn = answer.json()["confirmed_turn"]
    assert [step_disposition["disposition_name"] for step_disposition in confirmed_turn["plan_step_dispositions"]] == [
        "executed",
        "executed",
        "executed",
        "left_pending",
    ]
    assert confirmed_turn["plan_continuation_question"]["question_kind_name"] == "plan_continuation"
    assert confirmed_turn["resulting_state_version"] == 2
    pending_action_plan = lighthouse_investigation.read_current_public_state()["public_state"]["pending_action_plan"]
    assert [pending_step["step_identifier"] for pending_step in pending_action_plan["remaining_steps"]] == ["plan_step_4"]
    assert pending_action_plan["already_executed_step_count"] == 3


def test_conditional_step_is_skipped_when_the_condition_is_unmet(lighthouse_investigation):
    answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [
                lighthouse_investigation.build_plan_step(
                    1, suggested_action_identifier="speak_with_waiting_woman", condition_text="si estoy herido"
                )
            ]
        )
    )
    confirmed_turn = answer.json()["confirmed_turn"]
    assert confirmed_turn["plan_step_dispositions"][0]["disposition_name"] == "skipped_because_condition_was_unmet"
    assert confirmed_turn["confirmed_effects"] == []
    assert confirmed_turn["relationship_changes"] == []
    assert confirmed_turn["resulting_state_version"] == 2


def test_ending_closes_the_archive_and_new_whispers_become_possible(
    consequence_client, lighthouse_investigation, profile_database_path
):
    first_offer = consequence_client.get("/api/case-start/whispers", headers=profile_headers).json()
    ending_turn = lighthouse_investigation.reach_the_containment_ending()
    ending_action_key = ending_turn["action_key"]

    assert ending_turn["archive_outcome"]["kind"] == "archive_ended_alive"
    assert ending_turn["archive_outcome"]["ending_identifier"] == "ending_fixed_shutters"
    assert ending_turn["archive_outcome"]["counts_as_sanctioned_closure"] is True
    assert len(ending_turn["archive_outcome"]["objective_results"]) == 4
    assert ending_turn["next_scene_presentation"] is None
    assert ending_turn["plan_continuation_question"] is None
    case_rows = read_rows(profile_database_path, "SELECT lifecycle_status_name, closed_at_utc FROM archive_case")
    run_rows = read_rows(profile_database_path, "SELECT lifecycle_status_name, current_run_json FROM archive_run")
    assert [(case_row["lifecycle_status_name"], case_row["closed_at_utc"] is not None) for case_row in case_rows] == [
        ("closed", True)
    ]
    assert run_rows[0]["lifecycle_status_name"] == "ended"
    assert json.loads(run_rows[0]["current_run_json"])["public_state"]["archive_outcome"] == ending_turn["archive_outcome"]
    closure_checkpoint_rows = read_rows(
        profile_database_path, "SELECT 1 FROM run_checkpoint WHERE checkpoint_reason_name = 'archive_closure'"
    )
    assert len(closure_checkpoint_rows) == 1
    assert consequence_client.get("/api/case-start/archives/current", headers=profile_headers).json() == {
        "current_archive": None
    }

    repeated_ending_request = json.loads(
        read_rows(
            profile_database_path, "SELECT request_json FROM confirmed_turn WHERE action_key = ?", (ending_action_key,)
        )[0]["request_json"]
    )
    repeated_ending_answer = consequence_client.post(
        "/api/consequences/investigator-actions", headers=profile_headers, json=repeated_ending_request
    )
    assert repeated_ending_answer.json()["confirmed_turn"] == ending_turn
    late_answer = lighthouse_investigation.write_own_words("Me quedo mirando el mar")
    assert late_answer.json() == {"failure_name": "archive_not_open"}

    closed_history = consequence_client.get(
        "/api/consequences/turns",
        headers=profile_headers,
        params={"archive_case_identifier": ending_turn_archive_case_identifier(profile_database_path)},
    ).json()
    assert closed_history["archive_run"]["lifecycle_status_name"] == "ended"
    assert closed_history["turns"][-1]["resolution"]["confirmed_turn"] == ending_turn

    second_offer = consequence_client.get("/api/case-start/whispers", headers=profile_headers).json()
    assert second_offer["offer_batch_identifier"] != first_offer["offer_batch_identifier"]
    second_opening = lighthouse_investigation.open_lighthouse_archive()
    assert second_opening.json()["archive"]["archive_number"] == 2
    assert lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")["resulting_state_version"] == 2


def ending_turn_archive_case_identifier(profile_database_path):
    return read_rows(profile_database_path, "SELECT archive_case_identifier FROM archive_case ORDER BY archive_number")[0][
        "archive_case_identifier"
    ]


def test_lethal_branch_closes_the_archive_by_death(lighthouse_investigation, profile_database_path):
    specification = read_lighthouse_case_specification()
    assert any(ending["death_outcome"] is not None for ending in specification["endings"])
    lighthouse_investigation.walk_to_the_service_door_lock()
    lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value)
    lighthouse_investigation.take_suggested_action("climb_service_staircase")
    lighthouse_investigation.take_suggested_action("step_out_to_gallery")
    lighthouse_investigation.take_suggested_action("face_tenth_flash_on_gallery")
    scene_actions = lighthouse_investigation.read_current_public_state()["public_state"]["current_scene_presentation"][
        "suggested_actions"
    ]
    lethal_action_identifier = next(
        suggested_action["identifier"]
        for suggested_action in scene_actions
        if suggested_action["identifier"] in ("face_tenth_flash_on_gallery_again", "reach_optic_over_bent_railing")
    )
    lethal_turn = lighthouse_investigation.take_suggested_action(lethal_action_identifier)
    assert lethal_turn["archive_outcome"]["kind"] == "chronicle_closed_by_death"
    assert lethal_turn["archive_outcome"]["death_cause_name"] == "critical_failure"
    assert read_rows(profile_database_path, "SELECT lifecycle_status_name FROM archive_case")[0][
        "lifecycle_status_name"
    ] == "closed"


def test_failed_transaction_leaves_no_partial_rows(consequence_client, lighthouse_investigation, profile_database_path):
    lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    execute_statement(
        profile_database_path,
        "CREATE TRIGGER run_checkpoint_fails_for_test BEFORE INSERT ON run_checkpoint "
        "BEGIN SELECT RAISE(ABORT, 'checkpoint_failure_for_test'); END",
    )
    failing_request = lighthouse_investigation.build_action_request(
        [lighthouse_investigation.build_plan_step(1, suggested_action_identifier="pay_boatman_to_wait")]
    )
    public_state_before_failure = lighthouse_investigation.read_current_public_state()
    with pytest.raises(sqlite3.IntegrityError):
        lighthouse_investigation.send_action_request(failing_request)

    assert count_rows(profile_database_path, "confirmed_turn") == 1
    assert count_rows(profile_database_path, "run_checkpoint") == 1
    assert read_rows(
        profile_database_path, "SELECT COUNT(*) AS row_count FROM confirmed_effect WHERE effect_kind_name = ?",
        ("operational_funds_spent",),
    )[0]["row_count"] == 0
    assert read_rows(
        profile_database_path, "SELECT COUNT(DISTINCT turn_identifier) AS turn_count FROM log_entry"
    )[0]["turn_count"] == 1
    assert lighthouse_investigation.read_current_public_state() == public_state_before_failure

    execute_statement(profile_database_path, "DROP TRIGGER run_checkpoint_fails_for_test")
    retried_answer = lighthouse_investigation.send_action_request(failing_request)
    assert retried_answer.status_code == 200
    assert retried_answer.json()["confirmed_turn"]["resulting_state_version"] == 3
    assert count_rows(profile_database_path, "confirmed_turn") == 2


def test_history_and_log_entries_are_public_and_ordered(consequence_client, lighthouse_investigation):
    lighthouse_investigation.write_own_words("Ataco")
    first_turn = lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    turn_history = consequence_client.get("/api/consequences/turns", headers=profile_headers).json()
    log_history = consequence_client.get("/api/consequences/log-entries", headers=profile_headers).json()

    assert turn_history["archive_run"]["state_version"] == 2
    assert [stored_turn["disposition_name"] for stored_turn in turn_history["turns"]] == ["question_asked", "resolved"]
    assert turn_history["turns"][1]["resolution"]["confirmed_turn"] == first_turn
    voice_names = [log_entry["voice"] for log_entry in log_history["log_entries"]]
    assert voice_names[:3] == ["investigator_entry", "director_question", "investigator_entry"]
    assert "consequence_receipt" in voice_names
    assert voice_names.count("relationship_pulse") == len(first_turn["relationship_changes"])
    relationship_pulse_entry = next(
        log_entry for log_entry in log_history["log_entries"] if log_entry["voice"] == "relationship_pulse"
    )
    assert "resulting_level" not in relationship_pulse_entry["relationship_pulse"]
    assert len({log_entry["identifier"] for log_entry in log_history["log_entries"]}) == len(log_history["log_entries"])
    assert all(log_entry["scene_identifier"] == "pier_arrival" for log_entry in log_history["log_entries"])


def test_private_material_never_reaches_any_response(consequence_client, lighthouse_investigation):
    specification = read_lighthouse_case_specification()
    lighthouse_investigation.write_own_words("Ataco")
    lighthouse_investigation.walk_to_the_service_door_lock()
    lighthouse_investigation.request_assistance(service_door_lock_identifier, "gentle")
    lighthouse_investigation.request_assistance(service_door_lock_identifier, "medium")
    lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, wrong_lock_value)
    lighthouse_investigation.write_own_words("Reviso mi equipo antes de seguir")
    lighthouse_investigation.write_own_words("Me quedo quieto escuchando el viento")
    lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value)
    lighthouse_investigation.take_suggested_action("take_shutter_plates")
    lighthouse_investigation.take_suggested_action("climb_service_staircase")
    lighthouse_investigation.take_suggested_action("mount_shutter_plates")
    lighthouse_investigation.attempt_interactive_piece(shutter_plate_frame_identifier, wrong_plate_order_value)
    answer_texts = [answer.text for answer in lighthouse_investigation.answers]
    answer_texts.append(consequence_client.get("/api/consequences/turns", headers=profile_headers).text)
    answer_texts.append(consequence_client.get("/api/consequences/log-entries", headers=profile_headers).text)
    answer_texts.append(consequence_client.get("/api/case-start/archives/current", headers=profile_headers).text)

    private_texts = [
        specification["private_truth"]["summary_text"],
        *specification["private_truth"]["causal_chronology_texts"],
        *specification["private_truth"]["threat"]["capability_texts"],
        json.dumps(right_plate_order_value["ordered_piece_identifiers"]),
        "Renata",
    ]
    assert len(answer_texts) >= 14
    for answer_text in answer_texts:
        decoded_answer_text = json.dumps(json.loads(answer_text), ensure_ascii=False)
        for private_material_marker in private_material_markers:
            assert private_material_marker not in decoded_answer_text
        for private_text in private_texts:
            assert private_text not in decoded_answer_text


def test_unknown_name_is_revealed_only_after_the_person_becomes_known(lighthouse_investigation):
    revealing_turn = lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    assert {"kind": "person_became_known", "person_identifier": "renata_oquendo", "visible_name": "Renata Oquendo"} in (
        revealing_turn["confirmed_effects"]
    )
    assert revealing_turn["next_scene_presentation"]["present_persons"][0]["is_name_known"] is True
