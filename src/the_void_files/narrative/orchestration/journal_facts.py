from typing import Any

from the_void_files.narrative.orchestration.heard_exchanges import journal_lines_from_exchanges, read_stored_exchanges
from the_void_files.narrative.orchestration.threat_register import journal_lines_from_threat_acts, read_stored_threat_acts

journal_facts_instruction = (
    "Estos hechos son los del diario. Úsalos con estos nombres. No los niegues ni los cambies. "
    "Si alguien dijo una frase, esa frase es de esa voz y conserva su orden."
)


def _append_fact(facts: list[dict[str, str]], seen_texts: set[str], kind: str, visible_text: str) -> None:
    cleaned_text = visible_text.strip()
    if cleaned_text == "" or cleaned_text in seen_texts:
        return
    seen_texts.add(cleaned_text)
    facts.append({"kind": kind, "visible_text": cleaned_text})


def build_journal_facts(
    public_state: dict[str, Any], known_persons: list[dict[str, Any]] | None = None
) -> list[dict[str, str]]:
    facts: list[dict[str, str]] = []
    seen_texts: set[str] = set()
    for revealed_fact in public_state.get("revealed_facts") or []:
        if isinstance(revealed_fact, dict) and isinstance(revealed_fact.get("visible_name"), str):
            _append_fact(facts, seen_texts, "hecho", revealed_fact["visible_name"])
    completed_objective_texts = public_state.get("completed_objective_texts")
    if isinstance(completed_objective_texts, list):
        for completed_objective_text in completed_objective_texts:
            if isinstance(completed_objective_text, str) and "_" not in completed_objective_text:
                _append_fact(facts, seen_texts, "encargo", completed_objective_text)
    for visited_place in public_state.get("visited_places") or []:
        if isinstance(visited_place, dict) and isinstance(visited_place.get("place_name"), str):
            _append_fact(facts, seen_texts, "lugar", visited_place["place_name"])
    for known_person in known_persons or []:
        if isinstance(known_person, dict) and isinstance(known_person.get("visible_name"), str):
            _append_fact(facts, seen_texts, "persona", known_person["visible_name"])
    wound_count = public_state.get("serious_wound_count")
    wound_cause_text = public_state.get("last_serious_wound_cause_text")
    if isinstance(wound_count, int) and wound_count > 0 and isinstance(wound_cause_text, str):
        _append_fact(facts, seen_texts, "herida", wound_cause_text)
    for active_condition in public_state.get("active_conditions") or []:
        if not isinstance(active_condition, dict):
            continue
        visible_name = active_condition.get("visible_name")
        effect_text = active_condition.get("effect_text")
        exit_text = active_condition.get("exit_text")
        if not isinstance(visible_name, str) or visible_name.strip() == "":
            continue
        condition_text = visible_name.strip()
        if isinstance(effect_text, str) and effect_text.strip() != "":
            condition_text = f"{condition_text}. Efecto: {effect_text.strip()}"
        if isinstance(exit_text, str) and exit_text.strip() != "":
            condition_text = f"{condition_text}. Salida: {exit_text.strip()}"
        _append_fact(facts, seen_texts, "condicion", condition_text)
    for spoken_fact in journal_lines_from_exchanges(read_stored_exchanges(public_state)):
        _append_fact(facts, seen_texts, spoken_fact["kind"], spoken_fact["visible_text"])
    for threat_fact in journal_lines_from_threat_acts(read_stored_threat_acts(public_state)):
        _append_fact(facts, seen_texts, threat_fact["kind"], threat_fact["visible_text"])
    return facts
