import json
from pathlib import Path
from typing import Any

from the_void_files.application.content_hashing import compute_bytes_content_hash
from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest, NarrativeGenerationResponse
from the_void_files.application.use_cases.case_start_failures import SyntheticCaseMaterialMissingError
from the_void_files.application.use_cases.case_start_specification_models import CaseSpecification
from the_void_files.narrative.context_builder import (
    build_json_block,
    control_authority_label_name,
    global_invariant_texts,
    output_contract_authority_label_name,
    rejected_proposal_review_authority_label_name,
    relevant_rules_authority_label_name,
)
from the_void_files.service_settings import project_root_directory

whisper_offer_generation_purpose_name = "whisper_offer_generation"
case_generation_purpose_name = "case_generation"
whisper_offer_response_schema_name = "whisper_offer"
case_specification_response_schema_name = "case_specification"
chosen_whisper_authority_label_name = "chosen_whisper"
stub_synthetic_provider_name = "synthetic_narrative"

rulebook_path = project_root_directory / "content" / "rules" / "THE_VOID_FILES_REGLAMENTO_MAESTRO.md"
director_core_path = project_root_directory / "content" / "rules" / "01_NUCLEO_DIRECTOR.md"
case_archetypes_directory = project_root_directory / "content" / "case_archetypes"
synthetic_cases_directory = project_root_directory / "content" / "synthetic_cases"
synthetic_whisper_offers_file_name = "whisper_offers.json"
synthetic_case_specification_file_name = "case_specification.json"
canonical_belonging_identifiers = ("signal_flare", "hand_lantern", "sealed_evidence_bag")
single_playable_whisper_count = 1
identifier_pattern_text = r"^[a-z0-9][a-z0-9_]{0,95}$"
case_specification_authorship_checklist = [
    "Invent one complete local-threat Archive for this Whisper: scenes, persons, belongings, optional interactive pieces, and the threat's capabilities.",
    "Every scene either changes place with elapsed_minutes of at least 1, or reaches an ending. A piece attempt also costs at least 1 minute.",
    "The engine persists clocks, inventory, flags, people and endings; write the world, do not outline a campaign.",
    "Every identifier matches ^[a-z0-9][a-z0-9_]{0,95}$ and every referenced identifier is defined in this specification.",
    "signal_flare, hand_lantern and sealed_evidence_bag remain valid; case-specific belongings are allowed if defined in belongings.",
    "Player-visible prose is neutral Latin American Spanish, third person; never expand OICNAU.",
]

whisper_offer_instruction_text = (
    "Use investigator_profile to situate the rumors near the known residence, respecting the origin and relational anchor. "
    "If any profile field is unknown, do not invent it. "
    "Propose four Whisper cards for the board. Every card has is_case_material_available true: the investigator may open "
    "any of the four. At most one card may be is_encoded true as a visual cipher; encoded cards are still openable. "
    "Every whisper identifier matches ^[a-z0-9][a-z0-9_]{0,95}$. Answer with structured data only, following the output "
    "contract. Every player-visible text is written in neutral Latin American Spanish, in third person, and the acronym "
    "OICNAU is never expanded."
)
case_generation_instruction_text = (
    "Author the complete case specification for the chosen Whisper. Invent freely within the output contract. "
    "Use interactive pieces only when the investigation needs them; an empty interactive_pieces list is valid. "
    "When a piece is included, present it from a scene and give it a solved outcome. "
    "Ground the arrival and locations in investigator_profile.residence_place when known. "
    "Write the threat's capabilities as concrete actions, not as dice or percentages. "
    "When a wound, a condition, a mental attack or an anomaly is that threat acting, set threat_capability_text "
    "to the exact capability_texts entry that fired. When an ending defeats the threat, set threat_was_defeated true. "
    "Leave both empty when the beat is not the threat. "
    "The opening scene has 5 to 12 action branches. At least one outcome gains a condition with an exit. "
    "At least one later branch stays hidden until a flag some outcome grants. "
    "Every free-text fallback is a short scene: one narration paragraph of at least 40 characters and at least 1 minute, "
    "and it does not end the archive. "
    "Every change of scene sets elapsed_minutes to at least 1. Every scene either leaves that way or reaches an ending. "
    "Every piece attempt costs at least 1 minute. "
    "Every case includes at least one entropy signal, a phenomenon-clock paragraph the engine reveals later. "
    "An entropy version stays when it is a non-boolean integer of at least 2 and not already used; "
    "any other version moves to the next free version, skipping a taken one by the same seeded 4-to-8 gap, "
    "and if none qualify every signal is still spread from 2. "
    "An illegal piece order and an out-of-range cipher shift are still replaced by a calculated pattern, "
    "but a private solution already marked combination_dials is not rewritten. "
    "The engine will persist and normalize clocks, inventory, people and endings. Answer with structured data only."
)
case_repair_instruction_text = (
    "The previous case specification was rejected by the case reviewer. Return the complete corrected specification, "
    "repairing every listed validation error. Keep the people, scenes, pieces and belongings already invented. "
    "If an identifier failed the pattern, rewrite it to match ^[a-z0-9][a-z0-9_]{0,95}$."
)


def read_rules_version() -> str:
    return f"rulebook_sha256_{compute_bytes_content_hash(rulebook_path.read_bytes())[:16]}"


def read_director_core_rules_text() -> str:
    return director_core_path.read_text(encoding="utf-8")


def read_case_archetype_catalog() -> list[dict[str, str]]:
    archetype_catalog: list[dict[str, str]] = []
    for archetype_path in sorted(case_archetypes_directory.glob("*.md")):
        experience_text = ""
        for line_text in archetype_path.read_text(encoding="utf-8").splitlines():
            if line_text.startswith("**Experiencia:**"):
                experience_text = line_text.split("**Experiencia:**", 1)[1].strip()
                break
        archetype_catalog.append({"identifier": archetype_path.stem, "experience_text": experience_text})
    return archetype_catalog


