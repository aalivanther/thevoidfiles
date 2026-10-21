import unicodedata
from dataclasses import dataclass, field
from typing import Any

from the_void_files.application.generated_markup_text import decode_generated_markup_text
from the_void_files.application.use_cases.case_start_public_opening import (
    archive_number_label_placeholder,
    build_archive_number_label,
    conceal_unknown_person_names,
)
from the_void_files.application.use_cases.case_start_specification_models import (
    BranchCondition,
    CaseActionBranch,
    CaseInteractivePiece,
    CasePersonDefinition,
    CaseSceneDefinition,
    CaseSpecification,
    ScriptedDialogueEntry,
    ScriptedDirectorEntry,
    ScriptedThoughtEntry,
    order_branches_by_action_group,
)
from the_void_files.application.use_cases.consequence_director_copy import CaseSupplement, DirectorCopy
from the_void_files.application.use_cases.consequence_free_text_reading import FreeTextReader
from the_void_files.narrative.case_reviewer import read_branches_of_scene

lifecycle_status_names_open_to_attempts = ("presented", "in_progress", "set_aside")
fallback_silhouette_name = "close_figure"
maximum_serious_wound_count = 5
solved_interactive_piece_origin_prefix = "solved_"


@dataclass
class WorkingCaseState:
    scene_identifier: str
    place_name: str
    world_clock_minutes: int
    operational_funds: int
    belonging_units: dict[str, int]
    serious_wound_count: int
    lived_experience_flag_names: list[str]
    active_conditions: list[dict[str, Any]]
    known_person_identifiers: list[str]
    witnessed_origin_identifiers: list[str]
    interactive_piece_status_by_identifier: dict[str, str]
    relationship_level_by_key: dict[tuple[str, str], int]
    relationship_dimension_by_key: dict[tuple[str, str], str | None]
    executed_branch_identifiers: list[str]
    given_entropy_signal_flag_names: list[str]
    last_serious_wound_cause_text: str | None = None
    open_suggested_actions: list[dict[str, Any]] | None = None
    open_suggested_actions_scene_identifier: str | None = None
    previous_scene_identifier: str | None = None
    revealed_facts: list[dict[str, Any]] = field(default_factory=list)
    heard_exchanges: list[dict[str, Any]] = field(default_factory=list)
    threat_acts: list[dict[str, Any]] = field(default_factory=list)
    threat_is_defeated: bool = False
    effort_remaining: int = 6
    investigator_attributes: dict[str, int] = field(default_factory=dict)

    def read_active_condition_identifiers(self) -> list[str]:
        return [active_condition["condition_identifier"] for active_condition in self.active_conditions]


@dataclass
class CaseResolutionContext:
    case_specification: CaseSpecification
    director_copy: DirectorCopy
    case_supplement: CaseSupplement | None
    archive_number: int
    has_relational_anchor_person: bool
    placeholder_texts: dict[str, str]
    free_text_reader: FreeTextReader = field(init=False)
    scenes_by_identifier: dict[str, CaseSceneDefinition] = field(init=False)
    persons_by_identifier: dict[str, CasePersonDefinition] = field(init=False)
    interactive_pieces_by_identifier: dict[str, CaseInteractivePiece] = field(init=False)
    dawn_scene_identifiers: set[str] = field(init=False)
    fictional_date_label: str = field(init=False)

    def __post_init__(self) -> None:
        case_specification = self.case_specification
        self.free_text_reader = FreeTextReader(
            self.director_copy.free_text_patterns,
            list(self.director_copy.plan_conditions)
            + (list(self.case_supplement.plan_conditions) if self.case_supplement is not None else []),
        )
        self.scenes_by_identifier = {
            scene_definition.scene_identifier: scene_definition for scene_definition in case_specification.scenes
        }
        self.persons_by_identifier = {
            person_definition.person_identifier: person_definition for person_definition in case_specification.persons
        }
        self.interactive_pieces_by_identifier = {
            interactive_piece.public_definition.interactive_piece_identifier: interactive_piece
            for interactive_piece in case_specification.interactive_pieces
        }
        ending_selection_request_identifier = case_specification.ending_selection.selection_request_identifier
        self.dawn_scene_identifiers = {
            scene_definition.scene_identifier
            for scene_definition in case_specification.scenes
            for action_branch in scene_definition.action_branches
            for branch_outcome in [
                action_branch.default_outcome,
                *([action_branch.repeated_outcome] if action_branch.repeated_outcome is not None else []),
                *[conditional_outcome.outcome for conditional_outcome in action_branch.conditional_outcomes],
            ]
            if branch_outcome.archive_ending_identifier == ending_selection_request_identifier
        }
        self.fictional_date_label = case_specification.fictional_date_label_template.replace(
            archive_number_label_placeholder, build_archive_number_label(self.archive_number)
        )

    def read_scene(self, scene_identifier: str) -> CaseSceneDefinition:
        return self.scenes_by_identifier.get(
            scene_identifier, self.scenes_by_identifier[self.case_specification.initial_state.first_scene_identifier]
        )


