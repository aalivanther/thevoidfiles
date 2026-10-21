import asyncio
import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from case_start.conftest import (
    lighthouse_whisper_identifier,
    open_service_client,
    profile_headers,
    profile_identifier,
    read_lighthouse_case_specification,
    read_whisper_offer,
    service_base_address,
)
from consequences.conftest import LighthouseInvestigation, read_rows
from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest, NarrativeGenerationResponse
from the_void_files.application.service_failures import ProfileAlreadyRegisteredError
from the_void_files.application.use_cases import consequence_directed_turn_confirmation
from the_void_files.application.use_cases.director_failures import NarrativeProviderTimedOutError
from the_void_files.application_factory import create_application
from the_void_files.narrative.case_generator import whisper_offer_response_schema_name
from the_void_files.service_settings import ServiceSettings, project_root_directory

foreign_whisper_identifier = "invented_foreign_whisper"
enriching_prefix_text = "Bajo la bruma, "


def lower_first_letter(marked_paragraph):
    return marked_paragraph[:1].lower() + marked_paragraph[1:] if not marked_paragraph.startswith("{{") else marked_paragraph


def enrich_paragraphs(engine_marked_paragraphs):
    return [f"{enriching_prefix_text}{lower_first_letter(marked_paragraph)}" for marked_paragraph in engine_marked_paragraphs]


class RealModeDirectorDouble:
    provider_name = "director_double"
    provider_mode_name = "real"
    model_identifier = "director_double_model"

    def __init__(self, narrate=enrich_paragraphs, narration_failure=None, adjudication_proposal=None) -> None:
        self.narrate = narrate
        self.narration_failure = narration_failure
        self.adjudication_proposal = adjudication_proposal
        self.received_requests: list[NarrativeGenerationRequest] = []

    def count_requests(self, purpose_name):
        return len([request for request in self.received_requests if request.purpose_name == purpose_name])

    def read_block(self, generation_request, authority_label_name):
        for context_block in generation_request.context_blocks:
            if context_block.authority_label_name == authority_label_name:
                return json.loads(context_block.content_text)
        return {}

    async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
        self.received_requests.append(generation_request)
        if generation_request.purpose_name == "whisper_offer_generation":
            structured_response = {
                whisper_offer_response_schema_name: {
                    "offer_format_version": 1,
                    "offered_whispers": [
                        {
                            "identifier": foreign_whisper_identifier,
                            "ordinal_label": "I",
                            "headline": "Titular ajeno",
                            "source_label": "Fuente ajena",
                            "rumor_text": "Rumor ajeno",
                            "distance_text": "Lejos",
                            "sphere_text": "Esfera",
                            "tone_text": "Tono",
                            "threat_text": "Amenaza",
                            "reward_text": "Recompensa",
                            "is_encoded": False,
                            "is_case_material_available": True,
                        }
                    ],
                }
            }
        elif generation_request.purpose_name == "adjudication":
            control_content = self.read_block(generation_request, "control")
            adjudication_proposal = {
                "action_key": control_content["action_key"],
                "expected_state_version": control_content["state_version"],
                "disposition_name": "proposed",
                "interpreted_intent_text": "Intento interpretado",
                "feasibility_class_name": "plausible",
                "concise_ruling_text": "Fallo breve",
                "supporting_fact_identifiers": [],
                "effect_proposals": [],
                "requested_clarification_text": None,
            }
            if self.adjudication_proposal is not None:
                adjudication_proposal.update(self.adjudication_proposal)
                adjudication_proposal["action_key"] = control_content["action_key"]
                adjudication_proposal["expected_state_version"] = control_content["state_version"]
            structured_response = {"adjudication_proposal": adjudication_proposal}
        elif generation_request.purpose_name == "narration":
            if self.narration_failure is not None:
                raise self.narration_failure
            engine_marked_paragraphs = self.read_block(generation_request, "prepared_result")["marked_paragraphs"]
            structured_response = {
                "narration_draft": {
                    "marked_paragraphs": self.narrate(engine_marked_paragraphs),
                    "introduced_fact_identifiers": [],
                }
            }
        else:
            raise AssertionError(generation_request.purpose_name)
        return NarrativeGenerationResponse(
            provider_name=self.provider_name,
            model_identifier=self.model_identifier,
            response_text="director_double",
            structured_response=structured_response,
        )

    async def close(self) -> None:
        return None


