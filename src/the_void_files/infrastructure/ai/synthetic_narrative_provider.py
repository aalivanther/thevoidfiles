import json
from pathlib import Path
from typing import Any, Literal, get_args

from the_void_files.application.content_hashing import compute_json_content_hash
from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest, NarrativeGenerationResponse
from the_void_files.application.use_cases.director_failures import (
    NarrativeProviderTimedOutError,
    SyntheticDirectorMaterialMissingError,
)
from the_void_files.narrative.case_generator import (
    FixtureBackedCaseMaterialProvider,
    case_generation_purpose_name,
    synthetic_cases_directory,
    whisper_offer_generation_purpose_name,
)
from the_void_files.narrative.context_builder import (
    control_authority_label_name,
    prepared_result_authority_label_name,
    synthetic_failure_injection_authority_label_name,
)
from the_void_files.narrative.tool_registry import (
    adjudication_purpose_name,
    adjudication_response_schema_name,
    chapter_summary_purpose_name,
    chapter_summary_response_schema_name,
    connection_check_purpose_name,
    connection_check_response_schema_name,
    narration_purpose_name,
    narration_response_schema_name,
    piece_assistance_purpose_name,
    piece_assistance_response_schema_name,
)

SyntheticFailureModeName = Literal["invalid_json", "impossible_effect", "timeout", "stale_state_version"]

known_synthetic_failure_mode_names: tuple[str, ...] = get_args(SyntheticFailureModeName)
synthetic_director_answers_path = synthetic_cases_directory / "director_simulation" / "synthetic_director_answers.json"
case_material_purpose_names = (whisper_offer_generation_purpose_name, case_generation_purpose_name)
director_purpose_names = (
    adjudication_purpose_name,
    narration_purpose_name,
    piece_assistance_purpose_name,
    chapter_summary_purpose_name,
    connection_check_purpose_name,
)
impossible_effect_kind_name = "operational_funds_created"
impossible_effect_quantity = 999999
truncated_response_text = '{"unfinished_answer": ['


def read_block_content(generation_request: NarrativeGenerationRequest, authority_label_name: str) -> dict[str, Any]:
    for context_block in generation_request.context_blocks:
        if context_block.authority_label_name == authority_label_name:
            try:
                block_content = json.loads(context_block.content_text)
            except ValueError:
                return {}
            return block_content if isinstance(block_content, dict) else {}
    return {}


