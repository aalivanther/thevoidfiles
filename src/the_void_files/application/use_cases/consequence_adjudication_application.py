import re
from typing import Any

from the_void_files.application.use_cases.case_start_specification_models import (
    CaseBranchOutcome,
    InvestigatorCondition,
    ScriptedNarrationEntry,
    ScriptedRelationshipChange,
)
from the_void_files.application.use_cases.consequence_case_state import CaseResolutionContext
from the_void_files.narrative.tool_registry import (
    AdjudicationProposal,
    EffectProposal,
    known_effect_kind_names,
    normalize_effect_proposal,
)
identifier_pattern = re.compile(r"^[a-z0-9][a-z0-9_]{0,95}$")
sentence_split_pattern = re.compile(r"(?<=[.!?…])\s+")
minimum_directed_elapsed_minutes = 5
maximum_directed_elapsed_minutes = 180
maximum_engine_paragraph_count = 8


def split_ruling_into_engine_paragraphs(ruling_text: str) -> list[str]:
    stripped_ruling_text = ruling_text.strip()
    if stripped_ruling_text == "":
        return []
    sentence_texts = [sentence_text.strip() for sentence_text in sentence_split_pattern.split(stripped_ruling_text) if sentence_text.strip()]
    if not sentence_texts:
        return [stripped_ruling_text]
    if len(sentence_texts) <= maximum_engine_paragraph_count:
        return sentence_texts
    merged_paragraphs: list[str] = []
    group_size = (len(sentence_texts) + maximum_engine_paragraph_count - 1) // maximum_engine_paragraph_count
    for group_start_index in range(0, len(sentence_texts), group_size):
        merged_paragraphs.append(" ".join(sentence_texts[group_start_index : group_start_index + group_size]))
    return merged_paragraphs[:maximum_engine_paragraph_count]


def collect_known_flag_names(case_specification: Any) -> set[str]:
    dumped_specification = case_specification.model_dump(mode="json")
    flag_names: set[str] = set()

    def visit(node: Any) -> None:
        if isinstance(node, dict):
            granted_flag_names = node.get("granted_lived_experience_flag_names")
            if isinstance(granted_flag_names, list):
                flag_names.update(flag_name for flag_name in granted_flag_names if isinstance(flag_name, str))
            for nested_value in node.values():
                visit(nested_value)
        elif isinstance(node, list):
            for nested_value in node:
                visit(nested_value)

    visit(dumped_specification)
    return flag_names


def collect_scene_identifiers(resolution_context: CaseResolutionContext) -> set[str]:
    return {scene.scene_identifier for scene in resolution_context.case_specification.scenes}


def read_effect_quantity(effect_proposal: EffectProposal, default_quantity: int) -> int:
    return effect_proposal.quantity if isinstance(effect_proposal.quantity, int) else default_quantity


