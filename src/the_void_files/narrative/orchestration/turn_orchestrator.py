from typing import Any

from the_void_files.application.ports.narrative_provider import NarrativeContextBlock
from the_void_files.narrative.context_builder import build_json_block, read_public_state
from the_void_files.narrative.orchestration.context_retriever import retrieve_action_context
from the_void_files.narrative.orchestration.decision_matrix import score_logical_courses
from the_void_files.narrative.orchestration.distance_field import measure_course_to_named_place
from the_void_files.narrative.orchestration.effort import read_investigator_attributes
from the_void_files.narrative.orchestration.plan_calculus import calculate_declared_plan
from the_void_files.narrative.orchestration.reality_ledger import (
    build_committed_facts,
    build_controlled_variable_legend,
    diff_reality_ledger,
    read_held_kit_for_context,
)

controlled_variables_authority_label_name = "controlled_variables"
ranked_decision_authority_label_name = "ranked_decision"
calculated_plan_authority_label_name = "calculated_plan"
distance_course_authority_label_name = "distance_course"
retrieved_context_authority_label_name = "retrieved_context"


def read_current_scene_identifier_from_context(turn_context: Any) -> str | None:
    scene_presentation = read_public_state(turn_context).get("current_scene_presentation")
    if isinstance(scene_presentation, dict) and isinstance(scene_presentation.get("scene_identifier"), str):
        return scene_presentation["scene_identifier"]
    return None


def prepare_turn_direction(
    turn_context: Any,
    action_text: str,
    investigator_placeholder_texts: dict[str, str],
    declared_plan_steps: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    public_state = read_public_state(turn_context)
    held_kit = read_held_kit_for_context(turn_context)
    director_private_state = turn_context.current_run.get("director_private_state") if isinstance(turn_context.current_run, dict) else {}
    stored_position = director_private_state.get("position") if isinstance(director_private_state, dict) else None
    previous_scene_identifier = (
        stored_position.get("previous_scene_identifier") if isinstance(stored_position, dict) else None
    )
    current_scene_identifier = read_current_scene_identifier_from_context(turn_context)
    distance_course = measure_course_to_named_place(
        turn_context.case_specification,
        current_scene_identifier,
        action_text,
        previous_scene_identifier if isinstance(previous_scene_identifier, str) else None,
    )
    case_specification = turn_context.case_specification if isinstance(turn_context.case_specification, dict) else {}
    return {
        "controlled_variables": build_controlled_variable_legend(
            public_state, investigator_placeholder_texts, held_kit
        ),
        "distance_course": distance_course,
        "ranked_decision": score_logical_courses(action_text, held_kit, distance_course),
        "calculated_plan": calculate_declared_plan(
            declared_plan_steps,
            read_investigator_attributes(public_state),
            case_specification,
            current_scene_identifier,
            held_kit,
            previous_scene_identifier if isinstance(previous_scene_identifier, str) else None,
            action_text,
        ),
        "retrieved_context": retrieve_action_context(turn_context, action_text, distance_course),
    }


def build_orchestration_blocks(
    turn_context: Any,
    action_text: str,
    investigator_placeholder_texts: dict[str, str] | None = None,
    declared_plan_steps: list[dict[str, Any]] | None = None,
) -> list[NarrativeContextBlock]:
    direction = prepare_turn_direction(
        turn_context, action_text, investigator_placeholder_texts or {}, declared_plan_steps
    )
    blocks = [
        build_json_block(controlled_variables_authority_label_name, direction["controlled_variables"]),
        build_json_block(ranked_decision_authority_label_name, direction["ranked_decision"]),
        build_json_block(calculated_plan_authority_label_name, direction["calculated_plan"]),
    ]
    if direction["distance_course"] is not None:
        blocks.append(build_json_block(distance_course_authority_label_name, direction["distance_course"]))
    blocks.append(build_json_block(retrieved_context_authority_label_name, direction["retrieved_context"]))
    return blocks


def commit_reality_ledger(before_run: dict[str, Any], after_run: dict[str, Any], working_previous_scene_identifier: str | None, scene_identifier: str, place_name: str) -> None:
    before_public_state = before_run.get("public_state") if isinstance(before_run.get("public_state"), dict) else {}
    after_public_state = after_run.get("public_state") if isinstance(after_run.get("public_state"), dict) else {}
    director_private_state = after_run.get("director_private_state")
    if not isinstance(director_private_state, dict):
        return
    director_private_state["reality_ledger"] = diff_reality_ledger(before_public_state, after_public_state)
    director_private_state["committed_facts"] = build_committed_facts(after_public_state)
    director_private_state["position"] = {
        "scene_identifier": scene_identifier,
        "place_name": place_name,
        "previous_scene_identifier": working_previous_scene_identifier,
    }
