import re
from typing import Any

from the_void_files.application.use_cases.consequence_case_state import fold_comparable_person_name

kit_use_verb_texts = ("usar", "uso", "encender", "enciendo", "gastar", "gasto", "consumir", "consumo")
travel_verb_texts = ("ir", "voy", "camino", "caminar", "entrar", "salir", "bajar", "subir", "descender", "volver")
travel_verb_pattern = re.compile("(?<![a-z])(?:" + "|".join(re.escape(verb_text) for verb_text in travel_verb_texts) + ")")


commit_weight_threshold = 0.7


def folded_text_names_travel_verb(folded_action_text: str) -> bool:
    return travel_verb_pattern.search(folded_action_text) is not None


def response_curve_for_travel_minutes(travel_minutes: int) -> float:
    return 1 / (1 + max(travel_minutes, 0) / 40)


def score_logical_courses(
    action_text: str,
    held_kit: list[dict[str, Any]],
    distance_course: dict[str, Any] | None,
) -> dict[str, Any]:
    folded_action_text = fold_comparable_person_name(action_text)
    courses: list[dict[str, Any]] = []
    mentioned_kit = [
        held_item
        for held_item in held_kit
        if isinstance(held_item.get("identifier"), str)
        and int(held_item.get("units") or 0) > 0
        and (
            fold_comparable_person_name(str(held_item.get("visible_name") or "")) in folded_action_text
            or held_item["identifier"].replace("_", " ") in folded_action_text
        )
    ]
    names_a_tool = bool(mentioned_kit)
    uses_a_tool = any(verb_text in folded_action_text for verb_text in kit_use_verb_texts)
    if names_a_tool and uses_a_tool:
        kit_weight = 0.92
        courses.append(
            {
                "course_name": "spend_held_kit",
                "weight": round(kit_weight, 3),
                "commits_logistics": kit_weight >= commit_weight_threshold,
                "factors": {"named_tool": 1, "use_verb": 1, "units_available": 1},
                "belonging_identifier": mentioned_kit[0]["identifier"],
                "visible_name": mentioned_kit[0].get("visible_name"),
                "units": 1,
            }
        )
    can_enter = isinstance(distance_course, dict) and distance_course.get("can_enter") is True
    names_travel = folded_text_names_travel_verb(folded_action_text)
    if can_enter:
        travel_minutes = distance_course.get("travel_minutes") if isinstance(distance_course, dict) else 0
        time_factor = response_curve_for_travel_minutes(travel_minutes if isinstance(travel_minutes, int) else 15)
        desire_factor = 0.95 if names_travel else 0.6
        travel_weight = round(desire_factor * max(time_factor, 0.75), 3)
        courses.append(
            {
                "course_name": "enter_place",
                "weight": travel_weight,
                "commits_logistics": travel_weight >= commit_weight_threshold,
                "factors": {
                    "reachable": 1,
                    "travel_verb": 1 if names_travel else 0,
                    "time_factor": round(time_factor, 3),
                },
                "to_scene_identifier": distance_course.get("to_scene_identifier") if isinstance(distance_course, dict) else None,
                "to_place_name": distance_course.get("to_place_name") if isinstance(distance_course, dict) else None,
                "cardinal": distance_course.get("cardinal") if isinstance(distance_course, dict) else None,
                "travel_minutes": travel_minutes,
            }
        )
    if not courses:
        courses.append(
            {
                "course_name": "remain_and_inquire",
                "weight": 0.4,
                "commits_logistics": False,
                "elapsed_minutes": 10,
                "factors": {"no_tool": 1, "no_reachable_place": 1},
            }
        )
    courses.sort(key=lambda course: course["weight"], reverse=True)
    return {
        "chosen_course": courses[0],
        "ranked_courses": courses,
        "commit_weight_threshold": commit_weight_threshold,
        "note": "Utilidad interna por factores. No es una tirada y no se muestra al jugador.",
    }
