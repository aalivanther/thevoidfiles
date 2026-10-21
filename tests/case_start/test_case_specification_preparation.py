import copy

from case_start.conftest import lighthouse_whisper_identifier, read_lighthouse_case_specification
from the_void_files.narrative.case_reviewer import review_case_specification_proposal
from the_void_files.application.generated_markup_text import decode_generated_markup_text
from the_void_files.narrative.case_specification_preparation import (
    normalize_identifier_text,
    prepare_case_specification_proposal,
    salvage_interactive_piece,
)


def test_normalize_identifier_text_rewrites_hyphens_and_uppercase():
    assert normalize_identifier_text("Susurro-Archivo_Perdido") == "susurro_archivo_perdido"
    assert normalize_identifier_text("  ") == "unnamed"


def test_prepared_lighthouse_specification_stays_accepted():
    prepared_specification = prepare_case_specification_proposal(
        read_lighthouse_case_specification(), lighthouse_whisper_identifier
    )
    case_review = review_case_specification_proposal(prepared_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted
    assert case_review.validation_errors == []


def test_hyphenated_whisper_identifier_is_forced_to_the_chosen_offer():
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    broken_specification["whisper_identifier"] = "Lighthouse-Counts-One-More"
    prepared_specification = prepare_case_specification_proposal(
        broken_specification, lighthouse_whisper_identifier
    )
    assert prepared_specification["whisper_identifier"] == lighthouse_whisper_identifier
    case_review = review_case_specification_proposal(prepared_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted


def test_unusable_unpresented_interactive_piece_is_dropped():
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    extra_piece = copy.deepcopy(broken_specification["interactive_pieces"][0])
    extra_piece["public_definition"]["interactive_piece_identifier"] = "candado_roto"
    extra_piece["private_rule_checks"] = []
    broken_specification["interactive_pieces"].append(extra_piece)
    prepared_specification = prepare_case_specification_proposal(
        broken_specification, lighthouse_whisper_identifier
    )
    remaining_piece_identifiers = {
        interactive_piece["public_definition"]["interactive_piece_identifier"]
        for interactive_piece in prepared_specification["interactive_pieces"]
    }
    assert "candado_roto" not in remaining_piece_identifiers
    case_review = review_case_specification_proposal(prepared_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted


def test_case_specific_belonging_is_kept():
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    broken_specification["belongings"].append(
        {
            "identifier": "bitacora_de_campo",
            "visible_name": "Bitácora de campo",
            "visible_unit_description": "Un cuaderno grapado con lomo de tela.",
        }
    )
    broken_specification["initial_state"]["issued_belonging_units"].append(
        {"belonging_identifier": "bitacora_de_campo", "units": 1}
    )
    prepared_specification = prepare_case_specification_proposal(
        broken_specification, lighthouse_whisper_identifier
    )
    issued_identifiers = [
        issued_belonging["belonging_identifier"]
        for issued_belonging in prepared_specification["initial_state"]["issued_belonging_units"]
    ]
    assert "bitacora_de_campo" in issued_identifiers
    case_review = review_case_specification_proposal(prepared_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted


def test_opening_scene_endings_are_stripped_and_a_person_is_made_present():
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    first_scene = broken_specification["scenes"][0]
    first_scene["action_branches"][0]["default_outcome"]["archive_ending_identifier"] = "ending_fixed_shutters"
    first_scene["present_persons"] = []
    prepared_specification = prepare_case_specification_proposal(
        broken_specification, lighthouse_whisper_identifier
    )
    prepared_first_scene = prepared_specification["scenes"][0]
    assert prepared_first_scene["action_branches"][0]["default_outcome"]["archive_ending_identifier"] is None
    assert prepared_first_scene["present_persons"]
    case_review = review_case_specification_proposal(prepared_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted


def test_unknown_belonging_is_replaced_with_a_canonical_one():
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    broken_specification["initial_state"]["issued_belonging_units"][0]["belonging_identifier"] = "linterna-de-mano"
    prepared_specification = prepare_case_specification_proposal(
        broken_specification, lighthouse_whisper_identifier
    )
    assert (
        prepared_specification["initial_state"]["issued_belonging_units"][0]["belonging_identifier"] == "hand_lantern"
    )
    case_review = review_case_specification_proposal(prepared_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted


def test_html_entities_are_decoded_in_visible_text():
    assert decode_generated_markup_text("ANOMAL&Iacute;A EN LA BAH&Iacute;A") == "ANOMALÍA EN LA BAHÍA"
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    broken_specification["archive_title"] = "El faro que cuenta de m&aacute;s"
    prepared_specification = prepare_case_specification_proposal(
        broken_specification, lighthouse_whisper_identifier
    )
    assert prepared_specification["archive_title"] == "El faro que cuenta de más"


def test_free_text_fallback_cannot_close_the_archive():
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    broken_specification["scenes"][0]["free_text_fallback_outcome"]["archive_ending_identifier"] = "ending_fixed_shutters"
    prepared_specification = prepare_case_specification_proposal(
        broken_specification, lighthouse_whisper_identifier
    )
    assert prepared_specification["scenes"][0]["free_text_fallback_outcome"]["archive_ending_identifier"] is None


def test_a_missing_medium_hint_does_not_claim_an_order_on_a_lock_or_a_wheel():
    specification = read_lighthouse_case_specification()

    def piece_without_medium(interactive_piece):
        stripped_piece = copy.deepcopy(interactive_piece)
        stripped_piece["assistance_texts"] = [
            assistance_text
            for assistance_text in stripped_piece["assistance_texts"]
            if assistance_text["level_name"] != "medium"
        ]
        return stripped_piece

    def medium_hint(interactive_piece):
        salvaged_piece = salvage_interactive_piece(interactive_piece)
        return next(
            assistance_text["public_hint_text"]
            for assistance_text in salvaged_piece["assistance_texts"]
            if assistance_text["level_name"] == "medium"
        )

    lock_hint = medium_hint(piece_without_medium(specification["interactive_pieces"][0]))
    assert lock_hint == "Los signos de cada dial ya están a la vista y se pueden cotejar."
    assert "orden" not in lock_hint
    wheel_hint = medium_hint(piece_without_medium(specification["interactive_pieces"][1]))
    assert wheel_hint == "Las letras y el texto cifrado ya están a la vista y se pueden cotejar."
    assert "orden" not in wheel_hint
    order_hint = medium_hint(piece_without_medium(specification["interactive_pieces"][2]))
    assert order_hint == "Hay un orden que se puede comprobar a simple vista."
    unknown_piece = piece_without_medium(specification["interactive_pieces"][0])
    unknown_piece["public_definition"]["public_state"]["widget_kind_name"] = "unknown_widget"
    unknown_hint = medium_hint(unknown_piece)
    assert unknown_hint == "Lo que la pieza muestra se puede comprobar a simple vista."
    assert "orden" not in unknown_hint
    kept_piece = copy.deepcopy(specification["interactive_pieces"][0])
    for assistance_text in kept_piece["assistance_texts"]:
        if assistance_text["level_name"] == "medium":
            assistance_text["public_hint_text"] = "Pista escrita."
    assert medium_hint(kept_piece) == "Pista escrita."


def test_a_decoded_iacute_rule_matches_and_the_piece_is_kept():
    specification = copy.deepcopy(read_lighthouse_case_specification())
    interactive_piece = specification["interactive_pieces"][0]
    piece_identifier = interactive_piece["public_definition"]["interactive_piece_identifier"]
    interactive_piece["public_definition"]["visible_rule_texts"] = ["Aqu&iacute; marca el dial."]
    copied_rule_check = copy.deepcopy(interactive_piece["private_rule_checks"][0])
    copied_rule_check["visible_rule_text"] = "Aquí marca el dial."
    interactive_piece["private_rule_checks"] = [copied_rule_check]
    narration_paragraphs = specification["scenes"][0]["arrival_entries"][0]["marked_paragraphs"]
    assert isinstance(narration_paragraphs[0], str)
    narration_paragraphs[0] = "&amp;amp;amp;amp;"
    prepared_specification = prepare_case_specification_proposal(specification, lighthouse_whisper_identifier)
    prepared_piece = prepared_specification["interactive_pieces"][0]
    assert prepared_piece["public_definition"]["interactive_piece_identifier"] == piece_identifier
    assert prepared_piece["public_definition"]["visible_rule_texts"] == ["Aquí marca el dial."]
    assert any(
        rule_check.get("visible_rule_text") == "Aquí marca el dial."
        for rule_check in prepared_piece["private_rule_checks"]
    )
    prepared_paragraph = prepared_specification["scenes"][0]["arrival_entries"][0]["marked_paragraphs"][0]
    assert prepared_paragraph == "&amp;"
    assert prepared_paragraph != "&"