def create_working_case_state(current_run: dict[str, Any], resolution_context: CaseResolutionContext) -> WorkingCaseState:
    public_state = current_run["public_state"]
    director_private_state = current_run["director_private_state"]
    current_scene_presentation = public_state.get("current_scene_presentation")
    working_state = WorkingCaseState(
        scene_identifier=(
            current_scene_presentation["scene_identifier"]
            if current_scene_presentation is not None
            else resolution_context.case_specification.initial_state.first_scene_identifier
        ),
        place_name=public_state["place_name"],
        world_clock_minutes=public_state["world_clock_minutes"],
        operational_funds=public_state["operational_funds"],
        belonging_units={
            issued_belonging["belonging_identifier"]: issued_belonging["units"]
            for issued_belonging in public_state["belonging_units"]
        },
        serious_wound_count=public_state["serious_wound_count"],
        last_serious_wound_cause_text=(
            public_state.get("last_serious_wound_cause_text")
            if isinstance(public_state.get("last_serious_wound_cause_text"), str)
            else None
        ),
        lived_experience_flag_names=list(public_state["lived_experience_flag_names"]),
        active_conditions=[dict(active_condition) for active_condition in public_state["active_conditions"]],
        known_person_identifiers=list(public_state["known_person_identifiers"]),
        witnessed_origin_identifiers=[
            witnessed_origin["origin_identifier"] for witnessed_origin in public_state["witnessed_origins"]
        ],
        interactive_piece_status_by_identifier={
            runtime_state["interactive_piece_identifier"]: runtime_state["lifecycle_status_name"]
            for runtime_state in public_state["interactive_piece_runtime_states"]
        },
        relationship_level_by_key={
            (relationship_level["person_identifier"], relationship_level["direction_name"]): relationship_level["level"]
            for relationship_level in public_state["relationship_levels"]
        },
        relationship_dimension_by_key={
            (relationship_level["person_identifier"], relationship_level["direction_name"]): relationship_level.get(
                "dimension_name"
            )
            for relationship_level in public_state["relationship_levels"]
        },
        executed_branch_identifiers=list(director_private_state["executed_branch_identifiers"]),
        given_entropy_signal_flag_names=list(director_private_state["given_entropy_signal_flag_names"]),
    )
    working_state.known_person_identifiers.extend(
        person_identifier
        for person_identifier in collect_unconcealed_known_person_identifiers(working_state, resolution_context)
        if person_identifier not in working_state.known_person_identifiers
    )
    stored_open_suggested_actions = director_private_state.get("open_suggested_actions")
    if isinstance(stored_open_suggested_actions, dict):
        stored_scene_identifier = stored_open_suggested_actions.get("scene_identifier")
        stored_suggested_actions = stored_open_suggested_actions.get("suggested_actions")
        if isinstance(stored_scene_identifier, str):
            working_state.open_suggested_actions_scene_identifier = stored_scene_identifier
        if isinstance(stored_suggested_actions, list):
            working_state.open_suggested_actions = [
                dict(stored_suggested_action)
                for stored_suggested_action in stored_suggested_actions
                if isinstance(stored_suggested_action, dict)
            ]
    from the_void_files.narrative.orchestration.effort import read_effort_remaining, read_investigator_attributes

    working_state.effort_remaining = read_effort_remaining(public_state)
    working_state.investigator_attributes = read_investigator_attributes(public_state)
    working_state.revealed_facts = [
        dict(revealed_fact)
        for revealed_fact in public_state.get("revealed_facts") or []
        if isinstance(revealed_fact, dict)
    ]
    working_state.heard_exchanges = [
        dict(heard_exchange)
        for heard_exchange in public_state.get("heard_exchanges") or []
        if isinstance(heard_exchange, dict)
    ]
    private_threat_acts = director_private_state.get("threat_capability_acts")
    stored_threat_acts = private_threat_acts if isinstance(private_threat_acts, list) else public_state.get("threat_acts")
    working_state.threat_acts = [
        dict(threat_act) for threat_act in stored_threat_acts or [] if isinstance(threat_act, dict)
    ]
    working_state.threat_is_defeated = public_state.get("threat_is_defeated") is True
    stored_position = director_private_state.get("position")
    if isinstance(stored_position, dict) and isinstance(stored_position.get("previous_scene_identifier"), str):
        working_state.previous_scene_identifier = stored_position["previous_scene_identifier"]
    return working_state