def open_real_mode_client(
    data_directory, access_key_vault, director_double, case_material_source_name="curated", adjudication="on"
):
    application = create_application(
        service_settings=ServiceSettings(
            data_directory=data_directory,
            migrations_directory=project_root_directory / "database" / "migrations",
            frontend_distribution_directory=data_directory / "absent_frontend_distribution",
            provider_mode_name="real",
            case_material_source_name=case_material_source_name,
            turn_adjudication_switch_name=adjudication,
        ),
        access_key_vault=access_key_vault,
        narrative_provider=director_double,
    )
    try:
        application.state.service_dependencies.profile_catalogue.register_profile(
            profile_identifier, "First investigator"
        )
    except ProfileAlreadyRegisteredError:
        pass
    return TestClient(application, base_url=service_base_address)


@pytest.fixture
def profile_database_path(data_directory):
    return data_directory / "profiles" / profile_identifier / "chronicle.sqlite3"


def read_narration_paragraphs(director_entries):
    return [
        marked_paragraph
        for director_entry in director_entries
        if director_entry["voice"] == "director_narration"
        for marked_paragraph in director_entry["marked_paragraphs"]
    ]


def test_curated_material_is_offered_and_opened_while_the_story_provider_is_real(
    data_directory, access_key_vault, profile_database_path
):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        health = test_client.get("/api/health").json()
        provider_status = test_client.get("/api/director/provider-status").json()
        whisper_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
    assert health["case_material_source_name"] == "curated"
    assert health["turn_adjudication_switch_name"] == "on"
    assert provider_status["case_material_source_name"] == "curated"
    assert lighthouse_whisper_identifier in [whisper["identifier"] for whisper in whisper_offer["offered_whispers"]]
    assert director_double.received_requests == []
    material_interactions = read_rows(
        profile_database_path,
        "SELECT provider_name, provider_mode_name FROM ai_interaction "
        "WHERE purpose_name IN ('whisper_offer_generation', 'case_generation')",
    )
    assert len(material_interactions) == 2
    assert {tuple(interaction_row) for interaction_row in material_interactions} == {
        ("synthetic_case_material", "synthetic")
    }
    specification_rows = read_rows(profile_database_path, "SELECT provider_name, provider_mode_name FROM case_specification")
    assert [tuple(specification_row) for specification_row in specification_rows] == [
        ("synthetic_case_material", "synthetic")
    ]


def test_generated_source_keeps_asking_the_real_story_provider(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double, "generated") as test_client:
        whisper_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
    assert [whisper["identifier"] for whisper in whisper_offer["offered_whispers"]] == [foreign_whisper_identifier]
    assert director_double.count_requests("whisper_offer_generation") == 1
    whisper_request = director_double.received_requests[0]
    assert [context_block.authority_label_name for context_block in whisper_request.context_blocks] == [
        "control",
        "relevant_rules",
        "investigator_profile",
        "output_contract",
    ]


def test_generated_source_marks_every_offered_whisper_openable(data_directory, access_key_vault):
    class BoardDirectorDouble(RealModeDirectorDouble):
        async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
            self.received_requests.append(generation_request)
            if generation_request.purpose_name == "whisper_offer_generation":
                board_offer = read_whisper_offer()
                return NarrativeGenerationResponse(
                    provider_name=self.provider_name,
                    model_identifier=self.model_identifier,
                    response_text="board_offer",
                    structured_response={whisper_offer_response_schema_name: board_offer},
                )
            raise AssertionError(generation_request.purpose_name)

    with open_real_mode_client(data_directory, access_key_vault, BoardDirectorDouble(), "generated") as test_client:
        whisper_answer = test_client.get("/api/case-start/whispers", headers=profile_headers)
    assert whisper_answer.status_code == 200
    offered_whispers = whisper_answer.json()["offered_whispers"]
    assert len(offered_whispers) == 4
    assert [offered_whisper["is_case_material_available"] for offered_whisper in offered_whispers] == [True, True, True, True]


