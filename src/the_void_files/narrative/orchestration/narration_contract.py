import re
import unicodedata
from typing import Any

from the_void_files.application.use_cases.consequence_case_state import fold_comparable_person_name
from the_void_files.narrative.context_builder import format_world_clock_label
from the_void_files.narrative.orchestration.distance_field import read_place_tail
from the_void_files.narrative.tool_registry import ContractValidationError

clock_literal_pattern = re.compile(r"\b(\d{1,2}):(\d{2})\b")
unhurt_claim_pattern = re.compile(r"\b(ileso|ilesa|sin heridas|sin una herida)\b", re.IGNORECASE)
hurt_claim_pattern = re.compile(
    r"\b(queda herid[oa]|está herid[oa]|esta herid[oa]|sufre una herida|herida grave|tiene una herida|sangra)\b",
    re.IGNORECASE,
)
presence_claim_pattern = re.compile(r"(?<!\w)(?:se encuentra en|esta en|llega a)")


def read_threat_narration_facts(public_state: dict[str, Any], case_specification: dict[str, Any]) -> dict[str, Any]:
    from the_void_files.narrative.orchestration.threat_register import read_capability_texts, used_capability_texts

    listed_capability_texts = read_capability_texts(case_specification)
    if not listed_capability_texts and "threat_is_defeated" not in public_state:
        return {}
    stored_acts = public_state.get("threat_acts")
    threat_acts = stored_acts if isinstance(stored_acts, list) else []
    return {
        "listed_capability_texts": listed_capability_texts,
        "used_capability_texts": used_capability_texts(
            [threat_act for threat_act in threat_acts if isinstance(threat_act, dict)]
        ),
        "threat_is_defeated": public_state.get("threat_is_defeated") is True,
    }


def read_committed_narration_facts(
    public_state: dict[str, Any],
    case_specification: dict[str, Any],
    previous_place_name: str | None = None,
) -> dict[str, Any]:
    current_place_name = str(public_state.get("place_name") or "")
    allowed_place_tails = {read_place_tail(current_place_name)} if current_place_name else set()
    if isinstance(previous_place_name, str) and previous_place_name.strip() != "":
        allowed_place_tails.add(read_place_tail(previous_place_name))
    other_place_tails = []
    for scene in case_specification.get("scenes") or []:
        if not isinstance(scene, dict):
            continue
        place_tail = read_place_tail(str(scene.get("place_name") or ""))
        if len(place_tail) >= 8 and place_tail not in allowed_place_tails:
            other_place_tails.append(place_tail)
    held_kit = []
    for held_belonging in public_state.get("belonging_units") or []:
        if not isinstance(held_belonging, dict):
            continue
        belonging_identifier = held_belonging.get("belonging_identifier")
        units = held_belonging.get("units")
        if isinstance(belonging_identifier, str) and isinstance(units, int):
            held_kit.append({"identifier": belonging_identifier, "units": units})
    return {
        "clock_label": format_world_clock_label(public_state.get("world_clock_minutes")),
        "place_name": current_place_name,
        "allowed_place_tails": sorted(tail for tail in allowed_place_tails if tail),
        "other_place_tails": other_place_tails,
        "operational_funds": public_state.get("operational_funds") or 0,
        "serious_wound_count": public_state.get("serious_wound_count") or 0,
        "wound_cause_text": (
            public_state.get("last_serious_wound_cause_text")
            if isinstance(public_state.get("last_serious_wound_cause_text"), str)
            else ""
        ),
        "held_kit": held_kit,
        "condition_names": [
            active_condition.get("visible_name")
            for active_condition in public_state.get("active_conditions") or []
            if isinstance(active_condition, dict) and isinstance(active_condition.get("visible_name"), str)
        ],
        **read_threat_narration_facts(public_state, case_specification),
    }


def read_anchored_status_lies(
    director_entries: list[dict[str, Any]], staging_events: list[dict[str, Any]]
) -> dict[int, dict[str, str]]:
    narration_offset_by_entry_index: dict[int, int] = {}
    narration_paragraph_count = 0
    for entry_index, director_entry in enumerate(director_entries):
        if director_entry.get("voice") != "director_narration":
            continue
        narration_offset_by_entry_index[entry_index] = narration_paragraph_count
        narration_paragraph_count += len(director_entry.get("marked_paragraphs") or [])
    anchored_lies: dict[int, dict[str, str]] = {}
    for staging_event in staging_events:
        if staging_event.get("kind") != "mental_attack":
            continue
        falsified_reading = staging_event.get("falsified_status_reading") or {}
        entry_index = staging_event.get("anchor_director_entry_index")
        paragraph_index = staging_event.get("anchor_paragraph_index")
        if not isinstance(entry_index, int) or entry_index not in narration_offset_by_entry_index:
            continue
        if not isinstance(paragraph_index, int):
            continue
        flat_paragraph_index = narration_offset_by_entry_index[entry_index] + paragraph_index
        anchored_lie = anchored_lies.setdefault(flat_paragraph_index, {})
        false_visible_text = falsified_reading.get("false_visible_text")
        if not isinstance(false_visible_text, str) or false_visible_text.strip() == "":
            continue
        if falsified_reading.get("status_field_name") == "world_clock":
            anchored_lie["clock_label"] = false_visible_text.strip()
        elif falsified_reading.get("status_field_name") == "place_name":
            anchored_lie["place_text"] = false_visible_text.strip()
    return anchored_lies


