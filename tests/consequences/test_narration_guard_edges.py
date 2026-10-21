import json
from pathlib import Path

from the_void_files.application.use_cases.case_start_specification_models import (
    CaseBranchOutcome,
    CaseEndingDefinition,
    CaseSpecification,
    ScriptedNarrationEntry,
)
from the_void_files.application.use_cases.consequence_case_state import CaseResolutionContext, WorkingCaseState
from the_void_files.application.use_cases.consequence_director_copy import read_director_copy
from the_void_files.application.use_cases.consequence_turn_resolution import TurnDraft, apply_outcome
from the_void_files.narrative.narration_guard import (
    collect_private_texts,
    read_forbidden_game_term_texts,
    review_player_facing_narration,
    salvage_player_facing_narration,
)
from the_void_files.narrative.orchestration.effort import case_effort_maximum
from the_void_files.narrative.orchestration.narration_contract import (
    repair_narration_to_committed_facts,
    review_narration_against_committed_facts,
)
from the_void_files.narrative.tool_registry import NarrationDraft


def error_names(validation_errors) -> list[str]:
    return [validation_error.error_name for validation_error in validation_errors]


def test_a_new_digit_is_rejected_and_a_clock_or_an_engine_year_is_not():
    added_digit = review_player_facing_narration(
        NarrationDraft(marked_paragraphs=["Saca un 14 y sigue."]),
        ["Sigue el muelle en calma."],
        [],
        [],
    )
    assert "narration_adds_numbers" in error_names(added_digit)
    copied_year = review_player_facing_narration(
        NarrationDraft(marked_paragraphs=["El faro lleva apagado desde 1987."]),
        ["El faro lleva apagado desde 1987."],
        [],
        [],
    )
    assert "narration_adds_numbers" not in error_names(copied_year)
    written_clock = review_player_facing_narration(
        NarrationDraft(marked_paragraphs=["A las 03:12 sigue."]),
        ["Sigue el muelle en calma."],
        [],
        [],
    )
    assert "narration_adds_numbers" not in error_names(written_clock)


def test_game_terms_match_a_whole_word():
    forbidden_terms = read_forbidden_game_term_texts()
    ordinary_prose = review_player_facing_narration(
        NarrationDraft(marked_paragraphs=["La retirada de los soldados deja el muelle vacío."]),
        ["El muelle queda en calma."],
        [],
        forbidden_terms,
    )
    assert "narration_uses_game_terms" not in error_names(ordinary_prose)
    bare_roll = review_player_facing_narration(
        NarrationDraft(marked_paragraphs=["La tirada sale bien."]),
        ["El muelle queda en calma."],
        [],
        forbidden_terms,
    )
    assert "narration_uses_game_terms" in error_names(bare_roll)
    engine_says_retreat = review_player_facing_narration(
        NarrationDraft(marked_paragraphs=["La tirada sale bien."]),
        ["La retirada queda anotada."],
        [],
        forbidden_terms,
    )
    assert "narration_uses_game_terms" in error_names(engine_says_retreat)


def test_a_short_name_does_not_eat_a_longer_word():
    case_specification = {
        "persons": [
            {
                "person_identifier": "ana",
                "known_name": "Ana",
                "alias_before_name_is_known": "La desconocida",
            }
        ]
    }
    private_texts = collect_private_texts(case_specification, [])
    fruit_draft = NarrationDraft(marked_paragraphs=["Come una manzana junto al mostrador."])
    fruit_errors = salvage_player_facing_narration(
        fruit_draft,
        ["Come una fruta junto al mostrador."],
        private_texts,
        [],
        case_specification,
        [],
    )
    assert fruit_errors == []
    assert fruit_draft.marked_paragraphs == ["Come una manzana junto al mostrador."]
    named_draft = NarrationDraft(marked_paragraphs=["Ana espera."])
    named_errors = salvage_player_facing_narration(
        named_draft,
        ["Alguien espera."],
        private_texts,
        [],
        case_specification,
        [],
    )
    assert named_errors == []
    assert named_draft.marked_paragraphs == ["La desconocida espera."]


