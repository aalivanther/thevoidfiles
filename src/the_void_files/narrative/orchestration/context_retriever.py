from typing import Any

from the_void_files.narrative.context_builder import read_public_state
from the_void_files.narrative.orchestration.distance_field import list_neighbor_passages


def retrieve_action_context(
    turn_context: Any, action_text: str, distance_course: dict[str, Any] | None
) -> dict[str, Any]:
    public_state = read_public_state(turn_context)
    case_specification = turn_context.case_specification if isinstance(turn_context.case_specification, dict) else {}
    scene_presentation = public_state.get("current_scene_presentation")
    current_scene_identifier = (
        scene_presentation.get("scene_identifier") if isinstance(scene_presentation, dict) else None
    )
    lived_flag_names = set(public_state.get("lived_experience_flag_names") or [])
    open_objectives = []
    for objective in case_specification.get("objectives") or []:
        if not isinstance(objective, dict):
            continue
        required_flag_names = [
            flag_name
            for flag_name in objective.get("required_lived_experience_flag_names") or []
            if isinstance(flag_name, str) and flag_name not in lived_flag_names
        ]
        if required_flag_names:
            open_objectives.append(
                {
                    "objective_identifier": objective.get("objective_identifier"),
                    "missing_flag_names": required_flag_names,
                }
            )
    neighbors = (
        list_neighbor_passages(case_specification, current_scene_identifier)
        if isinstance(current_scene_identifier, str)
        else []
    )
    return {
        "action_text": action_text,
        "current_place_name": public_state.get("place_name"),
        "current_scene_identifier": current_scene_identifier,
        "destination": {
            "place_name": distance_course.get("to_place_name"),
            "scene_identifier": distance_course.get("to_scene_identifier"),
            "cardinal": distance_course.get("cardinal"),
            "travel_minutes": distance_course.get("travel_minutes"),
            "can_enter": distance_course.get("can_enter"),
        }
        if isinstance(distance_course, dict) and distance_course.get("to_scene_identifier")
        else None,
        "neighbor_passages": neighbors,
        "open_objectives": open_objectives,
    }
