import re
from typing import Any

from the_void_files.application.use_cases.case_start_archive_case_store import PreparedArchiveOpening
from the_void_files.application.use_cases.case_start_specification_models import (
    BranchCondition,
    CasePersonDefinition,
    CaseSceneDefinition,
    CaseSpecification,
    order_branches_by_action_group,
)

run_format_version = 1
initial_state_version = 1
archive_number_label_placeholder = "{archive_number_label}"
sentence_boundary_pattern = re.compile(r"[.!?…»«¡¿:]$")
relationship_direction_names = ("from_investigator", "toward_investigator_as_perceived")


def build_archive_number_label(archive_number: int) -> str:
    return f"{archive_number:02d}"


def read_opening_relationship_level(
    case_specification: CaseSpecification, person_identifier: str, direction_name: str
) -> int:
    for person_definition in case_specification.persons:
        if (
            person_definition.person_identifier == person_identifier
            and person_definition.is_relationship_established_at_opening
        ):
            return (
                person_definition.initial_level_from_investigator
                if direction_name == "from_investigator"
                else person_definition.initial_level_toward_investigator
            )
    return 0


def is_opening_condition_met(case_specification: CaseSpecification, branch_condition: BranchCondition | None) -> bool:
    if branch_condition is None:
        return True
    return (
        not branch_condition.required_lived_experience_flag_names
        and not branch_condition.required_interactive_piece_statuses
        and not branch_condition.required_active_condition_identifiers
        and branch_condition.minimum_serious_wound_count == 0
        and all(
            read_opening_relationship_level(
                case_specification, minimum_relationship_level.person_identifier, minimum_relationship_level.direction_name
            )
            >= minimum_relationship_level.minimum_level
            for minimum_relationship_level in branch_condition.minimum_relationship_levels
        )
    )


def conceal_unknown_person_names(
    visible_text: str, person_definitions: list[CasePersonDefinition], known_person_identifiers: list[str]
) -> str:
    concealed_text = visible_text
    for person_definition in person_definitions:
        name_concealment = person_definition.name_concealment
        if name_concealment is None or person_definition.person_identifier in known_person_identifiers:
            continue
        concealed_names_pattern = re.compile(
            "|".join(
                re.escape(concealed_name_text)
                for concealed_name_text in sorted(name_concealment.concealed_name_texts, key=len, reverse=True)
            )
        )
        source_text = concealed_text

        def choose_replacement(name_match: re.Match[str]) -> str:
            preceding_text = source_text[: name_match.start()].rstrip()
            if not preceding_text or sentence_boundary_pattern.search(preceding_text):
                return name_concealment.replacement_at_sentence_start
            return name_concealment.replacement_inside_sentence

        concealed_text = concealed_names_pattern.sub(choose_replacement, source_text)
    return concealed_text


def build_first_scene_presentation(case_specification: CaseSpecification) -> dict[str, Any]:
    first_scene = read_first_scene(case_specification)
    persons_by_identifier = {
        person_definition.person_identifier: person_definition for person_definition in case_specification.persons
    }
    reachable_action_branches = [
        action_branch
        for action_branch in list(first_scene.action_branches)
        + [
            shared_action_branch.action_branch
            for shared_action_branch in case_specification.shared_action_branches
            if first_scene.scene_identifier not in shared_action_branch.excluded_scene_identifiers
        ]
        if is_opening_condition_met(case_specification, action_branch.visibility_condition)
    ]
    return {
        "scene_identifier": first_scene.scene_identifier,
        "place_name": first_scene.place_name,
        "tension_tier_name": first_scene.tension_tier_name,
        "present_persons": [
            {
                "person_identifier": present_person.person_identifier,
                "visible_name": persons_by_identifier[present_person.person_identifier].alias_before_name_is_known,
                "is_name_known": False,
                "silhouette_name": persons_by_identifier[present_person.person_identifier].silhouette_name,
                "presence_text": conceal_unknown_person_names(
                    present_person.presence_text, case_specification.persons, []
                ),
            }
            for present_person in first_scene.present_persons
            if is_opening_condition_met(case_specification, present_person.presence_condition)
        ],
        "perceived_points_of_interest": [
            point_of_interest.model_dump(mode="json") for point_of_interest in first_scene.perceived_points_of_interest
        ],
        "suggested_actions": [
            {
                "identifier": action_branch.branch_identifier,
                "visible_text": conceal_unknown_person_names(action_branch.visible_text, case_specification.persons, []),
                "resource_cost": (
                    action_branch.resource_cost.model_dump(mode="json")
                    if action_branch.resource_cost is not None
                    else None
                ),
                "action_group_name": action_branch.action_group_name,
                "has_been_attempted_before": False,
            }
            for action_branch in order_branches_by_action_group(reachable_action_branches)
        ],
        "open_interactive_piece_identifiers": [],
    }


