from consequences.conftest import LighthouseInvestigation
from consequences.test_directed_turn_routes import (
    RealModeDirectorDouble,
    open_real_mode_client,
)
from the_void_files.narrative.orchestration.effort import case_effort_maximum, no_effort_remaining_text


def step_dispositions(confirmed_turn):
    return [step["disposition_name"] for step in confirmed_turn["plan_step_dispositions"]]


def directed_clock_minutes(confirmed_turn):
    clock_effects = [
        effect for effect in confirmed_turn["confirmed_effects"] if effect.get("kind") == "world_clock_advanced"
    ]
    assert len(clock_effects) == 1
    return clock_effects[0]["elapsed_minutes"]


def continuation_paragraphs(confirmed_turn):
    question = confirmed_turn["plan_continuation_question"]
    assert question is not None
    return " ".join(question["plain_paragraphs"])


def test_two_wounded_conditions_in_one_step_share_the_condition_label(lighthouse_investigation):
    answer = lighthouse_investigation.write_own_words(
        "Si estoy herido hago la 1. Si estoy herido hago la 2"
    )
    confirmed_turn = answer.json()["confirmed_turn"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["skipped_because_condition_was_unmet"]
    assert confirmed_turn["confirmed_effects"] == []


def test_a_mixed_step_keeps_the_first_skip_reason(lighthouse_investigation):
    answer = lighthouse_investigation.write_own_words("Hago la 1 si estoy herido y luego ataco")
    assert answer.status_code == 200
    assert step_dispositions(answer.json()["confirmed_turn"]) == ["skipped_because_condition_was_unmet"]


def test_a_later_attack_without_method_is_not_called_a_circumstance(lighthouse_investigation):
    answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [
                lighthouse_investigation.build_plan_step(1, suggested_action_identifier="speak_with_waiting_woman"),
                lighthouse_investigation.build_plan_step(2, action_text="Ataco"),
                lighthouse_investigation.build_plan_step(3, suggested_action_identifier="listen_to_boatman_warning"),
                lighthouse_investigation.build_plan_step(4, suggested_action_identifier="count_flashes_from_boat"),
                lighthouse_investigation.build_plan_step(
                    5, suggested_action_identifier="ask_boatman_about_the_shipwreck_year"
                ),
            ]
        )
    )
    confirmed_turn = answer.json()["confirmed_turn"]
    assert step_dispositions(confirmed_turn) == [
        "executed",
        "skipped_without_method",
        "executed",
        "executed",
        "left_pending",
    ]
    assert "circunstancias" not in continuation_paragraphs(confirmed_turn)


def test_only_a_real_unmet_condition_is_called_a_circumstance(lighthouse_investigation):
    answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [
                lighthouse_investigation.build_plan_step(
                    1,
                    suggested_action_identifier="speak_with_waiting_woman",
                    condition_text="si estoy herido",
                ),
                lighthouse_investigation.build_plan_step(2, suggested_action_identifier="listen_to_boatman_warning"),
                lighthouse_investigation.build_plan_step(3, suggested_action_identifier="count_flashes_from_boat"),
                lighthouse_investigation.build_plan_step(
                    4, suggested_action_identifier="ask_boatman_about_the_shipwreck_year"
                ),
                lighthouse_investigation.build_plan_step(5, action_text="Reviso el cuaderno de bitácora con calma"),
            ]
        )
    )
    confirmed_turn = answer.json()["confirmed_turn"]
    assert step_dispositions(confirmed_turn) == [
        "skipped_because_condition_was_unmet",
        "executed",
        "executed",
        "executed",
        "left_pending",
    ]
    assert "circunstancias" in continuation_paragraphs(confirmed_turn)


def test_repeating_the_woman_in_her_own_words_is_already_done(lighthouse_investigation):
    lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    answer = lighthouse_investigation.write_own_words("Hablar con la mujer que espera al final del muelle")
    assert answer.status_code == 200
    assert step_dispositions(answer.json()["confirmed_turn"]) == ["skipped_already_done"]


def test_the_seventh_forced_shove_is_skipped_for_no_effort(lighthouse_investigation):
    for _ in range(case_effort_maximum):
        spent = lighthouse_investigation.write_own_words("Fuerzo el marco con el hombro")
        assert spent.status_code == 200
        assert step_dispositions(spent.json()["confirmed_turn"]) == ["executed"]
    refused = lighthouse_investigation.write_own_words("Fuerzo el marco con el hombro")
    confirmed_turn = refused.json()["confirmed_turn"]
    paragraphs = [
        paragraph
        for director_entry in confirmed_turn["director_entries"]
        for paragraph in director_entry.get("marked_paragraphs", [])
    ]
    assert step_dispositions(confirmed_turn) == ["skipped_for_no_effort"]
    assert no_effort_remaining_text in paragraphs
    assert lighthouse_investigation.read_current_public_state()["public_state"]["effort_remaining"] == 0


