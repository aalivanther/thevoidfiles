import re
from typing import Any

from the_void_files.application.use_cases.consequence_case_state import fold_comparable_person_name
from the_void_files.narrative.orchestration.narration_contract import review_narration_against_committed_facts

unsolved_piece_claim_pattern = re.compile(
    r"\b(sigue cerrad[oa]s?|permanece cerrad[oa]s?|no se abre|no logra abrir|sin abrir)\b",
    re.IGNORECASE,
)


def read_solved_piece_subject(solved_piece_name: str) -> str:
    folded_name = solved_piece_name.casefold()
    for marker in (" está ", " esta ", " quedó ", " quedo "):
        marker_index = folded_name.find(marker)
        if marker_index >= 4:
            return solved_piece_name[:marker_index].strip()
    return solved_piece_name.strip()


def paragraph_denies_a_solved_piece(marked_paragraph: str, solved_piece_names: list[str]) -> bool:
    if unsolved_piece_claim_pattern.search(marked_paragraph) is None:
        return False
    folded_paragraph = fold_comparable_person_name(marked_paragraph)
    return any(
        fold_comparable_person_name(read_solved_piece_subject(solved_piece_name)) in folded_paragraph
        for solved_piece_name in solved_piece_names
        if len(read_solved_piece_subject(solved_piece_name)) >= 4
    )


def build_closure_register(public_state: dict[str, Any], place_name: str, serious_wound_count: int, wound_cause_text: str | None, revealed_facts: list[dict[str, Any]]) -> dict[str, Any]:
    visited_place_names: list[str] = []
    for visited_place in public_state.get("visited_places") or []:
        if not isinstance(visited_place, dict):
            continue
        visited_place_name = visited_place.get("place_name")
        if isinstance(visited_place_name, str) and visited_place_name.strip() != "" and visited_place_name.strip() not in visited_place_names:
            visited_place_names.append(visited_place_name.strip())
    if place_name.strip() != "" and place_name.strip() not in visited_place_names:
        visited_place_names.append(place_name.strip())
    solved_piece_names: list[str] = []
    for revealed_fact in revealed_facts:
        visible_name = revealed_fact.get("visible_name") if isinstance(revealed_fact, dict) else None
        if isinstance(visible_name, str) and visible_name.strip() != "" and visible_name.strip() not in solved_piece_names:
            solved_piece_names.append(visible_name.strip())
    return {
        "place_name": place_name,
        "visited_place_names": visited_place_names,
        "serious_wound_count": serious_wound_count,
        "wound_cause_text": wound_cause_text if isinstance(wound_cause_text, str) and wound_cause_text.strip() != "" else None,
        "solved_piece_names": solved_piece_names,
    }


def build_truthful_closure_paragraph(
    place_name: str, serious_wound_count: int, wound_cause_text: str | None, solved_piece_names: list[str]
) -> str:
    wound_sentence = (
        f"Heridas graves: {serious_wound_count}. La causa anotada es: {wound_cause_text.strip().rstrip('.')}."
        if serious_wound_count > 0 and isinstance(wound_cause_text, str) and wound_cause_text.strip() != ""
        else f"Heridas graves: {serious_wound_count}."
    )
    solved_sentence = (
        "Piezas resueltas: " + "; ".join(solved_piece_names) + "."
        if solved_piece_names
        else "Ninguna pieza quedó resuelta."
    )
    return f"El cierre queda en {place_name}. {wound_sentence} {solved_sentence}"


def guard_closing_paragraphs(
    marked_paragraphs: list[str],
    committed_facts: dict[str, Any],
    solved_piece_names: list[str],
    truthful_paragraph: str,
) -> list[str]:
    guarded_paragraphs: list[str] = []
    for marked_paragraph in marked_paragraphs:
        contradicts_register = (
            review_narration_against_committed_facts([marked_paragraph], committed_facts) != []
            or paragraph_denies_a_solved_piece(marked_paragraph, solved_piece_names)
        )
        replacement = truthful_paragraph if contradicts_register else marked_paragraph
        if guarded_paragraphs and guarded_paragraphs[-1] == replacement and replacement == truthful_paragraph:
            continue
        guarded_paragraphs.append(replacement)
    return guarded_paragraphs
