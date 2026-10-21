import asyncio
import copy
from dataclasses import dataclass, replace
from typing import Any

from the_void_files.application.action_coordinator import (
    PreparedTurn,
    build_turn_resolver,
    investigator_action_turn_kind_name,
    persist_resolved_turn,
    prepare_turn,
    resolve_prepared_turn,
)
from the_void_files.application.ports.narrative_provider import NarrativeProvider
from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.use_cases.consequence_confirmed_turn_store import ConfirmedTurnStore
from the_void_files.application.use_cases.consequence_turn_requests import (
    InteractivePieceAssistanceRequest,
    InteractivePieceAttemptRequest,
    InvestigatorActionRequest,
)
from the_void_files.application.use_cases.consequence_case_state import fill_investigator_placeholder_marks
from the_void_files.application.use_cases.consequence_turn_resolution import (
    ResolvedTurn,
    is_unusable_plan_step_text,
    resolve_investigator_action,
)
from the_void_files.application.use_cases.director_interaction_log_review import (
    DirectorGenerationAttemptRecord,
    DirectorRecordStore,
)
from the_void_files.application.use_cases.director_staged_generation import (
    GenerationAttemptLinkage,
    StagedGenerationOutcome,
    generate_validated_contract,
)
from the_void_files.narrative.case_generator import read_rules_version
from the_void_files.narrative.context_builder import (
    DirectorTurnContext,
    build_adjudication_domain_facts,
    build_adjudication_request,
    build_live_placeholder_texts,
    build_player_facing_narration_request,
    format_world_clock_label,
    wrap_log_entry_for_director_context,
)
from the_void_files.narrative.orchestration.narration_contract import (
    read_anchored_status_lies,
    read_committed_narration_facts,
)
from the_void_files.narrative.narration_guard import (
    collect_private_texts,
    read_forbidden_game_term_texts,
    review_player_facing_narration,
    salvage_player_facing_narration,
)
from the_void_files.application.generated_markup_text import decode_generated_markup_text
from the_void_files.narrative.case_specification_preparation import normalize_identifier_text
from the_void_files.narrative.tool_registry import (
    AdjudicationProposal,
    NarrationDraft,
    SuggestedNextAction,
    adjudication_purpose_name,
    adjudication_response_schema_name,
    narration_purpose_name,
    narration_response_schema_name,
    review_adjudication_proposal,
)

suggested_action_group_names = ("speak", "examine", "use_or_spend", "move", "withdraw")
minimum_director_suggested_action_count = 3

DirectedTurnRequest = InvestigatorActionRequest | InteractivePieceAttemptRequest | InteractivePieceAssistanceRequest

director_narration_voice_name = "director_narration"
turn_adjudication_time_budget_seconds = 180.0
turn_narration_time_budget_seconds = 180.0
maximum_turn_adjudication_attempt_count = 2
maximum_turn_narration_attempt_count = 2
time_budget_exhausted_failure_name = "director_time_budget_exhausted"
director_involvement_key_name = "director_involvement"


def build_public_suggested_actions_from_director(
    suggested_next_actions: list[SuggestedNextAction],
) -> list[dict[str, Any]]:
    public_suggested_actions: list[dict[str, Any]] = []
    used_identifiers: set[str] = set()
    for action_index, suggested_next_action in enumerate(suggested_next_actions):
        visible_text = decode_generated_markup_text(suggested_next_action.visible_text).strip()
        if visible_text == "":
            continue
        action_identifier = normalize_identifier_text(suggested_next_action.identifier)
        if action_identifier in used_identifiers:
            action_identifier = normalize_identifier_text(f"{action_identifier}_{action_index + 1}")
        used_identifiers.add(action_identifier)
        action_group_name = suggested_next_action.action_group_name
        public_suggested_actions.append(
            {
                "identifier": action_identifier,
                "visible_text": visible_text,
                "resource_cost": None,
                "action_group_name": action_group_name if action_group_name in suggested_action_group_names else "examine",
                "has_been_attempted_before": False,
            }
        )
    return public_suggested_actions


