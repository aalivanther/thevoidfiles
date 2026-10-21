import re
from typing import Any

attribute_names = ("im", "if", "c", "o", "co", "m", "s")
attribute_meanings = {
    "im": "Resistencia psíquica",
    "if": "Capacidad física",
    "c": "Conocimiento",
    "o": "Percepción",
    "co": "Trato social",
    "m": "Sensibilidad arcana",
    "s": "Fortuna. No se tira ni se muestra como probabilidad.",
}
default_attribute_value = 4
maximum_attribute_value = 50
case_effort_maximum = 6
effort_verb_texts = (
    "forzar",
    "fuerzo",
    "fuerza",
    "forzamos",
    "descifrar",
    "descifro",
    "descifra",
    "sostener",
    "sostengo",
    "sostiene",
    "investigar a fondo",
)
no_effort_remaining_text = "No queda esfuerzo. Solo cabe hablar o retirarse."


def default_investigator_attributes() -> dict[str, int]:
    return {attribute_name: default_attribute_value for attribute_name in attribute_names}


def read_investigator_attributes(public_state: dict[str, Any]) -> dict[str, int]:
    raw_attributes = public_state.get("investigator_attributes")
    attributes = default_investigator_attributes()
    if not isinstance(raw_attributes, dict):
        return attributes
    for attribute_name in attribute_names:
        raw_value = raw_attributes.get(attribute_name)
        if isinstance(raw_value, int) and not isinstance(raw_value, bool):
            attributes[attribute_name] = min(maximum_attribute_value, max(0, raw_value))
    return attributes


def read_effort_remaining(public_state: dict[str, Any]) -> int:
    raw_effort = public_state.get("effort_remaining")
    if not isinstance(raw_effort, int):
        return case_effort_maximum
    return min(case_effort_maximum, max(0, raw_effort))


def contains_whole_phrase(action_text: str, phrase_text: str) -> bool:
    return (
        re.search(rf"(?<!\w){re.escape(phrase_text.casefold())}(?!\w)", action_text.casefold()) is not None
    )


def does_text_spend_effort(action_text: str) -> bool:
    return any(contains_whole_phrase(action_text, verb_text) for verb_text in effort_verb_texts)


feasibility_words = {
    "trivial": "sencillo",
    "plausible": "coherente",
    "risky": "arriesgado",
    "impossible": "imposible",
}


def build_public_ruling_lead(action_text: str, feasibility_class_name: str, attributes: dict[str, int]) -> str:
    plan_word = feasibility_words.get(feasibility_class_name, "coherente")
    attribute_name = read_consulted_attribute_name(action_text)
    if attribute_name is None or attribute_name == "s":
        return f"El plan es {plan_word}."
    attribute_value = attributes.get(attribute_name, default_attribute_value)
    if not isinstance(attribute_value, int):
        attribute_value = default_attribute_value
    attribute_label = attribute_meanings[attribute_name].split(".")[0]
    return f"El plan es {plan_word}. Se apoya en {attribute_label}, que vale {attribute_value}."


def read_consulted_attribute_name(action_text: str) -> str | None:
    if any(
        contains_whole_phrase(action_text, verb_text)
        for verb_text in ("forzar", "fuerzo", "fuerza", "empujar", "empujo", "correr", "corro", "cargar", "cargo")
    ):
        return "if"
    if any(
        contains_whole_phrase(action_text, verb_text)
        for verb_text in ("hablar", "hablo", "pregunto", "preguntar", "convencer", "convenzo")
    ):
        return "co"
    if any(
        contains_whole_phrase(action_text, verb_text)
        for verb_text in ("mirar", "miro", "examinar", "examino", "buscar", "busco", "registrar", "registro")
    ):
        return "o"
    if any(
        contains_whole_phrase(action_text, verb_text)
        for verb_text in ("recordar", "recuerdo", "deducir", "deduzco", "leer", "leo")
    ):
        return "c"
    if any(
        contains_whole_phrase(action_text, verb_text)
        for verb_text in ("rezar", "rezo", "invocar", "invoco", "susurro")
    ):
        return "m"
    if any(
        contains_whole_phrase(action_text, verb_text)
        for verb_text in ("aguantar", "aguanto", "resistir", "resisto")
    ):
        return "im"
    return None


def adjusted_elapsed_minutes(elapsed_minutes: int, attribute_value: int) -> int:
    if attribute_value >= 6:
        return max(1, elapsed_minutes - 2)
    if attribute_value <= 2:
        return elapsed_minutes + 2
    return elapsed_minutes
