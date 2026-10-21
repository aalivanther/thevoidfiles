import re
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError

from the_void_files.application.content_hashing import compute_json_content_hash
from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.use_cases.case_start_specification_models import CaseSpecification
from the_void_files.application.use_cases.consequence_case_state import CaseResolutionContext
from the_void_files.application.use_cases.consequence_confirmed_turn_store import (
    ConfirmedTurnStore,
    ConfirmedTurnToPersist,
    OpenCaseResolutionMaterial,
)
from the_void_files.application.use_cases.consequence_director_copy import read_case_supplement, read_director_copy
from the_void_files.application.use_cases.consequence_failures import (
    ActionKeyMalformedError,
    ActionKeyReusedForOtherRequestError,
    ArchiveNotOpenError,
    ArchiveRunNotActiveError,
    StateVersionConflictError,
    StoredCaseSpecificationUnusableError,
)
from the_void_files.application.use_cases.consequence_turn_requests import (
    InteractivePieceAssistanceRequest,
    InteractivePieceAttemptRequest,
    InvestigatorActionRequest,
)
from the_void_files.application.use_cases.consequence_turn_resolution import (
    ResolvedTurn,
    resolve_interactive_piece_assistance,
    resolve_interactive_piece_attempt,
    resolve_investigator_action,
)

action_key_pattern = re.compile(r"^[A-Za-z0-9_-]{8,128}$")
investigator_action_turn_kind_name = "investigator_action"
interactive_piece_attempt_turn_kind_name = "interactive_piece_attempt"
interactive_piece_assistance_turn_kind_name = "interactive_piece_assistance"

TurnResolver = Callable[[dict[str, Any], CaseResolutionContext, str, int], ResolvedTurn]


def require_well_formed_action_key(action_key: str) -> str:
    if action_key_pattern.fullmatch(action_key) is None:
        raise ActionKeyMalformedError()
    return action_key


def build_case_resolution_context(open_case_material: OpenCaseResolutionMaterial) -> CaseResolutionContext:
    try:
        case_specification = CaseSpecification.model_validate(open_case_material.specification)
    except ValidationError as unusable_specification_error:
        raise StoredCaseSpecificationUnusableError() from unusable_specification_error
    return CaseResolutionContext(
        case_specification=case_specification,
        director_copy=read_director_copy(),
        case_supplement=read_case_supplement(case_specification.whisper_identifier),
        archive_number=open_case_material.archive_number,
        has_relational_anchor_person=open_case_material.has_relational_anchor_person,
        placeholder_texts=open_case_material.placeholder_texts,
    )


@dataclass(frozen=True)
class PreparedTurn:
    action_key: str
    turn_kind_name: str
    request_record: dict[str, Any]
    request_content_hash: str
    open_case_material: OpenCaseResolutionMaterial
    archive_run_identifier: str
    state_version: int
    current_run: dict[str, Any]
    resolution_context: CaseResolutionContext


def prepare_turn(
    confirmed_turn_store: ConfirmedTurnStore,
    turn_kind_name: str,
    turn_request: BaseModel,
    action_key: str,
    expected_state_version: int,
) -> PreparedTurn | dict[str, Any]:
    require_well_formed_action_key(action_key)
    request_record = turn_request.model_dump(mode="json")
    request_content_hash = compute_json_content_hash({"turn_kind_name": turn_kind_name, "request": request_record})
    already_stored_turn = confirmed_turn_store.read_stored_turn_by_action_key(action_key)
    if already_stored_turn is not None:
        if already_stored_turn.request_content_hash != request_content_hash:
            raise ActionKeyReusedForOtherRequestError()
        return already_stored_turn.response_payload
    open_case_material = confirmed_turn_store.read_open_case_resolution_material()
    if open_case_material is None:
        raise ArchiveNotOpenError()
    if (
        open_case_material.archive_run_identifier is None
        or open_case_material.current_run is None
        or open_case_material.state_version is None
    ):
        raise ArchiveRunNotActiveError()
    if expected_state_version != open_case_material.state_version:
        raise StateVersionConflictError()
    return PreparedTurn(
        action_key=action_key,
        turn_kind_name=turn_kind_name,
        request_record=request_record,
        request_content_hash=request_content_hash,
        open_case_material=open_case_material,
        archive_run_identifier=open_case_material.archive_run_identifier,
        state_version=open_case_material.state_version,
        current_run=open_case_material.current_run,
        resolution_context=build_case_resolution_context(open_case_material),
    )


def resolve_prepared_turn(prepared_turn: PreparedTurn, resolve_turn: TurnResolver) -> ResolvedTurn:
    return resolve_turn(
        prepared_turn.current_run,
        prepared_turn.resolution_context,
        f"turn_{uuid.uuid4().hex}",
        prepared_turn.state_version,
    )