def test_foreign_pending_offer_batch_is_superseded_without_deleting_rows(
    data_directory, access_key_vault, profile_database_path
):
    with open_real_mode_client(data_directory, access_key_vault, RealModeDirectorDouble(), "generated") as test_client:
        foreign_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
    with open_real_mode_client(data_directory, access_key_vault, RealModeDirectorDouble()) as test_client:
        curated_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
        repeated_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
        LighthouseInvestigation(test_client).open_lighthouse_archive()
    assert curated_offer["offer_batch_identifier"] != foreign_offer["offer_batch_identifier"]
    assert repeated_offer["offer_batch_identifier"] == curated_offer["offer_batch_identifier"]
    assert lighthouse_whisper_identifier in [whisper["identifier"] for whisper in curated_offer["offered_whispers"]]
    stored_batch_identifiers = {
        batch_row["offer_batch_identifier"]
        for batch_row in read_rows(profile_database_path, "SELECT offer_batch_identifier FROM whisper_offer_batch")
    }
    assert stored_batch_identifiers == {foreign_offer["offer_batch_identifier"], curated_offer["offer_batch_identifier"]}
    foreign_whisper_rows = read_rows(
        profile_database_path,
        "SELECT was_chosen, archive_case_identifier FROM offered_whisper WHERE offer_batch_identifier = ?",
        (foreign_offer["offer_batch_identifier"],),
    )
    assert [tuple(whisper_row) for whisper_row in foreign_whisper_rows] == [(0, None)]


def test_synthetic_mode_supersedes_a_pending_real_whisper_offer(data_directory, access_key_vault):
    with open_real_mode_client(data_directory, access_key_vault, RealModeDirectorDouble(), "generated") as test_client:
        real_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
    application = create_application(
        service_settings=ServiceSettings(
            data_directory=data_directory,
            migrations_directory=project_root_directory / "database" / "migrations",
            frontend_distribution_directory=data_directory / "absent_frontend_distribution",
            provider_mode_name="synthetic",
        ),
        access_key_vault=access_key_vault,
    )
    with TestClient(application, base_url=service_base_address) as test_client:
        demo_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
    assert demo_offer["offer_batch_identifier"] != real_offer["offer_batch_identifier"]
    assert [whisper["identifier"] for whisper in real_offer["offered_whispers"]] == [foreign_whisper_identifier]
    assert lighthouse_whisper_identifier in [whisper["identifier"] for whisper in demo_offer["offered_whispers"]]


def test_generated_mode_supersedes_a_pending_synthetic_whisper_offer(data_directory, access_key_vault):
    with open_service_client(data_directory, access_key_vault) as test_client:
        demo_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double, "generated") as test_client:
        real_offer = test_client.get("/api/case-start/whispers", headers=profile_headers).json()
    assert real_offer["offer_batch_identifier"] != demo_offer["offer_batch_identifier"]
    assert [whisper["identifier"] for whisper in real_offer["offered_whispers"]] == [foreign_whisper_identifier]
    assert director_double.count_requests("whisper_offer_generation") == 1


def test_turn_is_adjudicated_narrated_by_the_director_and_persisted(
    data_directory, access_key_vault, profile_database_path
):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        confirmed_turn = investigation.take_suggested_action("speak_with_waiting_woman")
        answer = investigation.answers[-1].json()
        log_history = test_client.get("/api/consequences/log-entries", headers=profile_headers).json()
    narrated_paragraphs = read_narration_paragraphs(confirmed_turn["director_entries"])
    assert narrated_paragraphs
    assert all(narrated_paragraph.startswith(enriching_prefix_text) for narrated_paragraph in narrated_paragraphs)
    assert answer["director_involvement"]["narration"]["narration_source_name"] == "director"
    assert answer["director_involvement"]["adjudication"]["outcome_name"] == "skipped"
    assert answer["director_involvement"]["adjudication"]["is_engine_the_authority_for_effects"] is True
    assert director_double.count_requests("adjudication") == 0
    assert director_double.count_requests("narration") == 1
    stored_log_rows = read_rows(
        profile_database_path,
        "SELECT entry_json FROM log_entry WHERE turn_identifier = ? AND voice_name = 'director_narration' "
        "ORDER BY ordinal_number",
        (confirmed_turn["turn_identifier"],),
    )
    stored_paragraphs = [
        marked_paragraph
        for stored_log_row in stored_log_rows
        for marked_paragraph in json.loads(stored_log_row["entry_json"])["marked_paragraphs"]
    ]
    assert stored_paragraphs == narrated_paragraphs
    decoded_log_history_text = json.dumps(log_history, ensure_ascii=False)
    assert all(
        json.dumps(narrated_paragraph, ensure_ascii=False) in decoded_log_history_text
        for narrated_paragraph in narrated_paragraphs
    )
    attempt_rows = read_rows(
        profile_database_path,
        "SELECT purpose_name, outcome_name, action_key, turn_identifier FROM director_generation_attempt "
        "ORDER BY sequence_number",
    )
    assert [(attempt_row["purpose_name"], attempt_row["outcome_name"]) for attempt_row in attempt_rows] == [
        ("narration", "accepted"),
    ]
    assert attempt_rows[0]["turn_identifier"] == confirmed_turn["turn_identifier"]
    narration_request = [
        request for request in director_double.received_requests if request.purpose_name == "narration"
    ][0]
    assert "private_case_definition" not in [
        context_block.authority_label_name for context_block in narration_request.context_blocks
    ]
    specification = read_lighthouse_case_specification()
    decoded_narration_request_text = "".join(
        context_block.content_text for context_block in narration_request.context_blocks
    )
    assert specification["private_truth"]["summary_text"] not in decoded_narration_request_text


