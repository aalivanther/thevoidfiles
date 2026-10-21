import itertools
import sqlite3

import pytest

from case_start.conftest import (
    lighthouse_whisper_identifier,
    open_service_client,
    profile_headers,
    profile_identifier,
)

service_door_lock_identifier = "interactive_piece_0001"
shutter_plate_frame_identifier = "interactive_piece_0003"
wrong_lock_value = {"widget_kind_name": "combination_dials", "chosen_symbols": ["1", "2", "3"]}
right_lock_value = {"widget_kind_name": "combination_dials", "chosen_symbols": ["3", "1", "2"]}
wrong_plate_order_value = {
    "widget_kind_name": "ordered_positions",
    "ordered_piece_identifiers": [
        "shutter_plate_a",
        "shutter_plate_b",
        "shutter_plate_c",
        "shutter_plate_d",
        "shutter_plate_e",
    ],
}
right_plate_order_value = {
    "widget_kind_name": "ordered_positions",
    "ordered_piece_identifiers": [
        "shutter_plate_a",
        "shutter_plate_e",
        "shutter_plate_c",
        "shutter_plate_d",
        "shutter_plate_b",
    ],
}


def read_rows(database_path, query_text, query_parameters=()):
    connection = sqlite3.connect(str(database_path))
    connection.row_factory = sqlite3.Row
    try:
        return connection.execute(query_text, query_parameters).fetchall()
    finally:
        connection.close()


def execute_statement(database_path, statement_text):
    connection = sqlite3.connect(str(database_path))
    try:
        connection.execute(statement_text)
        connection.commit()
    finally:
        connection.close()


class LighthouseInvestigation:
    def __init__(self, test_client) -> None:
        self.test_client = test_client
        self.created_key_counter = itertools.count(1)
        self.opening_counter = itertools.count(1)
        self.state_version = 0
        self.scene_identifier = ""
        self.answers = []

    def open_lighthouse_archive(self):
        self.test_client.get("/api/case-start/whispers", headers=profile_headers)
        opening_answer = self.test_client.post(
            "/api/case-start/archives",
            headers=profile_headers,
            json={
                "opening_key": f"opening_key_{next(self.opening_counter):04d}",
                "whisper_identifier": lighthouse_whisper_identifier,
            },
        )
        assert opening_answer.status_code == 200
        self.state_version = opening_answer.json()["archive_run"]["state_version"]
        self.scene_identifier = opening_answer.json()["opening_resolution"]["first_scene_presentation"][
            "scene_identifier"
        ]
        return opening_answer

    def create_action_key(self) -> str:
        return f"archive_action_key_{next(self.created_key_counter):04d}"

    def build_plan_step(self, step_number, suggested_action_identifier=None, action_text=None, condition_text=None):
        return {
            "step_identifier": f"plan_step_{step_number}",
            "action_text": action_text or suggested_action_identifier,
            "condition_text": condition_text,
            "origin_suggested_action_identifier": suggested_action_identifier,
            "was_text_edited_by_player": False,
            "declared_resource_cost": None,
        }

    def build_action_request(self, plan_steps, action_key=None, is_insisting=False, expected_state_version=None):
        return {
            "action_key": action_key or self.create_action_key(),
            "expected_state_version": self.state_version if expected_state_version is None else expected_state_version,
            "scene_identifier": self.scene_identifier,
            "remaining_plan_steps": plan_steps,
            "declared_plan_step_count": len(plan_steps),
            "already_executed_step_count": 0,
            "is_player_insisting_after_director_veto": is_insisting,
            "referenced_interactive_piece_identifier": None,
        }

    def remember_confirmed_turn(self, answer, confirmed_turn):
        self.answers.append(answer)
        self.state_version = confirmed_turn["resulting_state_version"]
        if confirmed_turn["next_scene_presentation"] is not None:
            self.scene_identifier = confirmed_turn["next_scene_presentation"]["scene_identifier"]

    def send_action_request(self, action_request):
        answer = self.test_client.post(
            "/api/consequences/investigator-actions", headers=profile_headers, json=action_request
        )
        if answer.status_code == 200 and answer.json()["disposition_name"] == "resolved":
            self.remember_confirmed_turn(answer, answer.json()["confirmed_turn"])
        elif answer.status_code == 200:
            self.answers.append(answer)
        return answer

    def take_suggested_action(self, suggested_action_identifier):
        answer = self.send_action_request(
            self.build_action_request([self.build_plan_step(1, suggested_action_identifier=suggested_action_identifier)])
        )
        assert answer.status_code == 200
        assert answer.json()["disposition_name"] == "resolved"
        return answer.json()["confirmed_turn"]

    def write_own_words(self, action_text, is_insisting=False):
        return self.send_action_request(
            self.build_action_request([self.build_plan_step(1, action_text=action_text)], is_insisting=is_insisting)
        )

    def attempt_interactive_piece(self, interactive_piece_identifier, submitted_value, action_key=None):
        answer = self.test_client.post(
            "/api/consequences/interactive-piece-attempts",
            headers=profile_headers,
            json={
                "action_key": action_key or self.create_action_key(),
                "expected_state_version": self.state_version,
                "interactive_piece_identifier": interactive_piece_identifier,
                "submitted_value": submitted_value,
            },
        )
        if answer.status_code == 200:
            self.remember_confirmed_turn(answer, answer.json()["confirmed_turn"])
        return answer

    def request_assistance(self, interactive_piece_identifier, requested_level_name, action_key=None):
        answer = self.test_client.post(
            "/api/consequences/interactive-piece-assistance",
            headers=profile_headers,
            json={
                "action_key": action_key or self.create_action_key(),
                "expected_state_version": self.state_version,
                "interactive_piece_identifier": interactive_piece_identifier,
                "requested_level_name": requested_level_name,
                "is_scope_limited_to_this_piece_confirmed": True,
            },
        )
        if answer.status_code == 200:
            self.answers.append(answer)
        return answer

    def read_current_public_state(self):
        current_archive = self.test_client.get("/api/case-start/archives/current", headers=profile_headers).json()[
            "current_archive"
        ]
        return current_archive["archive_run"]

    def walk_to_the_service_door_lock(self):
        self.take_suggested_action("walk_to_tower_foot")
        return self.take_suggested_action("inspect_service_door")

    def reach_the_containment_ending(self):
        self.walk_to_the_service_door_lock()
        assert self.attempt_interactive_piece(service_door_lock_identifier, right_lock_value).status_code == 200
        self.take_suggested_action("take_shutter_plates")
        self.take_suggested_action("climb_service_staircase")
        self.take_suggested_action("mount_shutter_plates")
        assert self.attempt_interactive_piece(shutter_plate_frame_identifier, right_plate_order_value).status_code == 200
        return self.take_suggested_action("sign_report_on_the_boat")


@pytest.fixture
def consequence_client(data_directory, access_key_vault):
    with open_service_client(data_directory, access_key_vault) as test_client:
        yield test_client


@pytest.fixture
def lighthouse_investigation(consequence_client):
    investigation = LighthouseInvestigation(consequence_client)
    investigation.open_lighthouse_archive()
    return investigation


@pytest.fixture
def profile_database_path(data_directory):
    return data_directory / "profiles" / profile_identifier / "chronicle.sqlite3"