def persist_resolved_turn(
    confirmed_turn_store: ConfirmedTurnStore, prepared_turn: PreparedTurn, resolved_turn: ResolvedTurn
) -> dict[str, Any]:
    stored_turn = confirmed_turn_store.persist_confirmed_turn(
        ConfirmedTurnToPersist(
            turn_identifier=resolved_turn.turn_identifier,
            action_key=prepared_turn.action_key,
            archive_case_identifier=prepared_turn.open_case_material.archive_case_identifier,
            archive_run_identifier=prepared_turn.archive_run_identifier,
            turn_kind_name=prepared_turn.turn_kind_name,
            disposition_name=resolved_turn.disposition_name,
            state_version_before=prepared_turn.state_version,
            state_version_after=(
                prepared_turn.state_version + 1
                if resolved_turn.disposition_name == "resolved"
                else prepared_turn.state_version
            ),
            request_content_hash=prepared_turn.request_content_hash,
            request_record=prepared_turn.request_record,
            response_payload=resolved_turn.response_payload,
            confirmed_effects=resolved_turn.confirmed_effects,
            relationship_changes=resolved_turn.relationship_changes,
            log_entries=resolved_turn.log_entries,
            scene_identifier=prepared_turn.current_run["public_state"]["current_scene_presentation"][
                "scene_identifier"
            ],
            next_run=resolved_turn.next_run,
            does_turn_close_archive=resolved_turn.archive_outcome is not None,
            confirmed_at_utc=read_current_utc_timestamp(),
        )
    )
    return stored_turn.response_payload


def confirm_turn(
    confirmed_turn_store: ConfirmedTurnStore,
    turn_kind_name: str,
    turn_request: BaseModel,
    action_key: str,
    expected_state_version: int,
    resolve_turn: TurnResolver,
) -> dict[str, Any]:
    prepared_turn = prepare_turn(confirmed_turn_store, turn_kind_name, turn_request, action_key, expected_state_version)
    if not isinstance(prepared_turn, PreparedTurn):
        return prepared_turn
    return persist_resolved_turn(
        confirmed_turn_store, prepared_turn, resolve_prepared_turn(prepared_turn, resolve_turn)
    )


def build_turn_resolver(turn_request: BaseModel) -> tuple[str, TurnResolver]:
    if isinstance(turn_request, InvestigatorActionRequest):
        return (
            investigator_action_turn_kind_name,
            lambda current_run, resolution_context, turn_identifier, state_version: resolve_investigator_action(
                turn_request, current_run, resolution_context, turn_identifier
            ),
        )
    if isinstance(turn_request, InteractivePieceAttemptRequest):
        return (
            interactive_piece_attempt_turn_kind_name,
            lambda current_run, resolution_context, turn_identifier, state_version: resolve_interactive_piece_attempt(
                turn_request, current_run, resolution_context, turn_identifier
            ),
        )
    if isinstance(turn_request, InteractivePieceAssistanceRequest):
        return (
            interactive_piece_assistance_turn_kind_name,
            lambda current_run, resolution_context, turn_identifier, state_version: (
                resolve_interactive_piece_assistance(
                    turn_request, current_run, resolution_context, turn_identifier, state_version
                )
            ),
        )
    raise TypeError(type(turn_request).__name__)


def confirm_investigator_action(
    confirmed_turn_store: ConfirmedTurnStore, action_request: InvestigatorActionRequest
) -> dict[str, Any]:
    return confirm_turn(
        confirmed_turn_store,
        investigator_action_turn_kind_name,
        action_request,
        action_request.action_key,
        action_request.expected_state_version,
        lambda current_run, resolution_context, turn_identifier, state_version: resolve_investigator_action(
            action_request, current_run, resolution_context, turn_identifier
        ),
    )


def confirm_interactive_piece_attempt(
    confirmed_turn_store: ConfirmedTurnStore, attempt_request: InteractivePieceAttemptRequest
) -> dict[str, Any]:
    return confirm_turn(
        confirmed_turn_store,
        interactive_piece_attempt_turn_kind_name,
        attempt_request,
        attempt_request.action_key,
        attempt_request.expected_state_version,
        lambda current_run, resolution_context, turn_identifier, state_version: resolve_interactive_piece_attempt(
            attempt_request, current_run, resolution_context, turn_identifier
        ),
    )


def confirm_interactive_piece_assistance(
    confirmed_turn_store: ConfirmedTurnStore, assistance_request: InteractivePieceAssistanceRequest
) -> dict[str, Any]:
    return confirm_turn(
        confirmed_turn_store,
        interactive_piece_assistance_turn_kind_name,
        assistance_request,
        assistance_request.action_key,
        assistance_request.expected_state_version,
        lambda current_run, resolution_context, turn_identifier, state_version: resolve_interactive_piece_assistance(
            assistance_request, current_run, resolution_context, turn_identifier, state_version
        ),
    )
