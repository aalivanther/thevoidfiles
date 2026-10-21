import heapq
from typing import Any

from the_void_files.application.use_cases.consequence_case_state import fold_comparable_person_name

cardinal_offsets = {
    "norte": (0, 1),
    "este": (1, 0),
    "sur": (0, -1),
    "oeste": (-1, 0),
}
cardinal_cycle = ("norte", "este", "sur", "oeste")
default_travel_minutes = 15


def read_cardinal_from_passage_text(passage_text: str, fallback_index: int) -> str:
    folded_text = fold_comparable_person_name(passage_text)
    if any(word in folded_text for word in ("subir", "arriba", "linterna", "galeria")):
        return "norte"
    if any(word in folded_text for word in ("bajar", "abajo", "descender", "deposito", "trampilla")):
        return "sur"
    if any(word in folded_text for word in ("volver", "retirarse", "salir", "muelle")):
        return "oeste"
    if any(word in folded_text for word in ("entrar", "puerta", "adentro")):
        return "este"
    return cardinal_cycle[fallback_index % len(cardinal_cycle)]


def read_place_tail(place_name: str) -> str:
    folded_place_name = fold_comparable_person_name(place_name)
    if "·" in place_name:
        tail_text = place_name.split("·")[-1]
        folded_tail = fold_comparable_person_name(tail_text)
        if len(folded_tail) >= 6:
            return folded_tail
    return folded_place_name


def branch_passage_is_open(
    action_branch: dict[str, Any],
    lived_flag_names: set[str],
    operational_funds: int | None,
    belonging_units: dict[str, int] | None,
) -> bool:
    visibility_condition = action_branch.get("visibility_condition")
    if isinstance(visibility_condition, dict):
        required_flag_names = visibility_condition.get("required_lived_experience_flag_names") or []
        forbidden_flag_names = visibility_condition.get("forbidden_lived_experience_flag_names") or []
        if any(
            isinstance(flag_name, str) and flag_name not in lived_flag_names for flag_name in required_flag_names
        ):
            return False
        if any(isinstance(flag_name, str) and flag_name in lived_flag_names for flag_name in forbidden_flag_names):
            return False
        if visibility_condition.get("required_interactive_piece_statuses"):
            return False
        if visibility_condition.get("minimum_relationship_levels"):
            return False
        if visibility_condition.get("required_active_condition_identifiers"):
            return False
        minimum_serious_wound_count = visibility_condition.get("minimum_serious_wound_count") or 0
        if isinstance(minimum_serious_wound_count, int) and minimum_serious_wound_count > 0:
            return False
    resource_cost = action_branch.get("resource_cost")
    if not isinstance(resource_cost, dict):
        return True
    if resource_cost.get("kind") == "operational_funds":
        amount = resource_cost.get("amount")
        return isinstance(operational_funds, int) and isinstance(amount, int) and operational_funds >= amount
    if resource_cost.get("kind") == "belonging":
        belonging_identifier = resource_cost.get("belonging_identifier")
        units = resource_cost.get("units")
        if not isinstance(belonging_identifier, str) or not isinstance(units, int) or not isinstance(belonging_units, dict):
            return False
        held_units = belonging_units.get(belonging_identifier, 0)
        return isinstance(held_units, int) and not isinstance(held_units, bool) and held_units >= units
    return False


