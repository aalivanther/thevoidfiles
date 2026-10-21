from typing import Any

from the_void_files.application.use_cases.consequence_case_state import fold_comparable_person_name
from the_void_files.narrative.orchestration.decision_matrix import folded_text_names_travel_verb, score_logical_courses
from the_void_files.narrative.orchestration.distance_field import measure_course_to_named_place
from the_void_files.narrative.orchestration.effort import (
    adjusted_elapsed_minutes,
    attribute_meanings,
    default_attribute_value,
    feasibility_words,
    read_consulted_attribute_name,
)

inquiry_minute_estimate = 10


def held_kit_records(belonging_units: dict[str, Any], visible_names: dict[str, str]) -> list[dict[str, Any]]:
    held_kit: list[dict[str, Any]] = []
    for belonging_identifier, units in belonging_units.items():
        if not isinstance(belonging_identifier, str) or isinstance(units, bool) or not isinstance(units, int) or units <= 0:
            continue
        held_kit.append(
            {
                "identifier": belonging_identifier,
                "visible_name": visible_names.get(belonging_identifier, belonging_identifier.replace("_", " ")),
                "units": units,
            }
        )
    return held_kit


def names_travel(action_text: str) -> bool:
    return folded_text_names_travel_verb(fold_comparable_person_name(action_text))


def feasibility_class_name_for_course(action_text: str, attributes: dict[str, int], course: dict[str, Any]) -> str:
    attribute_name = read_consulted_attribute_name(action_text)
    attribute_value = None
    if attribute_name is not None and attribute_name != "s":
        raw_value = attributes.get(attribute_name, default_attribute_value)
        attribute_value = raw_value if isinstance(raw_value, int) and not isinstance(raw_value, bool) else default_attribute_value
    weight = course.get("weight")
    commits_logistics = course.get("commits_logistics") is True
    if commits_logistics and (attribute_value is None or attribute_value >= 6):
        return "trivial"
    if commits_logistics or (attribute_value is not None and attribute_value >= 5):
        return "plausible"
    if attribute_value is not None and attribute_value <= 2:
        return "risky"
    if names_travel(action_text):
        return "plausible"
    if not isinstance(weight, (int, float)) or weight < 0.5:
        return "risky"
    return "plausible"


def confirm_feasibility_class_name(
    model_class_name: str,
    action_text: str,
    attributes: dict[str, int],
    chosen_course: dict[str, Any] | None = None,
) -> str:
    if model_class_name == "impossible":
        return "impossible"
    course = chosen_course
    if course is None:
        course = score_logical_courses(action_text, [], None)["chosen_course"]
    confirmed_class_name = feasibility_class_name_for_course(action_text, attributes, course)
    if confirmed_class_name not in feasibility_words:
        return "plausible"
    return confirmed_class_name


def minute_estimate_for_course(action_text: str, attributes: dict[str, int], course: dict[str, Any]) -> int:
    travel_minutes = course.get("travel_minutes") if course.get("course_name") == "enter_place" else None
    elapsed_minutes = travel_minutes if isinstance(travel_minutes, int) and travel_minutes > 0 else inquiry_minute_estimate
    attribute_name = read_consulted_attribute_name(action_text)
    if attribute_name is None or attribute_name == "s":
        return elapsed_minutes
    raw_value = attributes.get(attribute_name, default_attribute_value)
    attribute_value = raw_value if isinstance(raw_value, int) and not isinstance(raw_value, bool) else default_attribute_value
    return adjusted_elapsed_minutes(elapsed_minutes, attribute_value)


def read_plan_steps(plan_steps: list[dict[str, Any]] | None, action_text: str) -> list[dict[str, str]]:
    steps: list[dict[str, str]] = []
    for plan_step in plan_steps or []:
        if not isinstance(plan_step, dict):
            continue
        step_action_text = plan_step.get("action_text")
        if not isinstance(step_action_text, str) or step_action_text.strip() == "":
            continue
        step_identifier = plan_step.get("step_identifier")
        steps.append(
            {
                "step_identifier": step_identifier if isinstance(step_identifier, str) and step_identifier != "" else f"step_{len(steps) + 1}",
                "action_text": step_action_text,
            }
        )
    if steps:
        return steps
    if action_text.strip() != "":
        return [{"step_identifier": "declared_step_1", "action_text": action_text}]
    return []


def public_plan_sentence(step_count: int, minute_estimate: int, first_word: str) -> str:
    if step_count <= 1:
        return f"El plan es {first_word} y pide unos {minute_estimate} minutos."
    return f"El plan tiene {step_count} pasos y pide unos {minute_estimate} minutos. El primero es {first_word}."


def calculate_declared_plan(
    plan_steps: list[dict[str, Any]] | None,
    attributes: dict[str, int],
    case_specification: dict[str, Any] | None,
    current_scene_identifier: str | None,
    held_kit: list[dict[str, Any]],
    previous_scene_identifier: str | None,
    action_text: str = "",
) -> dict[str, Any]:
    declared_steps = read_plan_steps(plan_steps, action_text)
    calculated_steps: list[dict[str, Any]] = []
    total_minutes = 0
    for declared_step in declared_steps:
        step_action_text = declared_step["action_text"]
        distance_course = None
        if isinstance(case_specification, dict):
            distance_course = measure_course_to_named_place(
                case_specification,
                current_scene_identifier,
                step_action_text,
                previous_scene_identifier,
            )
        ranked_decision = score_logical_courses(step_action_text, held_kit, distance_course)
        chosen_course = ranked_decision["chosen_course"]
        feasibility_class_name = feasibility_class_name_for_course(step_action_text, attributes, chosen_course)
        minute_estimate = minute_estimate_for_course(step_action_text, attributes, chosen_course)
        total_minutes += minute_estimate
        attribute_name = read_consulted_attribute_name(step_action_text)
        attribute_label = None
        attribute_value = None
        if attribute_name is not None and attribute_name != "s":
            attribute_label = attribute_meanings[attribute_name].split(".")[0]
            raw_value = attributes.get(attribute_name, default_attribute_value)
            attribute_value = raw_value if isinstance(raw_value, int) and not isinstance(raw_value, bool) else default_attribute_value
        calculated_steps.append(
            {
                "step_identifier": declared_step["step_identifier"],
                "course_name": chosen_course.get("course_name"),
                "feasibility_class_name": feasibility_class_name,
                "feasibility_word": feasibility_words.get(feasibility_class_name, "coherente"),
                "minute_estimate": minute_estimate,
                "consulted_attribute_name": attribute_name,
                "consulted_attribute_label": attribute_label,
                "consulted_attribute_value": attribute_value,
            }
        )
    if not calculated_steps:
        return {
            "step_count": 0,
            "minute_estimate": 0,
            "pattern_name": "",
            "feasibility_class_name": "plausible",
            "feasibility_word": "coherente",
            "public_sentence": "",
            "steps": [],
            "note": "Cálculo del motor. No es una tirada y no muestra porcentajes.",
        }
    first_step = calculated_steps[0]
    return {
        "step_count": len(calculated_steps),
        "minute_estimate": total_minutes,
        "pattern_name": ",".join(str(calculated_step["course_name"]) for calculated_step in calculated_steps),
        "feasibility_class_name": first_step["feasibility_class_name"],
        "feasibility_word": first_step["feasibility_word"],
        "public_sentence": public_plan_sentence(
            len(calculated_steps), total_minutes, str(first_step["feasibility_word"])
        ),
        "steps": calculated_steps,
        "note": "Cálculo del motor. No es una tirada y no muestra porcentajes.",
    }