def fold_comparable_person_name(visible_text: str) -> str:
    decomposed_text = unicodedata.normalize("NFD", visible_text.casefold())
    without_marks = "".join(
        character for character in decomposed_text if unicodedata.category(character) != "Mn"
    )
    letters_and_spaces = "".join(
        character for character in without_marks if character.isalpha() or character.isspace()
    )
    return " ".join(letters_and_spaces.split())


def collect_unconcealed_known_person_identifiers(
    working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> list[str]:
    scene_definition = resolution_context.read_scene(working_state.scene_identifier)
    visible_corpus = fold_comparable_person_name(
        " ".join(
            [scene_definition.place_name]
            + [present_person.presence_text for present_person in scene_definition.present_persons]
            + [
                action_branch.visible_text
                for action_branch in read_branches_of_scene(resolution_context.case_specification, scene_definition)
            ]
        )
    )
    revealed_person_identifiers: list[str] = []
    for person_definition in resolution_context.case_specification.persons:
        if person_definition.person_identifier in working_state.known_person_identifiers:
            continue
        if person_definition.name_concealment is not None:
            continue
        folded_known_name = fold_comparable_person_name(person_definition.known_name)
        if folded_known_name != "" and folded_known_name in visible_corpus:
            revealed_person_identifiers.append(person_definition.person_identifier)
    return revealed_person_identifiers


def read_relationship_level(
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
    person_identifier: str,
    direction_name: str,
) -> int:
    recorded_level = working_state.relationship_level_by_key.get((person_identifier, direction_name))
    if recorded_level is not None:
        return recorded_level
    person_definition = resolution_context.persons_by_identifier.get(person_identifier)
    if person_definition is None:
        return 0
    return (
        person_definition.initial_level_from_investigator
        if direction_name == "from_investigator"
        else person_definition.initial_level_toward_investigator
    )


def is_branch_condition_met(
    branch_condition: BranchCondition | None,
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
) -> bool:
    if branch_condition is None:
        return True
    active_condition_identifiers = working_state.read_active_condition_identifiers()
    return (
        all(
            flag_name in working_state.lived_experience_flag_names
            for flag_name in branch_condition.required_lived_experience_flag_names
        )
        and all(
            flag_name not in working_state.lived_experience_flag_names
            for flag_name in branch_condition.forbidden_lived_experience_flag_names
        )
        and all(
            working_state.interactive_piece_status_by_identifier.get(required_status.interactive_piece_identifier)
            == required_status.lifecycle_status_name
            for required_status in branch_condition.required_interactive_piece_statuses
        )
        and all(
            read_relationship_level(
                working_state,
                resolution_context,
                minimum_relationship_level.person_identifier,
                minimum_relationship_level.direction_name,
            )
            >= minimum_relationship_level.minimum_level
            for minimum_relationship_level in branch_condition.minimum_relationship_levels
        )
        and all(
            condition_identifier in active_condition_identifiers
            for condition_identifier in branch_condition.required_active_condition_identifiers
        )
        and working_state.serious_wound_count >= branch_condition.minimum_serious_wound_count
    )


def read_current_scene(working_state: WorkingCaseState, resolution_context: CaseResolutionContext) -> CaseSceneDefinition:
    return resolution_context.read_scene(working_state.scene_identifier)


def read_reachable_branches(
    working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> list[CaseActionBranch]:
    return [
        action_branch
        for action_branch in read_branches_of_scene(
            resolution_context.case_specification, read_current_scene(working_state, resolution_context)
        )
        if is_branch_condition_met(action_branch.visibility_condition, working_state, resolution_context)
    ]


def has_informational_outcome_already_been_lived(
    action_branch: CaseActionBranch, working_state: WorkingCaseState
) -> bool:
    granted_flag_names = action_branch.default_outcome.granted_lived_experience_flag_names
    return bool(granted_flag_names) and all(
        flag_name in working_state.lived_experience_flag_names for flag_name in granted_flag_names
    )


def read_suggested_branches(
    working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> list[CaseActionBranch]:
    return order_branches_by_action_group(
        [
            action_branch
            for action_branch in read_reachable_branches(working_state, resolution_context)
            if not has_informational_outcome_already_been_lived(action_branch, working_state)
            and (
                action_branch.is_repeatable
                or action_branch.branch_identifier not in working_state.witnessed_origin_identifiers
            )
        ]
    )


def has_archive_reached_resolution(working_state: WorkingCaseState, resolution_context: CaseResolutionContext) -> bool:
    return any(
        flag_name in working_state.lived_experience_flag_names
        for flag_name in resolution_context.case_specification.resolution_flag_names
    )


def conceal_names_still_unknown(
    visible_text: str, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> str:
    return conceal_unknown_person_names(
        visible_text, resolution_context.case_specification.persons, working_state.known_person_identifiers
    )


def fill_investigator_placeholder_marks(scripted_text: str, placeholder_texts: dict[str, str]) -> str:
    filled_text = decode_generated_markup_text(scripted_text)
    for placeholder_name, placeholder_value in placeholder_texts.items():
        filled_text = filled_text.replace(f"{{{{{placeholder_name}}}}}", placeholder_value)
    return filled_text.replace("{{nombre}}", placeholder_texts.get("nombre", "el Investigador"))


def prepare_scripted_text(
    scripted_text: str, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> str:
    prepared_text = fill_investigator_placeholder_marks(scripted_text, resolution_context.placeholder_texts)
    case_supplement = resolution_context.case_supplement
    if case_supplement is not None and case_supplement.lost_voice is not None:
        prepared_text = prepared_text.replace(
            case_supplement.lost_voice.placeholder_text,
            (
                case_supplement.lost_voice.anchor_person_text
                if resolution_context.has_relational_anchor_person
                else case_supplement.lost_voice.uprooted_investigator_text
            ),
        )
    return conceal_names_still_unknown(prepared_text, working_state, resolution_context)


def read_person_visible_name(
    person_identifier: str, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> str:
    person_definition = resolution_context.persons_by_identifier.get(person_identifier)
    if person_definition is None:
        return ""
    return (
        person_definition.known_name
        if person_identifier in working_state.known_person_identifiers
        else person_definition.alias_before_name_is_known
    )


def read_person_silhouette_name(person_identifier: str, resolution_context: CaseResolutionContext) -> str:
    person_definition = resolution_context.persons_by_identifier.get(person_identifier)
    return person_definition.silhouette_name if person_definition is not None else fallback_silhouette_name


def create_director_spoken_entry(
    scripted_entry: ScriptedDirectorEntry, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> dict[str, Any]:
    marked_paragraphs = [
        prepare_scripted_text(marked_paragraph, working_state, resolution_context)
        for marked_paragraph in scripted_entry.marked_paragraphs
    ]
    if isinstance(scripted_entry, ScriptedDialogueEntry):
        return {
            "voice": "character_dialogue",
            "speaker_person_identifier": scripted_entry.speaker_person_identifier,
            "speaker_visible_name": read_person_visible_name(
                scripted_entry.speaker_person_identifier, working_state, resolution_context
            ),
            "speaker_silhouette_name": read_person_silhouette_name(
                scripted_entry.speaker_person_identifier, resolution_context
            ),
            "delivery_name": scripted_entry.delivery_name,
            "marked_paragraphs": marked_paragraphs,
        }
    if isinstance(scripted_entry, ScriptedThoughtEntry):
        return {
            "voice": "inner_thought",
            "thought_origin_name": scripted_entry.thought_origin_name,
            "marked_paragraphs": marked_paragraphs,
        }
    return {"voice": "director_narration", "marked_paragraphs": marked_paragraphs}


def is_person_present_in_scene(
    person_identifier: str, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> bool:
    return any(
        present_person.person_identifier == person_identifier
        and is_branch_condition_met(present_person.presence_condition, working_state, resolution_context)
        for present_person in read_current_scene(working_state, resolution_context).present_persons
    )


def read_action_branch_by_identifier(
    working_state: WorkingCaseState, resolution_context: CaseResolutionContext, branch_identifier: str
) -> CaseActionBranch | None:
    return next(
        (
            action_branch
            for action_branch in read_branches_of_scene(
                resolution_context.case_specification, read_current_scene(working_state, resolution_context)
            )
            if action_branch.branch_identifier == branch_identifier
        ),
        None,
    )


def build_suggested_action_record(
    action_branch: CaseActionBranch, working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> dict[str, Any]:
    return {
        "identifier": action_branch.branch_identifier,
        "visible_text": conceal_names_still_unknown(action_branch.visible_text, working_state, resolution_context),
        "resource_cost": (
            action_branch.resource_cost.model_dump(mode="json") if action_branch.resource_cost is not None else None
        ),
        "action_group_name": action_branch.action_group_name,
        "has_been_attempted_before": action_branch.branch_identifier in working_state.executed_branch_identifiers
        or action_branch.branch_identifier in working_state.witnessed_origin_identifiers,
    }


def merge_open_suggested_actions(
    authored_actions: list[dict[str, Any]],
    working_state: WorkingCaseState,
    resolution_context: CaseResolutionContext,
) -> list[dict[str, Any]]:
    stored_actions = working_state.open_suggested_actions
    if (
        not stored_actions
        or working_state.open_suggested_actions_scene_identifier != working_state.scene_identifier
    ):
        return authored_actions
    authored_actions_by_identifier = {authored_action["identifier"]: authored_action for authored_action in authored_actions}
    merged_actions: list[dict[str, Any]] = []
    seen_identifiers: set[str] = set()
    for stored_action in stored_actions:
        action_identifier = stored_action.get("identifier")
        if not isinstance(action_identifier, str) or action_identifier in seen_identifiers:
            continue
        if action_identifier in working_state.witnessed_origin_identifiers:
            continue
        matching_branch = read_action_branch_by_identifier(working_state, resolution_context, action_identifier)
        if matching_branch is not None and has_informational_outcome_already_been_lived(
            matching_branch, working_state
        ):
            continue
        if action_identifier in authored_actions_by_identifier:
            merged_actions.append(authored_actions_by_identifier[action_identifier])
        else:
            merged_actions.append(
                {
                    **stored_action,
                    "has_been_attempted_before": action_identifier in working_state.executed_branch_identifiers
                    or action_identifier in working_state.witnessed_origin_identifiers,
                }
            )
        seen_identifiers.add(action_identifier)
    for authored_action in authored_actions:
        if authored_action["identifier"] not in seen_identifiers:
            merged_actions.append(authored_action)
            seen_identifiers.add(authored_action["identifier"])
    return merged_actions


def create_scene_presentation(
    working_state: WorkingCaseState, resolution_context: CaseResolutionContext
) -> dict[str, Any]:
    scene_definition = read_current_scene(working_state, resolution_context)
    authored_actions = [
        build_suggested_action_record(action_branch, working_state, resolution_context)
        for action_branch in read_suggested_branches(working_state, resolution_context)
    ]
    return {
        "scene_identifier": scene_definition.scene_identifier,
        "place_name": scene_definition.place_name,
        "tension_tier_name": scene_definition.tension_tier_name,
        "present_persons": [
            {
                "person_identifier": present_person.person_identifier,
                "visible_name": read_person_visible_name(
                    present_person.person_identifier, working_state, resolution_context
                ),
                "is_name_known": present_person.person_identifier in working_state.known_person_identifiers,
                "silhouette_name": read_person_silhouette_name(present_person.person_identifier, resolution_context),
                "presence_text": conceal_names_still_unknown(
                    present_person.presence_text, working_state, resolution_context
                ),
            }
            for present_person in scene_definition.present_persons
            if is_branch_condition_met(present_person.presence_condition, working_state, resolution_context)
        ],
        "perceived_points_of_interest": [
            point_of_interest.model_dump(mode="json")
            for point_of_interest in scene_definition.perceived_points_of_interest
        ],
        "suggested_actions": merge_open_suggested_actions(authored_actions, working_state, resolution_context),
        "open_interactive_piece_identifiers": [
            solved_outcome.interactive_piece_identifier
            for solved_outcome in scene_definition.interactive_piece_solved_outcomes
            if working_state.interactive_piece_status_by_identifier.get(solved_outcome.interactive_piece_identifier)
            in lifecycle_status_names_open_to_attempts
        ],
    }
