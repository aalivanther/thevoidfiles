import json
from pathlib import Path

from the_void_files.application.use_cases.case_start_specification_models import CaseSpecification
from the_void_files.application.use_cases.consequence_case_state import CaseResolutionContext, WorkingCaseState
from the_void_files.application.use_cases.consequence_director_copy import read_director_copy
from the_void_files.application.use_cases.consequence_turn_resolution import TurnDraft, append_entropy_signal_if_due
from the_void_files.narrative.orchestration.effort import case_effort_maximum


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


def build_pier_state(*, threat_is_defeated: bool) -> WorkingCaseState:
    return WorkingCaseState(
        scene_identifier="pier_arrival",
        place_name="Muelle",
        world_clock_minutes=100,
        operational_funds=100,
        belonging_units={},
        serious_wound_count=0,
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
        threat_is_defeated=threat_is_defeated,
    )


def narrated_text(turn_draft: TurnDraft) -> str:
    return " ".join(
        paragraph
        for director_entry in turn_draft.director_entries
        for paragraph in director_entry.get("marked_paragraphs", [])
    )


def test_entropy_stays_quiet_once_the_threat_is_defeated():
    resolution_context = read_lighthouse_resolution_context()
    signal_fragment = "se detiene en cada puerta un poco más"
    defeated_state = build_pier_state(threat_is_defeated=True)
    defeated_draft = TurnDraft()
    append_entropy_signal_if_due(defeated_state, defeated_draft, resolution_context, 10)
    assert signal_fragment not in narrated_text(defeated_draft)
    assert defeated_state.lived_experience_flag_names == []
    assert defeated_state.given_entropy_signal_flag_names == []
    assert defeated_state.threat_acts == []

    living_state = build_pier_state(threat_is_defeated=False)
    living_draft = TurnDraft()
    append_entropy_signal_if_due(living_state, living_draft, resolution_context, 10)
    assert signal_fragment in narrated_text(living_draft)
    assert living_state.lived_experience_flag_names == ["first_entropy_signal_was_given"]
    assert len(living_state.threat_acts) == 1