def test_second_turn_adjudication_keeps_what_the_investigator_already_did(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        investigation.take_suggested_action("speak_with_waiting_woman")
        own_words_answer = investigation.write_own_words("Huelo cada remache de la barandilla oxidada del muelle")
        assert own_words_answer.status_code == 200
    second_adjudication = [
        request for request in director_double.received_requests if request.purpose_name == "adjudication"
    ][0]
    narrative_memory = director_double.read_block(second_adjudication, "narrative_memory")
    attempted_texts = [
        attempted_step.get("action_text")
        for log_entry in narrative_memory["recent_log_entries"]
        if log_entry.get("voice") == "investigator_entry"
        for attempted_step in log_entry.get("attempted_steps") or []
    ]
    assert any(attempted_text for attempted_text in attempted_texts)
    record_texts = [
        attempted_action["action_text"]
        for attempted_action in narrative_memory["investigation_record"]["attempted_actions"]
    ]
    assert "speak_with_waiting_woman" in record_texts
    canonical_state = director_double.read_block(second_adjudication, "canonical_character_state")
    assert "world_clock_minutes" in canonical_state
    private_case_definition = director_double.read_block(second_adjudication, "private_case_definition")
    encoded_branches_text = json.dumps(
        private_case_definition.get("current_scene", {}).get("action_branches"), ensure_ascii=False
    )
    assert "marked_paragraphs" not in encoded_branches_text
    specification = read_lighthouse_case_specification()
    assert private_case_definition["private_truth"]["summary_text"] == specification["private_truth"]["summary_text"]
    private_case_definition = director_double.read_block(second_adjudication, "private_case_definition")
    assert private_case_definition.get("reachable_places")
    assert private_case_definition.get("persons")


def test_invented_suggested_origin_is_adjudicated_instead_of_skipped(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El Investigador pregunta por los químicos. El interlocutor evita la mirada. "
                "El olor a vinagre se espesa. Los frascos del escritorio tiemblan. "
                "La lista de nombres queda a la vista."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "knowledge_gained",
                    "target_identifier": "origen_reactivos_revelado",
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
                    investigation.build_plan_step(
                        1,
                        suggested_action_identifier="branch_preguntar_origen_quimicos",
                        action_text="Cuestionar al interlocutor sobre los compuestos corrosivos",
                    )
                ]
            )
        )
        public_state = investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert director_double.count_requests("adjudication") == 1
    confirmed_turn = answer.json()["confirmed_turn"]
    assert confirmed_turn["investigator_entry"]["attempted_steps"][0]["composition_origin_name"] == "suggested_action"
    assert confirmed_turn["investigator_entry"]["attempted_steps"][0]["origin_identifier"] == (
        "branch_preguntar_origen_quimicos"
    )
    assert "origen_reactivos_revelado" in public_state["lived_experience_flag_names"]


