import copy
import json

from case_start.conftest import lighthouse_whisper_identifier, read_lighthouse_case_specification
from consequences.conftest import read_rows
from the_void_files.application.use_cases.case_start_specification_models import CaseBranchOutcome
from the_void_files.narrative.case_reviewer import review_case_specification_proposal
from the_void_files.narrative.context_builder import DirectorTurnContext, build_investigation_record
from the_void_files.narrative.orchestration.narration_contract import review_narration_against_committed_facts
from the_void_files.narrative.orchestration.threat_register import (
    append_threat_acts,
    build_threat_rows,
    match_listed_capability,
)


def bare_outcome(**updates):
    payload = {
        "director_entries": [{"voice": "director_narration", "marked_paragraphs": ["El cuarto sigue quieto."]}],
        "elapsed_minutes": 1,
        "new_place_name": None,
        "serious_wound_cause_text": None,
        "critical_failure_cause_text": None,
        "perception_clarification_text": None,
        "conditions_gained": [],
        "condition_identifiers_ended": [],
        "person_identifiers_becoming_known": [],
        "relationship_changes": [],
        "staging_events": [],
        "granted_lived_experience_flag_names": [],
        "presented_interactive_piece_identifiers": [],
        "interactive_piece_status_changes": [],
        "should_update_journal": False,
        "additional_witnessed_origin_identifiers": [],
        "next_scene_identifier": None,
        "archive_ending_identifier": None,
    }
    payload.update(updates)
    return CaseBranchOutcome.model_validate(payload)


def narration_facts(**updates):
    facts = {
        "clock_label": "03:12",
        "other_place_tails": [],
        "serious_wound_count": 0,
        "wound_cause_text": "",
        "condition_names": [],
        "listed_capability_texts": ["Retiene a una persona dentro de la torre como décimo provisional."],
        "used_capability_texts": [],
        "threat_is_defeated": False,
    }
    facts.update(updates)
    return facts


def test_only_a_listed_capability_is_attached_to_the_act():
    capability_text = "Retiene a una persona dentro de la torre como décimo provisional."
    assert match_listed_capability("  retiene a una persona dentro de la torre como décimo provisional. ", [capability_text]) == (
        capability_text
    )
    assert match_listed_capability("Inventa un rayo nuevo.", [capability_text]) == ""
    wound = bare_outcome(
        serious_wound_cause_text="El décimo destello le dio de frente.",
        threat_capability_text=capability_text,
        staging_events=[{"kind": "attack_received", "anchor_entry_index": 0, "anchor_paragraph_index": 0}],
    )
    rows = build_threat_rows(wound, [capability_text])
    assert [row["kind"] for row in rows] == ["herida"]
    assert rows[0]["capability_text"] == capability_text
    anomaly = bare_outcome(
        staging_events=[{"kind": "anomaly_manifested", "anchor_entry_index": 0, "anchor_paragraph_index": 0}],
        threat_capability_text="Inventa un rayo nuevo.",
    )
    anomaly_rows = build_threat_rows(anomaly, [capability_text])
    assert anomaly_rows == [{"kind": "anomalia", "detail": "", "capability_text": ""}]
    defeat = bare_outcome(threat_was_defeated=True)
    acts, sentences = append_threat_acts([], "El cuarto de la linterna", "04:10", build_threat_rows(defeat, [capability_text]))
    assert acts[0]["kind"] == "derrota"
    assert acts[0]["capability_text"] == ""
    assert sentences[0] == "A las 04:10, en El cuarto de la linterna, la amenaza quedó vencida."
    assert "_" not in sentences[0]


def test_the_narrator_cannot_invent_a_capability_or_declare_victory():
    capability_text = "Retiene a una persona dentro de la torre como décimo provisional."
    invented = review_narration_against_committed_facts(
        [f"Entonces ocurre esto: {capability_text}"],
        narration_facts(),
    )
    assert any(error.error_name == "narration_invents_threat_capability" for error in invented)
    used = review_narration_against_committed_facts(
        [f"Entonces ocurre esto: {capability_text}"],
        narration_facts(used_capability_texts=[capability_text]),
    )
    assert all(error.error_name != "narration_invents_threat_capability" for error in used)
    victory = review_narration_against_committed_facts(
        ["La amenaza ya no está en la torre."],
        narration_facts(),
    )
    assert any(error.error_name == "narration_declares_threat_defeated" for error in victory)
    allowed = review_narration_against_committed_facts(
        ["La amenaza ya no está en la torre."],
        narration_facts(threat_is_defeated=True),
    )
    assert all(error.error_name != "narration_declares_threat_defeated" for error in allowed)