class SyntheticNarrativeProvider:
    provider_name = "synthetic_narrative"
    provider_mode_name = "synthetic"
    model_identifier = "synthetic_director_v1"

    def __init__(
        self,
        fixtures_directory: Path = synthetic_cases_directory,
        director_answers_path: Path = synthetic_director_answers_path,
        planned_failure_mode_names_by_purpose_name: dict[str, list[str]] | None = None,
    ) -> None:
        self.case_material_provider = FixtureBackedCaseMaterialProvider(fixtures_directory)
        self.director_answers_path = director_answers_path
        self.planned_failure_mode_names_by_purpose_name = {
            purpose_name: list(failure_mode_names)
            for purpose_name, failure_mode_names in (planned_failure_mode_names_by_purpose_name or {}).items()
        }

    def read_director_answers(self) -> dict[str, Any]:
        if not self.director_answers_path.is_file():
            raise SyntheticDirectorMaterialMissingError()
        return json.loads(self.director_answers_path.read_text(encoding="utf-8"))

    def take_failure_mode_name(self, generation_request: NarrativeGenerationRequest) -> str | None:
        injected_failure_mode_name = read_block_content(
            generation_request, synthetic_failure_injection_authority_label_name
        ).get("failure_mode_name")
        if injected_failure_mode_name in known_synthetic_failure_mode_names:
            return injected_failure_mode_name
        planned_failure_mode_names = self.planned_failure_mode_names_by_purpose_name.get(generation_request.purpose_name)
        if planned_failure_mode_names:
            return planned_failure_mode_names.pop(0)
        return None

    def build_response(
        self, generation_request: NarrativeGenerationRequest, structured_response: dict[str, Any] | None, response_text: str
    ) -> NarrativeGenerationResponse:
        return NarrativeGenerationResponse(
            provider_name=self.provider_name,
            model_identifier=self.model_identifier,
            response_text=response_text,
            structured_response=structured_response,
            input_token_count=0,
            output_token_count=0,
        )

    def build_adjudication_proposal(
        self, generation_request: NarrativeGenerationRequest, failure_mode_name: str | None
    ) -> dict[str, Any]:
        control_content = read_block_content(generation_request, control_authority_label_name)
        adjudication_answers = self.read_director_answers()["adjudication"]
        state_version = control_content.get("state_version")
        expected_state_version = state_version if isinstance(state_version, int) else 0
        effect_proposals: list[dict[str, Any]] = [
            {
                "effect_kind_name": "world_clock_advanced",
                "target_identifier": None,
                "quantity": adjudication_answers["elapsed_minutes"],
                "unit_name": "minutes",
            }
        ]
        if failure_mode_name == "impossible_effect":
            effect_proposals.append(
                {
                    "effect_kind_name": impossible_effect_kind_name,
                    "target_identifier": None,
                    "quantity": impossible_effect_quantity,
                    "unit_name": "funds",
                }
            )
        if failure_mode_name == "stale_state_version":
            expected_state_version -= 1
        return {
            "action_key": control_content.get("action_key") or "absent_action_key",
            "expected_state_version": expected_state_version,
            "disposition_name": "proposed",
            "interpreted_intent_text": adjudication_answers["interpreted_intent_text"],
            "feasibility_class_name": "plausible",
            "concise_ruling_text": adjudication_answers["concise_ruling_text"],
            "supporting_fact_identifiers": [],
            "effect_proposals": effect_proposals,
            "requested_clarification_text": None,
        }

    def build_director_contract_content(
        self, generation_request: NarrativeGenerationRequest, failure_mode_name: str | None
    ) -> tuple[str, dict[str, Any]]:
        prepared_result = read_block_content(generation_request, prepared_result_authority_label_name)
        if generation_request.purpose_name == adjudication_purpose_name:
            return adjudication_response_schema_name, self.build_adjudication_proposal(
                generation_request, failure_mode_name
            )
        if generation_request.purpose_name == narration_purpose_name:
            return narration_response_schema_name, {
                "marked_paragraphs": list(prepared_result.get("marked_paragraphs") or []),
                "introduced_fact_identifiers": [],
            }
        if generation_request.purpose_name == piece_assistance_purpose_name:
            return piece_assistance_response_schema_name, {
                "interactive_piece_identifier": prepared_result.get("interactive_piece_identifier"),
                "level_name": prepared_result.get("level_name"),
                "public_hint_text": prepared_result.get("public_hint_text"),
            }
        if generation_request.purpose_name == chapter_summary_purpose_name:
            chapter_summary_answers = self.read_director_answers()["chapter_summary"]
            return chapter_summary_response_schema_name, {
                "summary_paragraphs": list(chapter_summary_answers["summary_paragraphs"]),
                "open_thread_texts": list(chapter_summary_answers["open_thread_texts"]),
            }
        if generation_request.purpose_name == connection_check_purpose_name:
            return connection_check_response_schema_name, {"is_director_listening": True}
        raise SyntheticDirectorMaterialMissingError()

    async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
        failure_mode_name = self.take_failure_mode_name(generation_request)
        if failure_mode_name == "timeout":
            raise NarrativeProviderTimedOutError()
        if failure_mode_name == "invalid_json":
            return self.build_response(generation_request, None, truncated_response_text)
        if generation_request.purpose_name in case_material_purpose_names:
            case_material_response = await self.case_material_provider.generate_narrative(generation_request)
            return case_material_response.model_copy(
                update={"provider_name": self.provider_name, "model_identifier": self.model_identifier}
            )
        request_content_hash = compute_json_content_hash(
            generation_request.model_dump(mode="json", exclude={"profile_identifier", "turn_identifier"})
        )
        response_text = f"synthetic:{generation_request.purpose_name}:{request_content_hash[:16]}"
        if generation_request.purpose_name not in director_purpose_names:
            return self.build_response(
                generation_request,
                {"purpose_name": generation_request.purpose_name, "request_content_hash": request_content_hash},
                response_text,
            )
        response_schema_name, contract_content = self.build_director_contract_content(
            generation_request, failure_mode_name
        )
        if failure_mode_name == "impossible_effect" and generation_request.purpose_name != adjudication_purpose_name:
            contract_content["effect_proposals"] = [
                {"effect_kind_name": impossible_effect_kind_name, "quantity": impossible_effect_quantity}
            ]
        return self.build_response(generation_request, {response_schema_name: contract_content}, response_text)

    async def close(self) -> None:
        return None