def read_attempted_origin_identifiers(source_run: dict[str, Any] | None) -> set[str]:
    if not isinstance(source_run, dict):
        return set()
    attempted_origin_identifiers: set[str] = set()
    director_private_state = source_run.get("director_private_state")
    if isinstance(director_private_state, dict):
        for branch_identifier in director_private_state.get("executed_branch_identifiers") or []:
            if isinstance(branch_identifier, str):
                attempted_origin_identifiers.add(branch_identifier)
    public_state = source_run.get("public_state")
    if isinstance(public_state, dict):
        for witnessed_origin in public_state.get("witnessed_origins") or []:
            if isinstance(witnessed_origin, dict) and isinstance(witnessed_origin.get("origin_identifier"), str):
                attempted_origin_identifiers.add(witnessed_origin["origin_identifier"])
    return attempted_origin_identifiers


def overlay_director_suggested_actions_on_turn(
    response_payload: dict[str, Any],
    next_run: dict[str, Any] | None,
    suggested_next_actions: list[SuggestedNextAction],
    attempted_origin_identifiers: set[str] | None = None,
) -> None:
    public_suggested_actions = build_public_suggested_actions_from_director(suggested_next_actions)
    if not public_suggested_actions:
        return
    attempted_identifiers = attempted_origin_identifiers or set()
    for public_suggested_action in public_suggested_actions:
        public_suggested_action["has_been_attempted_before"] = (
            public_suggested_action["identifier"] in attempted_identifiers
        )
    public_suggested_actions = [
        public_suggested_action
        for public_suggested_action in public_suggested_actions
        if not public_suggested_action["has_been_attempted_before"]
    ]
    if not public_suggested_actions:
        return
    if isinstance(next_run, dict):
        public_state = next_run.get("public_state")
        if isinstance(public_state, dict) and isinstance(public_state.get("current_scene_presentation"), dict):
            authored_remaining_actions = public_state["current_scene_presentation"].get("suggested_actions")
            if isinstance(authored_remaining_actions, list):
                used_identifiers = {
                    public_suggested_action["identifier"] for public_suggested_action in public_suggested_actions
                }
                for authored_action in authored_remaining_actions:
                    authored_identifier = authored_action.get("identifier")
                    if isinstance(authored_identifier, str) and authored_identifier not in used_identifiers:
                        public_suggested_actions.append(authored_action)
                        used_identifiers.add(authored_identifier)
    live_placeholder_texts = build_live_placeholder_texts(
        next_run.get("public_state") if isinstance(next_run, dict) and isinstance(next_run.get("public_state"), dict) else {},
        {},
    )
    for public_suggested_action in public_suggested_actions:
        visible_text = public_suggested_action.get("visible_text")
        if isinstance(visible_text, str):
            public_suggested_action["visible_text"] = fill_investigator_placeholder_marks(
                visible_text, live_placeholder_texts
            )
    confirmed_turn = response_payload.get("confirmed_turn")
    if isinstance(confirmed_turn, dict) and isinstance(confirmed_turn.get("next_scene_presentation"), dict):
        confirmed_turn["next_scene_presentation"]["suggested_actions"] = public_suggested_actions
    if isinstance(next_run, dict):
        public_state = next_run.get("public_state")
        if isinstance(public_state, dict) and isinstance(public_state.get("current_scene_presentation"), dict):
            public_state["current_scene_presentation"]["suggested_actions"] = public_suggested_actions
            director_private_state = next_run.get("director_private_state")
            if isinstance(director_private_state, dict):
                director_private_state["open_suggested_actions"] = {
                    "scene_identifier": public_state["current_scene_presentation"].get("scene_identifier"),
                    "suggested_actions": public_suggested_actions,
                }


@dataclass(frozen=True)
class DirectedTurnCollaborators:
    narrative_provider: NarrativeProvider
    confirmed_turn_store: ConfirmedTurnStore
    director_record_store: DirectorRecordStore
    profile_identifier: str
    is_turn_adjudication_enabled: bool


def read_authored_branch_identifiers_from_specification(case_specification: dict[str, Any]) -> set[str]:
    authored_branch_identifiers: set[str] = set()
    for scene in case_specification.get("scenes", []):
        if not isinstance(scene, dict):
            continue
        for action_branch in scene.get("action_branches", []):
            if isinstance(action_branch, dict) and isinstance(action_branch.get("branch_identifier"), str):
                authored_branch_identifiers.add(action_branch["branch_identifier"])
    for shared_branch in case_specification.get("shared_action_branches", []):
        action_branch = shared_branch.get("action_branch") if isinstance(shared_branch, dict) else None
        if isinstance(action_branch, dict) and isinstance(action_branch.get("branch_identifier"), str):
            authored_branch_identifiers.add(action_branch["branch_identifier"])
    return authored_branch_identifiers