def read_first_scene(case_specification: CaseSpecification) -> CaseSceneDefinition:
    return next(
        scene_definition
        for scene_definition in case_specification.scenes
        if scene_definition.scene_identifier == case_specification.initial_state.first_scene_identifier
    )


def build_initial_relationship_levels(case_specification: CaseSpecification, archive_number: int) -> list[dict[str, Any]]:
    fictional_date_label = case_specification.fictional_date_label_template.replace(
        archive_number_label_placeholder, build_archive_number_label(archive_number)
    )
    return [
        {
            "identifier": f"initial_relationship_{person_definition.person_identifier}_{direction_name}",
            "person_identifier": person_definition.person_identifier,
            "person_visible_name": person_definition.alias_before_name_is_known,
            "person_silhouette_name": person_definition.silhouette_name,
            "direction_name": direction_name,
            "dimension_name": None,
            "level_change": 0,
            "resulting_level": (
                person_definition.initial_level_from_investigator
                if direction_name == "from_investigator"
                else person_definition.initial_level_toward_investigator
            ),
            "perceptible_cause_text": person_definition.opening_relationship_cause_text or "",
            "fictional_date_label": fictional_date_label,
        }
        for person_definition in case_specification.persons
        if person_definition.is_relationship_established_at_opening
        for direction_name in relationship_direction_names
    ]


