from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from the_void_files.application.use_cases.case_start_specification_models import AssistanceLevelName, ResourceCost

maximum_plan_step_count = 12
maximum_player_text_length = 2000
maximum_submitted_item_count = 64

ActionKeyText = Annotated[str, Field(min_length=1, max_length=200)]
ReferenceIdentifierText = Annotated[str, Field(min_length=1, max_length=200)]


class TurnRequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlannedActionStep(TurnRequestModel):
    step_identifier: ReferenceIdentifierText
    action_text: str = Field(min_length=1, max_length=maximum_player_text_length)
    condition_text: str | None = Field(default=None, max_length=maximum_player_text_length)
    origin_suggested_action_identifier: ReferenceIdentifierText | None = None
    was_text_edited_by_player: bool = False
    declared_resource_cost: ResourceCost | None = None


class InvestigatorActionRequest(TurnRequestModel):
    action_key: ActionKeyText
    expected_state_version: int = Field(ge=1)
    scene_identifier: ReferenceIdentifierText
    remaining_plan_steps: list[PlannedActionStep] = Field(min_length=1, max_length=maximum_plan_step_count)
    declared_plan_step_count: int = Field(ge=0, le=1000)
    already_executed_step_count: int = Field(ge=0, le=1000)
    is_player_insisting_after_director_veto: bool = False
    referenced_interactive_piece_identifier: ReferenceIdentifierText | None = None


class CipherWheelSubmittedValue(TurnRequestModel):
    widget_kind_name: Literal["cipher_wheel"]
    shift_positions: int = Field(ge=-100000, le=100000)


class OrderedPositionsSubmittedValue(TurnRequestModel):
    widget_kind_name: Literal["ordered_positions"]
    ordered_piece_identifiers: list[ReferenceIdentifierText] = Field(max_length=maximum_submitted_item_count)


class CombinationDialsSubmittedValue(TurnRequestModel):
    widget_kind_name: Literal["combination_dials"]
    chosen_symbols: list[Annotated[str, Field(max_length=200)]] = Field(max_length=maximum_submitted_item_count)


InteractivePieceSubmittedValue = Annotated[
    CipherWheelSubmittedValue | OrderedPositionsSubmittedValue | CombinationDialsSubmittedValue,
    Field(discriminator="widget_kind_name"),
]


class InteractivePieceAttemptRequest(TurnRequestModel):
    action_key: ActionKeyText
    expected_state_version: int = Field(ge=1)
    interactive_piece_identifier: ReferenceIdentifierText
    submitted_value: InteractivePieceSubmittedValue


class InteractivePieceAssistanceRequest(TurnRequestModel):
    action_key: ActionKeyText
    expected_state_version: int = Field(ge=1)
    interactive_piece_identifier: ReferenceIdentifierText
    requested_level_name: AssistanceLevelName
    is_scope_limited_to_this_piece_confirmed: Literal[True]
