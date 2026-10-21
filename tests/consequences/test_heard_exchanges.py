from the_void_files.narrative.context_builder import DirectorTurnContext, build_investigation_record
from the_void_files.narrative.orchestration.heard_exchanges import (
    append_heard_exchange,
    heard_exchanges_instruction,
)
from the_void_files.narrative.orchestration.journal_facts import build_journal_facts


def test_a_group_exchange_keeps_speaker_order_and_drops_a_repeat():
    raw_lines = [
        {
            "speaker_person_identifier": "renata_oquendo",
            "speaker_visible_name": "Renata Oquendo",
            "marked_paragraphs": ["«Yo cuento.»"],
            "was_present": True,
        },
        {
            "speaker_person_identifier": "punta_animas_boatman",
            "speaker_visible_name": "El lanchero",
            "marked_paragraphs": ["«Yo también.» [[pausa:200]]Y [[diez]]."],
            "was_present": False,
        },
    ]
    exchanges, sentences = append_heard_exchange([], "El muelle", "03:21", raw_lines)
    assert [line["speaker_visible_name"] for line in exchanges[0]["lines"]] == ["Renata Oquendo", "El lanchero"]
    assert exchanges[0]["lines"][1]["was_present"] is False
    assert exchanges[0]["lines"][1]["spoken_text"] == "«Yo también.» Y diez."
    assert sentences[0] == "A las 03:21, en El muelle, Renata Oquendo dijo: «Yo cuento.»"
    assert "[[" not in sentences[1]
    assert "grupo" in heard_exchanges_instruction
    repeated_exchanges, repeated_sentences = append_heard_exchange(exchanges, "El muelle", "03:21", raw_lines)
    assert repeated_exchanges == exchanges
    assert repeated_sentences == []


def test_speaking_with_the_waiting_woman_stays_in_the_next_turn(lighthouse_investigation):
    confirmed_turn = lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    assert confirmed_turn["heard_lines"]
    assert all("[[" not in heard_line and "renata_oquendo" not in heard_line for heard_line in confirmed_turn["heard_lines"])
    assert any("aprendiz" in heard_line for heard_line in confirmed_turn["heard_lines"])

    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    exchange = public_state["heard_exchanges"][0]
    assert exchange["lines"][0]["was_present"] is True
    assert exchange["lines"][0]["speaker_person_identifier"] == "renata_oquendo"
    assert "renata_oquendo" not in exchange["lines"][0]["spoken_text"]

    journal_facts = build_journal_facts(public_state)
    assert any(
        fact["kind"] == "dicho" and "aprendiz" in fact["visible_text"] and "_" not in fact["visible_text"]
        for fact in journal_facts
    )

    investigation_record = build_investigation_record(
        DirectorTurnContext(
            profile_identifier="main_chronicle",
            archive_case_identifier="archive_case",
            archive_run_identifier="archive_run",
            action_key="action_key",
            state_version=2,
            rules_version="1",
            case_specification={"persons": [], "belongings": [], "scenes": []},
            current_run={"public_state": public_state},
            recent_log_entries=[],
        )
    )
    assert investigation_record["heard_exchanges"][0]["lines"][0]["spoken_text"]
    assert "grupo" in investigation_record["heard_exchanges_instruction"]
    assert any("aprendiz" in fact["visible_text"] for fact in investigation_record["journal_facts"])