def merge_belonging_unit_lists(
    issued_belonging_units: list[dict[str, Any]], carried_belonging_units: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    merged_units_by_identifier: dict[str, int] = {}
    for belonging_units in issued_belonging_units + carried_belonging_units:
        belonging_identifier = belonging_units.get("belonging_identifier")
        unit_count = belonging_units.get("units")
        if not isinstance(belonging_identifier, str) or not isinstance(unit_count, int) or unit_count < 0:
            continue
        merged_units_by_identifier[belonging_identifier] = max(
            merged_units_by_identifier.get(belonging_identifier, 0), unit_count
        )
    return [
        {"belonging_identifier": belonging_identifier, "units": unit_count}
        for belonging_identifier, unit_count in merged_units_by_identifier.items()
    ]


def apply_carried_investigator_attributes(
    initial_run: dict[str, Any], carried_attributes: dict[str, Any] | None
) -> None:
    public_state = initial_run.get("public_state")
    if not isinstance(public_state, dict):
        return
    if isinstance(carried_attributes, dict):
        from the_void_files.narrative.orchestration.effort import read_investigator_attributes

        public_state["investigator_attributes"] = read_investigator_attributes(
            {"investigator_attributes": carried_attributes}
        )
    private_state = initial_run.get("director_private_state")
    if isinstance(private_state, dict):
        private_state["committed_facts"] = build_opening_committed_facts(public_state)


def apply_carried_investigator_resources(
    opening_public_payload: dict[str, Any],
    initial_run: dict[str, Any],
    carried_belonging_units: list[dict[str, Any]],
    carried_operational_funds: int | None,
) -> None:
    investigator_resources = opening_public_payload.get("investigator_resources")
    public_state = initial_run.get("public_state")
    if not isinstance(investigator_resources, dict) or not isinstance(public_state, dict):
        return
    issued_belonging_units = investigator_resources.get("belonging_units")
    if not isinstance(issued_belonging_units, list):
        issued_belonging_units = []
    merged_belonging_units = merge_belonging_unit_lists(issued_belonging_units, carried_belonging_units)
    investigator_resources["belonging_units"] = merged_belonging_units
    public_state["belonging_units"] = merged_belonging_units
    issued_operational_funds = investigator_resources.get("operational_funds")
    if isinstance(carried_operational_funds, int) and isinstance(issued_operational_funds, int):
        merged_operational_funds = max(issued_operational_funds, carried_operational_funds)
        investigator_resources["operational_funds"] = merged_operational_funds
        public_state["operational_funds"] = merged_operational_funds


def remember_visited_place(public_state: dict[str, Any], scene_identifier: str, place_name: str) -> None:
    if not isinstance(scene_identifier, str) or scene_identifier.strip() == "":
        return
    if not isinstance(place_name, str) or place_name.strip() == "":
        return
    visible_place_name = place_name.strip()
    visited_places = public_state.get("visited_places")
    if not isinstance(visited_places, list):
        visited_places = []
        public_state["visited_places"] = visited_places
    for visited_place in visited_places:
        if isinstance(visited_place, dict) and visited_place.get("scene_identifier") == scene_identifier:
            visited_place["place_name"] = visible_place_name
            return
    visited_places.append({"scene_identifier": scene_identifier, "place_name": visible_place_name})


def build_opening_committed_facts(public_state: dict[str, Any]) -> dict[str, Any]:
    from the_void_files.narrative.orchestration.reality_ledger import build_committed_facts

    return build_committed_facts(public_state)


def fill_opening_narration_paragraph(opening_paragraph: str, investigator_resources: dict[str, Any]) -> str:
    from the_void_files.narrative.context_builder import format_world_clock_label

    placeholder_values = {
        "lugar": str(investigator_resources.get("place_name") or ""),
        "hora": format_world_clock_label(investigator_resources.get("world_clock_minutes")),
        "fondos": str(investigator_resources.get("operational_funds") or 0),
        "heridas": str(investigator_resources.get("serious_wound_count") or 0),
    }
    filled_paragraph = opening_paragraph
    for placeholder_name, placeholder_value in placeholder_values.items():
        filled_paragraph = filled_paragraph.replace("{{" + placeholder_name + "}}", placeholder_value)
    return filled_paragraph


def prepare_archive_opening(
    case_specification: CaseSpecification,
    archive_case_identifier: str,
    archive_run_identifier: str,
    opened_at_utc: str,
    archive_number: int,
) -> PreparedArchiveOpening:
    from the_void_files.narrative.orchestration.effort import case_effort_maximum, default_investigator_attributes

    first_scene = read_first_scene(case_specification)
    first_scene_presentation = build_first_scene_presentation(case_specification)
    initial_relationship_levels = build_initial_relationship_levels(case_specification, archive_number)
    investigator_resources = {
        "place_name": first_scene.place_name,
        "world_clock_minutes": case_specification.initial_state.world_clock_minutes,
        "operational_funds": case_specification.initial_state.issued_operational_funds,
        "belonging_units": [
            issued_belonging.model_dump(mode="json")
            for issued_belonging in case_specification.initial_state.issued_belonging_units
        ],
        "serious_wound_count": 0,
    }
    opening_public_payload = {
        "archive": {
            "archive_case_identifier": archive_case_identifier,
            "archive_number": archive_number,
            "archive_number_label": build_archive_number_label(archive_number),
            "archive_title": case_specification.archive_title,
            "sanction_label": case_specification.sanction_label,
            "whisper_identifier": case_specification.whisper_identifier,
            "opened_at_utc": opened_at_utc,
        },
        "archive_run": {
            "archive_run_identifier": archive_run_identifier,
            "run_number": 1,
            "state_version": initial_state_version,
        },
        "opening_resolution": {
            "opening_entries": [
                {
                    "voice": "director_narration",
                    "marked_paragraphs": [
                        fill_opening_narration_paragraph(opening_paragraph, investigator_resources)
                        for opening_paragraph in case_specification.opening_narration_paragraphs
                    ],
                }
            ],
            "first_scene_presentation": first_scene_presentation,
            "initial_relationship_levels": initial_relationship_levels,
        },
        "investigator_resources": investigator_resources,
        "belonging_definitions": [
            belonging_definition.model_dump(mode="json") for belonging_definition in case_specification.belongings
        ],
    }
    initial_public_state = {
        **investigator_resources,
        "last_confirmed_action_key": None,
        "confirmed_turn_count": 0,
        "current_scene_presentation": first_scene_presentation,
        "visited_scene_identifiers": [first_scene.scene_identifier],
        "visited_places": [],
        "witnessed_origins": [],
        "lived_experience_flag_names": [],
        "known_person_identifiers": [],
        "relationship_levels": [
            {
                "person_identifier": relationship_level["person_identifier"],
                "direction_name": relationship_level["direction_name"],
                "dimension_name": None,
                "level": relationship_level["resulting_level"],
            }
            for relationship_level in initial_relationship_levels
        ],
        "active_conditions": [],
        "effort_remaining": case_effort_maximum,
        "investigator_attributes": default_investigator_attributes(),
        "interactive_piece_public_definitions": [],
        "interactive_piece_runtime_states": [],
        "pending_action_plan": None,
        "unanswered_director_question": None,
        "journal_update_count": 0,
        "archive_outcome": None,
    }
    remember_visited_place(initial_public_state, first_scene.scene_identifier, first_scene.place_name)
    initial_run = {
        "run_format_version": run_format_version,
        "public_state": initial_public_state,
        "director_private_state": {
            "executed_branch_identifiers": [],
            "given_entropy_signal_flag_names": [],
            "hidden_notes": [],
            "committed_facts": build_opening_committed_facts(initial_public_state),
        },
    }
    return PreparedArchiveOpening(opening_public_payload=opening_public_payload, initial_run=initial_run)
