import json
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from the_void_files.application.action_coordinator import (
    confirm_interactive_piece_assistance,
    confirm_interactive_piece_attempt,
    confirm_investigator_action,
)
from the_void_files.application.ports.narration_audio_library import NarrationAudioLibrary
from the_void_files.application.ports.narrative_provider import NarrativeProvider
from the_void_files.application.ports.speech_provider import SpeechProvider, SpeechSynthesisRequest
from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.service_failures import ServiceFailure
from the_void_files.application.use_cases.case_start_archive_case_store import ArchiveCaseStore
from the_void_files.application.use_cases.case_start_offer_whispers import read_or_create_whisper_offer
from the_void_files.application.use_cases.case_start_open_archive import open_archive
from the_void_files.application.use_cases.case_start_specification_models import AssistanceLevelName
from the_void_files.application.use_cases.consequence_confirmed_turn_store import ConfirmedTurnStore
from the_void_files.application.use_cases.consequence_turn_requests import (
    InteractivePieceAssistanceRequest,
    InteractivePieceAttemptRequest,
    InvestigatorActionRequest,
)
from the_void_files.application.use_cases.director_failures import (
    FailureInjectionNeedsSyntheticProviderError,
    ScriptedPathUnknownError,
    ScriptedPathUnusableError,
    SimulationNeedsClosedArchiveError,
)
from the_void_files.application.use_cases.director_interaction_log_review import (
    DirectorRecordStore,
    DirectorSimulationRunRecord,
)
from the_void_files.application.use_cases.director_speakable_narration import (
    build_placeholder_texts,
    convert_marked_paragraph_to_speakable_text,
    read_neutral_wording,
)
from the_void_files.application.use_cases.director_staged_generation import (
    GenerationAttemptLinkage,
    StagedGenerationOutcome,
    generate_validated_contract,
)
from the_void_files.application.use_cases.synthesize_narration_speech import synthesize_narration_speech
from the_void_files.narrative.case_generator import read_rules_version
from the_void_files.narrative.context_builder import (
    DirectorTurnContext,
    build_adjudication_domain_facts,
    build_adjudication_request,
    build_chapter_summary_request,
    build_narration_request,
    build_piece_assistance_request,
    wrap_log_entry_for_director_context,
)
from the_void_files.narrative.orchestration.narration_contract import (
    read_committed_narration_facts,
    review_narration_against_committed_facts,
)
from the_void_files.narrative.tool_registry import (
    AdjudicationProposal,
    ChapterSummaryDraft,
    NarrationDraft,
    PieceAssistanceDraft,
    adjudication_purpose_name,
    adjudication_response_schema_name,
    chapter_summary_purpose_name,
    chapter_summary_response_schema_name,
    narration_purpose_name,
    narration_response_schema_name,
    piece_assistance_purpose_name,
    piece_assistance_response_schema_name,
    review_adjudication_proposal,
    review_narration_draft,
)
from the_void_files.service_settings import project_root_directory

scripted_paths_path = (
    project_root_directory / "content" / "synthetic_cases" / "director_simulation" / "scripted_paths.json"
)
director_narration_voice_name = "director_narration"
simulated_purpose_names = (
    adjudication_purpose_name,
    narration_purpose_name,
    piece_assistance_purpose_name,
    chapter_summary_purpose_name,
)

SimulatedPurposeName = Literal["adjudication", "narration", "piece_assistance", "chapter_summary"]
InjectedFailureModeName = Literal["invalid_json", "impossible_effect", "timeout", "stale_state_version"]


class SimulationModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ScriptedStep(SimulationModel):
    step_kind_name: Literal["suggested_action", "interactive_piece_attempt", "interactive_piece_assistance"]
    suggested_action_identifiers: list[str] = Field(default_factory=list, max_length=8)
    interactive_piece_identifier: str | None = None
    submitted_value: dict[str, Any] | None = None
    requested_level_name: AssistanceLevelName | None = None


class ScriptedPath(SimulationModel):
    scripted_path_identifier: str
    whisper_identifier: str
    expected_archive_outcome_kind_name: str
    steps: list[ScriptedStep] = Field(min_length=1, max_length=200)


class ScriptedPathCollection(SimulationModel):
    paths_format_version: int
    default_voice_identifier: str
    scripted_paths: list[ScriptedPath]


