import re
import unicodedata
from dataclasses import dataclass

from the_void_files.application.use_cases.consequence_director_copy import FreeTextPatterns, PlanConditionDefinition

maximum_quoted_player_text_length = 120
quoted_player_text_ellipsis = "…"
letter_pattern = re.compile(r"[a-zñ]")
suggestion_number_pattern = re.compile(r"\d{1,2}", re.ASCII)
digit_pattern = re.compile(r"\d", re.ASCII)
slice_edge_pattern = re.compile(r"[\s,:]")
removed_player_character_pattern = re.compile(r"[\[\]{}]")
whitespace_run_pattern = re.compile(r"\s+")


@dataclass(frozen=True)
class TextSlice:
    start_index: int
    end_index: int


@dataclass
class FreePlanSegment:
    kind_name: str
    suggestion_number: int | None
    action_text: str | None
    condition_text: str | None


@dataclass(frozen=True)
class ParsedChunk:
    kind_name: str
    action_slice: TextSlice | None
    condition_slice: TextSlice | None


@dataclass(frozen=True)
class ClassifiedPlanCondition:
    condition_definition: PlanConditionDefinition | None
    is_negated: bool


def compile_folded_text_pattern(pattern_source: str) -> re.Pattern[str] | None:
    try:
        return re.compile(pattern_source, re.IGNORECASE | re.ASCII)
    except re.error:
        return None


def fold_character(character: str) -> str:
    folded_character = "".join(
        decomposed_character
        for decomposed_character in unicodedata.normalize("NFD", character)
        if not unicodedata.combining(decomposed_character)
    ).lower()
    if len(folded_character) == 1:
        return folded_character
    lowered_character = character.lower()
    return lowered_character[0] if lowered_character else " "


def fold_spanish_text(original_text: str) -> str:
    return "".join(fold_character(character) for character in original_text)


def does_free_text_match_any_pattern(free_text: str, pattern_sources: list[str]) -> bool:
    folded_text = fold_spanish_text(free_text)
    for pattern_source in pattern_sources:
        compiled_pattern = compile_folded_text_pattern(pattern_source)
        if compiled_pattern is not None and compiled_pattern.search(folded_text) is not None:
            return True
    return False


_diphthong_stem_replacements = {
    "cont": "(?:cont|(?<![a-z])cuent)",
    "volv": "(?:volv|(?<![a-z])vuelv)",
    "prob": "(?:prob|(?<![a-z])prueb)",
    "deduc": "(?:deduc|(?<![a-z])deduzc)",
    "forz": "(?:forz|(?<![a-z])fuerz)",
}
_letter_token_pattern = re.compile(r"[A-Za-z]+")
_governing_negation_pattern = re.compile(r"(?<![a-z])(?:no|sin)(?![a-z])")


def _expand_diphthong_stems(pattern_source: str) -> str:
    def replace_stem(token_match: re.Match[str]) -> str:
        replacement = _diphthong_stem_replacements.get(token_match.group(0).lower())
        return token_match.group(0) if replacement is None else replacement

    return _letter_token_pattern.sub(replace_stem, pattern_source)


def _compile_expanded_intent_pattern(pattern_source: str) -> re.Pattern[str] | None:
    expanded_source = _expand_diphthong_stems(pattern_source)
    compiled_pattern = compile_folded_text_pattern(expanded_source)
    if compiled_pattern is not None or expanded_source == pattern_source:
        return compiled_pattern
    return compile_folded_text_pattern(pattern_source)


def _pattern_source_contains_letter_token(pattern_source: str, token_text: str) -> bool:
    lowered_token = token_text.lower()
    return any(
        token_match.group(0).lower() == lowered_token for token_match in _letter_token_pattern.finditer(pattern_source)
    )