def test_digit_leftover_does_not_ask_a_continuation_question(lighthouse_investigation):
    plan_steps = [
        lighthouse_investigation.build_plan_step(1, suggested_action_identifier="speak_with_waiting_woman"),
        lighthouse_investigation.build_plan_step(2, suggested_action_identifier="listen_to_boatman_warning"),
        lighthouse_investigation.build_plan_step(3, suggested_action_identifier="count_flashes_from_boat"),
        lighthouse_investigation.build_plan_step(4, action_text="8"),
    ]
    answer = lighthouse_investigation.send_action_request(lighthouse_investigation.build_action_request(plan_steps))
    confirmed_turn = answer.json()["confirmed_turn"]
    assert confirmed_turn["plan_continuation_question"] is None
    assert [step["disposition_name"] for step in confirmed_turn["plan_step_dispositions"]] == [
        "executed",
        "executed",
        "executed",
    ]


def test_using_the_lantern_in_own_words_consumes_it_when_the_director_omits_the_ledger(
    data_directory, access_key_vault
):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        answer = investigation.write_own_words("Enciendo la linterna de mano para mirar bajo las tablas del muelle")
        public_state = investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    belonging_units = {
        belonging["belonging_identifier"]: belonging["units"] for belonging in public_state["belonging_units"]
    }
    assert belonging_units["hand_lantern"] == 0


def test_naming_a_reachable_place_moves_the_investigator_there(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        answer = investigation.write_own_words("Camino hasta el pie del faro")
        public_state = investigation.read_current_public_state()["public_state"]
    assert answer.status_code == 200
    assert "Pie del faro" in public_state["place_name"]
    assert public_state["current_scene_presentation"]["scene_identifier"] == "tower_foot"
    narration_request = [request for request in director_double.received_requests if request.purpose_name == "narration"][0]
    legend = director_double.read_block(narration_request, "controlled_variables")
    assert "Pie del faro" in legend["variables"][0]["current_value"]


def test_unmatched_own_words_apply_director_ruling(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El Investigador se agacha junto a la barandilla. El óxido mancha los dedos. "
                "Los remaches no coinciden con el plano. El viento trae salitre y aceite frío."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "advance_world_clock_minutes",
                    "target_identifier": None,
                    "quantity": 12,
                    "unit_name": "minutes",
                },
                {
                    "effect_kind_name": "archive_outcome_reached",
                    "target_identifier": "ending_fixed_shutters",
                    "quantity": None,
                    "unit_name": None,
                },
            ],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        own_words_answer = investigation.write_own_words("Huelo cada remache de la barandilla oxidada del muelle")
        assert own_words_answer.status_code == 200
        confirmed_turn = own_words_answer.json()["confirmed_turn"]
    assert confirmed_turn["investigator_entry"]["attempted_steps"][0]["composition_origin_name"] == "own_words"
    narration_paragraphs = read_narration_paragraphs(confirmed_turn["director_entries"])
    assert len(narration_paragraphs) == 5
    assert any("plan es" in paragraph.casefold() for paragraph in narration_paragraphs)
    assert any("remaches" in paragraph for paragraph in narration_paragraphs)
    world_clock_effects = [
        confirmed_effect
        for confirmed_effect in confirmed_turn["confirmed_effects"]
        if confirmed_effect.get("kind") == "world_clock_advanced"
    ]
    assert world_clock_effects
    assert world_clock_effects[0]["elapsed_minutes"] == 12
    assert confirmed_turn.get("archive_outcome") is None


