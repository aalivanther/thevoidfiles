import re
from typing import Any

from the_void_files.application.use_cases.case_start_specification_models import CaseBranchOutcome
from the_void_files.application.use_cases.consequence_case_state import fold_comparable_person_name

threat_acts_instruction = (
    "threat_acts es lo que la amenaza ya hizo. "
    "No narres como hecho una capacidad que no esté en esa lista, y no copies la frase de la capacidad al jugador: narra el efecto visible. "
    "Si threat_is_defeated es falso, la amenaza sigue: no la des por vencida."
)
defeat_claim_pattern = re.compile(
    r"\b(la amenaza ya no|la amenaza termin|ya no hay peligro|el peligro paso|la amenaza quedo vencid|la amenaza fue vencid|la amenaza esta vencid)\b"
)


def match_listed_capability(candidate: str | None, capability_texts: list[str]) -> str:
    if not isinstance(candidate, str) or candidate.strip() == "":
        return ""
    folded_candidate = candidate.strip().casefold()
    for capability_text in capability_texts:
        if isinstance(capability_text, str) and capability_text.strip().casefold() == folded_candidate:
            return capability_text.strip()
    return ""


def read_capability_texts(case_specification: dict[str, Any] | Any) -> list[str]:
    if not isinstance(case_specification, dict):
        return []
    private_truth = case_specification.get("private_truth")
    if not isinstance(private_truth, dict):
        return []
    threat = private_truth.get("threat")
    if not isinstance(threat, dict):
        return []
    return [
        capability_text.strip()
        for capability_text in threat.get("capability_texts") or []
        if isinstance(capability_text, str) and capability_text.strip() != ""
    ]


def build_threat_rows(outcome: CaseBranchOutcome, capability_texts: list[str]) -> list[dict[str, str]]:
    capability_text = match_listed_capability(outcome.threat_capability_text, capability_texts)
    rows: list[dict[str, str]] = []
    if isinstance(outcome.serious_wound_cause_text, str) and outcome.serious_wound_cause_text.strip() != "":
        rows.append(
            {"kind": "herida", "detail": outcome.serious_wound_cause_text.strip(), "capability_text": capability_text}
        )
    for gained_condition in outcome.conditions_gained:
        rows.append(
            {
                "kind": "condicion",
                "detail": f"{gained_condition.visible_name}. {gained_condition.effect_text}",
                "capability_text": capability_text,
            }
        )
    wound_was_recorded = any(row["kind"] == "herida" for row in rows)
    for staging_event in outcome.staging_events:
        if staging_event.kind == "mental_attack":
            rows.append({"kind": "ataque_mental", "detail": "", "capability_text": capability_text})
        elif staging_event.kind == "attack_received" and not wound_was_recorded:
            rows.append({"kind": "ataque", "detail": "", "capability_text": capability_text})
        elif staging_event.kind == "anomaly_manifested":
            rows.append({"kind": "anomalia", "detail": "", "capability_text": capability_text})
    if outcome.threat_was_defeated:
        rows.append({"kind": "derrota", "detail": "", "capability_text": ""})
    attached_capability_texts = {row["capability_text"] for row in rows if row["capability_text"] != ""}
    for extra_capability_text in outcome.threat_capability_texts:
        matched_capability_text = match_listed_capability(extra_capability_text, capability_texts)
        if matched_capability_text == "" or matched_capability_text in attached_capability_texts:
            continue
        attached_capability_texts.add(matched_capability_text)
        rows.append({"kind": "capacidad", "detail": "", "capability_text": matched_capability_text})
    return rows


def sentence_for_threat_row(clock_label: str, place_name: str, row: dict[str, str]) -> str:
    kind_name = row["kind"]
    detail_text = row["detail"].strip()
    if kind_name == "herida":
        action_text = f"la amenaza hirió: {detail_text}"
    elif kind_name == "condicion":
        action_text = f"la amenaza dejó una condición: {detail_text}"
    elif kind_name == "ataque_mental":
        action_text = "la amenaza atacó la percepción"
    elif kind_name == "ataque":
        action_text = "la amenaza atacó"
    elif kind_name == "derrota":
        action_text = "la amenaza quedó vencida"
    elif kind_name == "capacidad":
        action_text = "la amenaza actuó"
    else:
        action_text = "la amenaza se manifestó"
    place_clause = f"en {place_name.strip()}, " if place_name.strip() != "" else ""
    return f"A las {clock_label}, {place_clause}{action_text}."


def append_threat_acts(
    threat_acts: list[dict[str, Any]],
    place_name: str,
    clock_label: str,
    rows: list[dict[str, str]],
) -> tuple[list[dict[str, Any]], list[str]]:
    recorded_acts = list(threat_acts)
    sentences: list[str] = []
    for row in rows:
        sentence = sentence_for_threat_row(clock_label, place_name, row)
        recorded_acts.append(
            {
                "kind": row["kind"],
                "capability_text": row["capability_text"].strip(),
                "visible_text": sentence,
                "place_name": place_name.strip(),
                "clock_label": clock_label,
            }
        )
        sentences.append(sentence)
    return recorded_acts, sentences


def read_stored_threat_acts(public_state: dict[str, Any]) -> list[dict[str, Any]]:
    stored_acts = public_state.get("threat_acts")
    if not isinstance(stored_acts, list):
        return []
    return [stored_act for stored_act in stored_acts if isinstance(stored_act, dict)]


def journal_lines_from_threat_acts(threat_acts: list[dict[str, Any]]) -> list[dict[str, str]]:
    journal_lines: list[dict[str, str]] = []
    for threat_act in threat_acts:
        visible_text = threat_act.get("visible_text")
        if isinstance(visible_text, str) and visible_text.strip() != "":
            journal_lines.append({"kind": "amenaza", "visible_text": visible_text.strip()})
    return journal_lines


def used_capability_texts(threat_acts: list[dict[str, Any]]) -> list[str]:
    used_texts: list[str] = []
    for threat_act in threat_acts:
        capability_text = threat_act.get("capability_text")
        if isinstance(capability_text, str) and capability_text.strip() != "" and capability_text.strip() not in used_texts:
            used_texts.append(capability_text.strip())
    return used_texts


def prompt_threat_acts(threat_acts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    prompt_acts: list[dict[str, Any]] = []
    for threat_act in threat_acts:
        visible_text = threat_act.get("visible_text")
        if not isinstance(visible_text, str) or visible_text.strip() == "":
            continue
        prompt_acts.append(
            {
                "kind": threat_act.get("kind"),
                "capability_text": threat_act.get("capability_text") or "",
                "visible_text": visible_text.strip(),
                "place_name": threat_act.get("place_name") or "",
                "clock_label": threat_act.get("clock_label") or "",
            }
        )
    return prompt_acts


def paragraph_declares_threat_defeated(marked_paragraph: str) -> bool:
    return defeat_claim_pattern.search(fold_comparable_person_name(marked_paragraph)) is not None


def paragraph_quotes_an_unused_capability(
    marked_paragraph: str, listed_capability_texts: list[str], used_texts: list[str]
) -> bool:
    folded_paragraph = fold_comparable_person_name(marked_paragraph)
    used_folded_texts = {fold_comparable_person_name(used_text) for used_text in used_texts}
    for capability_text in listed_capability_texts:
        folded_capability = fold_comparable_person_name(capability_text)
        if len(folded_capability) < 12:
            continue
        if folded_capability in folded_paragraph and folded_capability not in used_folded_texts:
            return True
    return False