class InjectedFailure(SimulationModel):
    step_number: int = Field(ge=1, le=200)
    purpose_name: SimulatedPurposeName
    failure_mode_name: InjectedFailureModeName
    failing_attempt_count: int = Field(default=1, ge=1, le=3)

    @model_validator(mode="after")
    def require_stale_version_only_for_adjudication(self) -> "InjectedFailure":
        if self.failure_mode_name == "stale_state_version" and self.purpose_name != "adjudication":
            raise ValueError("stale_state_version_needs_adjudication")
        return self


class CaseSimulationRequest(SimulationModel):
    scripted_path_identifier: str = Field(min_length=1, max_length=200)
    voice_identifier: str | None = Field(default=None, min_length=1, max_length=64)
    is_speech_enabled: bool = True
    injected_failures: list[InjectedFailure] = Field(default_factory=list, max_length=32)


@dataclass(frozen=True)
class CaseSimulationCollaborators:
    narrative_provider: NarrativeProvider
    speech_provider: SpeechProvider
    narration_audio_library: NarrationAudioLibrary
    archive_case_store: ArchiveCaseStore
    confirmed_turn_store: ConfirmedTurnStore
    director_record_store: DirectorRecordStore
    chronicle_state: dict[str, Any] | None


def read_scripted_path_collection(paths_path: Path = scripted_paths_path) -> ScriptedPathCollection:
    if not paths_path.is_file():
        raise ScriptedPathUnusableError()
    try:
        return ScriptedPathCollection.model_validate(json.loads(paths_path.read_text(encoding="utf-8")))
    except (ValueError, ValidationError) as unusable_paths_error:
        raise ScriptedPathUnusableError() from unusable_paths_error


def list_public_scripted_paths() -> dict[str, Any]:
    scripted_path_collection = read_scripted_path_collection()
    return {
        "default_voice_identifier": scripted_path_collection.default_voice_identifier,
        "scripted_paths": [
            {
                "scripted_path_identifier": scripted_path.scripted_path_identifier,
                "whisper_identifier": scripted_path.whisper_identifier,
                "expected_archive_outcome_kind_name": scripted_path.expected_archive_outcome_kind_name,
                "step_count": len(scripted_path.steps),
            }
            for scripted_path in scripted_path_collection.scripted_paths
        ],
    }


def read_director_narration_paragraphs(narration_entries: Any) -> list[str]:
    return [
        marked_paragraph
        for narration_entry in (narration_entries if isinstance(narration_entries, list) else [])
        if isinstance(narration_entry, dict) and narration_entry.get("voice") == director_narration_voice_name
        for marked_paragraph in narration_entry.get("marked_paragraphs", [])
        if isinstance(marked_paragraph, str)
    ]