def review_narration_against_committed_facts(
    marked_paragraphs: list[str],
    committed_facts: dict[str, Any],
    anchored_status_lies: dict[int, dict[str, str]] | None = None,
) -> list[ContractValidationError]:
    validation_errors: list[ContractValidationError] = []
    committed_clock_label = committed_facts["clock_label"]
    other_place_tails = committed_facts["other_place_tails"]
    anchored_lies = anchored_status_lies or {}
    for paragraph_position, marked_paragraph in enumerate(marked_paragraphs):
        anchored_lie = anchored_lies.get(paragraph_position) or {}
        location_text = f"marked_paragraphs.{paragraph_position}"
        for clock_match in clock_literal_pattern.finditer(marked_paragraph):
            written_clock_label = f"{int(clock_match.group(1)):02d}:{clock_match.group(2)}"
            if written_clock_label != committed_clock_label and written_clock_label != anchored_lie.get("clock_label"):
                validation_errors.append(
                    ContractValidationError(
                        error_name="narration_contradicts_committed_clock",
                        location_text=location_text,
                    )
                )
                break
        folded_paragraph = fold_comparable_person_name(marked_paragraph)
        allowed_false_place = fold_comparable_person_name(str(anchored_lie.get("place_text") or ""))
        if any(
            place_tail in folded_paragraph and not (allowed_false_place and place_tail in allowed_false_place)
            for place_tail in other_place_tails
        ):
            validation_errors.append(
                ContractValidationError(
                    error_name="narration_contradicts_committed_place",
                    location_text=location_text,
                )
            )
        wound_count = committed_facts.get("serious_wound_count") or 0
        wound_cause_text = committed_facts.get("wound_cause_text") or ""
        claims_a_wound = hurt_claim_pattern.search(marked_paragraph) is not None
        if wound_count == 0 and claims_a_wound:
            validation_errors.append(
                ContractValidationError(
                    error_name="narration_contradicts_committed_wound",
                    location_text=location_text,
                )
            )
        if isinstance(wound_count, int) and wound_count > 0 and unhurt_claim_pattern.search(marked_paragraph):
            validation_errors.append(
                ContractValidationError(
                    error_name="narration_contradicts_committed_wound",
                    location_text=location_text,
                )
            )
        if (
            isinstance(wound_count, int)
            and wound_count > 0
            and isinstance(wound_cause_text, str)
            and wound_cause_text.strip() != ""
            and claims_a_wound
            and wound_cause_text.casefold() not in marked_paragraph.casefold()
            and "{{herida_causa}}" not in marked_paragraph
        ):
            validation_errors.append(
                ContractValidationError(
                    error_name="narration_contradicts_committed_wound",
                    location_text=location_text,
                )
            )
    condition_names = [
        condition_name
        for condition_name in committed_facts.get("condition_names") or []
        if isinstance(condition_name, str) and condition_name.strip() != ""
    ]
    if condition_names:
        folded_narration = fold_comparable_person_name(" ".join(marked_paragraphs))
        missing_condition_name = next(
            (
                condition_name
                for condition_name in condition_names
                if fold_comparable_person_name(condition_name) not in folded_narration
            ),
            None,
        )
        if missing_condition_name is not None and "{{condicion}}" not in " ".join(marked_paragraphs):
            validation_errors.append(
                ContractValidationError(
                    error_name="narration_contradicts_committed_condition",
                    location_text="marked_paragraphs",
                )
            )
    from the_void_files.narrative.orchestration.threat_register import (
        paragraph_declares_threat_defeated,
        paragraph_quotes_an_unused_capability,
    )

    listed_capability_texts = [
        capability_text
        for capability_text in committed_facts.get("listed_capability_texts") or []
        if isinstance(capability_text, str)
    ]
    used_texts = [
        capability_text
        for capability_text in committed_facts.get("used_capability_texts") or []
        if isinstance(capability_text, str)
    ]
    threat_is_defeated = committed_facts.get("threat_is_defeated")
    if listed_capability_texts or threat_is_defeated is False:
        for paragraph_position, marked_paragraph in enumerate(marked_paragraphs):
            location_text = f"marked_paragraphs.{paragraph_position}"
            if listed_capability_texts and paragraph_quotes_an_unused_capability(
                marked_paragraph, listed_capability_texts, used_texts
            ):
                validation_errors.append(
                    ContractValidationError(
                        error_name="narration_invents_threat_capability",
                        location_text=location_text,
                    )
                )
            if threat_is_defeated is False and paragraph_declares_threat_defeated(marked_paragraph):
                validation_errors.append(
                    ContractValidationError(
                        error_name="narration_declares_threat_defeated",
                        location_text=location_text,
                    )
                )
    return validation_errors


