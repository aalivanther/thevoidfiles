import re
from typing import Any

markup_span_pattern = re.compile(r"\[\[([^\[\]]*)\]\]")
dropped_markup_tag_names = {"pausa", "temblor", "latido", "interferencia", "tinta", "reescrito", "censura"}
heard_exchanges_instruction = (
    "Estas voces ya hablaron, en este orden. "
    "Una sola voz es un diálogo con quien investiga. Varias voces en el mismo intercambio son un grupo. "
    "No pases una frase a otra boca ni añadas a alguien que no está en ese intercambio. "
    "Si was_present es falso, esa voz no estaba en el lugar, pero la frase sí se oyó: no la borres ni se la pases a otra boca."
)


def replace_markup_span(match: re.Match[str]) -> str:
    inside_text = match.group(1).strip()
    tag_name = inside_text.split(":", 1)[0].strip().casefold()
    if tag_name in dropped_markup_tag_names:
        return ""
    return inside_text


def strip_markup_spans(visible_text: str) -> str:
    return " ".join(markup_span_pattern.sub(replace_markup_span, visible_text).split())


def speakable_line_text(marked_paragraphs: list[str]) -> str:
    return " ".join(
        cleaned_paragraph
        for marked_paragraph in marked_paragraphs
        if (cleaned_paragraph := strip_markup_spans(marked_paragraph)) != ""
    )


def player_line_sentence(clock_label: str, place_name: str, speaker_visible_name: str, spoken_text: str) -> str:
    cleaned_place_name = place_name.strip()
    if cleaned_place_name:
        return f"A las {clock_label}, en {cleaned_place_name}, {speaker_visible_name} dijo: {spoken_text}"
    return f"A las {clock_label}, {speaker_visible_name} dijo: {spoken_text}"


def line_signature(line: dict[str, Any]) -> tuple[Any, ...]:
    marked_paragraphs = line.get("marked_paragraphs")
    return (
        line.get("speaker_person_identifier") or "",
        tuple(marked_paragraphs) if isinstance(marked_paragraphs, list) else (),
    )


def append_heard_exchange(
    exchanges: list[dict[str, Any]],
    place_name: str,
    clock_label: str,
    lines: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    cleaned_lines: list[dict[str, Any]] = []
    sentences: list[str] = []
    for line in lines:
        if not isinstance(line, dict):
            continue
        speaker_visible_name = line.get("speaker_visible_name")
        marked_paragraphs = line.get("marked_paragraphs")
        if not isinstance(speaker_visible_name, str) or speaker_visible_name.strip() == "":
            continue
        if not isinstance(marked_paragraphs, list):
            continue
        spoken_text = speakable_line_text(
            [marked_paragraph for marked_paragraph in marked_paragraphs if isinstance(marked_paragraph, str)]
        )
        if spoken_text == "":
            continue
        speaker_person_identifier = line.get("speaker_person_identifier")
        cleaned_lines.append(
            {
                "speaker_person_identifier": speaker_person_identifier if isinstance(speaker_person_identifier, str) else "",
                "speaker_visible_name": speaker_visible_name.strip(),
                "marked_paragraphs": [
                    marked_paragraph.strip()
                    for marked_paragraph in marked_paragraphs
                    if isinstance(marked_paragraph, str) and marked_paragraph.strip() != ""
                ],
                "spoken_text": spoken_text,
                "was_present": line.get("was_present") is True,
            }
        )
        sentences.append(
            player_line_sentence(clock_label, place_name, speaker_visible_name.strip(), spoken_text)
        )
    if not cleaned_lines:
        return exchanges, []
    signature = tuple(line_signature(cleaned_line) for cleaned_line in cleaned_lines)
    for existing_exchange in exchanges:
        existing_lines = existing_exchange.get("lines")
        if isinstance(existing_lines, list) and tuple(
            line_signature(existing_line) for existing_line in existing_lines if isinstance(existing_line, dict)
        ) == signature:
            return exchanges, []
    return [
        *exchanges,
        {"place_name": place_name.strip(), "clock_label": clock_label, "lines": cleaned_lines},
    ], sentences


def read_stored_exchanges(public_state: dict[str, Any]) -> list[dict[str, Any]]:
    stored_exchanges = public_state.get("heard_exchanges")
    if not isinstance(stored_exchanges, list):
        return []
    return [stored_exchange for stored_exchange in stored_exchanges if isinstance(stored_exchange, dict)]


def journal_lines_from_exchanges(exchanges: list[dict[str, Any]]) -> list[dict[str, str]]:
    journal_lines: list[dict[str, str]] = []
    for exchange in exchanges:
        place_name = exchange.get("place_name") if isinstance(exchange.get("place_name"), str) else ""
        clock_label = exchange.get("clock_label") if isinstance(exchange.get("clock_label"), str) else ""
        for line in exchange.get("lines") or []:
            if not isinstance(line, dict):
                continue
            spoken_text = line.get("spoken_text")
            speaker_visible_name = line.get("speaker_visible_name")
            if not isinstance(spoken_text, str) or not isinstance(speaker_visible_name, str) or spoken_text.strip() == "":
                continue
            journal_lines.append(
                {
                    "kind": "dicho",
                    "visible_text": player_line_sentence(clock_label, place_name, speaker_visible_name, spoken_text),
                }
            )
    return journal_lines


def prompt_exchanges(exchanges: list[dict[str, Any]]) -> list[dict[str, Any]]:
    prompt_ready_exchanges: list[dict[str, Any]] = []
    for exchange in exchanges:
        lines = [
            {
                "speaker_visible_name": line.get("speaker_visible_name"),
                "speaker_person_identifier": line.get("speaker_person_identifier"),
                "spoken_text": line.get("spoken_text"),
                "was_present": line.get("was_present") is True,
            }
            for line in exchange.get("lines") or []
            if isinstance(line, dict) and isinstance(line.get("spoken_text"), str) and line.get("spoken_text") != ""
        ]
        if not lines:
            continue
        prompt_ready_exchanges.append(
            {
                "place_name": exchange.get("place_name"),
                "clock_label": exchange.get("clock_label"),
                "lines": lines,
            }
        )
    return prompt_ready_exchanges