class CaseSimulation:
    def __init__(
        self, collaborators: CaseSimulationCollaborators, profile_identifier: str, simulation_request: CaseSimulationRequest
    ) -> None:
        self.collaborators = collaborators
        self.profile_identifier = profile_identifier
        self.simulation_request = simulation_request
        self.simulation_run_identifier = uuid.uuid4().hex
        self.started_at_utc = read_current_utc_timestamp()
        self.rules_version = read_rules_version()
        self.neutral_wording = read_neutral_wording()
        self.placeholder_texts = build_placeholder_texts(collaborators.chronicle_state, self.neutral_wording)
        self.voice_identifier = ""
        self.archive_case_identifier: str | None = None
        self.step_reports: list[dict[str, Any]] = []
        self.failures: list[dict[str, Any]] = []
        self.interaction_identifiers: list[str] = []
        self.generated_audio_count = 0
        self.cached_audio_count = 0

    def add_failure(self, step_number: int | None, stage_name: str, failure_name: str) -> None:
        self.failures.append({"step_number": step_number, "stage_name": stage_name, "failure_name": failure_name})

    def read_injected_failure_mode_names(self, step_number: int, purpose_name: str) -> list[str]:
        return [
            injected_failure.failure_mode_name
            for injected_failure in self.simulation_request.injected_failures
            if injected_failure.step_number == step_number and injected_failure.purpose_name == purpose_name
            for repetition_number in range(injected_failure.failing_attempt_count)
        ]

    def absorb_staged_outcome(self, step_number: int | None, staged_outcome: StagedGenerationOutcome) -> dict[str, Any]:
        self.interaction_identifiers.extend(staged_outcome.interaction_identifiers)
        for attempt in staged_outcome.attempts:
            if attempt["outcome_name"] != "accepted":
                self.add_failure(
                    step_number,
                    f"{staged_outcome.purpose_name}_attempt_{attempt['attempt_number']}",
                    attempt["failure_name"] or "director_answer_rejected",
                )
        return {
            "purpose_name": staged_outcome.purpose_name,
            "was_accepted": staged_outcome.accepted_contract is not None,
            "attempts": staged_outcome.attempts,
        }

    async def speak_paragraphs(
        self, step_number: int | None, turn_identifier: str | None, marked_paragraphs: list[str]
    ) -> list[dict[str, Any]]:
        spoken_paragraph_reports: list[dict[str, Any]] = []
        if not self.simulation_request.is_speech_enabled:
            return spoken_paragraph_reports
        for paragraph_number, marked_paragraph in enumerate(marked_paragraphs, start=1):
            speakable_text = convert_marked_paragraph_to_speakable_text(
                marked_paragraph, self.placeholder_texts, self.neutral_wording["unknown_placeholder_fallback_text"]
            )
            if not speakable_text:
                continue
            try:
                narration_audio = await synthesize_narration_speech(
                    self.collaborators.speech_provider,
                    self.collaborators.narration_audio_library,
                    SpeechSynthesisRequest(
                        profile_identifier=self.profile_identifier,
                        turn_identifier=turn_identifier,
                        text=speakable_text,
                        voice_identifier=self.voice_identifier,
                    ),
                )
            except ServiceFailure as speech_failure:
                self.add_failure(step_number, f"speech_paragraph_{paragraph_number}", speech_failure.failure_name)
                spoken_paragraph_reports.append(
                    {
                        "paragraph_number": paragraph_number,
                        "speakable_character_count": len(speakable_text),
                        "content_hash": None,
                        "was_served_from_cache": False,
                        "failure_name": speech_failure.failure_name,
                    }
                )
                continue
            if narration_audio.was_found_in_library:
                self.cached_audio_count += 1
            else:
                self.generated_audio_count += 1
            spoken_paragraph_reports.append(
                {
                    "paragraph_number": paragraph_number,
                    "speakable_character_count": len(speakable_text),
                    "content_hash": narration_audio.content_hash,
                    "was_served_from_cache": narration_audio.was_found_in_library,
                    "failure_name": None,
                }
            )
        return spoken_paragraph_reports

    def build_turn_context(self, action_key: str) -> DirectorTurnContext | None:
        open_case_material = self.collaborators.confirmed_turn_store.read_open_case_resolution_material()
        if (
            open_case_material is None
            or open_case_material.archive_run_identifier is None
            or open_case_material.current_run is None
            or open_case_material.state_version is None
        ):
            return None
        return DirectorTurnContext(
            profile_identifier=self.profile_identifier,
            archive_case_identifier=open_case_material.archive_case_identifier,
            archive_run_identifier=open_case_material.archive_run_identifier,
            action_key=action_key,
            state_version=open_case_material.state_version,
            rules_version=self.rules_version,
            case_specification=open_case_material.specification,
            current_run=open_case_material.current_run,
            recent_log_entries=[
                wrap_log_entry_for_director_context(
                    stored_log_entry.scene_identifier,
                    stored_log_entry.world_clock_minutes,
                    stored_log_entry.entry_content,
                )
                for stored_log_entry in self.collaborators.confirmed_turn_store.list_stored_log_entries(
                    open_case_material.archive_run_identifier
                )
            ],
        )

    def build_linkage(self, action_key: str | None, turn_identifier: str | None) -> GenerationAttemptLinkage:
        return GenerationAttemptLinkage(
            simulation_run_identifier=self.simulation_run_identifier,
            archive_case_identifier=self.archive_case_identifier,
            action_key=action_key,
            turn_identifier=turn_identifier,
        )

    def choose_suggested_action(
        self, turn_context: DirectorTurnContext, scripted_step: ScriptedStep
    ) -> dict[str, Any] | None:
        scene_presentation = turn_context.current_run["public_state"]["current_scene_presentation"]
        for wanted_action_identifier in scripted_step.suggested_action_identifiers:
            for suggested_action in scene_presentation.get("suggested_actions", []):
                if suggested_action.get("identifier") == wanted_action_identifier:
                    return suggested_action
        return None

    def build_player_action(
        self, turn_context: DirectorTurnContext, scripted_step: ScriptedStep
    ) -> tuple[dict[str, Any], Any] | None:
        scene_identifier = turn_context.current_run["public_state"]["current_scene_presentation"]["scene_identifier"]
        if scripted_step.step_kind_name == "suggested_action":
            suggested_action = self.choose_suggested_action(turn_context, scripted_step)
            if suggested_action is None:
                return None
            action_request = InvestigatorActionRequest.model_validate(
                {
                    "action_key": turn_context.action_key,
                    "expected_state_version": turn_context.state_version,
                    "scene_identifier": scene_identifier,
                    "remaining_plan_steps": [
                        {
                            "step_identifier": "plan_step_1",
                            "action_text": suggested_action.get("visible_text") or suggested_action["identifier"],
                            "condition_text": None,
                            "origin_suggested_action_identifier": suggested_action["identifier"],
                            "was_text_edited_by_player": False,
                            "declared_resource_cost": None,
                        }
                    ],
                    "declared_plan_step_count": 1,
                    "already_executed_step_count": 0,
                    "is_player_insisting_after_director_veto": False,
                    "referenced_interactive_piece_identifier": None,
                }
            )
            return (
                {
                    "action_kind_name": "suggested_action",
                    "suggested_action_identifier": suggested_action["identifier"],
                    "exact_text": suggested_action.get("visible_text"),
                },
                action_request,
            )
        if scripted_step.step_kind_name == "interactive_piece_attempt":
            attempt_request = InteractivePieceAttemptRequest.model_validate(
                {
                    "action_key": turn_context.action_key,
                    "expected_state_version": turn_context.state_version,
                    "interactive_piece_identifier": scripted_step.interactive_piece_identifier,
                    "submitted_value": scripted_step.submitted_value,
                }
            )
            return (
                {
                    "action_kind_name": "interactive_piece_attempt",
                    "interactive_piece_identifier": scripted_step.interactive_piece_identifier,
                    "submitted_value": scripted_step.submitted_value,
                },
                attempt_request,
            )
        assistance_request = InteractivePieceAssistanceRequest.model_validate(
            {
                "action_key": turn_context.action_key,
                "expected_state_version": turn_context.state_version,
                "interactive_piece_identifier": scripted_step.interactive_piece_identifier,
                "requested_level_name": scripted_step.requested_level_name,
                "is_scope_limited_to_this_piece_confirmed": True,
            }
        )
        return (
            {
                "action_kind_name": "interactive_piece_assistance",
                "interactive_piece_identifier": scripted_step.interactive_piece_identifier,
                "requested_level_name": scripted_step.requested_level_name,
            },
            assistance_request,
        )

    def confirm_turn_request(self, turn_request: Any) -> dict[str, Any]:
        if isinstance(turn_request, InvestigatorActionRequest):
            return confirm_investigator_action(self.collaborators.confirmed_turn_store, turn_request)
        if isinstance(turn_request, InteractivePieceAttemptRequest):
            return confirm_interactive_piece_attempt(self.collaborators.confirmed_turn_store, turn_request)
        return confirm_interactive_piece_assistance(self.collaborators.confirmed_turn_store, turn_request)

    async def play_assistance_wording(
        self,
        step_number: int,
        step_report: dict[str, Any],
        turn_context: DirectorTurnContext,
        response_payload: dict[str, Any],
    ) -> None:
        assistance_record = response_payload.get("assistance_record") or {}
        prepared_result = {
            "interactive_piece_identifier": response_payload.get("interactive_piece_identifier"),
            "level_name": assistance_record.get("level_name"),
            "public_hint_text": assistance_record.get("public_hint_text"),
        }
        staged_outcome = await generate_validated_contract(
            self.collaborators.narrative_provider,
            self.collaborators.director_record_store,
            piece_assistance_purpose_name,
            piece_assistance_response_schema_name,
            lambda attempt_position, validation_errors, failure_mode_name: build_piece_assistance_request(
                turn_context,
                None,
                prepared_result,
                attempt_position,
                validation_errors,
                failure_mode_name,
                investigator_placeholder_texts=self.placeholder_texts,
            ),
            lambda accepted_contract: [],
            self.build_linkage(turn_context.action_key, None),
            self.read_injected_failure_mode_names(step_number, piece_assistance_purpose_name),
        )
        step_report["generations"].append(self.absorb_staged_outcome(step_number, staged_outcome))
        step_report["was_engine_text_used_as_fallback"] = staged_outcome.accepted_contract is None

    async def play_step(self, step_number: int, scripted_step: ScriptedStep) -> bool:
        action_key = f"simulation_{self.simulation_run_identifier[:16]}_{step_number:03d}"
        step_report: dict[str, Any] = {
            "step_number": step_number,
            "step_kind_name": scripted_step.step_kind_name,
            "action_key": action_key,
            "state_version_before": None,
            "state_version_after": None,
            "turn_identifier": None,
            "disposition_name": None,
            "scene_identifier_before": None,
            "archive_outcome_kind_name": None,
            "generations": [],
            "spoken_paragraphs": [],
            "was_engine_text_used_as_fallback": False,
        }
        self.step_reports.append(step_report)
        turn_context = self.build_turn_context(action_key)
        if turn_context is None:
            self.add_failure(step_number, "context_building", "archive_not_open")
            return False
        step_report["state_version_before"] = turn_context.state_version
        step_report["scene_identifier_before"] = turn_context.current_run["public_state"]["current_scene_presentation"][
            "scene_identifier"
        ]
        try:
            built_player_action = self.build_player_action(turn_context, scripted_step)
        except ValidationError:
            self.add_failure(step_number, "scripted_step_reading", "scripted_step_unusable")
            return False
        if built_player_action is None:
            self.add_failure(step_number, "scripted_step_reading", "suggested_action_not_offered")
            return False
        player_action, turn_request = built_player_action
        step_report["player_action"] = player_action
        if scripted_step.step_kind_name != "interactive_piece_assistance":
            domain_facts = build_adjudication_domain_facts(turn_context)
            adjudication_outcome = await generate_validated_contract(
                self.collaborators.narrative_provider,
                self.collaborators.director_record_store,
                adjudication_purpose_name,
                adjudication_response_schema_name,
                lambda attempt_position, validation_errors, failure_mode_name: build_adjudication_request(
                    turn_context,
                    player_action,
                    attempt_position,
                    validation_errors,
                    failure_mode_name,
                    investigator_placeholder_texts=self.placeholder_texts,
                ),
                lambda accepted_contract: (
                    review_adjudication_proposal(accepted_contract, domain_facts)
                    if isinstance(accepted_contract, AdjudicationProposal)
                    else []
                ),
                self.build_linkage(action_key, None),
                self.read_injected_failure_mode_names(step_number, adjudication_purpose_name),
            )
            step_report["generations"].append(self.absorb_staged_outcome(step_number, adjudication_outcome))
            if adjudication_outcome.accepted_contract is None:
                self.add_failure(step_number, "adjudication", "director_adjudication_exhausted")
                return False
        try:
            response_payload = self.confirm_turn_request(turn_request)
        except ServiceFailure as resolution_failure:
            self.add_failure(step_number, "turn_confirmation", resolution_failure.failure_name)
            return False
        if scripted_step.step_kind_name == "interactive_piece_assistance":
            step_report["disposition_name"] = "assistance_given"
            step_report["state_version_after"] = response_payload.get("state_version")
            await self.play_assistance_wording(step_number, step_report, turn_context, response_payload)
            return True
        confirmed_turn = response_payload.get("confirmed_turn")
        step_report["disposition_name"] = response_payload.get("disposition_name", "resolved")
        if not isinstance(confirmed_turn, dict):
            self.add_failure(step_number, "turn_confirmation", "scripted_step_not_resolved")
            return False
        turn_identifier = confirmed_turn["turn_identifier"]
        archive_outcome = confirmed_turn.get("archive_outcome")
        step_report["turn_identifier"] = turn_identifier
        step_report["state_version_after"] = confirmed_turn["resulting_state_version"]
        step_report["archive_outcome_kind_name"] = archive_outcome.get("kind") if isinstance(archive_outcome, dict) else None
        engine_paragraphs = read_director_narration_paragraphs(confirmed_turn.get("director_entries"))
        prepared_result = {
            "marked_paragraphs": engine_paragraphs,
            "confirmed_effects": confirmed_turn.get("confirmed_effects"),
            "staging_events": confirmed_turn.get("staging_events"),
            "relationship_changes": confirmed_turn.get("relationship_changes"),
            "archive_outcome": archive_outcome,
        }
        if engine_paragraphs:
            narration_outcome = await generate_validated_contract(
                self.collaborators.narrative_provider,
                self.collaborators.director_record_store,
                narration_purpose_name,
                narration_response_schema_name,
                lambda attempt_position, validation_errors, failure_mode_name: build_narration_request(
                    turn_context,
                    turn_identifier,
                    prepared_result,
                    attempt_position,
                    validation_errors,
                    failure_mode_name,
                    investigator_placeholder_texts=self.placeholder_texts,
                ),
                lambda accepted_contract: (
                    review_narration_draft(accepted_contract) if isinstance(accepted_contract, NarrationDraft) else []
                ),
                self.build_linkage(action_key, turn_identifier),
                self.read_injected_failure_mode_names(step_number, narration_purpose_name),
            )
            step_report["generations"].append(self.absorb_staged_outcome(step_number, narration_outcome))
            if not isinstance(narration_outcome.accepted_contract, NarrationDraft):
                step_report["was_engine_text_used_as_fallback"] = True
        if isinstance(archive_outcome, dict):
            await self.play_chapter_summary(step_number, step_report, turn_context, archive_outcome)
        return True

    async def play_chapter_summary(
        self,
        step_number: int,
        step_report: dict[str, Any],
        turn_context: DirectorTurnContext,
        archive_outcome: dict[str, Any],
    ) -> None:
        closing_log_entries = [
            stored_log_entry.entry_content
            for stored_log_entry in self.collaborators.confirmed_turn_store.list_stored_log_entries(
                turn_context.archive_run_identifier
            )
        ]
        prepared_result = {"archive_outcome": archive_outcome, "confirmed_log_entries": closing_log_entries}
        summary_outcome = await generate_validated_contract(
            self.collaborators.narrative_provider,
            self.collaborators.director_record_store,
            chapter_summary_purpose_name,
            chapter_summary_response_schema_name,
            lambda attempt_position, validation_errors, failure_mode_name: build_chapter_summary_request(
                turn_context,
                prepared_result,
                attempt_position,
                validation_errors,
                failure_mode_name,
                investigator_placeholder_texts=self.placeholder_texts,
            ),
            lambda accepted_contract: (
                review_narration_against_committed_facts(
                    list(accepted_contract.summary_paragraphs) + list(accepted_contract.open_thread_texts),
                    read_committed_narration_facts(
                        turn_context.current_run.get("public_state", {}),
                        turn_context.case_specification,
                    ),
                )
                if isinstance(accepted_contract, ChapterSummaryDraft)
                else []
            ),
            self.build_linkage(turn_context.action_key, None),
            self.read_injected_failure_mode_names(step_number, chapter_summary_purpose_name),
        )
        step_report["generations"].append(self.absorb_staged_outcome(step_number, summary_outcome))

    async def play_case_start(self, scripted_path: ScriptedPath) -> dict[str, Any] | None:
        case_start_report: dict[str, Any] = {
            "offer_batch_identifier": None,
            "archive_case_identifier": None,
            "archive_number": None,
            "initial_state_version": None,
            "spoken_paragraphs": [],
        }
        try:
            whisper_offer_batch = await read_or_create_whisper_offer(
                self.collaborators.narrative_provider, self.collaborators.archive_case_store, self.profile_identifier
            )
            case_start_report["offer_batch_identifier"] = whisper_offer_batch.offer_batch_identifier
            stored_archive_opening = await open_archive(
                self.collaborators.narrative_provider,
                self.collaborators.archive_case_store,
                self.profile_identifier,
                f"simulation_{self.simulation_run_identifier}",
                scripted_path.whisper_identifier,
            )
        except ServiceFailure as case_start_failure:
            self.add_failure(None, "case_start", case_start_failure.failure_name)
            return case_start_report
        opening_payload = stored_archive_opening.opening_public_payload
        self.archive_case_identifier = stored_archive_opening.archive_case_summary.archive_case_identifier
        case_start_report["archive_case_identifier"] = self.archive_case_identifier
        case_start_report["archive_number"] = stored_archive_opening.archive_case_summary.archive_number
        case_start_report["initial_state_version"] = opening_payload["archive_run"]["state_version"]
        case_start_report["spoken_paragraphs"] = await self.speak_paragraphs(
            None, None, read_director_narration_paragraphs(opening_payload["opening_resolution"].get("opening_entries"))
        )
        return case_start_report

    async def run(self) -> dict[str, Any]:
        scripted_path_collection = read_scripted_path_collection()
        scripted_path = next(
            (
                candidate_path
                for candidate_path in scripted_path_collection.scripted_paths
                if candidate_path.scripted_path_identifier == self.simulation_request.scripted_path_identifier
            ),
            None,
        )
        if scripted_path is None:
            raise ScriptedPathUnknownError()
        if self.simulation_request.injected_failures and self.collaborators.narrative_provider.provider_mode_name != "synthetic":
            raise FailureInjectionNeedsSyntheticProviderError()
        if self.collaborators.archive_case_store.read_open_archive_opening() is not None:
            raise SimulationNeedsClosedArchiveError()
        self.voice_identifier = self.simulation_request.voice_identifier or scripted_path_collection.default_voice_identifier
        interaction_count_before = self.collaborators.director_record_store.count_interactions()
        case_start_report = await self.play_case_start(scripted_path)
        if self.archive_case_identifier is not None:
            for step_number, scripted_step in enumerate(scripted_path.steps, start=1):
                if not await self.play_step(step_number, scripted_step):
                    break
        reached_outcome_kind_name = next(
            (
                step_report["archive_outcome_kind_name"]
                for step_report in reversed(self.step_reports)
                if step_report["archive_outcome_kind_name"] is not None
            ),
            None,
        )
        is_archive_closed = (
            self.archive_case_identifier is not None
            and self.collaborators.archive_case_store.read_open_archive_opening() is None
        )
        if reached_outcome_kind_name != scripted_path.expected_archive_outcome_kind_name:
            self.add_failure(None, "ending", "expected_archive_outcome_not_reached")
        if not is_archive_closed:
            self.add_failure(None, "closure", "archive_not_closed")
        did_run_complete = (
            is_archive_closed and reached_outcome_kind_name == scripted_path.expected_archive_outcome_kind_name
        )
        simulation_report = {
            "simulation_run_identifier": self.simulation_run_identifier,
            "scripted_path_identifier": scripted_path.scripted_path_identifier,
            "outcome_name": "completed" if did_run_complete else "failed",
            "narrative_provider_name": self.collaborators.narrative_provider.provider_name,
            "narrative_provider_mode_name": self.collaborators.narrative_provider.provider_mode_name,
            "speech_provider_name": self.collaborators.speech_provider.provider_name,
            "speech_provider_mode_name": self.collaborators.speech_provider.provider_mode_name,
            "voice_identifier": self.voice_identifier,
            "is_speech_enabled": self.simulation_request.is_speech_enabled,
            "case_start": case_start_report,
            "steps": self.step_reports,
            "played_step_count": len(self.step_reports),
            "scripted_step_count": len(scripted_path.steps),
            "state_versions": [
                step_report["state_version_after"]
                for step_report in self.step_reports
                if step_report["state_version_after"] is not None
            ],
            "reached_archive_outcome_kind_name": reached_outcome_kind_name,
            "is_archive_closed": is_archive_closed,
            "recorded_director_interaction_identifiers": self.interaction_identifiers,
            "recorded_interaction_count": (
                self.collaborators.director_record_store.count_interactions() - interaction_count_before
            ),
            "generated_audio_count": self.generated_audio_count,
            "cached_audio_count": self.cached_audio_count,
            "failures": self.failures,
            "started_at_utc": self.started_at_utc,
            "finished_at_utc": read_current_utc_timestamp(),
        }
        self.collaborators.director_record_store.save_simulation_run(
            DirectorSimulationRunRecord(
                simulation_run_identifier=self.simulation_run_identifier,
                scripted_path_identifier=scripted_path.scripted_path_identifier,
                archive_case_identifier=self.archive_case_identifier,
                outcome_name=simulation_report["outcome_name"],
                report=simulation_report,
                started_at_utc=self.started_at_utc,
                finished_at_utc=simulation_report["finished_at_utc"],
            )
        )
        return simulation_report


async def simulate_complete_case(
    collaborators: CaseSimulationCollaborators, profile_identifier: str, simulation_request: CaseSimulationRequest
) -> dict[str, Any]:
    return await CaseSimulation(collaborators, profile_identifier, simulation_request).run()
