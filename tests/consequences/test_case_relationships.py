from the_void_files.narrative.context_builder import DirectorTurnContext, build_investigation_record
from the_void_files.narrative.orchestration.case_relationships import build_case_relationship_lines


def test_a_relationship_line_names_the_band_and_hides_the_number():
    lines = build_case_relationship_lines(
        {
            "relationship_levels": [
                {"person_identifier": "renata_oquendo", "direction_name": "from_investigator", "level": 6},
                {
                    "person_identifier": "renata_oquendo",
                    "direction_name": "toward_investigator_as_perceived",
                    "level": 1,
                },
                {"person_identifier": "sin_nombre", "direction_name": "from_investigator", "level": 12},
            ]
        },
        {"renata_oquendo": "Renata Oquendo"},
    )
    visible_texts = [line["visible_text"] for line in lines]
    assert visible_texts == [
        "Renata Oquendo. De ida: Confianza ganada.",
        "Renata Oquendo. De vuelta, según lo percibido: Apenas se conocen.",
    ]
    assert all(character not in "".join(visible_texts) for character in "0123456789%")
    assert all("_" not in line["visible_text"] for line in lines)


def test_the_next_turn_reads_the_case_relationships():
    turn_context = DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key",
        state_version=2,
        rules_version="1",
        case_specification={
            "persons": [
                {
                    "person_identifier": "renata_oquendo",
                    "known_name": "Renata Oquendo",
                    "alias_before_name_is_known": "La mujer que espera",
                }
            ],
            "belongings": [],
            "scenes": [],
        },
        current_run={
            "public_state": {
                "known_person_identifiers": ["renata_oquendo"],
                "relationship_levels": [
                    {"person_identifier": "renata_oquendo", "direction_name": "from_investigator", "level": 16}
                ],
                "place_name": "Muelle",
                "world_clock_minutes": 200,
            }
        },
    )
    investigation_record = build_investigation_record(turn_context)
    assert investigation_record["case_relationships"][0]["visible_text"] == (
        "Renata Oquendo. De ida: Vínculo incondicional."
    )
    assert "porcentaje" in investigation_record["case_relationships_instruction"]


def test_speaking_with_the_waiting_woman_reaches_the_relationship_register(lighthouse_investigation):
    lighthouse_investigation.take_suggested_action("speak_with_waiting_woman")
    public_state = lighthouse_investigation.read_current_public_state()["public_state"]
    named_people = {
        relationship_level["person_identifier"]: "La mujer que espera"
        for relationship_level in public_state["relationship_levels"]
        if isinstance(relationship_level, dict) and isinstance(relationship_level.get("person_identifier"), str)
    }
    lines = build_case_relationship_lines(public_state, named_people)
    assert lines
    assert all("%" not in line["visible_text"] for line in lines)
    assert all(not any(character.isdigit() for character in line["visible_text"]) for line in lines)
