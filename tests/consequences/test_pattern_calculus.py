import copy
import json
from pathlib import Path

from the_void_files.application.use_cases.case_start_specification_models import CaseInteractivePiece
from the_void_files.application.use_cases.consequence_turn_requests import OrderedPositionsSubmittedValue
from the_void_files.application.use_cases.consequence_turn_resolution import find_violated_visible_rule_texts
from the_void_files.narrative.case_reviewer import (
    review_case_specification_proposal,
    review_interactive_piece,
)
from the_void_files.narrative.case_specification_preparation import prepare_case_specification_proposal
from the_void_files.narrative.orchestration.pattern_calculus import (
    calculated_dial_symbols,
    decode_caesar_shift,
    letter_frequency_score,
    order_satisfies_rules,
    repair_private_solution,
    spread_colliding_signal_versions,
)

lighthouse_whisper_identifier = "lighthouse_counts_one_more"


def read_lighthouse_specification() -> dict:
    specification_path = (
        Path(__file__).resolve().parents[2]
        / "content"
        / "synthetic_cases"
        / "lighthouse_counts_one_more"
        / "case_specification.json"
    )
    return json.loads(specification_path.read_text(encoding="utf-8"))


def test_a_valid_lighthouse_pattern_is_left_alone_and_a_broken_one_is_calculated():
    specification = read_lighthouse_specification()
    ordered_piece = specification["interactive_pieces"][2]
    authored_order = ordered_piece["private_solution"]["ordered_piece_identifiers"]
    assert order_satisfies_rules(tuple(authored_order), ordered_piece["private_rule_checks"])
    assert repair_private_solution(ordered_piece)["private_solution"] == ordered_piece["private_solution"]
    broken_piece = copy.deepcopy(ordered_piece)
    broken_piece["private_solution"]["ordered_piece_identifiers"] = list(
        broken_piece["public_definition"]["public_state"]["initial_order_piece_identifiers"]
    )
    repaired_piece = repair_private_solution(broken_piece)
    repaired_again = repair_private_solution(broken_piece)
    repaired_order = repaired_piece["private_solution"]["ordered_piece_identifiers"]
    assert repaired_order == repaired_again["private_solution"]["ordered_piece_identifiers"]
    assert repaired_order != broken_piece["public_definition"]["public_state"]["initial_order_piece_identifiers"]
    assert order_satisfies_rules(tuple(repaired_order), broken_piece["private_rule_checks"])


def test_an_out_of_range_shift_is_the_spanish_frequency_fit_and_a_missing_dial_pattern_is_filled():
    specification = read_lighthouse_specification()
    cipher_piece = copy.deepcopy(specification["interactive_pieces"][1])
    public_state = cipher_piece["public_definition"]["public_state"]
    cipher_piece["private_solution"] = {"widget_kind_name": "cipher_wheel", "shift_positions": 0}
    repaired_cipher = repair_private_solution(cipher_piece)
    assert repaired_cipher["private_solution"]["shift_positions"] == 9
    decoded_text = decode_caesar_shift(public_state["ciphered_text"], public_state["alphabet_letters"], 9)
    assert decoded_text.startswith("ERAN DIEZ.")
    dial_piece = copy.deepcopy(specification["interactive_pieces"][0])
    short_solution = {"widget_kind_name": "combination_dials", "chosen_symbols": ["3", "1"]}
    dial_piece["private_solution"] = short_solution
    assert repair_private_solution(dial_piece)["private_solution"] == short_solution
    dial_piece["private_solution"] = {"widget_kind_name": "cipher_wheel", "shift_positions": 1}
    dials = dial_piece["public_definition"]["public_state"]["dials"]
    filled_symbols = repair_private_solution(dial_piece)["private_solution"]["chosen_symbols"]
    assert filled_symbols == calculated_dial_symbols(dials, dial_piece["public_definition"]["interactive_piece_identifier"])
    assert all(chosen_symbol in dial["symbols"] for chosen_symbol, dial in zip(filled_symbols, dials))


def test_colliding_entropy_versions_are_spread_and_the_lighthouse_clock_is_kept():
    specification = read_lighthouse_specification()
    original_versions = [
        entropy_signal["minimum_state_version"] for entropy_signal in specification["clocks"]["entropy_signals"]
    ]
    assert spread_colliding_signal_versions(specification["clocks"]["entropy_signals"], lighthouse_whisper_identifier)[
        0
    ]["minimum_state_version"] == original_versions[0]
    colliding_signals = copy.deepcopy(specification["clocks"]["entropy_signals"])
    for entropy_signal in colliding_signals:
        entropy_signal["minimum_state_version"] = 4
    spread_signals = spread_colliding_signal_versions(colliding_signals, lighthouse_whisper_identifier)
    spread_again = spread_colliding_signal_versions(colliding_signals, lighthouse_whisper_identifier)
    spread_versions = [entropy_signal["minimum_state_version"] for entropy_signal in spread_signals]
    assert spread_versions == [entropy_signal["minimum_state_version"] for entropy_signal in spread_again]
    assert spread_versions[0] >= 2
    assert len(set(spread_versions)) == len(spread_versions)
    assert spread_versions != [4, 4]


