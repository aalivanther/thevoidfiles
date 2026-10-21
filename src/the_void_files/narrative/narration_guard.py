import json
import re
from pathlib import Path
from typing import Any

from the_void_files.narrative.tool_registry import ContractValidationError, NarrationDraft, review_narration_draft
from the_void_files.service_settings import project_root_directory

narration_guard_terms_path = project_root_directory / "content" / "rules" / "narration_guard_terms.json"
placeholder_mark_pattern = re.compile(r"\{\{([a-z_]{1,64})\}\}")
marked_span_mark_pattern = re.compile(r"\[\[[^\[\]]{1,160}\]\]")
digit_run_pattern = re.compile(r"\d+")
internal_identifier_pattern = re.compile(r"\b[a-z]+(?:_[a-z0-9]+)+\b")
whitespace_run_pattern = re.compile(r"\s+")
minimum_private_text_length = 12
minimum_concealed_name_word_length = 4
maximum_length_growth_factor = 6
length_growth_allowance = 800
maximum_player_facing_narration_paragraph_count = 12
always_allowed_placeholder_names = (
    "nombre",
    "nombre_completo",
    "lugar",
    "hora",
    "fondos",
    "heridas",
    "herida_causa",
    "condicion",
    "esfuerzo",
    "residencia",
    "origen",
)


def read_forbidden_game_term_texts(terms_path: Path = narration_guard_terms_path) -> list[str]:
    if not terms_path.is_file():
        return []
    stored_terms = json.loads(terms_path.read_text(encoding="utf-8")).get("forbidden_game_term_texts")
    return [term_text.lower() for term_text in (stored_terms if isinstance(stored_terms, list) else []) if term_text]


def normalize_compared_text(compared_text: str) -> str:
    return whitespace_run_pattern.sub(" ", compared_text).strip().lower()


def contains_bounded_term(term_text: str, compared_text: str) -> bool:
    if term_text == "":
        return False
    return re.search(rf"(?<!\w){re.escape(term_text)}(?!\w)", compared_text, flags=re.IGNORECASE) is not None


def collect_text_leaves(candidate: Any) -> list[str]:
    if isinstance(candidate, str):
        return [candidate]
    if isinstance(candidate, dict):
        return [text_leaf for nested_value in candidate.values() for text_leaf in collect_text_leaves(nested_value)]
    if isinstance(candidate, list):
        return [text_leaf for nested_value in candidate for text_leaf in collect_text_leaves(nested_value)]
    return []


def read_concealed_name_texts(case_specification: dict[str, Any], known_person_identifiers: list[str]) -> list[str]:
    concealed_name_texts: list[str] = []
    for person in case_specification.get("persons", []):
        if not isinstance(person, dict) or person.get("person_identifier") in known_person_identifiers:
            continue
        name_concealment = person.get("name_concealment")
        if isinstance(name_concealment, dict):
            concealed_name_texts.extend(collect_text_leaves(name_concealment.get("concealed_name_texts")))
        if isinstance(person.get("known_name"), str):
            concealed_name_texts.append(person["known_name"])
            concealed_name_texts.extend(
                name_word
                for name_word in person["known_name"].split()
                if len(name_word) >= minimum_concealed_name_word_length and name_word[:1].isupper()
            )
    return [concealed_name_text for concealed_name_text in concealed_name_texts if concealed_name_text.strip()]


def collect_private_texts(case_specification: dict[str, Any], known_person_identifiers: list[str]) -> list[str]:
    private_texts = collect_text_leaves(case_specification.get("private_truth"))
    for interactive_piece in case_specification.get("interactive_pieces", []):
        if not isinstance(interactive_piece, dict):
            continue
        private_solution = interactive_piece.get("private_solution")
        if isinstance(private_solution, dict):
            for solution_key_name, solution_value in private_solution.items():
                if solution_key_name == "widget_kind_name":
                    continue
                if isinstance(solution_value, list) and solution_value:
                    private_texts.append(json.dumps(solution_value, ensure_ascii=False))
                    private_texts.append(" ".join(str(solution_part) for solution_part in solution_value))
                elif isinstance(solution_value, str):
                    private_texts.append(solution_value)
        private_texts.extend(collect_text_leaves(interactive_piece.get("hidden_notes")))
    return [
        *[private_text for private_text in private_texts if len(private_text.strip()) >= minimum_private_text_length],
        *read_concealed_name_texts(case_specification, known_person_identifiers),
    ]


