from typing import Any


def build_investigator_generation_context(chronicle_state: Any) -> dict[str, Any]:
    if not isinstance(chronicle_state, dict):
        return {}
    registration = chronicle_state.get("investigatorRegistration")
    registration = registration if isinstance(registration, dict) else {}
    context: dict[str, Any] = {}
    for source, target in (
        ("fullName", "full_name"), ("originPlace", "origin_place"), ("residencePlace", "residence_place")
    ):
        value = registration.get(source)
        if isinstance(value, str) and value.strip():
            context[target] = value.strip()
    anchor = registration.get("relationalAnchor")
    if isinstance(anchor, dict) and anchor.get("kind") in ("person", "uprooted"):
        context["relational_anchor"] = {
            key: anchor[key] for key in ("kind", "personName", "bondDescription") if isinstance(anchor.get(key), str)
        }
    stance = chronicle_state.get("oicnauStance")
    if stance in ("sanctioned_operative", "independent_ally", "refused_offer"):
        context["oicnau_stance"] = stance
    attributes = chronicle_state.get("investigatorAttributes")
    if isinstance(attributes, dict):
        context["investigator_attributes"] = {
            key: value for key, value in attributes.items()
            if key in ("im", "if", "c", "o", "co", "m", "s") and type(value) is int and 0 <= value <= 50
        }
    return context