def test_an_unknown_capability_name_is_rejected_and_a_listed_one_is_kept():
    specification = copy.deepcopy(read_lighthouse_case_specification())
    outcome = specification["scenes"][0]["action_branches"][0]["default_outcome"]
    outcome["threat_capability_text"] = "Inventa un rayo nuevo."
    rejected = review_case_specification_proposal(specification, lighthouse_whisper_identifier)
    assert "threat_capability_unknown" in {error.error_name for error in rejected.validation_errors}
    outcome["threat_capability_text"] = specification["private_truth"]["threat"]["capability_texts"][0]
    accepted = review_case_specification_proposal(specification, lighthouse_whisper_identifier)
    assert accepted.is_accepted


def test_climbing_the_inner_staircase_records_the_listed_capability(lighthouse_investigation, profile_database_path):
    lighthouse_investigation.take_suggested_action("walk_to_tower_foot")
    lighthouse_investigation.take_suggested_action("enter_main_door")
    lighthouse_investigation.take_suggested_action("start_up_inner_staircase")
    confirmed_turn = lighthouse_investigation.take_suggested_action("climb_inner_staircase")
    threat_lines = confirmed_turn["threat_lines"]
    assert any("dejó una condición" in threat_line and "Desorientación" in threat_line for threat_line in threat_lines)
    assert any("atacó la percepción" in threat_line for threat_line in threat_lines)
    assert any("Desorientación" in threat_line for threat_line in threat_lines)
    assert all("Habla por la escalera" not in threat_line for threat_line in threat_lines)
    assert all("Retiene a una persona" not in threat_line for threat_line in threat_lines)
    assert any("Cuentas bien" in heard_line and "voice_on_the_staircase" not in heard_line for heard_line in confirmed_turn["heard_lines"])
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert public_state["threat_is_defeated"] is False
    assert all(
        "Habla por la escalera" not in json.dumps(threat_act, ensure_ascii=False)
        for threat_act in public_state["threat_acts"]
    )
    stored_run = json.loads(read_rows(profile_database_path, "SELECT current_run_json FROM archive_run")[0]["current_run_json"])
    investigation_record = build_investigation_record(
        DirectorTurnContext(
            profile_identifier="main_chronicle",
            archive_case_identifier="archive_case",
            archive_run_identifier="archive_run",
            action_key="action_key",
            state_version=public_state["confirmed_turn_count"] + 1,
            rules_version="1",
            case_specification=read_lighthouse_case_specification(),
            current_run=stored_run,
            recent_log_entries=[],
        )
    )
    assert investigation_record["threat_is_defeated"] is False
    assert {threat_act["kind"] for threat_act in investigation_record["threat_acts"]} == {
        "condicion",
        "ataque_mental",
        "capacidad",
    }
    assert any(
        threat_act["capability_text"].startswith("Desorienta a quien sube")
        for threat_act in investigation_record["threat_acts"]
    )
    assert any(
        threat_act["capability_text"].startswith("Habla por la escalera")
        for threat_act in investigation_record["threat_acts"]
    )
    assert any(
        threat_act["capability_text"].startswith("Retiene a una persona")
        for threat_act in investigation_record["threat_acts"]
    )
    assert any(fact["kind"] == "amenaza" and "Desorientación" in fact["visible_text"] for fact in investigation_record["journal_facts"])
    assert any(fact["kind"] == "dicho" and "Cuentas bien" in fact["visible_text"] for fact in investigation_record["journal_facts"])


def test_a_quiet_turn_leaves_the_threat_undefeated_for_the_next_turn(lighthouse_investigation):
    confirmed_turn = lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    assert confirmed_turn["threat_lines"] == []
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    assert public_state["threat_acts"] == []
    assert public_state["threat_is_defeated"] is False
    investigation_record = build_investigation_record(
        DirectorTurnContext(
            profile_identifier="main_chronicle",
            archive_case_identifier="archive_case",
            archive_run_identifier="archive_run",
            action_key="action_key",
            state_version=2,
            rules_version="1",
            case_specification=read_lighthouse_case_specification(),
            current_run={"public_state": public_state},
            recent_log_entries=[],
        )
    )
    assert investigation_record["threat_is_defeated"] is False
    assert "no la des por vencida" in investigation_record["threat_acts_instruction"]
    assert "threat_acts" not in investigation_record