def test_paying_the_boatman_after_the_funds_are_gone_is_unaffordable(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El Investigador silba junto al neumático. El lanchero no vuelve la cara. "
                "Los billetes de la caja cambian de mano. El muelle sigue en su sitio."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "operational_funds_spent",
                    "target_identifier": None,
                    "quantity": 1800,
                    "unit_name": None,
                }
            ],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        answer = investigation.send_action_request(
            investigation.build_action_request(
                [
                    investigation.build_plan_step(1, action_text="Silbo una canción junto al neumático"),
                    investigation.build_plan_step(2, suggested_action_identifier="pay_boatman_to_wait"),
                ]
            )
        )
        public_state = investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert step_dispositions(answer.json()["confirmed_turn"]) == ["executed", "skipped_unaffordable"]
    assert public_state["operational_funds"] == 0
    assert public_state["current_scene_presentation"]["scene_identifier"] == "pier_arrival"


def test_the_second_flash_on_the_bent_railing_is_out_of_reach(lighthouse_investigation):
    lighthouse_investigation.take_suggested_action("ignite_flare_outer_stairs")
    answer = lighthouse_investigation.send_action_request(
        lighthouse_investigation.build_action_request(
            [
                lighthouse_investigation.build_plan_step(
                    1, suggested_action_identifier="face_tenth_flash_on_gallery"
                ),
                lighthouse_investigation.build_plan_step(
                    2, suggested_action_identifier="face_tenth_flash_on_gallery"
                ),
            ]
        )
    )
    confirmed_turn = answer.json()["confirmed_turn"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["executed", "skipped_out_of_reach"]
    assert confirmed_turn["archive_outcome"] is None
    assert lighthouse_investigation.read_current_public_state()["public_state"]["serious_wound_count"] == 1


def test_two_free_steps_charge_the_directed_clock_once(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El óxido mancha el dedo. La sal queda en la uña. "
                "Nadie se mueve del sitio. El viento sigue igual."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "world_clock_advanced",
                    "target_identifier": None,
                    "quantity": 12,
                    "unit_name": "minutes",
                }
            ],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        answer = investigation.send_action_request(
            investigation.build_action_request(
                [
                    investigation.build_plan_step(1, action_text="Huelo el óxido de un remache suelto"),
                    investigation.build_plan_step(2, action_text="Paso el dedo por la sal del mismo remache"),
                ]
            )
        )
    confirmed_turn = answer.json()["confirmed_turn"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["executed", "executed"]
    assert directed_clock_minutes(confirmed_turn) == 12


def test_two_free_steps_without_a_clock_effect_charge_the_floor_once(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El óxido mancha el dedo. La sal queda en la uña. "
                "Nadie se mueve del sitio. El viento sigue igual."
            ),
            "effect_proposals": [],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        answer = investigation.send_action_request(
            investigation.build_action_request(
                [
                    investigation.build_plan_step(1, action_text="Huelo el óxido de un remache suelto"),
                    investigation.build_plan_step(2, action_text="Paso el dedo por la sal del mismo remache"),
                ]
            )
        )
    confirmed_turn = answer.json()["confirmed_turn"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["executed", "executed"]
    assert directed_clock_minutes(confirmed_turn) == 5


def test_a_directed_scene_change_waits_until_this_step_can_enter(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El óxido mancha el dedo. La sal queda en la uña. "
                "Nadie nombra otro lugar. El viento sigue igual."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "scene_changed",
                    "target_identifier": "tower_foot",
                    "quantity": None,
                    "unit_name": None,
                }
            ],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        answer = investigation.send_action_request(
            investigation.build_action_request(
                [
                    investigation.build_plan_step(1, action_text="Huelo el óxido de un remache suelto"),
                    investigation.build_plan_step(2, action_text="Paso el dedo por la sal del mismo remache"),
                ]
            )
        )
        public_state = investigation.read_current_public_state()["public_state"]
    confirmed_turn = answer.json()["confirmed_turn"]
    assert answer.status_code == 200
    assert step_dispositions(confirmed_turn) == ["executed", "executed"]
    assert public_state["current_scene_presentation"]["scene_identifier"] == "pier_arrival"


def test_a_directed_scene_change_enters_the_gallery_when_the_text_names_it(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "La luz roja corta el muelle. El hierro de arriba queda a la vista. "
                "El cuerpo no enciende nada. El viento sigue igual."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "scene_changed",
                    "target_identifier": "outer_gallery",
                    "quantity": None,
                    "unit_name": None,
                }
            ],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        answer = investigation.write_own_words("La galería exterior queda a la vista, roja de óxido")
        public_state = investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert step_dispositions(answer.json()["confirmed_turn"]) == ["executed"]
    assert public_state["current_scene_presentation"]["scene_identifier"] == "outer_gallery"


def test_a_directed_scene_change_does_not_open_the_locked_machine_room(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El umbral está a oscuras. La puerta no cede. "
                "No hay marca de llave a la vista. El viento sigue igual."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "scene_changed",
                    "target_identifier": "machine_room",
                    "quantity": None,
                    "unit_name": None,
                }
            ],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        investigation.take_suggested_action("walk_to_tower_foot")
        answer = investigation.write_own_words("Observo el cuarto de máquinas desde el umbral")
        public_state = investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert step_dispositions(answer.json()["confirmed_turn"]) == ["executed"]
    assert public_state["current_scene_presentation"]["scene_identifier"] == "tower_foot"