def _is_intent_match_governed(folded_text: str, match_start: int, match_end: int, pattern_source: str) -> bool:
    for negation_match in _governing_negation_pattern.finditer(folded_text):
        negation_start = negation_match.start()
        negation_end = negation_match.end()
        is_inside_span = match_start <= negation_start and negation_end <= match_end
        is_immediately_before = folded_text[negation_end:match_start].isspace()
        if not is_inside_span and not is_immediately_before:
            continue
        if not _pattern_source_contains_letter_token(pattern_source, negation_match.group(0)):
            return True
    return False


def _expanded_pattern_has_ungoverned_match(folded_text: str, pattern_source: str) -> bool:
    compiled_pattern = _compile_expanded_intent_pattern(pattern_source)
    if compiled_pattern is None:
        return False
    return any(
        not _is_intent_match_governed(folded_text, intent_match.start(), intent_match.end(), pattern_source)
        for intent_match in compiled_pattern.finditer(folded_text)
    )


def find_best_matching_intent(free_text: str, intent_candidates: list[tuple[str, list[str]]]) -> str | None:
    folded_text = fold_spanish_text(free_text)
    best_candidate_identifier: str | None = None
    best_matched_pattern_count = 0
    for candidate_identifier, pattern_sources in intent_candidates:
        matched_pattern_count = 0
        for pattern_source in pattern_sources:
            if _expanded_pattern_has_ungoverned_match(folded_text, pattern_source):
                matched_pattern_count += 1
        if matched_pattern_count > best_matched_pattern_count:
            best_matched_pattern_count = matched_pattern_count
            best_candidate_identifier = candidate_identifier
    return best_candidate_identifier


def sanitize_quoted_player_text(player_text: str) -> str:
    cleaned_text = whitespace_run_pattern.sub(" ", removed_player_character_pattern.sub("", player_text)).strip()
    if len(cleaned_text) > maximum_quoted_player_text_length:
        kept_text = cleaned_text[: maximum_quoted_player_text_length - 3].rstrip()
        return f"{kept_text}{quoted_player_text_ellipsis}"
    return cleaned_text