def test_place_repair_keeps_a_distant_mention_and_folds_an_accented_presence():
    committed_facts = {
        "clock_label": "20:05",
        "other_place_tails": ["muelle viejo", "cuarto de maquinas"],
    }
    distant_paragraphs = repair_narration_to_committed_facts(
        ["A lo lejos el muelle viejo sigue apagado, y el reloj marca las 20:05."],
        committed_facts,
    )
    assert "muelle viejo" in distant_paragraphs[0]
    assert "20:05" in distant_paragraphs[0]
    assert "{{lugar}}" not in distant_paragraphs[0]
    assert "{{hora}}" not in distant_paragraphs[0]
    present_paragraphs = repair_narration_to_committed_facts(
        ["Ya está en el cuarto de máquinas."],
        committed_facts,
    )
    assert "{{lugar}}" in present_paragraphs[0]
    assert "máquinas" not in present_paragraphs[0]


def test_an_unrecorded_bleed_is_rejected_and_not_rewritten():
    committed_facts = {
        "clock_label": "20:05",
        "other_place_tails": [],
        "serious_wound_count": 0,
        "wound_cause_text": "",
    }
    bleed_paragraph = "Sangra por el costado."
    validation_errors = review_narration_against_committed_facts([bleed_paragraph], committed_facts)
    assert "narration_contradicts_committed_wound" in error_names(validation_errors)
    assert repair_narration_to_committed_facts([bleed_paragraph], committed_facts) == [bleed_paragraph]


def read_lighthouse_resolution_context() -> CaseResolutionContext:
    specification = CaseSpecification.model_validate(
        json.loads(
            (
                Path(__file__).resolve().parents[2]
                / "content"
                / "synthetic_cases"
                / "lighthouse_counts_one_more"
                / "case_specification.json"
            ).read_text(encoding="utf-8")
        )
    )
    return CaseResolutionContext(
        case_specification=specification,
        director_copy=read_director_copy(),
        case_supplement=None,
        archive_number=1,
        has_relational_anchor_person=False,
        placeholder_texts={},
    )


def test_a_fifth_wound_does_not_keep_the_living_ending():
    resolution_context = read_lighthouse_resolution_context()
    dying_ending = CaseEndingDefinition(
        ending_identifier="ending_written_while_dying",
        closing_entries=[
            ScriptedNarrationEntry(
                voice="director_narration",
                marked_paragraphs=["El investigador redacta el informe en la lancha y sigue con vida."],
            )
        ],
        death_outcome=None,
    )
    resolution_context.case_specification = resolution_context.case_specification.model_copy(
        update={"endings": [*resolution_context.case_specification.endings, dying_ending]}
    )
    working_state = WorkingCaseState(
        scene_identifier="tower_foot",
        place_name="Pie del faro",
        world_clock_minutes=100,
        operational_funds=100,
        belonging_units={},
        serious_wound_count=4,
        lived_experience_flag_names=[],
        active_conditions=[],
        known_person_identifiers=[],
        witnessed_origin_identifiers=[],
        interactive_piece_status_by_identifier={},
        relationship_level_by_key={},
        relationship_dimension_by_key={},
        executed_branch_identifiers=[],
        given_entropy_signal_flag_names=[],
        effort_remaining=case_effort_maximum,
        investigator_attributes={"im": 4, "if": 4, "c": 4, "o": 4, "co": 4, "m": 4, "s": 4},
    )
    outcome = CaseBranchOutcome(
        director_entries=[
            ScriptedNarrationEntry(
                voice="director_narration",
                marked_paragraphs=["La barandilla aguanta por dos tornillos."],
            )
        ],
        elapsed_minutes=1,
        new_place_name=None,
        serious_wound_cause_text="La barandilla cedió.",
        critical_failure_cause_text=None,
        perception_clarification_text=None,
        conditions_gained=[],
        condition_identifiers_ended=[],
        person_identifiers_becoming_known=[],
        relationship_changes=[],
        staging_events=[],
        granted_lived_experience_flag_names=[],
        presented_interactive_piece_identifiers=[],
        interactive_piece_status_changes=[],
        should_update_journal=False,
        additional_witnessed_origin_identifiers=[],
        next_scene_identifier=None,
        archive_ending_identifier="ending_written_while_dying",
    )
    turn_draft = TurnDraft()
    apply_outcome(outcome, None, working_state, turn_draft, resolution_context, "turn_fifth_wound")
    narrated_text = " ".join(
        paragraph
        for director_entry in turn_draft.director_entries
        for paragraph in director_entry.get("marked_paragraphs", [])
    )
    assert "redacta el informe" not in narrated_text
    assert turn_draft.archive_outcome["kind"] == "chronicle_closed_by_death"
    assert turn_draft.archive_outcome["death_cause_name"] == "fifth_serious_wound"
