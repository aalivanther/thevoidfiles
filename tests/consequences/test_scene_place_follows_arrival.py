import json
from pathlib import Path

from the_void_files.application.use_cases.case_start_specification_models import (
    CaseBranchOutcome,
    CaseSpecification,
    ScriptedNarrationEntry,
)
from the_void_files.application.use_cases.consequence_case_state import CaseResolutionContext, WorkingCaseState
from the_void_files.application.use_cases.consequence_director_copy import read_director_copy
from the_void_files.application.use_cases.consequence_turn_resolution import TurnDraft, apply_outcome
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


def build_pier_state() -> WorkingCaseState:
    return WorkingCaseState(
        scene_identifier="pier_arrival",
        place_name="Punta Ánimas · Muelle viejo",
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
    )


def build_gallery_outcome(*, new_place_name: str | None) -> CaseBranchOutcome:
    return CaseBranchOutcome(
        director_entries=[
            ScriptedNarrationEntry(
                voice="director_narration",
                marked_paragraphs=["La galería exterior queda a la vista."],
            )
        ],
        elapsed_minutes=1,
        new_place_name=new_place_name,
        serious_wound_cause_text=None,
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
        next_scene_identifier="outer_gallery",
        archive_ending_identifier=None,
    )


def test_a_scene_change_without_a_named_place_adopts_the_arrival_place():
    resolution_context = read_lighthouse_resolution_context()
    arrival_place_name = "Faro · Galería exterior"
    working_state = build_pier_state()
    turn_draft = TurnDraft()
    apply_outcome(
        build_gallery_outcome(new_place_name=None),
        None,
        working_state,
        turn_draft,
        resolution_context,
        "turn_gallery_without_place",
    )
    assert working_state.scene_identifier == "outer_gallery"
    assert working_state.place_name == arrival_place_name
    scene_changes = [
        staging_event
        for staging_event in turn_draft.staging_events
        if staging_event.get("kind") == "scene_changed"
    ]
    assert len(scene_changes) == 1
    assert scene_changes[0]["resulting_place_name"] == arrival_place_name

    named_state = build_pier_state()
    named_draft = TurnDraft()
    apply_outcome(
        build_gallery_outcome(new_place_name="Muelle de carga de Punta Ánimas"),
        None,
        named_state,
        named_draft,
        resolution_context,
        "turn_gallery_with_named_place",
    )
    assert named_state.scene_identifier == "outer_gallery"
    assert named_state.place_name == "Muelle de carga de Punta Ánimas"
    named_scene_changes = [
        staging_event
        for staging_event in named_draft.staging_events
        if staging_event.get("kind") == "scene_changed"
    ]
    assert named_scene_changes[0]["resulting_place_name"] == "Muelle de carga de Punta Ánimas"