class FreeTextReader:
    def __init__(self, free_text_patterns: FreeTextPatterns, plan_condition_definitions: list[PlanConditionDefinition]):
        self.free_text_patterns = free_text_patterns
        self.plan_condition_definitions = sorted(
            plan_condition_definitions, key=lambda condition_definition: condition_definition.priority_number
        )
        self.numeric_run_pattern = re.compile(free_text_patterns.numeric_run_pattern_source, re.ASCII)
        self.measured_unit_after_number_pattern = re.compile(
            free_text_patterns.measured_unit_after_number_pattern_source, re.ASCII
        )
        self.strong_separator_pattern = re.compile(free_text_patterns.strong_separator_pattern_source, re.ASCII)
        self.leading_connective_pattern = re.compile(free_text_patterns.leading_connective_pattern_source, re.ASCII)
        self.trailing_connective_pattern = re.compile(free_text_patterns.trailing_connective_pattern_source, re.ASCII)
        self.condition_clause_pattern = re.compile(free_text_patterns.condition_clause_pattern_source, re.ASCII)
        self.action_without_method_pattern = re.compile(
            free_text_patterns.action_without_method_pattern_source, re.ASCII
        )
        self.object_never_carried_pattern = re.compile(free_text_patterns.object_never_carried_pattern_source, re.ASCII)
        self.preparation_pattern = re.compile(free_text_patterns.preparation_pattern_source, re.ASCII)
        self.negating_conjunction_pattern = re.compile(free_text_patterns.negating_conjunction_pattern_source, re.ASCII)
        self.negative_wording_pattern = re.compile(free_text_patterns.negative_wording_pattern_source, re.ASCII)

    def is_action_text_without_method(self, action_text: str) -> bool:
        return self.action_without_method_pattern.search(fold_spanish_text(action_text)) is not None

    def find_mention_of_object_never_carried(self, action_text: str) -> str | None:
        object_match = self.object_never_carried_pattern.search(fold_spanish_text(action_text))
        return object_match.group(1) if object_match is not None else None

    def is_preparation_text(self, action_text: str) -> bool:
        return self.preparation_pattern.search(fold_spanish_text(action_text)) is not None

    def does_text_carry_mechanism_value(self, action_text: str) -> bool:
        return does_free_text_match_any_pattern(
            action_text, self.free_text_patterns.mechanism_value_mention_pattern_sources
        )

    def does_text_mention_mechanism(self, action_text: str) -> bool:
        return does_free_text_match_any_pattern(action_text, self.free_text_patterns.mechanism_mention_pattern_sources)

    def classify_plan_condition(self, condition_text: str) -> ClassifiedPlanCondition:
        folded_condition = fold_spanish_text(condition_text)
        is_negated = (self.negating_conjunction_pattern.search(folded_condition) is not None) != (
            self.negative_wording_pattern.search(folded_condition) is not None
        )
        for condition_definition in self.plan_condition_definitions:
            compiled_pattern = compile_folded_text_pattern(condition_definition.pattern_source)
            if compiled_pattern is None or compiled_pattern.search(folded_condition) is None:
                continue
            inverting_pattern = (
                compile_folded_text_pattern(condition_definition.negation_inverting_pattern_source)
                if condition_definition.negation_inverting_pattern_source is not None
                else None
            )
            if inverting_pattern is not None and inverting_pattern.search(folded_condition) is not None:
                return ClassifiedPlanCondition(condition_definition, not is_negated)
            return ClassifiedPlanCondition(condition_definition, is_negated)
        return ClassifiedPlanCondition(None, False)

    def find_valid_numeric_runs(
        self, folded_text: str, available_suggestion_count: int
    ) -> list[tuple[TextSlice, list[int]]]:
        numeric_runs: list[tuple[TextSlice, list[int]]] = []
        for run_match in self.numeric_run_pattern.finditer(folded_text):
            start_index = run_match.start()
            end_index = run_match.end()
            character_before = folded_text[start_index - 1] if start_index >= 1 else ""
            character_two_before = folded_text[start_index - 2] if start_index >= 2 else ""
            character_after = folded_text[end_index] if end_index < len(folded_text) else ""
            suggestion_numbers = [
                int(number_text) for number_text in suggestion_number_pattern.findall(run_match.group(0))
            ]
            are_all_numbers_available = all(
                1 <= suggestion_number <= available_suggestion_count for suggestion_number in suggestion_numbers
            )
            if (
                not are_all_numbers_available
                or character_before == ":"
                or character_after == ":"
                or (character_before == "." and digit_pattern.search(character_two_before) is not None)
                or self.measured_unit_after_number_pattern.search(folded_text[end_index:]) is not None
            ):
                continue
            numeric_runs.append((TextSlice(start_index, end_index), suggestion_numbers))
        return numeric_runs

    def trim_slice(self, folded_text: str, text_slice: TextSlice) -> TextSlice:
        start_index = text_slice.start_index
        end_index = text_slice.end_index
        leading_match = self.leading_connective_pattern.search(folded_text[start_index:end_index])
        if leading_match is not None:
            start_index += len(leading_match.group(0))
        trailing_match = self.trailing_connective_pattern.search(folded_text[start_index:end_index])
        if trailing_match is not None:
            end_index -= len(trailing_match.group(0))
        while start_index < end_index and slice_edge_pattern.match(folded_text[start_index]) is not None:
            start_index += 1
        while end_index > start_index and slice_edge_pattern.match(folded_text[end_index - 1]) is not None:
            end_index -= 1
        return TextSlice(start_index, end_index)

    def split_slice_on_strong_separators(self, folded_text: str, text_slice: TextSlice) -> list[TextSlice]:
        slice_text = folded_text[text_slice.start_index : text_slice.end_index]
        resulting_slices: list[TextSlice] = []
        cursor_index = 0
        for separator_match in self.strong_separator_pattern.finditer(slice_text):
            resulting_slices.append(
                TextSlice(text_slice.start_index + cursor_index, text_slice.start_index + separator_match.start())
            )
            cursor_index = separator_match.end()
        resulting_slices.append(TextSlice(text_slice.start_index + cursor_index, text_slice.end_index))
        return resulting_slices

    def parse_chunk(self, folded_text: str, chunk_slice: TextSlice) -> ParsedChunk | None:
        trimmed_slice = self.trim_slice(folded_text, chunk_slice)
        chunk_text = folded_text[trimmed_slice.start_index : trimmed_slice.end_index]
        if len(letter_pattern.findall(chunk_text)) < 3:
            return None
        condition_match = self.condition_clause_pattern.search(chunk_text)
        if condition_match is None:
            return ParsedChunk("action", trimmed_slice, None)
        condition_start_index = (
            trimmed_slice.start_index
            + condition_match.start()
            + (len(condition_match.group(0)) - len(condition_match.group(1)))
        )
        condition_slice = self.trim_slice(folded_text, TextSlice(condition_start_index, trimmed_slice.end_index))
        action_slice = self.trim_slice(folded_text, TextSlice(trimmed_slice.start_index, condition_start_index))
        if len(letter_pattern.findall(folded_text[action_slice.start_index : action_slice.end_index])) < 3:
            return ParsedChunk("condition_only", None, condition_slice)
        return ParsedChunk("action", action_slice, condition_slice)

    def split_free_text_into_plan_segments(
        self, free_text: str, available_suggestion_count: int
    ) -> list[FreePlanSegment]:
        folded_text = fold_spanish_text(free_text)

        def read_original_text(text_slice: TextSlice) -> str:
            return free_text[text_slice.start_index : text_slice.end_index].strip()

        plan_segments: list[FreePlanSegment] = []
        condition_awaiting_next_reference: list[str | None] = [None]

        def consume_text_between_runs(between_slice: TextSlice, is_followed_by_numeric_run: bool) -> None:
            parsed_chunks = [
                parsed_chunk
                for parsed_chunk in (
                    self.parse_chunk(folded_text, chunk_slice)
                    for chunk_slice in self.split_slice_on_strong_separators(folded_text, between_slice)
                )
                if parsed_chunk is not None
            ]
            for chunk_index, parsed_chunk in enumerate(parsed_chunks):
                if parsed_chunk.kind_name == "action" and parsed_chunk.action_slice is not None:
                    plan_segments.append(
                        FreePlanSegment(
                            kind_name="free_text",
                            suggestion_number=None,
                            action_text=read_original_text(parsed_chunk.action_slice),
                            condition_text=(
                                read_original_text(parsed_chunk.condition_slice)
                                if parsed_chunk.condition_slice is not None
                                else None
                            ),
                        )
                    )
                    continue
                if parsed_chunk.condition_slice is None:
                    continue
                condition_text = read_original_text(parsed_chunk.condition_slice)
                is_last_chunk = chunk_index == len(parsed_chunks) - 1
                previous_segment = plan_segments[-1] if plan_segments else None
                if is_last_chunk and is_followed_by_numeric_run:
                    condition_awaiting_next_reference[0] = condition_text
                elif previous_segment is not None and previous_segment.condition_text is None:
                    previous_segment.condition_text = condition_text

        cursor_index = 0
        for run_slice, suggestion_numbers in self.find_valid_numeric_runs(folded_text, available_suggestion_count):
            consume_text_between_runs(TextSlice(cursor_index, run_slice.start_index), True)
            for number_index, suggestion_number in enumerate(suggestion_numbers):
                plan_segments.append(
                    FreePlanSegment(
                        kind_name="suggestion_reference",
                        suggestion_number=suggestion_number,
                        action_text=None,
                        condition_text=condition_awaiting_next_reference[0] if number_index == 0 else None,
                    )
                )
            condition_awaiting_next_reference[0] = None
            cursor_index = run_slice.end_index
        consume_text_between_runs(TextSlice(cursor_index, len(folded_text)), False)
        return plan_segments
