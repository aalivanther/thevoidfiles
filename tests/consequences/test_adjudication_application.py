import json
from pathlib import Path

from the_void_files.application.use_cases.case_start_specification_models import CaseSpecification
from the_void_files.application.use_cases.consequence_adjudication_application import (
    build_outcome_from_adjudication_proposal,
    split_ruling_into_engine_paragraphs,
)
from the_void_files.application.use_cases.consequence_case_state import CaseResolutionContext
from the_void_files.application.use_cases.consequence_director_copy import read_director_copy
from the_void_files.narrative.tool_registry import (
    AdjudicationProposal,
    EffectProposal,
    normalize_effect_kind_name,
    normalize_effect_proposal,
)


def test_the_public_ruling_names_the_plan_and_the_attribute_without_a_roll():
    from the_void_files.narrative.orchestration.effort import build_public_ruling_lead

    ruling_lead = build_public_ruling_lead("Examino la puerta", "plausible", {"o": 6})
    assert ruling_lead == "El plan es coherente. Se apoya en Percepción, que vale 6."
    assert "%" not in ruling_lead
    assert "dado" not in ruling_lead.casefold()
    assert build_public_ruling_lead("Espero", "risky", {"s": 9}) == "El plan es arriesgado."


def test_split_ruling_keeps_short_sentences_in_order():
    paragraphs = split_ruling_into_engine_paragraphs(
        "El libro huele a humedad. La tinta no seca. Nadie firmó la salida. Elena aguarda en la reja."
    )
    assert paragraphs == [
        "El libro huele a humedad.",
        "La tinta no seca.",
        "Nadie firmó la salida.",
        "Elena aguarda en la reja.",
    ]


def test_a_directed_wound_is_kept_only_when_the_cause_is_named():
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
    resolution_context = CaseResolutionContext(
        case_specification=specification,
        director_copy=read_director_copy(),
        case_supplement=None,
        archive_number=1,
        has_relational_anchor_person=False,
        placeholder_texts={},
    )
    ruling_text = (
        "El marco cede. El investigador se corta. "
        "La sangre es poca. Sigue de pie. No suelta la baranda."
    )
    without_cause = AdjudicationProposal(
        action_key="action_key_0001",
        expected_state_version=1,
        disposition_name="proposed",
        interpreted_intent_text="Se golpea.",
        feasibility_class_name="risky",
        concise_ruling_text=ruling_text,
        effect_proposals=[EffectProposal(effect_kind_name="serious_wound_suffered", quantity=1)],
    )
    with_cause = without_cause.model_copy(
        update={
            "effect_proposals": [
                EffectProposal(
                    effect_kind_name="serious_wound_suffered",
                    quantity=1,
                    unit_name="El marco de hierro le abre la sien.",
                )
            ]
        }
    )
    assert build_outcome_from_adjudication_proposal(without_cause, resolution_context).serious_wound_cause_text is None
    assert (
        build_outcome_from_adjudication_proposal(with_cause, resolution_context).serious_wound_cause_text
        == "El marco de hierro le abre la sien."
    )


def test_a_condition_without_an_exit_is_rejected_and_a_complete_one_is_kept():
    from the_void_files.narrative.tool_registry import AdjudicationDomainFacts, review_adjudication_proposal

    ruling_text = (
        "El olor a vinagre se pega a la lengua. El investigador tose. "
        "Los nombres se le escapan. Sigue el pasillo. No suelta la carpeta."
    )
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
    resolution_context = CaseResolutionContext(
        case_specification=specification,
        director_copy=read_director_copy(),
        case_supplement=None,
        archive_number=1,
        has_relational_anchor_person=False,
        placeholder_texts={},
    )
    incomplete = AdjudicationProposal(
        action_key="action_key_0001",
        expected_state_version=1,
        disposition_name="proposed",
        interpreted_intent_text="Respira el polvo.",
        feasibility_class_name="risky",
        concise_ruling_text=ruling_text,
        effect_proposals=[
            EffectProposal(
                effect_kind_name="condition_gained",
                target_identifier="amnesia_selectiva",
                unit_name="Amnesia selectiva",
                condition_origin_text="El polvo del legajo.",
                condition_effect_text="Olvida los nombres que acaba de oír.",
            )
        ],
    )
    errors = review_adjudication_proposal(
        incomplete,
        AdjudicationDomainFacts(
            action_key="action_key_0001",
            state_version=1,
            held_belonging_units_by_identifier={},
            operational_funds=0,
        ),
    )
    assert any(error.error_name == "condition_without_exit" for error in errors)
    complete = incomplete.model_copy(
        update={
            "effect_proposals": [
                EffectProposal(
                    effect_kind_name="condition_gained",
                    target_identifier="amnesia_selectiva",
                    unit_name="Amnesia selectiva",
                    condition_origin_text="El polvo del legajo.",
                    condition_effect_text="Olvida los nombres que acaba de oír.",
                    condition_exit_text="Reposo lejos de ese papel.",
                )
            ]
        }
    )
    outcome = build_outcome_from_adjudication_proposal(complete, resolution_context)
    assert outcome is not None
    assert outcome.conditions_gained[0].condition_identifier == "amnesia_selectiva"
    assert outcome.conditions_gained[0].exit_text == "Reposo lejos de ese papel."
    assert any("Amnesia selectiva" in paragraph for paragraph in outcome.director_entries[0].marked_paragraphs)


def test_clock_alias_normalizes_to_world_clock_advanced():
    assert normalize_effect_kind_name("advance_world_clock_minutes") == "world_clock_advanced"
    normalized_proposal = normalize_effect_proposal(
        EffectProposal(effect_kind_name="grant_lived_experience_flag", target_identifier="registro_examinado")
    )
    assert normalized_proposal is not None
    assert normalized_proposal.effect_kind_name == "knowledge_gained"
    assert normalize_effect_proposal(EffectProposal(effect_kind_name="record_executed_branch")) is None
