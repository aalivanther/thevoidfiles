import json
from pathlib import Path

from the_void_files.application.use_cases.case_start_specification_models import CaseSpecification
from the_void_files.application.use_cases.consequence_adjudication_application import (
    build_outcome_from_adjudication_proposal,
)
from the_void_files.application.use_cases.consequence_case_state import CaseResolutionContext, WorkingCaseState
from the_void_files.application.use_cases.consequence_director_copy import read_director_copy
from the_void_files.application.use_cases.consequence_turn_resolution import (
    TurnDraft,
    apply_outcome,
    read_relationship_qualitative_band_name,
)
from the_void_files.narrative.orchestration.effort import case_effort_maximum
from the_void_files.narrative.tool_registry import AdjudicationProposal, EffectProposal


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


def build_relationship_proposal(quantity: int | None) -> AdjudicationProposal:
    effect_proposal = EffectProposal(
        effect_kind_name="relationship_changed",
        target_identifier="renata_oquendo",
        quantity=quantity,
    )
    return AdjudicationProposal(
        action_key="action_key_0001",
        expected_state_version=1,
        disposition_name="proposed",
        interpreted_intent_text="Habla con la mujer de la libreta.",
        feasibility_class_name="plausible",
        concise_ruling_text=(
            "La mujer de la libreta escucha sin apartar el cuaderno. "
            "No promete nada. El muelle sigue en calma. El investigador espera."
        ),
        effect_proposals=[effect_proposal],
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


def test_a_relationship_quantity_of_zero_does_not_move_the_bond():
    resolution_context = read_lighthouse_resolution_context()
    outcome = build_outcome_from_adjudication_proposal(
        build_relationship_proposal(0),
        resolution_context,
    )
    assert outcome is not None
    assert len(outcome.relationship_changes) == 1
    assert outcome.relationship_changes[0].level_change == 0
    working_state = build_pier_state()
    turn_draft = TurnDraft()
    apply_outcome(outcome, None, working_state, turn_draft, resolution_context, "turn_relationship_zero")
    assert working_state.relationship_level_by_key[("renata_oquendo", "from_investigator")] == 2
    assert read_relationship_qualitative_band_name(2) == "barely_known"
    assert turn_draft.relationship_changes[0]["level_change"] == 0
    assert turn_draft.relationship_changes[0]["resulting_level"] == 2


def test_a_missing_relationship_quantity_still_moves_one_step():
    resolution_context = read_lighthouse_resolution_context()
    outcome = build_outcome_from_adjudication_proposal(
        build_relationship_proposal(None),
        resolution_context,
    )
    assert outcome is not None
    assert outcome.relationship_changes[0].level_change == 1


def test_an_explicit_relationship_quantity_is_kept():
    resolution_context = read_lighthouse_resolution_context()
    outcome = build_outcome_from_adjudication_proposal(
        build_relationship_proposal(3),
        resolution_context,
    )
    assert outcome is not None
    assert outcome.relationship_changes[0].level_change == 3
