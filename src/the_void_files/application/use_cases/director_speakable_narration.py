import json
import re
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any

from the_void_files.application.use_cases.director_failures import SyntheticDirectorMaterialMissingError
from the_void_files.service_settings import project_root_directory

neutral_wording_path = (
    project_root_directory / "content" / "synthetic_cases" / "director_simulation" / "neutral_wording.json"
)
marked_span_pattern = re.compile(r"\[\[([^\[\]]{1,160})\]\]")
placeholder_pattern = re.compile(r"\{\{([a-z_]{1,64})\}\}")
censored_block_pattern = re.compile(r"█+")
whitespace_pattern = re.compile(r"\s+")
silent_tag_names = {"pausa", "censura", "tachado"}
rewritten_tag_name = "reescrito"


def read_neutral_wording(wording_path: Path = neutral_wording_path) -> dict[str, Any]:
    if not wording_path.is_file():
        raise SyntheticDirectorMaterialMissingError()
    return json.loads(wording_path.read_text(encoding="utf-8"))


def normalize_tag_text(tag_text: str) -> str:
    decomposed_text = unicodedata.normalize("NFD", tag_text.strip().lower())
    return "".join(character for character in decomposed_text if not unicodedata.combining(character))


def read_speakable_text_from_marked_span(span_content: str) -> str:
    separator_position = span_content.find(":")
    if separator_position <= 0:
        return span_content
    tag_names = [normalize_tag_text(tag_text) for tag_text in span_content[:separator_position].split("+")]
    argument_text = span_content[separator_position + 1 :]
    if any(tag_name in silent_tag_names for tag_name in tag_names):
        return " "
    if rewritten_tag_name in tag_names:
        rewriting_parts = argument_text.split("|")
        return rewriting_parts[1] if len(rewriting_parts) > 1 else rewriting_parts[0]
    return argument_text


def read_trimmed_text(candidate: Any) -> str | None:
    if isinstance(candidate, str) and candidate.strip():
        return candidate.strip()
    return None


def calculate_age_in_years(birth_date: dict[str, Any], today: date) -> int | None:
    try:
        born_on = date(int(birth_date["year"]), int(birth_date["month"]), int(birth_date["day"]))
    except (KeyError, TypeError, ValueError):
        return None
    has_birthday_passed = (today.month, today.day) >= (born_on.month, born_on.day)
    return today.year - born_on.year - (0 if has_birthday_passed else 1)


def build_placeholder_texts(
    chronicle_state: dict[str, Any] | None, neutral_wording: dict[str, Any], today: date | None = None
) -> dict[str, str]:
    placeholder_texts = dict(neutral_wording["placeholder_fallback_texts"])
    registration = chronicle_state.get("investigatorRegistration") if isinstance(chronicle_state, dict) else None
    if not isinstance(registration, dict):
        return placeholder_texts
    full_name = read_trimmed_text(registration.get("fullName"))
    if full_name is not None:
        placeholder_texts["nombre_completo"] = full_name
        placeholder_texts["nombre"] = full_name.split()[0]
    for placeholder_name, registration_key_name in (("residencia", "residencePlace"), ("origen", "originPlace")):
        registered_text = read_trimmed_text(registration.get(registration_key_name))
        if registered_text is not None:
            placeholder_texts[placeholder_name] = registered_text
    birth_date = registration.get("birthDate")
    if isinstance(birth_date, dict):
        age_in_years = calculate_age_in_years(birth_date, today or date.today())
        month_number = birth_date.get("month")
        if age_in_years is not None and isinstance(month_number, int) and 1 <= month_number <= 12:
            placeholder_texts["edad"] = str(age_in_years)
            placeholder_texts["fecha_nacimiento"] = neutral_wording["birth_date_template"].format(
                day=birth_date["day"], month_name=neutral_wording["month_names"][month_number - 1], year=birth_date["year"]
            )
    relational_anchor = registration.get("relationalAnchor")
    if isinstance(relational_anchor, dict) and relational_anchor.get("kind") == "person":
        for placeholder_name, anchor_key_name in (("ancla_nombre", "personName"), ("ancla_vinculo", "bondDescription")):
            anchor_text = read_trimmed_text(relational_anchor.get(anchor_key_name))
            if anchor_text is not None:
                placeholder_texts[placeholder_name] = anchor_text
    return placeholder_texts


def convert_marked_paragraph_to_speakable_text(
    marked_paragraph_text: str, placeholder_texts: dict[str, str], unknown_placeholder_fallback_text: str
) -> str:
    personalized_text = placeholder_pattern.sub(
        lambda placeholder_match: placeholder_texts.get(placeholder_match.group(1), unknown_placeholder_fallback_text),
        marked_paragraph_text,
    )
    unmarked_text = marked_span_pattern.sub(
        lambda span_match: read_speakable_text_from_marked_span(span_match.group(1)), personalized_text
    )
    unmarked_text = unmarked_text.replace("[[", "").replace("]]", "")
    unmarked_text = censored_block_pattern.sub(" ", unmarked_text)
    return whitespace_pattern.sub(" ", unmarked_text).strip()