def does_investigator_action_need_director_adjudication(
    turn_request: InvestigatorActionRequest, current_run: dict[str, Any], authored_branch_identifiers: set[str]
) -> bool:
    if turn_request.is_player_insisting_after_director_veto:
        return True
    attempted_origin_identifiers = read_attempted_origin_identifiers(current_run)
    usable_plan_steps = [
        plan_step
        for plan_step in turn_request.remaining_plan_steps
        if not is_unusable_plan_step_text(plan_step.action_text)
    ]
    if not usable_plan_steps:
        return False
    for plan_step in usable_plan_steps:
        origin_identifier = plan_step.origin_suggested_action_identifier
        if origin_identifier is None or plan_step.was_text_edited_by_player:
            return True
        if origin_identifier not in authored_branch_identifiers:
            return True
        if origin_identifier in attempted_origin_identifiers:
            return True
    return False


def persist_open_suggested_actions(next_run: dict[str, Any] | None, accepted_adjudication: AdjudicationProposal | None) -> None:
    if not isinstance(next_run, dict):
        return
    public_state = next_run.get("public_state")
    director_private_state = next_run.get("director_private_state")
    if not isinstance(public_state, dict) or not isinstance(director_private_state, dict):
        return
    presentation = public_state.get("current_scene_presentation")
    suggested_actions = presentation.get("suggested_actions") if isinstance(presentation, dict) else None
    committed_decisions = {
        key_name: key_value
        for key_name, key_value in {
            "interpreted_intent_text": (
                accepted_adjudication.interpreted_intent_text
                if isinstance(accepted_adjudication, AdjudicationProposal)
                else None
            ),
            "lived_experience_flag_names": public_state.get("lived_experience_flag_names"),
            "known_person_identifiers": public_state.get("known_person_identifiers"),
        }.items()
        if key_value not in (None, [], "")
    }
    if committed_decisions:
        director_private_state["committed_decisions"] = committed_decisions
    if isinstance(presentation, dict) and isinstance(suggested_actions, list):
        director_private_state["open_suggested_actions"] = {
            "scene_identifier": presentation.get("scene_identifier"),
            "suggested_actions": suggested_actions,
        }


def read_engine_narration_paragraphs(director_entries: list[dict[str, Any]]) -> list[str]:
    return [
        marked_paragraph
        for director_entry in director_entries
        if director_entry.get("voice") == director_narration_voice_name
        for marked_paragraph in director_entry.get("marked_paragraphs", [])
    ]


def replace_narration_paragraphs(
    entry_contents: list[dict[str, Any]], narrated_paragraphs: list[str]
) -> list[dict[str, Any]]:
    remaining_narrated_paragraphs = list(narrated_paragraphs)
    replaced_entry_contents: list[dict[str, Any]] = []
    last_director_narration_index: int | None = None
    for entry_content in entry_contents:
        if entry_content.get("voice") != director_narration_voice_name:
            replaced_entry_contents.append(entry_content)
            continue
        paragraph_count = len(entry_content.get("marked_paragraphs", []))
        last_director_narration_index = len(replaced_entry_contents)
        replaced_entry_contents.append(
            {**entry_content, "marked_paragraphs": remaining_narrated_paragraphs[:paragraph_count]}
        )
        remaining_narrated_paragraphs = remaining_narrated_paragraphs[paragraph_count:]
    if remaining_narrated_paragraphs and last_director_narration_index is not None:
        last_director_entry = replaced_entry_contents[last_director_narration_index]
        replaced_entry_contents[last_director_narration_index] = {
            **last_director_entry,
            "marked_paragraphs": list(last_director_entry.get("marked_paragraphs", [])) + remaining_narrated_paragraphs,
        }
    return replaced_entry_contents


def build_player_action_description(prepared_turn: PreparedTurn) -> dict[str, Any]:
    return {"action_kind_name": prepared_turn.turn_kind_name, "request": prepared_turn.request_record}