def build_outcome_from_adjudication_proposal(
    adjudication_proposal: AdjudicationProposal | None,
    resolution_context: CaseResolutionContext,
    action_text: str | None = None,
    investigator_attributes: dict[str, int] | None = None,
    current_scene_identifier: str | None = None,
    belonging_units: dict[str, int] | None = None,
    previous_scene_identifier: str | None = None,
) -> CaseBranchOutcome | None:
    if adjudication_proposal is None or adjudication_proposal.disposition_name != "proposed":
        return None
    engine_paragraphs = split_ruling_into_engine_paragraphs(adjudication_proposal.concise_ruling_text)
    if not engine_paragraphs:
        return None
    scene_identifiers = collect_scene_identifiers(resolution_context)
    elapsed_minutes = minimum_directed_elapsed_minutes
    granted_flag_names: list[str] = []
    next_scene_identifier: str | None = None
    archive_ending_identifier: str | None = None
    new_place_name: str | None = None
    serious_wound_cause_text: str | None = None
    person_identifiers_becoming_known: list[str] = []
    relationship_changes: list[ScriptedRelationshipChange] = []
    conditions_gained: list[InvestigatorCondition] = []
    threat_capability_text: str | None = None
    person_identifiers = {person.person_identifier for person in resolution_context.case_specification.persons}
    for effect_proposal in adjudication_proposal.effect_proposals:
        normalized_proposal = normalize_effect_proposal(effect_proposal)
        if normalized_proposal is None or normalized_proposal.effect_kind_name not in known_effect_kind_names:
            continue
        if threat_capability_text is None and isinstance(normalized_proposal.threat_capability_text, str):
            stripped_capability_text = normalized_proposal.threat_capability_text.strip()
            if stripped_capability_text != "":
                threat_capability_text = stripped_capability_text
        if normalized_proposal.effect_kind_name == "world_clock_advanced":
            elapsed_minutes = min(
                maximum_directed_elapsed_minutes,
                max(minimum_directed_elapsed_minutes, read_effect_quantity(normalized_proposal, elapsed_minutes)),
            )
        elif normalized_proposal.effect_kind_name == "knowledge_gained":
            flag_name = normalized_proposal.target_identifier
            if isinstance(flag_name, str) and identifier_pattern.fullmatch(flag_name):
                granted_flag_names.append(flag_name)
        elif normalized_proposal.effect_kind_name == "scene_changed":
            scene_identifier = normalized_proposal.target_identifier
            if isinstance(scene_identifier, str) and scene_identifier in scene_identifiers:
                next_scene_identifier = scene_identifier
            elif isinstance(normalized_proposal.unit_name, str) and normalized_proposal.unit_name.strip() != "":
                new_place_name = normalized_proposal.unit_name.strip()
        elif normalized_proposal.effect_kind_name == "place_changed":
            if isinstance(normalized_proposal.unit_name, str) and normalized_proposal.unit_name.strip() != "":
                new_place_name = normalized_proposal.unit_name.strip()
        elif normalized_proposal.effect_kind_name == "archive_outcome_reached":
            continue
        elif normalized_proposal.effect_kind_name == "serious_wound_suffered":
            wound_cause_text = normalized_proposal.unit_name.strip() if isinstance(normalized_proposal.unit_name, str) else ""
            if wound_cause_text != "":
                serious_wound_cause_text = wound_cause_text
        elif normalized_proposal.effect_kind_name == "condition_gained":
            condition_identifier = normalized_proposal.target_identifier or ""
            visible_name = normalized_proposal.unit_name.strip() if isinstance(normalized_proposal.unit_name, str) else ""
            origin_text = (normalized_proposal.condition_origin_text or "").strip()
            effect_text = (normalized_proposal.condition_effect_text or "").strip()
            exit_text = (normalized_proposal.condition_exit_text or "").strip()
            if (
                identifier_pattern.fullmatch(condition_identifier)
                and visible_name
                and origin_text
                and effect_text
                and exit_text
            ):
                conditions_gained.append(
                    InvestigatorCondition(
                        condition_identifier=condition_identifier,
                        visible_name=visible_name,
                        origin_text=origin_text,
                        effect_text=effect_text,
                        exit_text=exit_text,
                    )
                )
                engine_paragraphs.append(f"{visible_name}. {effect_text} {exit_text}")
        elif normalized_proposal.effect_kind_name == "person_became_known":
            person_identifier = normalized_proposal.target_identifier
            if isinstance(person_identifier, str) and person_identifier in person_identifiers:
                person_identifiers_becoming_known.append(person_identifier)
        elif normalized_proposal.effect_kind_name == "relationship_changed":
            person_identifier = normalized_proposal.target_identifier
            if isinstance(person_identifier, str) and person_identifier in person_identifiers:
                level_change = read_effect_quantity(normalized_proposal, 1)
                relationship_changes.append(
                    ScriptedRelationshipChange(
                        person_identifier=person_identifier,
                        direction_name="from_investigator",
                        dimension_name=None,
                        level_change=level_change,
                        perceptible_cause_text=engine_paragraphs[0],
                    )
                )
    unique_flag_names = list(dict.fromkeys(granted_flag_names))
    unique_known_persons = list(dict.fromkeys(person_identifiers_becoming_known))
    if isinstance(action_text, str) and action_text.strip() != "":
        from the_void_files.narrative.orchestration.decision_matrix import score_logical_courses
        from the_void_files.narrative.orchestration.distance_field import measure_course_to_named_place
        from the_void_files.narrative.orchestration.effort import build_public_ruling_lead, read_investigator_attributes
        from the_void_files.narrative.orchestration.plan_calculus import confirm_feasibility_class_name, held_kit_records

        attributes = investigator_attributes or read_investigator_attributes({})
        visible_names = {
            belonging.identifier: belonging.visible_name
            for belonging in resolution_context.case_specification.belongings
        }
        held_kit = held_kit_records(belonging_units or {}, visible_names)
        specification_record = resolution_context.case_specification.model_dump(mode="json")
        distance_course = measure_course_to_named_place(
            specification_record,
            current_scene_identifier,
            action_text,
            previous_scene_identifier,
        )
        chosen_course = score_logical_courses(action_text, held_kit, distance_course)["chosen_course"]
        ruling_lead = build_public_ruling_lead(
            action_text,
            confirm_feasibility_class_name(
                adjudication_proposal.feasibility_class_name,
                action_text,
                attributes,
                chosen_course,
            ),
            attributes,
        )
        if not engine_paragraphs or engine_paragraphs[0] != ruling_lead:
            engine_paragraphs = [ruling_lead, *engine_paragraphs][:maximum_engine_paragraph_count]
    return CaseBranchOutcome(
        director_entries=[ScriptedNarrationEntry(voice="director_narration", marked_paragraphs=engine_paragraphs)],
        elapsed_minutes=elapsed_minutes,
        new_place_name=new_place_name,
        serious_wound_cause_text=serious_wound_cause_text,
        critical_failure_cause_text=None,
        perception_clarification_text=None,
        conditions_gained=conditions_gained,
        condition_identifiers_ended=[],
        person_identifiers_becoming_known=unique_known_persons,
        relationship_changes=relationship_changes,
        staging_events=[],
        granted_lived_experience_flag_names=unique_flag_names,
        presented_interactive_piece_identifiers=[],
        interactive_piece_status_changes=[],
        should_update_journal=True,
        additional_witnessed_origin_identifiers=[],
        next_scene_identifier=next_scene_identifier,
        archive_ending_identifier=archive_ending_identifier,
        threat_capability_text=threat_capability_text,
    )