def test_directed_ledger_gains_kit_moves_place_and_can_spend_the_lantern(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        adjudication_proposal={
            "concise_ruling_text": (
                "El Investigador compra un manómetro de bronce en el muelle. "
                "Gasta una linterna para leer la escala. El reloj del puerto marca otra hora. "
                "El lugar ya no es el muelle viejo. El metal huele a salitre."
            ),
            "effect_proposals": [
                {
                    "effect_kind_name": "world_clock_advanced",
                    "target_identifier": None,
                    "quantity": 90,
                    "unit_name": "minutes",
                },
                {
                    "effect_kind_name": "place_changed",
                    "target_identifier": "muelle_de_carga",
                    "quantity": None,
                    "unit_name": "Muelle de carga de Punta Ánimas",
                },
                {
                    "effect_kind_name": "belonging_gained",
                    "target_identifier": "manometro_de_bronce",
                    "quantity": 1,
                    "unit_name": "Manómetro de bronce",
                },
                {
                    "effect_kind_name": "belonging_consumed",
                    "target_identifier": "hand_lantern",
                    "quantity": 1,
                    "unit_name": None,
                },
            ],
        }
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        own_words_answer = investigation.write_own_words(
            "Compro un manómetro de bronce en el muelle y gasto la linterna para leerlo"
        )
        assert own_words_answer.status_code == 200
        confirmed_turn = own_words_answer.json()["confirmed_turn"]
        public_state = investigation.read_current_public_state()["public_state"]
    effect_kinds = [confirmed_effect["kind"] for confirmed_effect in confirmed_turn["confirmed_effects"]]
    assert "belonging_units_gained" in effect_kinds
    assert "belonging_units_consumed" in effect_kinds
    assert "place_changed" in effect_kinds
    clock_effect = next(
        confirmed_effect
        for confirmed_effect in confirmed_turn["confirmed_effects"]
        if confirmed_effect["kind"] == "world_clock_advanced"
    )
    assert clock_effect["elapsed_minutes"] == 90
    belonging_units = {
        belonging["belonging_identifier"]: belonging["units"] for belonging in public_state["belonging_units"]
    }
    assert belonging_units["manometro_de_bronce"] == 1
    assert belonging_units["hand_lantern"] == 0
    assert public_state["place_name"] == "Muelle de carga de Punta Ánimas"


def test_narration_provider_failure_falls_back_to_the_engine_text(
    data_directory, access_key_vault, profile_database_path
):
    director_double = RealModeDirectorDouble(narration_failure=NarrativeProviderTimedOutError())
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        confirmed_turn = investigation.take_suggested_action("speak_with_waiting_woman")
        answer = investigation.answers[-1].json()
    narrated_paragraphs = read_narration_paragraphs(confirmed_turn["director_entries"])
    assert narrated_paragraphs
    assert not any(narrated_paragraph.startswith(enriching_prefix_text) for narrated_paragraph in narrated_paragraphs)
    assert answer["director_involvement"]["narration"]["narration_source_name"] == "engine"
    assert answer["director_involvement"]["narration"]["failure_names"] == [
        "narrative_provider_timed_out",
        "narrative_provider_timed_out",
    ]
    failed_attempt_rows = read_rows(
        profile_database_path,
        "SELECT failure_name FROM director_generation_attempt WHERE purpose_name = 'narration'",
    )
    assert [attempt_row["failure_name"] for attempt_row in failed_attempt_rows] == [
        "narrative_provider_timed_out",
        "narrative_provider_timed_out",
    ]


def test_repeated_action_key_returns_the_stored_turn_without_asking_the_director_again(
    data_directory, access_key_vault
):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        action_request = investigation.build_action_request(
            [investigation.build_plan_step(1, suggested_action_identifier="speak_with_waiting_woman")]
        )
        first_answer = investigation.send_action_request(action_request)
        request_count_after_first_answer = len(director_double.received_requests)
        repeated_answer = test_client.post(
            "/api/consequences/investigator-actions", headers=profile_headers, json=action_request
        )
    assert first_answer.status_code == 200
    assert repeated_answer.status_code == 200
    assert repeated_answer.json() == first_answer.json()
    assert len(director_double.received_requests) == request_count_after_first_answer == 1


@pytest.mark.parametrize(
    "build_leaking_paragraphs",
    [
        lambda specification, engine_paragraphs: [
            f"{engine_paragraph} {specification['private_truth']['summary_text']}" for engine_paragraph in engine_paragraphs
        ],
        lambda specification, engine_paragraphs: [
            f"{engine_paragraph} Hay un 73 % de riesgo." for engine_paragraph in engine_paragraphs
        ],
        lambda specification, engine_paragraphs: [
            f"{engine_paragraph} La tirada sale bien." for engine_paragraph in engine_paragraphs
        ],
        lambda specification, engine_paragraphs: [
            f"{engine_paragraph} {{{{secreto_inventado}}}} mira." for engine_paragraph in engine_paragraphs
        ],
    ],
)
def test_private_or_forbidden_narration_never_leaves_the_service(
    data_directory, access_key_vault, build_leaking_paragraphs
):
    specification = read_lighthouse_case_specification()
    director_double = RealModeDirectorDouble(
        narrate=lambda engine_paragraphs: build_leaking_paragraphs(specification, engine_paragraphs)
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        confirmed_turn = investigation.take_suggested_action("walk_to_tower_foot")
        answer = investigation.answers[-1]
        history_texts = [
            test_client.get("/api/consequences/turns", headers=profile_headers).text,
            test_client.get("/api/consequences/log-entries", headers=profile_headers).text,
        ]
    assert answer.json()["director_involvement"]["narration"]["narration_source_name"] == "engine"
    assert director_double.count_requests("narration") == 2
    for answer_text in [answer.text, *history_texts]:
        decoded_answer_text = json.dumps(json.loads(answer_text), ensure_ascii=False)
        assert specification["private_truth"]["summary_text"] not in decoded_answer_text
        assert "73 %" not in decoded_answer_text
        assert "La tirada" not in decoded_answer_text
        assert "secreto_inventado" not in decoded_answer_text


def test_director_may_add_investigation_paragraphs_after_the_engine_text(data_directory, access_key_vault):
    extra_paragraph = "El aire del muelle huele a salitre y a aceite frío."
    director_double = RealModeDirectorDouble(
        narrate=lambda engine_paragraphs: [*engine_paragraphs, extra_paragraph]
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        confirmed_turn = investigation.take_suggested_action("walk_to_tower_foot")
        answer = investigation.answers[-1]
    assert answer.json()["director_involvement"]["narration"]["narration_source_name"] == "director"
    assert extra_paragraph in json.dumps(confirmed_turn, ensure_ascii=False)


def test_unrevealed_name_is_rejected_until_the_person_becomes_known(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble(
        narrate=lambda engine_paragraphs: [f"{engine_paragraph} Renata observa." for engine_paragraph in engine_paragraphs]
    )
    with open_real_mode_client(data_directory, access_key_vault, director_double) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        investigation.take_suggested_action("walk_to_tower_foot")
        concealing_answer = investigation.answers[-1].json()
    assert concealing_answer["director_involvement"]["narration"]["narration_source_name"] == "director"
    assert director_double.count_requests("narration") == 1
    assert "Renata" not in json.dumps(concealing_answer["confirmed_turn"], ensure_ascii=False)


def test_adjudication_can_be_switched_off(data_directory, access_key_vault):
    director_double = RealModeDirectorDouble()
    with open_real_mode_client(data_directory, access_key_vault, director_double, adjudication="off") as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        investigation.take_suggested_action("speak_with_waiting_woman")
        answer = investigation.answers[-1].json()
    assert director_double.count_requests("adjudication") == 0
    assert director_double.count_requests("narration") == 1
    assert answer["director_involvement"]["adjudication"]["outcome_name"] == "skipped"
    assert answer["director_involvement"]["narration"]["narration_source_name"] == "director"


def test_synthetic_story_provider_keeps_turns_deterministic_without_director_calls(
    consequence_client, lighthouse_investigation, profile_database_path
):
    lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    assert "director_involvement" not in lighthouse_investigation.answers[-1].json()
    connection = sqlite3.connect(str(profile_database_path))
    try:
        turn_interaction_count = connection.execute(
            "SELECT COUNT(*) FROM ai_interaction WHERE purpose_name IN ('adjudication', 'narration')"
        ).fetchone()[0]
    finally:
        connection.close()
    assert turn_interaction_count == 0


def test_narration_slower_than_the_time_budget_falls_back_and_is_recorded(
    data_directory, access_key_vault, profile_database_path, monkeypatch
):
    class SlowNarrationDirectorDouble(RealModeDirectorDouble):
        async def generate_narrative(self, generation_request):
            if generation_request.purpose_name == "narration":
                self.received_requests.append(generation_request)
                await asyncio.sleep(5)
            return await super().generate_narrative(generation_request)

    monkeypatch.setattr(consequence_directed_turn_confirmation, "turn_narration_time_budget_seconds", 0.05)
    with open_real_mode_client(data_directory, access_key_vault, SlowNarrationDirectorDouble()) as test_client:
        investigation = LighthouseInvestigation(test_client)
        investigation.open_lighthouse_archive()
        investigation.take_suggested_action("speak_with_waiting_woman")
        answer = investigation.answers[-1].json()
    assert answer["director_involvement"]["narration"]["narration_source_name"] == "engine"
    assert answer["director_involvement"]["narration"]["failure_names"] == ["director_time_budget_exhausted"]
    cancelled_interaction_rows = read_rows(
        profile_database_path, "SELECT failure_name FROM ai_interaction WHERE purpose_name = 'narration'"
    )
    assert [interaction_row["failure_name"] for interaction_row in cancelled_interaction_rows] == [
        "narrative_provider_call_cancelled"
    ]