def review_player_facing_narration(
    narration_draft: NarrationDraft,
    engine_marked_paragraphs: list[str],
    private_texts: list[str],
    forbidden_game_term_texts: list[str],
    concealed_name_texts: list[str] | None = None,
) -> list[ContractValidationError]:
    validation_errors = review_narration_draft(narration_draft)
    drafted_paragraph_count = len(narration_draft.marked_paragraphs)
    engine_paragraph_count = len(engine_marked_paragraphs)
    if drafted_paragraph_count < engine_paragraph_count:
        validation_errors.append(
            ContractValidationError(error_name="narration_paragraph_count_differs", location_text="marked_paragraphs")
        )
        return validation_errors
    if drafted_paragraph_count > max(maximum_player_facing_narration_paragraph_count, engine_paragraph_count):
        validation_errors.append(
            ContractValidationError(error_name="narration_paragraph_count_differs", location_text="marked_paragraphs")
        )
        return validation_errors
    normalized_engine_text = normalize_compared_text(" ".join(engine_marked_paragraphs))
    engine_placeholder_names = set(placeholder_mark_pattern.findall(" ".join(engine_marked_paragraphs)))
    allowed_placeholder_names = engine_placeholder_names | set(always_allowed_placeholder_names)
    normalized_private_texts = [
        normalized_private_text
        for normalized_private_text in (normalize_compared_text(private_text) for private_text in private_texts)
        if normalized_private_text
    ]
    concealed_name_set = {
        normalized_concealed_name
        for normalized_concealed_name in (
            normalize_compared_text(concealed_name_text) for concealed_name_text in (concealed_name_texts or [])
        )
        if normalized_concealed_name
    }

    def private_text_is_concealed_name(normalized_private_text: str) -> bool:
        if concealed_name_texts is None:
            return len(normalized_private_text) < minimum_private_text_length
        return normalized_private_text in concealed_name_set
    for paragraph_position, marked_paragraph in enumerate(narration_draft.marked_paragraphs):
        engine_marked_paragraph = (
            engine_marked_paragraphs[paragraph_position]
            if paragraph_position < engine_paragraph_count
            else engine_marked_paragraphs[-1]
        )
        paragraph_location_text = f"marked_paragraphs.{paragraph_position}"

        def add_error(error_name: str) -> None:
            validation_errors.append(
                ContractValidationError(error_name=error_name, location_text=paragraph_location_text)
            )

        normalized_paragraph = normalize_compared_text(marked_paragraph)
        if paragraph_position < engine_paragraph_count and len(marked_paragraph) > (
            len(engine_marked_paragraph) * maximum_length_growth_factor + length_growth_allowance
        ):
            add_error("narration_paragraph_outgrows_engine_text")
        reveals_private_material = False
        for normalized_private_text in normalized_private_texts:
            if private_text_is_concealed_name(normalized_private_text):
                if contains_bounded_term(normalized_private_text, normalized_engine_text):
                    continue
                if contains_bounded_term(normalized_private_text, normalized_paragraph):
                    reveals_private_material = True
                    break
            elif (
                normalized_private_text not in normalized_engine_text
                and normalized_private_text in normalized_paragraph
            ):
                reveals_private_material = True
                break
        if reveals_private_material:
            add_error("narration_reveals_private_material")
        if any(
            placeholder_name not in allowed_placeholder_names and not placeholder_name.startswith("kit_")
            for placeholder_name in placeholder_mark_pattern.findall(marked_paragraph)
        ):
            add_error("narration_invents_placeholder_mark")
        paragraph_without_marks = marked_span_mark_pattern.sub(" ", placeholder_mark_pattern.sub(" ", marked_paragraph))
        if any(stray_mark_text in paragraph_without_marks for stray_mark_text in ("{{", "}}", "[[", "]]")):
            add_error("narration_mark_is_malformed")
        if paragraph_position < engine_paragraph_count:
            engine_marked_spans = marked_span_mark_pattern.findall(engine_marked_paragraph)
            if any(
                marked_span not in engine_marked_spans
                for marked_span in marked_span_mark_pattern.findall(marked_paragraph)
            ):
                add_error("narration_invents_marked_span")
        adds_numbers = "%" in paragraph_without_marks
        if not adds_numbers:
            from the_void_files.narrative.orchestration.narration_contract import clock_literal_pattern

            draft_without_clocks = clock_literal_pattern.sub(" ", paragraph_without_marks)
            engine_without_clocks = clock_literal_pattern.sub(" ", engine_marked_paragraph)
            adds_numbers = any(
                digit_run not in engine_without_clocks
                for digit_run in digit_run_pattern.findall(draft_without_clocks)
            )
        if adds_numbers:
            add_error("narration_adds_numbers")
        lowered_paragraph_without_marks = paragraph_without_marks.lower()
        if internal_identifier_pattern.search(lowered_paragraph_without_marks) is not None:
            add_error("narration_shows_internal_identifier")
        if any(
            contains_bounded_term(forbidden_term_text, lowered_paragraph_without_marks)
            and not contains_bounded_term(forbidden_term_text, normalized_engine_text)
            for forbidden_term_text in forbidden_game_term_texts
        ):
            add_error("narration_uses_game_terms")
    return validation_errors