def build_scene_edges(
    case_specification: dict[str, Any],
    *,
    lived_flag_names: set[str] | None = None,
    operational_funds: int | None = None,
    belonging_units: dict[str, int] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    open_flag_names = set(lived_flag_names or ())
    edges_by_scene: dict[str, list[dict[str, Any]]] = {}
    for scene in case_specification.get("scenes") or []:
        if not isinstance(scene, dict):
            continue
        scene_identifier = scene.get("scene_identifier")
        if not isinstance(scene_identifier, str):
            continue
        edges_by_scene.setdefault(scene_identifier, [])
        for branch_index, action_branch in enumerate(scene.get("action_branches") or []):
            if not isinstance(action_branch, dict):
                continue
            if not branch_passage_is_open(action_branch, open_flag_names, operational_funds, belonging_units):
                continue
            outcome = action_branch.get("default_outcome") or {}
            next_scene_identifier = outcome.get("next_scene_identifier") if isinstance(outcome, dict) else None
            if not isinstance(next_scene_identifier, str) or next_scene_identifier == "":
                continue
            elapsed_minutes = outcome.get("elapsed_minutes") if isinstance(outcome, dict) else None
            travel_minutes = (
                elapsed_minutes if isinstance(elapsed_minutes, int) and elapsed_minutes > 0 else default_travel_minutes
            )
            passage = {
                "to_scene_identifier": next_scene_identifier,
                "travel_minutes": travel_minutes,
                "cardinal": read_cardinal_from_passage_text(
                    str(action_branch.get("visible_text") or ""), branch_index
                ),
                "passage_text": action_branch.get("visible_text"),
            }
            existing_passage = next(
                (
                    edge
                    for edge in edges_by_scene[scene_identifier]
                    if edge["to_scene_identifier"] == next_scene_identifier
                ),
                None,
            )
            if existing_passage is None:
                edges_by_scene[scene_identifier].append(passage)
            elif travel_minutes < existing_passage["travel_minutes"]:
                existing_passage.update(passage)
    return edges_by_scene


def read_scene_place_names(case_specification: dict[str, Any]) -> dict[str, str]:
    return {
        scene["scene_identifier"]: scene.get("place_name") or scene["scene_identifier"]
        for scene in case_specification.get("scenes") or []
        if isinstance(scene, dict) and isinstance(scene.get("scene_identifier"), str)
    }


def layout_place_coordinates(case_specification: dict[str, Any]) -> dict[str, tuple[int, int]]:
    place_names = read_scene_place_names(case_specification)
    if not place_names:
        return {}
    opening_scene_identifier = None
    initial_state = case_specification.get("initial_state")
    if isinstance(initial_state, dict) and isinstance(initial_state.get("first_scene_identifier"), str):
        opening_scene_identifier = initial_state["first_scene_identifier"]
    if opening_scene_identifier not in place_names:
        opening_scene_identifier = next(iter(place_names))
    coordinates = {opening_scene_identifier: (0, 0)}
    edges_by_scene = build_scene_edges(case_specification)
    pending_scene_identifiers = [opening_scene_identifier]
    while pending_scene_identifiers:
        scene_identifier = pending_scene_identifiers.pop(0)
        origin_x, origin_y = coordinates[scene_identifier]
        for edge in edges_by_scene.get(scene_identifier, []):
            next_scene_identifier = edge["to_scene_identifier"]
            if next_scene_identifier in coordinates or next_scene_identifier not in place_names:
                continue
            offset_x, offset_y = cardinal_offsets.get(edge["cardinal"], (1, 0))
            coordinates[next_scene_identifier] = (origin_x + offset_x, origin_y + offset_y)
            pending_scene_identifiers.append(next_scene_identifier)
    return coordinates


def list_neighbor_passages(
    case_specification: dict[str, Any],
    current_scene_identifier: str,
    *,
    lived_flag_names: set[str] | None = None,
    operational_funds: int | None = None,
    belonging_units: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    place_names = read_scene_place_names(case_specification)
    return [
        {
            "to_scene_identifier": edge["to_scene_identifier"],
            "to_place_name": place_names.get(edge["to_scene_identifier"]),
            "cardinal": edge["cardinal"],
            "travel_minutes": edge["travel_minutes"],
            "can_enter": True,
        }
        for edge in build_scene_edges(
            case_specification,
            lived_flag_names=lived_flag_names,
            operational_funds=operational_funds,
            belonging_units=belonging_units,
        ).get(current_scene_identifier, [])
    ]


def shortest_passage(
    edges_by_scene: dict[str, list[dict[str, Any]]], start_scene_identifier: str, goal_scene_identifier: str
) -> tuple[int, str] | None:
    pending_passages: list[tuple[int, str, str | None]] = [(0, start_scene_identifier, None)]
    best_minutes_by_scene = {start_scene_identifier: 0}
    while pending_passages:
        traveled_minutes, scene_identifier, first_cardinal = heapq.heappop(pending_passages)
        if traveled_minutes > best_minutes_by_scene.get(scene_identifier, traveled_minutes):
            continue
        if scene_identifier == goal_scene_identifier and first_cardinal is not None:
            return traveled_minutes, first_cardinal
        for edge in edges_by_scene.get(scene_identifier, []):
            next_scene_identifier = edge["to_scene_identifier"]
            next_minutes = traveled_minutes + edge["travel_minutes"]
            if next_minutes >= best_minutes_by_scene.get(next_scene_identifier, 10**9):
                continue
            best_minutes_by_scene[next_scene_identifier] = next_minutes
            heapq.heappush(
                pending_passages,
                (next_minutes, next_scene_identifier, first_cardinal or edge["cardinal"]),
            )
    return None


def measure_course_to_named_place(
    case_specification: dict[str, Any],
    current_scene_identifier: str | None,
    action_text: str,
    previous_scene_identifier: str | None = None,
    *,
    lived_flag_names: set[str] | None = None,
    operational_funds: int | None = None,
    belonging_units: dict[str, int] | None = None,
) -> dict[str, Any] | None:
    if not isinstance(current_scene_identifier, str) or current_scene_identifier == "":
        return None
    folded_action_text = fold_comparable_person_name(action_text)
    if folded_action_text == "":
        return None
    place_names = read_scene_place_names(case_specification)
    direct_edges = build_scene_edges(
        case_specification,
        lived_flag_names=lived_flag_names,
        operational_funds=operational_funds,
        belonging_units=belonging_units,
    ).get(current_scene_identifier, [])
    neighbor_scene_identifiers = {edge["to_scene_identifier"] for edge in direct_edges}
    named_neighbor_identifiers = {
        scene_identifier
        for scene_identifier, place_name in place_names.items()
        if scene_identifier != current_scene_identifier
        and scene_identifier in neighbor_scene_identifiers
        and (place_tail := read_place_tail(str(place_name)))
        and place_tail in folded_action_text
    }
    chosen_edge = None
    for edge in direct_edges:
        if edge["to_scene_identifier"] not in named_neighbor_identifiers:
            continue
        if chosen_edge is None or edge["travel_minutes"] < chosen_edge["travel_minutes"]:
            chosen_edge = edge
    if chosen_edge is None and any(
        verb_text in folded_action_text for verb_text in ("salir", "salgo", "volver", "retiro", "retirarse")
    ):
        if isinstance(previous_scene_identifier, str):
            chosen_edge = next(
                (edge for edge in direct_edges if edge["to_scene_identifier"] == previous_scene_identifier),
                None,
            )
    coordinates = layout_place_coordinates(case_specification)
    neighbors = list_neighbor_passages(
        case_specification,
        current_scene_identifier,
        lived_flag_names=lived_flag_names,
        operational_funds=operational_funds,
        belonging_units=belonging_units,
    )
    if chosen_edge is None:
        return {
            "from_scene_identifier": current_scene_identifier,
            "from_place_name": place_names.get(current_scene_identifier),
            "neighbors": neighbors,
            "coordinates": {
                scene_identifier: {"x": point[0], "y": point[1]} for scene_identifier, point in coordinates.items()
            },
            "can_enter": False,
        }
    named_scene_identifier = chosen_edge["to_scene_identifier"]
    origin_point = coordinates.get(current_scene_identifier, (0, 0))
    destination_point = coordinates.get(named_scene_identifier, origin_point)
    return {
        "from_scene_identifier": current_scene_identifier,
        "from_place_name": place_names.get(current_scene_identifier),
        "to_scene_identifier": named_scene_identifier,
        "to_place_name": place_names.get(named_scene_identifier),
        "cardinal": chosen_edge["cardinal"],
        "travel_minutes": chosen_edge["travel_minutes"],
        "can_enter": True,
        "neighbors": neighbors,
        "grid_offset": {
            "x": destination_point[0] - origin_point[0],
            "y": destination_point[1] - origin_point[1],
        },
    }
