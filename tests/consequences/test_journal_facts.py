from consequences.conftest import right_lock_value, service_door_lock_identifier
from the_void_files.narrative.context_builder import DirectorTurnContext, build_investigation_record
from the_void_files.narrative.orchestration.journal_facts import build_journal_facts


def test_journal_facts_keep_visible_words_and_drop_identifiers():
    facts = build_journal_facts(
        {
            "revealed_facts": [{"fact_identifier": "machine_room_is_open", "visible_name": "La sala de máquinas está abierta"}],
            "visited_places": [{"scene_identifier": "tower_foot", "place_name": "Punta Ánimas · Pie del faro"}],
            "serious_wound_count": 1,
            "last_serious_wound_cause_text": "La puerta le golpeó la mano.",
            "active_conditions": [
                {
                    "condition_identifier": "frio_de_la_torre",
                    "visible_name": "Frío de la torre",
                    "effect_text": "Le cuesta cerrar la mano.",
                    "exit_text": "Entrar en calor.",
                }
            ],
        },
        [{"person_identifier": "renata_oquendo", "visible_name": "Renata Oquendo"}],
    )
    visible_texts = [fact["visible_text"] for fact in facts]
    assert "La sala de máquinas está abierta" in visible_texts
    assert "Punta Ánimas · Pie del faro" in visible_texts
    assert "Renata Oquendo" in visible_texts
    assert "La puerta le golpeó la mano." in visible_texts
    assert any(fact["kind"] == "condicion" and "Frío de la torre" in fact["visible_text"] for fact in facts)
    assert all("_" not in fact["visible_text"] for fact in facts)
    assert all(set(fact) == {"kind", "visible_text"} for fact in facts)


def test_the_next_turn_reads_those_journal_facts():
    turn_context = DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key",
        state_version=2,
        rules_version="1",
        case_specification={"persons": [], "belongings": [], "scenes": []},
        current_run={
            "public_state": {
                "revealed_facts": [{"visible_name": "La sala de máquinas está abierta"}],
                "visited_places": [{"place_name": "Punta Ánimas · Pie del faro"}],
                "known_person_identifiers": [],
                "place_name": "Punta Ánimas · Pie del faro",
                "world_clock_minutes": 130,
            }
        },
    )
    investigation_record = build_investigation_record(turn_context)
    assert investigation_record["journal_facts_instruction"].startswith("Estos hechos son los del diario")
    assert {fact["visible_text"] for fact in investigation_record["journal_facts"]} >= {
        "La sala de máquinas está abierta",
        "Punta Ánimas · Pie del faro",
    }


def test_a_completed_objective_text_reaches_the_journal_and_the_next_turn():
    visible_text = "Saber de dónde sale el décimo destello"
    public_state = {
        "completed_objective_texts": [visible_text],
        "revealed_facts": [],
        "visited_places": [],
        "known_person_identifiers": [],
        "place_name": "Punta Ánimas · Pie del faro",
        "world_clock_minutes": 130,
    }
    facts = build_journal_facts(public_state)
    encargo_facts = [fact for fact in facts if fact["kind"] == "encargo"]
    assert encargo_facts == [{"kind": "encargo", "visible_text": visible_text}]
    assert "_" not in encargo_facts[0]["visible_text"]
    turn_context = DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key",
        state_version=2,
        rules_version="1",
        case_specification={"persons": [], "belongings": [], "scenes": []},
        current_run={"public_state": public_state},
    )
    investigation_record = build_investigation_record(turn_context)
    assert any(
        fact["kind"] == "encargo" and fact["visible_text"] == visible_text and "_" not in fact["visible_text"]
        for fact in investigation_record["journal_facts"]
    )


def test_a_solved_piece_and_the_walk_reach_the_journal(lighthouse_investigation):
    lighthouse_investigation.walk_to_the_service_door_lock()
    assert (
        lighthouse_investigation.attempt_interactive_piece(service_door_lock_identifier, right_lock_value).status_code
        == 200
    )
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    facts = build_journal_facts(public_state)
    assert any(fact["kind"] == "hecho" and fact["visible_text"].strip() for fact in facts)
    assert any(fact["kind"] == "lugar" and "faro" in fact["visible_text"].casefold() for fact in facts)
