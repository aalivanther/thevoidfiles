from typing import Any

case_relationships_instruction = (
    "Estos tratos son los del Archivo. No inventes otro grado ni un porcentaje."
)
band_labels = {
    "barely_known": "Apenas se conocen",
    "acquainted": "Trato incipiente",
    "trusted": "Confianza ganada",
    "close_ally": "Lealtad estrecha",
    "unconditional": "Vínculo incondicional",
}
direction_labels = {
    "from_investigator": "De ida",
    "toward_investigator_as_perceived": "De vuelta, según lo percibido",
}


def build_case_relationship_lines(
    public_state: dict[str, Any], visible_name_by_person_identifier: dict[str, str]
) -> list[dict[str, str]]:
    from the_void_files.application.use_cases.consequence_turn_resolution import read_relationship_qualitative_band_name

    lines: list[dict[str, str]] = []
    seen_keys: set[tuple[str, str]] = set()
    for relationship_level in public_state.get("relationship_levels") or []:
        if not isinstance(relationship_level, dict):
            continue
        person_identifier = relationship_level.get("person_identifier")
        direction_name = relationship_level.get("direction_name")
        level = relationship_level.get("level")
        if not isinstance(person_identifier, str) or direction_name not in direction_labels or not isinstance(level, int):
            continue
        visible_name = visible_name_by_person_identifier.get(person_identifier, "").strip()
        if visible_name == "":
            continue
        line_key = (person_identifier, direction_name)
        if line_key in seen_keys:
            continue
        seen_keys.add(line_key)
        band_name = read_relationship_qualitative_band_name(level)
        band_label = band_labels.get(band_name, band_labels["barely_known"])
        lines.append(
            {
                "visible_name": visible_name,
                "direction_name": direction_name,
                "visible_text": f"{visible_name}. {direction_labels[direction_name]}: {band_label}.",
            }
        )
    return lines
