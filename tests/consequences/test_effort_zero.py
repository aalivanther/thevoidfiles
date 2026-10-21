from consequences.conftest import right_lock_value, service_door_lock_identifier
from the_void_files.narrative.orchestration.effort import case_effort_maximum, no_effort_remaining_text


def step_dispositions(confirmed_turn):
    return [step["disposition_name"] for step in confirmed_turn["plan_step_dispositions"]]


def narration_paragraphs(confirmed_turn):
    return [
        paragraph
        for director_entry in confirmed_turn["director_entries"]
        for paragraph in director_entry.get("marked_paragraphs", [])
    ]


def test_a_forced_shove_whose_condition_fails_returns_the_effort(lighthouse_investigation):
    answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [
                lighthouse_investigation.build_plan_step(
                    1,
                    action_text="Fuerzo el marco con el hombro",
                    condition_text="si estoy herido",
                )
            ]
        )
    )
    confirmed_turn = answer.json()["confirmed_turn"]
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["skipped_because_condition_was_unmet"]
    assert public_state["effort_remaining"] == case_effort_maximum
    assert all(effect.get("kind") != "effort_spent" for effect in confirmed_turn["confirmed_effects"])


def test_a_skipped_shove_does_not_take_the_effort_of_the_shove_that_happened(lighthouse_investigation):
    answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [
                lighthouse_investigation.build_plan_step(1, action_text="Fuerzo el marco con el hombro"),
                lighthouse_investigation.build_plan_step(
                    2,
                    action_text="Fuerzo el marco con el hombro",
                    condition_text="si estoy herido",
                ),
            ]
        )
    )
    confirmed_turn = answer.json()["confirmed_turn"]
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["executed", "skipped_because_condition_was_unmet"]
    assert public_state["effort_remaining"] == case_effort_maximum - 1
    spent_effects = [effect for effect in confirmed_turn["confirmed_effects"] if effect.get("kind") == "effort_spent"]
    assert [effect["amount"] for effect in spent_effects] == [1]
    assert spent_effects[0]["resulting_effort"] == case_effort_maximum - 1


def test_the_lock_is_not_recorded_when_no_effort_remains(lighthouse_investigation):
    presenting_turn = lighthouse_investigation.walk_to_the_service_door_lock()
    scene_identifier = presenting_turn["next_scene_presentation"]["scene_identifier"]
    for _ in range(case_effort_maximum):
        spent_answer = lighthouse_investigation.write_own_words("Sostengo el marco un momento")
        assert spent_answer.status_code == 200
        assert step_dispositions(spent_answer.json()["confirmed_turn"]) == ["executed"]
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert public_state["effort_remaining"] == 0
    assert public_state["current_scene_presentation"]["scene_identifier"] == scene_identifier
    answer = lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value)
    body = answer.json()
    confirmed_turn = body["confirmed_turn"]
    runtime_state = lighthouse_investigation.read_current_public_state()["public_state"][
        "interactive_piece_runtime_states"
    ][0]
    assert answer.status_code == 200
    assert body["attempt_record"]["was_accepted"] is False
    assert body["attempt_record"]["counts_as_attempt"] is False
    paragraphs = narration_paragraphs(confirmed_turn)
    assert paragraphs[0] == no_effort_remaining_text
    assert all(
        paragraph == no_effort_remaining_text or "ventanuco" in paragraph
        for paragraph in paragraphs
    )
    assert all(effect.get("kind") != "world_clock_advanced" for effect in confirmed_turn["confirmed_effects"])
    assert lighthouse_investigation.read_current_public_state()["public_state"]["effort_remaining"] == 0
    assert runtime_state["attempts"] == []
    assert runtime_state["lifecycle_status_name"] != "resolved"


def test_prose_does_not_open_the_lock_when_no_effort_remains(lighthouse_investigation):
    lighthouse_investigation.walk_to_the_service_door_lock()
    for _ in range(case_effort_maximum):
        spent_answer = lighthouse_investigation.write_own_words("Sostengo el marco un momento")
        assert spent_answer.status_code == 200
    answer = lighthouse_investigation.write_own_words("Pongo el candado en 3 1 2")
    confirmed_turn = answer.json()["confirmed_turn"]
    runtime_state = lighthouse_investigation.read_current_public_state()["public_state"][
        "interactive_piece_runtime_states"
    ][0]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["skipped_for_no_effort"]
    assert no_effort_remaining_text in narration_paragraphs(confirmed_turn)
    assert runtime_state["lifecycle_status_name"] != "resolved"
    assert lighthouse_investigation.read_current_public_state()["public_state"]["effort_remaining"] == 0


def test_prose_still_opens_the_lock_when_effort_remains(lighthouse_investigation):
    lighthouse_investigation.walk_to_the_service_door_lock()
    answer = lighthouse_investigation.write_own_words("Pongo el candado en 3 1 2")
    confirmed_turn = answer.json()["confirmed_turn"]
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["executed"]
    assert public_state["current_scene_presentation"]["scene_identifier"] == "machine_room"
    assert public_state["effort_remaining"] == case_effort_maximum