def fold_with_origin_spans(visible_text: str) -> tuple[str, list[tuple[int, int]]]:
    folded_characters: list[str] = []
    origin_spans: list[tuple[int, int]] = []
    pending_space_span: tuple[int, int] | None = None
    has_letter = False
    for original_index, character in enumerate(visible_text):
        for piece in unicodedata.normalize("NFD", character.casefold()):
            if unicodedata.category(piece) == "Mn":
                continue
            if piece.isalpha():
                if pending_space_span is not None and has_letter:
                    folded_characters.append(" ")
                    origin_spans.append(pending_space_span)
                pending_space_span = None
                folded_characters.append(piece)
                origin_spans.append((original_index, original_index + 1))
                has_letter = True
            elif piece.isspace() and has_letter and pending_space_span is None:
                pending_space_span = (original_index, original_index + 1)
    return "".join(folded_characters), origin_spans


def paragraph_contradicts_clock(
    marked_paragraph: str, committed_clock_label: str, anchored_clock_label: str | None
) -> bool:
    for clock_match in clock_literal_pattern.finditer(marked_paragraph):
        written_clock_label = f"{int(clock_match.group(1)):02d}:{clock_match.group(2)}"
        if written_clock_label != committed_clock_label and written_clock_label != anchored_clock_label:
            return True
    return False


def paragraph_contradicts_place(
    marked_paragraph: str, other_place_tails: list[str], anchored_place_text: str | None
) -> bool:
    folded_paragraph = fold_comparable_person_name(marked_paragraph)
    allowed_false_place = fold_comparable_person_name(str(anchored_place_text or ""))
    return any(
        place_tail in folded_paragraph and not (allowed_false_place and place_tail in allowed_false_place)
        for place_tail in other_place_tails
    )


def replace_contradicting_clocks(marked_paragraph: str, committed_clock_label: str) -> str:
    def replace_clock(clock_match: re.Match[str]) -> str:
        written_clock_label = f"{int(clock_match.group(1)):02d}:{clock_match.group(2)}"
        if written_clock_label == committed_clock_label:
            return clock_match.group(0)
        return "{{hora}}"

    return clock_literal_pattern.sub(replace_clock, marked_paragraph)


def replace_present_place_tail(marked_paragraph: str, folded_place_tail: str) -> str:
    folded_paragraph, origin_spans = fold_with_origin_spans(marked_paragraph)
    if not origin_spans or folded_place_tail == "":
        return marked_paragraph
    place_pattern = re.compile(rf"(?<!\w){re.escape(folded_place_tail)}(?!\w)")
    for presence_match in presence_claim_pattern.finditer(folded_paragraph):
        for place_match in place_pattern.finditer(folded_paragraph):
            if place_match.start() < presence_match.end():
                continue
            origin_after_presence = origin_spans[presence_match.end() - 1][1]
            place_start = origin_spans[place_match.start()][0]
            if any(sentence_mark in marked_paragraph[origin_after_presence:place_start] for sentence_mark in ".?!"):
                continue
            place_end = origin_spans[place_match.end() - 1][1]
            return marked_paragraph[:place_start] + "{{lugar}}" + marked_paragraph[place_end:]
    return marked_paragraph


def repair_narration_to_committed_facts(
    marked_paragraphs: list[str],
    committed_facts: dict[str, Any],
    anchored_status_lies: dict[int, dict[str, str]] | None = None,
) -> list[str]:
    other_place_tails = sorted(committed_facts["other_place_tails"], key=len, reverse=True)
    anchored_lies = anchored_status_lies or {}
    committed_clock_label = committed_facts["clock_label"]
    repaired_paragraphs: list[str] = []
    for paragraph_position, marked_paragraph in enumerate(marked_paragraphs):
        anchored_lie = anchored_lies.get(paragraph_position) or {}
        anchored_clock_label = anchored_lie.get("clock_label")
        anchored_place_text = anchored_lie.get("place_text")
        has_clock_error = paragraph_contradicts_clock(marked_paragraph, committed_clock_label, anchored_clock_label)
        has_place_error = paragraph_contradicts_place(marked_paragraph, other_place_tails, anchored_place_text)
        if anchored_clock_label or not has_clock_error:
            repaired_paragraph = marked_paragraph
        else:
            repaired_paragraph = replace_contradicting_clocks(marked_paragraph, committed_clock_label)
        if not anchored_place_text and has_place_error:
            for place_tail in other_place_tails:
                repaired_paragraph = replace_present_place_tail(repaired_paragraph, place_tail)
        repaired_paragraphs.append(repaired_paragraph)
    return repaired_paragraphs
