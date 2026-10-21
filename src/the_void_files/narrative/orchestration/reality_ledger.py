from typing import Any

from the_void_files.narrative.context_builder import (
    compact_held_kit,
    format_world_clock_label,
    read_public_state,
)

controlled_variable_meanings = (
    ("lugar", "Nombre visible del lugar donde está el investigador ahora."),
    ("hora", "Hora del reloj del archivo, en formato HH:MM. El motor la calcula."),
    ("nombre", "Nombre corto del investigador. No lo inventes."),
    ("fondos", "Fondos operativos que aún puede gastar, en número entero."),
    ("heridas", "Heridas graves ya sufridas, de 0 a 5."),
    ("herida_causa", "Causa de la última herida grave, o ninguna si no hay."),
    ("condicion", "Nombre de la condición vigente, o ninguna si no hay."),
    ("esfuerzo", "Esfuerzo que queda en esta escena, de 0 a 6. No es una tirada."),
)


def read_condition_names(public_state: dict[str, Any]) -> list[str]:
    condition_names: list[str] = []
    for active_condition in public_state.get("active_conditions") or []:
        if not isinstance(active_condition, dict):
            continue
        visible_name = active_condition.get("visible_name")
        if isinstance(visible_name, str) and visible_name.strip() != "":
            condition_names.append(visible_name.strip())
    return condition_names


def build_committed_facts(
    public_state: dict[str, Any],
    investigator_placeholder_texts: dict[str, str] | None = None,
    held_kit: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    kit = held_kit if held_kit is not None else compact_kit_from_public_state(public_state)
    placeholder_texts = investigator_placeholder_texts or {}
    condition_names = read_condition_names(public_state)
    variable_values = read_controlled_variable_values(public_state, placeholder_texts, kit)
    wound_cause_text = public_state.get("last_serious_wound_cause_text")
    variable_values["herida_causa"] = wound_cause_text.strip() if isinstance(wound_cause_text, str) and wound_cause_text.strip() != "" else "ninguna"
    from the_void_files.narrative.orchestration.effort import read_effort_remaining, read_investigator_attributes

    variable_values["condicion"] = condition_names[0] if condition_names else "ninguna"
    variable_values["esfuerzo"] = str(read_effort_remaining(public_state))
    attributes = read_investigator_attributes(public_state)
    return {
        "values": variable_values,
        "condiciones": condition_names,
        "kit": kit,
        "heridas": public_state.get("serious_wound_count") or 0,
        "esfuerzo": read_effort_remaining(public_state),
        "atributos": attributes,
        "hechos": [
            revealed_fact
            for revealed_fact in public_state.get("revealed_facts") or []
            if isinstance(revealed_fact, dict)
        ],
    }


def read_controlled_variable_values(
    turn_context_public_state: dict[str, Any],
    investigator_placeholder_texts: dict[str, str],
    held_kit: list[dict[str, Any]],
) -> dict[str, str]:
    from the_void_files.narrative.orchestration.effort import read_effort_remaining

    variable_values = {
        "lugar": str(turn_context_public_state.get("place_name") or "el lugar"),
        "hora": format_world_clock_label(turn_context_public_state.get("world_clock_minutes")),
        "nombre": investigator_placeholder_texts.get("nombre", "el Investigador"),
        "fondos": str(turn_context_public_state.get("operational_funds") or 0),
        "heridas": str(turn_context_public_state.get("serious_wound_count") or 0),
        "esfuerzo": str(read_effort_remaining(turn_context_public_state)),
    }
    for held_item in held_kit:
        identifier = held_item.get("identifier")
        units = held_item.get("units")
        if isinstance(identifier, str) and isinstance(units, int):
            variable_values[f"kit_{identifier}"] = str(units)
    return variable_values


def build_controlled_variable_legend(
    public_state: dict[str, Any],
    investigator_placeholder_texts: dict[str, str],
    held_kit: list[dict[str, Any]],
) -> dict[str, Any]:
    from the_void_files.narrative.orchestration.effort import attribute_meanings, attribute_names

    committed_facts = build_committed_facts(public_state, investigator_placeholder_texts, held_kit)
    variable_values = committed_facts["values"]
    attributes = committed_facts["atributos"]
    variables = [
        {
            "placeholder": "{{" + variable_name + "}}",
            "meaning": meaning_text,
            "current_value": variable_values[variable_name],
        }
        for variable_name, meaning_text in controlled_variable_meanings
    ]
    for held_item in held_kit:
        identifier = held_item.get("identifier")
        if not isinstance(identifier, str):
            continue
        variables.append(
            {
                "placeholder": "{{kit_" + identifier + "}}",
                "meaning": f"Unidades que quedan de {held_item.get('visible_name') or identifier}.",
                "current_value": variable_values[f"kit_{identifier}"],
            }
        )
    return {
        "instruction": (
            "Estas variables son el registro vivo. Úsalas como placeholders; el motor las rellena y las vuelve a leer. "
            "No cambies fondos, hora, heridas, esfuerzo ni unidades salvo con un efecto permitido. "
            "Los atributos no se tiran ni se dicen como probabilidad: el motor ya contó los minutos."
        ),
        "variables": variables,
        "atributos": [
            {"significado": attribute_meanings[attribute_name], "valor": attributes[attribute_name]}
            for attribute_name in attribute_names
        ],
    }


def read_held_kit_for_context(turn_context: Any) -> list[dict[str, Any]]:
    return compact_held_kit(turn_context)


def read_public_state_for_context(turn_context: Any) -> dict[str, Any]:
    return read_public_state(turn_context)


def diff_reality_ledger(before_public_state: dict[str, Any], after_public_state: dict[str, Any]) -> dict[str, Any]:
    before_values = read_controlled_variable_values(before_public_state, {}, compact_kit_from_public_state(before_public_state))
    after_values = read_controlled_variable_values(after_public_state, {}, compact_kit_from_public_state(after_public_state))
    writes = [
        {"variable_name": variable_name, "before_value": before_value, "after_value": after_values.get(variable_name), "writer": "engine"}
        for variable_name, before_value in before_values.items()
        if after_values.get(variable_name) != before_value
    ]
    return {"writes": writes, "after_values": after_values}


def compact_kit_from_public_state(public_state: dict[str, Any]) -> list[dict[str, Any]]:
    held_kit: list[dict[str, Any]] = []
    for held_belonging in public_state.get("belonging_units") or []:
        if not isinstance(held_belonging, dict):
            continue
        belonging_identifier = held_belonging.get("belonging_identifier")
        units = held_belonging.get("units")
        if isinstance(belonging_identifier, str) and isinstance(units, int):
            held_kit.append({"identifier": belonging_identifier, "units": units, "visible_name": belonging_identifier})
    return held_kit