def summarize_staged_outcome(staged_outcome: StagedGenerationOutcome | None) -> dict[str, Any]:
    if staged_outcome is None:
        return {"outcome_name": "skipped", "attempt_count": 0, "failure_names": [], "interaction_identifiers": []}
    return {
        "outcome_name": "accepted" if staged_outcome.accepted_contract is not None else "not_accepted",
        "attempt_count": len(staged_outcome.attempts),
        "failure_names": [
            attempt["failure_name"]
            or ",".join(validation_error["error_name"] for validation_error in attempt["validation_errors"])
            or "director_answer_rejected"
            for attempt in staged_outcome.attempts
            if attempt["outcome_name"] != "accepted"
        ],
        "interaction_identifiers": staged_outcome.interaction_identifiers,
    }


class DirectedTurnConfirmation:
    def __init__(self, collaborators: DirectedTurnCollaborators, prepared_turn: PreparedTurn) -> None:
        self.collaborators = collaborators
        self.prepared_turn = prepared_turn
        self.turn_context = DirectorTurnContext(
            profile_identifier=collaborators.profile_identifier,
            archive_case_identifier=prepared_turn.open_case_material.archive_case_identifier,
            archive_run_identifier=prepared_turn.archive_run_identifier,
            action_key=prepared_turn.action_key,
            state_version=prepared_turn.state_version,
            rules_version=read_rules_version(),
            case_specification=prepared_turn.open_case_material.specification,
            current_run=prepared_turn.current_run,
            recent_log_entries=[
                wrap_log_entry_for_director_context(
                    stored_log_entry.scene_identifier,
                    stored_log_entry.world_clock_minutes,
                    stored_log_entry.entry_content,
                )
                for stored_log_entry in collaborators.confirmed_turn_store.list_stored_log_entries(
                    prepared_turn.archive_run_identifier
                )
            ],
        )

    def build_linkage(self, turn_identifier: str | None) -> GenerationAttemptLinkage:
        return GenerationAttemptLinkage(
            simulation_run_identifier=None,
            archive_case_identifier=self.turn_context.archive_case_identifier,
            action_key=self.prepared_turn.action_key,
            turn_identifier=turn_identifier,
        )

    async def generate_within_time_budget(
        self,
        purpose_name: str,
        turn_identifier: str | None,
        time_budget_seconds: float,
        staged_generation: Any,
    ) -> StagedGenerationOutcome:
        try:
            return await asyncio.wait_for(staged_generation, timeout=time_budget_seconds)
        except asyncio.TimeoutError:
            self.collaborators.director_record_store.record_generation_attempt(
                DirectorGenerationAttemptRecord(
                    interaction_identifier=None,
                    simulation_run_identifier=None,
                    archive_case_identifier=self.turn_context.archive_case_identifier,
                    action_key=self.prepared_turn.action_key,
                    turn_identifier=turn_identifier,
                    purpose_name=purpose_name,
                    attempt_number=1,
                    outcome_name="provider_failed",
                    failure_name=time_budget_exhausted_failure_name,
                    validation_errors=[],
                    created_at_utc=read_current_utc_timestamp(),
                )
            )
            return StagedGenerationOutcome(
                purpose_name=purpose_name,
                attempts=[
                    {
                        "attempt_number": 1,
                        "interaction_identifier": None,
                        "outcome_name": "provider_failed",
                        "failure_name": time_budget_exhausted_failure_name,
                        "injected_failure_mode_name": None,
                        "validation_errors": [],
                    }
                ],
            )

    async def adjudicate(self) -> StagedGenerationOutcome:
        domain_facts = build_adjudication_domain_facts(self.turn_context)
        player_action = build_player_action_description(self.prepared_turn)
        return await self.generate_within_time_budget(
            adjudication_purpose_name,
            None,
            turn_adjudication_time_budget_seconds,
            generate_validated_contract(
                self.collaborators.narrative_provider,
                self.collaborators.director_record_store,
                adjudication_purpose_name,
                adjudication_response_schema_name,
                lambda attempt_position, validation_errors, failure_mode_name: build_adjudication_request(
                    self.turn_context,
                    player_action,
                    attempt_position,
                    validation_errors,
                    None,
                    investigator_placeholder_texts=self.prepared_turn.resolution_context.placeholder_texts,
                ),
                lambda accepted_contract: (
                    review_adjudication_proposal(accepted_contract, domain_facts)
                    if isinstance(accepted_contract, AdjudicationProposal)
                    else []
                ),
                self.build_linkage(None),
                [],
                maximum_turn_adjudication_attempt_count,
            ),
        )

    async def narrate(self, resolved_turn: ResolvedTurn, engine_paragraphs: list[str]) -> StagedGenerationOutcome:
        confirmed_turn = resolved_turn.response_payload["confirmed_turn"]
        result_run = resolved_turn.next_run if resolved_turn.next_run is not None else self.prepared_turn.current_run
        private_texts = collect_private_texts(
            self.turn_context.case_specification,
            list(result_run.get("public_state", {}).get("known_person_identifiers", [])),
        )
        forbidden_game_term_texts = read_forbidden_game_term_texts()
        current_scene_presentation = result_run.get("public_state", {}).get("current_scene_presentation")
        prepared_result = {
            "marked_paragraphs": engine_paragraphs,
            "investigator_entry": confirmed_turn.get("investigator_entry"),
            "director_entries": confirmed_turn.get("director_entries"),
            "confirmed_effects": confirmed_turn.get("confirmed_effects"),
            "staging_events": confirmed_turn.get("staging_events"),
            "relationship_changes": confirmed_turn.get("relationship_changes"),
            "archive_outcome": confirmed_turn.get("archive_outcome"),
            "open_suggested_actions": (
                current_scene_presentation.get("suggested_actions")
                if isinstance(current_scene_presentation, dict)
                else []
            ),
            "required_suggested_next_action_count": 5,
            "resulting_place_name": result_run.get("public_state", {}).get("place_name"),
            "resulting_clock_label": format_world_clock_label(
                result_run.get("public_state", {}).get("world_clock_minutes")
            ),
            "resulting_held_kit": [
                {
                    "identifier": held_belonging.get("belonging_identifier"),
                    "units": held_belonging.get("units"),
                }
                for held_belonging in result_run.get("public_state", {}).get("belonging_units") or []
                if isinstance(held_belonging, dict)
            ],
        }
        return await self.generate_within_time_budget(
            narration_purpose_name,
            resolved_turn.turn_identifier,
            turn_narration_time_budget_seconds,
            generate_validated_contract(
                self.collaborators.narrative_provider,
                self.collaborators.director_record_store,
                narration_purpose_name,
                narration_response_schema_name,
                lambda attempt_position, validation_errors, failure_mode_name: build_player_facing_narration_request(
                    self.turn_context.model_copy(update={"current_run": result_run}),
                    resolved_turn.turn_identifier,
                    prepared_result,
                    attempt_position,
                    validation_errors,
                    None,
                    investigator_placeholder_texts=self.prepared_turn.resolution_context.placeholder_texts,
                ),
                lambda accepted_contract: (
                    salvage_player_facing_narration(
                        accepted_contract,
                        engine_paragraphs,
                        private_texts,
                        forbidden_game_term_texts,
                        self.turn_context.case_specification,
                        list(result_run.get("public_state", {}).get("known_person_identifiers", [])),
                        read_committed_narration_facts(
                            result_run.get("public_state", {}),
                            self.turn_context.case_specification,
                            self.turn_context.current_run.get("public_state", {}).get("place_name"),
                        ),
                        read_anchored_status_lies(
                            list(confirmed_turn.get("director_entries") or []),
                            list(confirmed_turn.get("staging_events") or []),
                        ),
                    )
                    if isinstance(accepted_contract, NarrationDraft)
                    else []
                ),
                self.build_linkage(resolved_turn.turn_identifier),
                [],
                maximum_turn_narration_attempt_count,
            ),
        )

    async def confirm(self, turn_request: DirectedTurnRequest) -> dict[str, Any]:
        turn_kind_name, resolve_turn = build_turn_resolver(turn_request)
        adjudication_outcome: StagedGenerationOutcome | None = None
        if (
            self.collaborators.is_turn_adjudication_enabled
            and turn_kind_name == investigator_action_turn_kind_name
            and isinstance(turn_request, InvestigatorActionRequest)
            and does_investigator_action_need_director_adjudication(
                turn_request,
                self.prepared_turn.current_run,
                read_authored_branch_identifiers_from_specification(self.turn_context.case_specification),
            )
        ):
            adjudication_outcome = await self.adjudicate()
            accepted_adjudication = adjudication_outcome.accepted_contract
            if isinstance(accepted_adjudication, AdjudicationProposal):

                def resolve_turn(current_run, resolution_context, turn_identifier, state_version):
                    return resolve_investigator_action(
                        turn_request,
                        current_run,
                        resolution_context,
                        turn_identifier,
                        accepted_adjudication,
                    )

        resolved_turn = resolve_prepared_turn(self.prepared_turn, resolve_turn)
        confirmed_turn = resolved_turn.response_payload.get("confirmed_turn")
        engine_paragraphs = (
            read_engine_narration_paragraphs(confirmed_turn.get("director_entries", []))
            if resolved_turn.disposition_name == "resolved" and isinstance(confirmed_turn, dict)
            else []
        )
        narration_outcome: StagedGenerationOutcome | None = None
        narrated_paragraphs: list[str] | None = None
        if engine_paragraphs:
            narration_outcome = await self.narrate(resolved_turn, engine_paragraphs)
            if isinstance(narration_outcome.accepted_contract, NarrationDraft):
                narrated_paragraphs = narration_outcome.accepted_contract.marked_paragraphs
                overlay_director_suggested_actions_on_turn(
                    resolved_turn.response_payload,
                    resolved_turn.next_run,
                    narration_outcome.accepted_contract.suggested_next_actions,
                    read_attempted_origin_identifiers(
                        resolved_turn.next_run if resolved_turn.next_run is not None else self.prepared_turn.current_run
                    ),
                )
        accepted_adjudication = adjudication_outcome.accepted_contract if adjudication_outcome is not None else None
        persist_open_suggested_actions(resolved_turn.next_run, accepted_adjudication)
        director_involvement = {
            "adjudication": {
                **summarize_staged_outcome(adjudication_outcome),
                "is_engine_the_authority_for_effects": True,
                "feasibility_class_name": (
                    accepted_adjudication.feasibility_class_name
                    if isinstance(accepted_adjudication, AdjudicationProposal)
                    else None
                ),
                "proposed_effect_kind_names": (
                    sorted({effect_proposal.effect_kind_name for effect_proposal in accepted_adjudication.effect_proposals})
                    if isinstance(accepted_adjudication, AdjudicationProposal)
                    else []
                ),
                "engine_effect_kind_names": sorted(
                    {
                        confirmed_effect["kind"]
                        for confirmed_effect in resolved_turn.confirmed_effects
                        if isinstance(confirmed_effect.get("kind"), str)
                    }
                ),
                "engine_disposition_name": resolved_turn.disposition_name,
            },
            "narration": {
                **summarize_staged_outcome(narration_outcome),
                "narration_source_name": "director" if narrated_paragraphs is not None else "engine",
            },
        }
        response_payload = copy.deepcopy(resolved_turn.response_payload)
        log_entries = resolved_turn.log_entries
        if narrated_paragraphs is not None:
            live_placeholder_texts = build_live_placeholder_texts(
                (resolved_turn.next_run or self.prepared_turn.current_run).get("public_state")
                if isinstance(resolved_turn.next_run or self.prepared_turn.current_run, dict)
                else {},
                self.prepared_turn.resolution_context.placeholder_texts,
            )
            filled_narrated_paragraphs = [
                fill_investigator_placeholder_marks(narrated_paragraph, live_placeholder_texts)
                for narrated_paragraph in narrated_paragraphs
            ]
            response_payload["confirmed_turn"]["director_entries"] = replace_narration_paragraphs(
                response_payload["confirmed_turn"]["director_entries"], filled_narrated_paragraphs
            )
            narrated_log_contents = replace_narration_paragraphs(
                [log_entry["content"] for log_entry in log_entries], filled_narrated_paragraphs
            )
            log_entries = [
                {**log_entry, "content": narrated_log_content}
                for log_entry, narrated_log_content in zip(log_entries, narrated_log_contents, strict=True)
            ]
        response_payload[director_involvement_key_name] = director_involvement
        return persist_resolved_turn(
            self.collaborators.confirmed_turn_store,
            self.prepared_turn,
            replace(resolved_turn, response_payload=response_payload, log_entries=log_entries),
        )


async def confirm_directed_turn(
    collaborators: DirectedTurnCollaborators, turn_request: DirectedTurnRequest
) -> dict[str, Any]:
    turn_kind_name = build_turn_resolver(turn_request)[0]
    prepared_turn = prepare_turn(
        collaborators.confirmed_turn_store,
        turn_kind_name,
        turn_request,
        turn_request.action_key,
        turn_request.expected_state_version,
    )
    if not isinstance(prepared_turn, PreparedTurn):
        return prepared_turn
    return await DirectedTurnConfirmation(collaborators, prepared_turn).confirm(turn_request)
