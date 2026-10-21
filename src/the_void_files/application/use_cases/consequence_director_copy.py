import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from the_void_files.application.use_cases.case_start_specification_models import (
    BranchCondition,
    ScriptedDirectorEntry,
)
from the_void_files.application.use_cases.consequence_failures import DirectorCopyMissingError
from the_void_files.service_settings import project_root_directory

synthetic_cases_directory = project_root_directory / "content" / "synthetic_cases"
director_copy_file_name = "consequence_director_copy.json"
case_supplement_file_name = "consequence_case_supplement.json"

PlanConditionEvaluationName = Literal[
    "time_remains",
    "person_is_present",
    "any_branch_condition_is_met",
    "investigator_is_wounded",
    "scene_is_not_dangerous",
]


class DirectorCopyModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlanContinuationCopy(DirectorCopyModel):
    first_paragraph_template: str
    executed_clause_for_single_step: str
    executed_clause_for_several_steps_template: str
    skipped_clause_for_single_step: str
    skipped_clause_for_several_steps_template: str
    pending_clause_for_single_step: str
    pending_clause_for_several_steps_template: str
    second_paragraph: str


class AttemptActionTextCopy(DirectorCopyModel):
    combination_dials_template: str
    chosen_symbol_separator: str
    cipher_wheel_single_letter_template: str
    cipher_wheel_several_letters_template: str
    ordered_positions_template: str
    ordered_visible_name_separator: str


class FreeTextPatterns(DirectorCopyModel):
    numeric_run_pattern_source: str
    measured_unit_after_number_pattern_source: str
    strong_separator_pattern_source: str
    leading_connective_pattern_source: str
    trailing_connective_pattern_source: str
    condition_clause_pattern_source: str
    action_without_method_pattern_source: str
    object_never_carried_pattern_source: str
    preparation_pattern_source: str
    mechanism_value_mention_pattern_sources: list[str]
    mechanism_mention_pattern_sources: list[str]
    negating_conjunction_pattern_source: str
    negative_wording_pattern_source: str


class PlanConditionDefinition(DirectorCopyModel):
    kind_name: str
    priority_number: int
    pattern_source: str
    evaluation_name: PlanConditionEvaluationName
    person_identifier: str | None
    satisfying_branch_conditions: list[BranchCondition]
    negation_inverting_pattern_source: str | None
    unmet_reason_text: str
    unmet_reason_when_negated_text: str


class DirectorCopy(DirectorCopyModel):
    copy_format_version: Literal[1]
    method_clarification_paragraphs: list[str] = Field(min_length=1)
    describe_method_answer_text: str
    illogical_action_veto_paragraph_templates: list[str] = Field(min_length=1)
    rethink_action_answer_text: str
    insist_on_action_answer_text: str
    insisted_impossible_action_paragraph_template: str
    insisted_impossible_action_elapsed_minutes: int = Field(ge=0)
    edited_suggestion_notice_text: str
    preparation_paragraph: str
    preparation_elapsed_minutes: int = Field(ge=0)
    condition_was_met_paragraph_template: str
    condition_was_unmet_paragraph_template: str
    unrecognized_condition_paragraph_template: str
    action_out_of_reach_paragraph_template: str
    action_already_done_paragraph_template: str
    action_without_method_inside_plan_paragraph_template: str
    unaffordable_cost_paragraph_template: str
    leftover_steps_paragraph_template: str
    leftover_action_text_quote_template: str
    leftover_action_text_separator: str
    scene_changed_mid_plan_paragraph: str
    plan_continuation: PlanContinuationCopy
    continue_plan_answer_text: str
    modify_plan_answer_text: str
    discard_plan_answer_text: str
    attempt_action_text: AttemptActionTextCopy
    piece_out_of_reach_rule_text: str
    piece_out_of_reach_paragraph: str
    piece_solved_in_prose_paragraph: str
    free_text_patterns: FreeTextPatterns
    plan_conditions: list[PlanConditionDefinition]


class LostVoiceCopy(DirectorCopyModel):
    placeholder_text: str
    anchor_person_text: str
    uprooted_investigator_text: str


class ConditionalClosingEntry(DirectorCopyModel):
    condition: BranchCondition
    entry: ScriptedDirectorEntry


class CaseSupplement(DirectorCopyModel):
    supplement_format_version: Literal[1]
    whisper_identifier: str
    lost_voice: LostVoiceCopy | None
    plan_conditions: list[PlanConditionDefinition]
    alive_ending_closing_entries: list[ConditionalClosingEntry]


def fill_copy_template(template_text: str, **replacement_texts: str) -> str:
    filled_text = template_text
    for placeholder_name, replacement_text in replacement_texts.items():
        filled_text = filled_text.replace("{" + placeholder_name + "}", replacement_text)
    return filled_text


def read_director_copy(fixtures_directory: Path = synthetic_cases_directory) -> DirectorCopy:
    director_copy_path = fixtures_directory / director_copy_file_name
    if not director_copy_path.is_file():
        raise DirectorCopyMissingError()
    try:
        return DirectorCopy.model_validate(json.loads(director_copy_path.read_text(encoding="utf-8")))
    except (ValidationError, ValueError) as unusable_copy_error:
        raise DirectorCopyMissingError() from unusable_copy_error


def read_case_supplement(
    whisper_identifier: str, fixtures_directory: Path = synthetic_cases_directory
) -> CaseSupplement | None:
    case_supplement_path = fixtures_directory / whisper_identifier / case_supplement_file_name
    if not case_supplement_path.is_file():
        return None
    try:
        return CaseSupplement.model_validate(json.loads(case_supplement_path.read_text(encoding="utf-8")))
    except (ValidationError, ValueError) as unusable_supplement_error:
        raise DirectorCopyMissingError() from unusable_supplement_error