def read_name_redaction_pairs(
    case_specification: dict[str, Any], known_person_identifiers: list[str]
) -> list[tuple[str, str]]:
    redaction_pairs: list[tuple[str, str]] = []
    known_person_identifier_set = set(known_person_identifiers)
    for person in case_specification.get("persons", []):
        if not isinstance(person, dict) or person.get("person_identifier") in known_person_identifier_set:
            continue
        known_name = person.get("known_name")
        alias_text = person.get("alias_before_name_is_known")
        if not isinstance(known_name, str) or not isinstance(alias_text, str) or known_name == alias_text:
            continue
        redaction_pairs.append((known_name, alias_text))
        for name_word in known_name.split():
            if (
                len(name_word) >= minimum_concealed_name_word_length
                and name_word[:1].isupper()
                and name_word.casefold() not in alias_text.casefold()
            ):
                redaction_pairs.append((name_word, alias_text))
    redaction_pairs.sort(key=lambda redaction_pair: len(redaction_pair[0]), reverse=True)
    return redaction_pairs


def redact_unearned_true_names(marked_paragraphs: list[str], redaction_pairs: list[tuple[str, str]]) -> list[str]:
    redacted_paragraphs: list[str] = []
    for marked_paragraph in marked_paragraphs:
        redacted_paragraph = marked_paragraph
        for true_name, alias_text in redaction_pairs:
            redacted_paragraph = re.sub(
                rf"(?<!\w){re.escape(true_name)}(?!\w)",
                alias_text,
                redacted_paragraph,
                flags=re.IGNORECASE,
            )
        redacted_paragraphs.append(whitespace_run_pattern.sub(" ", redacted_paragraph).strip())
    return redacted_paragraphs


def salvage_player_facing_narration(
    narration_draft: NarrationDraft,
    engine_marked_paragraphs: list[str],
    private_texts: list[str],
    forbidden_game_term_texts: list[str],
    case_specification: dict[str, Any],
    known_person_identifiers: list[str],
    committed_narration_facts: dict[str, Any] | None = None,
    anchored_status_lies: dict[int, dict[str, str]] | None = None,
) -> list[ContractValidationError]:
    concealed_name_texts = read_concealed_name_texts(case_specification, known_person_identifiers)
    validation_errors = review_player_facing_narration(
        narration_draft,
        engine_marked_paragraphs,
        private_texts,
        forbidden_game_term_texts,
        concealed_name_texts,
    )
    if not validation_errors:
        return review_committed_narration_or_accept(
            narration_draft, committed_narration_facts, anchored_status_lies
        )
    salvageable_error_names = {
        "narration_reveals_private_material",
        "narration_shows_internal_identifier",
        "narration_mark_is_malformed",
    }
    if any(validation_error.error_name not in salvageable_error_names for validation_error in validation_errors):
        return validation_errors
    drafted_text = normalize_compared_text(" ".join(narration_draft.marked_paragraphs))
    private_truth_texts = [
        normalize_compared_text(private_truth_text)
        for private_truth_text in collect_text_leaves(case_specification.get("private_truth"))
        if len(private_truth_text.strip()) >= minimum_private_text_length
    ]
    if any(private_truth_text and private_truth_text in drafted_text for private_truth_text in private_truth_texts):
        return validation_errors
    redacted_paragraphs = [
        internal_identifier_pattern.sub("", redacted_paragraph).replace("{{", "").replace("}}", "").replace("[[", "").replace("]]", "")
        for redacted_paragraph in redact_unearned_true_names(
            narration_draft.marked_paragraphs,
            read_name_redaction_pairs(case_specification, known_person_identifiers),
        )
    ]
    redacted_paragraphs = [whitespace_run_pattern.sub(" ", redacted_paragraph).strip() for redacted_paragraph in redacted_paragraphs]
    if any(redacted_paragraph == "" for redacted_paragraph in redacted_paragraphs):
        return validation_errors
    narration_draft.marked_paragraphs = redacted_paragraphs
    validation_errors = review_player_facing_narration(
        narration_draft,
        engine_marked_paragraphs,
        private_texts,
        forbidden_game_term_texts,
        concealed_name_texts,
    )
    if validation_errors:
        return validation_errors
    return review_committed_narration_or_accept(narration_draft, committed_narration_facts, anchored_status_lies)


def review_committed_narration_or_accept(
    narration_draft: NarrationDraft,
    committed_narration_facts: dict[str, Any] | None,
    anchored_status_lies: dict[int, dict[str, str]] | None = None,
) -> list[ContractValidationError]:
    if committed_narration_facts is None:
        return []
    from the_void_files.narrative.orchestration.narration_contract import (
        repair_narration_to_committed_facts,
        review_narration_against_committed_facts,
    )

    contract_errors = review_narration_against_committed_facts(
        narration_draft.marked_paragraphs, committed_narration_facts, anchored_status_lies
    )
    if not contract_errors:
        return []
    narration_draft.marked_paragraphs = repair_narration_to_committed_facts(
        narration_draft.marked_paragraphs, committed_narration_facts, anchored_status_lies
    )
    return review_narration_against_committed_facts(
        narration_draft.marked_paragraphs, committed_narration_facts, anchored_status_lies
    )