def test_preparation_repairs_a_broken_pattern_and_keeps_the_lighthouse_solutions():
    specification = read_lighthouse_specification()
    prepared_specification = prepare_case_specification_proposal(specification, lighthouse_whisper_identifier)
    assert [
        interactive_piece["private_solution"] for interactive_piece in prepared_specification["interactive_pieces"]
    ] == [interactive_piece["private_solution"] for interactive_piece in specification["interactive_pieces"]]
    assert [
        entropy_signal["minimum_state_version"]
        for entropy_signal in prepared_specification["clocks"]["entropy_signals"]
    ] == [10, 18]
    broken_specification = copy.deepcopy(specification)
    broken_piece = broken_specification["interactive_pieces"][2]
    broken_piece["private_solution"]["ordered_piece_identifiers"] = list(
        broken_piece["public_definition"]["public_state"]["initial_order_piece_identifiers"]
    )
    for entropy_signal in broken_specification["clocks"]["entropy_signals"]:
        entropy_signal["minimum_state_version"] = 3
    repaired_specification = prepare_case_specification_proposal(broken_specification, lighthouse_whisper_identifier)
    case_review = review_case_specification_proposal(repaired_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted
    repaired_order = repaired_specification["interactive_pieces"][2]["private_solution"]["ordered_piece_identifiers"]
    assert repaired_order != broken_piece["public_definition"]["public_state"]["initial_order_piece_identifiers"]
    repaired_versions = [
        entropy_signal["minimum_state_version"]
        for entropy_signal in repaired_specification["clocks"]["entropy_signals"]
    ]
    assert len(set(repaired_versions)) == len(repaired_versions)
    assert min(repaired_versions) >= 2


def test_a_valid_entropy_version_stays_beside_a_bad_sibling():
    def spread_versions(values, seed_text):
        entropy_signals = [{"minimum_state_version": value} for value in values]
        spread_signals = spread_colliding_signal_versions(entropy_signals, seed_text)
        return [entropy_signal["minimum_state_version"] for entropy_signal in spread_signals]

    assert spread_versions([10, 18], lighthouse_whisper_identifier) == [10, 18]
    assert spread_versions([10, 3], lighthouse_whisper_identifier) == [10, 3]
    assert spread_versions([3, 10], lighthouse_whisper_identifier) == [3, 10]
    assert spread_versions([18, True], lighthouse_whisper_identifier) == [18, 2]
    assert spread_versions([18, 18], lighthouse_whisper_identifier) == [18, 2]
    assert spread_versions([4, 4], lighthouse_whisper_identifier) == [4, 2]
    assert spread_versions([2, True], "caso") == [2, 9]
    assert spread_versions([True, True, 10], "caso") == [2, 6, 10]
    assert spread_versions([True, True], "caso") == [2, 6]
    assert spread_versions([True, 2], "caso") == [6, 2]


def test_piece_at_position_accepts_only_a_real_integer_slot():
    order = ("a", "b")

    def rule(piece_identifier: str, position_index: object) -> list[dict]:
        return [
            {
                "rule_kind_name": "piece_at_position",
                "piece_identifier": piece_identifier,
                "position_index": position_index,
            }
        ]

    assert order_satisfies_rules(order, rule("b", True)) is False
    assert order_satisfies_rules(order, rule("a", False)) is False
    assert order_satisfies_rules(order, rule("b", 1.0)) is False
    assert order_satisfies_rules(order, rule("b", "1")) is False
    assert order_satisfies_rules(order, rule("a", 0)) is True
    assert order_satisfies_rules(order, rule("b", 1)) is True


def test_a_repeated_piece_identifier_is_judged_by_every_copy():
    def rule(rule_kind_name: str, piece_identifier: str, other_piece_identifier: str | None = None, position_index: object | None = None) -> list[dict]:
        rule_check = {"rule_kind_name": rule_kind_name, "piece_identifier": piece_identifier}
        if other_piece_identifier is not None:
            rule_check["other_piece_identifier"] = other_piece_identifier
        if position_index is not None:
            rule_check["position_index"] = position_index
        return [rule_check]

    assert order_satisfies_rules(("a", "c", "b", "a"), rule("pieces_not_adjacent", "a", "b")) is False
    assert order_satisfies_rules(("a", "x", "b", "y", "a"), rule("pieces_not_adjacent", "a", "b")) is True
    assert order_satisfies_rules(("a", "b", "a"), rule("piece_immediately_before", "a", "b")) is False
    assert order_satisfies_rules(("a", "b"), rule("piece_immediately_before", "a", "b")) is True
    assert order_satisfies_rules(("b", "a", "b"), rule("piece_after", "a", "b")) is False
    assert order_satisfies_rules(("b", "a"), rule("piece_after", "a", "b")) is True
    assert order_satisfies_rules(("a", "b", "a"), rule("piece_at_position", "a", position_index=0)) is False
    assert order_satisfies_rules(("a", "b"), rule("piece_at_position", "b", position_index=1)) is True
    assert order_satisfies_rules(("a", "b", "b"), rule("piece_immediately_before", "a", "b")) is False
    assert order_satisfies_rules(("a", "b", "a", "b"), rule("piece_immediately_before", "a", "b")) is True
    assert order_satisfies_rules(("a", "b", "a"), rule("piece_after", "a", "b")) is False

    piece = copy.deepcopy(read_lighthouse_specification()["interactive_pieces"][2])
    piece["public_definition"]["visible_rule_texts"] = ["Esas placas no se tocan."]
    piece["public_definition"]["public_state"]["pieces"] = [
        {"piece_identifier": "a", "visible_name": "Placa a", "symbol_name": "mark_a"},
        {"piece_identifier": "c", "visible_name": "Placa c", "symbol_name": "mark_c"},
        {"piece_identifier": "b", "visible_name": "Placa b", "symbol_name": "mark_b"},
        {"piece_identifier": "a", "visible_name": "Placa a otra", "symbol_name": "mark_a_two"},
    ]
    piece["public_definition"]["public_state"]["initial_order_piece_identifiers"] = ["a", "a", "b", "c"]
    piece["public_definition"]["public_state"]["position_labels"] = ["Uno", "Dos", "Tres", "Cuatro"]
    piece["private_solution"]["ordered_piece_identifiers"] = ["a", "c", "b", "a"]
    piece["private_rule_checks"] = [
        {
            "rule_kind_name": "pieces_not_adjacent",
            "piece_identifier": "a",
            "other_piece_identifier": "b",
            "visible_rule_text": "Esas placas no se tocan.",
        }
    ]
    interactive_piece = CaseInteractivePiece.model_validate(piece)
    review_errors = review_interactive_piece(interactive_piece)
    assert [review_error.error_name for review_error in review_errors] == ["interactive_piece_solution_breaks_visible_rule"]
    violated_rule_texts = find_violated_visible_rule_texts(
        interactive_piece,
        OrderedPositionsSubmittedValue(
            widget_kind_name="ordered_positions",
            ordered_piece_identifiers=["a", "c", "b", "a"],
        ),
    )
    assert violated_rule_texts == ["Esas placas no se tocan."]


def test_a_repeated_alphabet_letter_does_not_lengthen_the_caesar_wheel():
    cipher_piece = copy.deepcopy(read_lighthouse_specification()["interactive_pieces"][1])
    public_state = cipher_piece["public_definition"]["public_state"]
    lengthened_alphabet = public_state["alphabet_letters"] + ["A"]
    assert decode_caesar_shift(public_state["ciphered_text"], lengthened_alphabet, 9).startswith("ERAN DIEZ.")
    cipher_piece["public_definition"]["public_state"]["alphabet_letters"] = lengthened_alphabet
    cipher_piece["private_solution"] = {"widget_kind_name": "cipher_wheel", "shift_positions": 9}
    assert repair_private_solution(cipher_piece)["private_solution"]["shift_positions"] == 9
    cipher_piece["private_solution"] = {"widget_kind_name": "cipher_wheel", "shift_positions": 26}
    assert repair_private_solution(cipher_piece)["private_solution"]["shift_positions"] == 9


def test_a_lowercase_disk_still_picks_the_spanish_frequency_shift():
    cipher_piece = copy.deepcopy(read_lighthouse_specification()["interactive_pieces"][1])
    public_state = cipher_piece["public_definition"]["public_state"]
    public_state["alphabet_letters"] = [letter.lower() for letter in public_state["alphabet_letters"]]
    public_state["ciphered_text"] = public_state["ciphered_text"].lower()
    cipher_piece["private_solution"] = {"widget_kind_name": "cipher_wheel", "shift_positions": 0}
    assert repair_private_solution(cipher_piece)["private_solution"]["shift_positions"] == 9
    assert decode_caesar_shift(public_state["ciphered_text"], public_state["alphabet_letters"], 9).startswith("eran diez.")
    assert letter_frequency_score("ñ") == letter_frequency_score("Ñ")
    assert letter_frequency_score("Á") == 0