def build_case_material_rules_block():
    return build_json_block(
        relevant_rules_authority_label_name,
        {
            "global_invariants": global_invariant_texts,
            "director_core_text": read_director_core_rules_text(),
            "case_archetype_catalog": read_case_archetype_catalog(),
            "complete_case_count": 1,
            "offered_whisper_count": 4,
            "playable_whisper_count": 4,
            "must_be_playable": True,
            "threat_scale_name": "local",
            "canonical_belonging_identifiers": list(canonical_belonging_identifiers),
            "must_include_surviving_ending": True,
            "campaign_loop_is_forbidden": True,
            "identifier_pattern": identifier_pattern_text,
            "authorship_checklist": case_specification_authorship_checklist,
        },
    )


def build_whisper_offer_generation_request(profile_identifier: str, rules_version: str, investigator_context: dict[str, Any] | None = None) -> NarrativeGenerationRequest:
    return NarrativeGenerationRequest(
        profile_identifier=profile_identifier,
        purpose_name=whisper_offer_generation_purpose_name,
        instruction_text=whisper_offer_instruction_text,
        context_blocks=[
            build_json_block(control_authority_label_name, {"rules_version": rules_version}),
            build_case_material_rules_block(),
            build_json_block("investigator_profile", investigator_context or {}),
            build_json_block(
                output_contract_authority_label_name,
                {
                    "structured_response_key_name": whisper_offer_response_schema_name,
                    "offered_whisper_count": 4,
                    "playable_whisper_count": 4,
                    "is_case_material_available": True,
                },
            ),
        ],
        response_schema_name=whisper_offer_response_schema_name,
    )


def build_case_generation_request(
    profile_identifier: str,
    opening_key: str,
    rules_version: str,
    chosen_whisper_card: dict[str, Any],
    repair_attempt_number: int,
    previous_validation_errors: list[dict[str, str]],
    investigator_context: dict[str, Any] | None = None,
) -> NarrativeGenerationRequest:
    context_blocks = [
        build_json_block(
            control_authority_label_name,
            {
                "opening_key": opening_key,
                "rules_version": rules_version,
                "repair_attempt_number": repair_attempt_number,
            },
        ),
        build_json_block(chosen_whisper_authority_label_name, chosen_whisper_card),
        build_json_block("investigator_profile", investigator_context or {}),
        build_case_material_rules_block(),
        build_json_block(
            output_contract_authority_label_name,
            {
                "structured_response_key_name": case_specification_response_schema_name,
                "minimum_interactive_piece_count": 0,
                "minimum_threat_capability_count": 1,
                "minimum_travel_minutes": 1,
                "minimum_piece_attempt_minutes": 1,
                "minimum_opening_action_branch_count": 5,
                "maximum_opening_action_branch_count": 12,
            },
        ),
    ]
    if repair_attempt_number > 0:
        context_blocks.append(build_json_block(rejected_proposal_review_authority_label_name, previous_validation_errors))
    return NarrativeGenerationRequest(
        profile_identifier=profile_identifier,
        purpose_name=case_generation_purpose_name,
        instruction_text=(
            case_generation_instruction_text
            if repair_attempt_number == 0
            else f"{case_generation_instruction_text} {case_repair_instruction_text}"
        ),
        context_blocks=context_blocks,
        response_schema_name=case_specification_response_schema_name,
        response_json_schema=CaseSpecification.model_json_schema(),
    )


def read_context_block_content(generation_request: NarrativeGenerationRequest, authority_label_name: str) -> Any:
    for context_block in generation_request.context_blocks:
        if context_block.authority_label_name == authority_label_name:
            return json.loads(context_block.content_text)
    return None


class FixtureBackedCaseMaterialProvider:
    provider_name = "synthetic_case_material"
    provider_mode_name = "synthetic"
    model_identifier = "synthetic_case_material_v1"

    def __init__(self, fixtures_directory: Path = synthetic_cases_directory) -> None:
        self.fixtures_directory = fixtures_directory

    def read_fixture(self, fixture_path: Path) -> dict[str, Any]:
        if not fixture_path.is_file():
            raise SyntheticCaseMaterialMissingError()
        return json.loads(fixture_path.read_text(encoding="utf-8"))

    async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
        if generation_request.purpose_name == whisper_offer_generation_purpose_name:
            structured_response = {
                whisper_offer_response_schema_name: self.read_fixture(
                    self.fixtures_directory / synthetic_whisper_offers_file_name
                )
            }
        elif generation_request.purpose_name == case_generation_purpose_name:
            chosen_whisper_card = read_context_block_content(generation_request, chosen_whisper_authority_label_name)
            chosen_whisper_identifier = (
                chosen_whisper_card.get("identifier") if isinstance(chosen_whisper_card, dict) else None
            )
            if not isinstance(chosen_whisper_identifier, str) or not chosen_whisper_identifier.isidentifier():
                raise SyntheticCaseMaterialMissingError()
            structured_response = {
                case_specification_response_schema_name: self.read_fixture(
                    self.fixtures_directory / chosen_whisper_identifier / synthetic_case_specification_file_name
                )
            }
        else:
            raise SyntheticCaseMaterialMissingError()
        return NarrativeGenerationResponse(
            provider_name=self.provider_name,
            model_identifier=self.model_identifier,
            response_text=f"synthetic_fixture:{generation_request.purpose_name}",
            structured_response=structured_response,
            input_token_count=0,
            output_token_count=0,
        )

    async def close(self) -> None:
        return None
