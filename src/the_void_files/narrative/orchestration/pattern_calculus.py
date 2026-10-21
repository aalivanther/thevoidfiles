from collections.abc import Sequence
from itertools import permutations
from typing import Any

from the_void_files.narrative.orchestration.seeded_draw import draw_index, draw_seed, mix_seed

maximum_ordered_piece_count = 7


def entropy_version_gap(seed_text: str, signal_index: int) -> int:
    return 4 + draw_index(mix_seed(draw_seed(seed_text, "entropy"), str(signal_index)), 5)


def spread_colliding_signal_versions(entropy_signals: list[Any], seed_text: str) -> list[Any]:
    if not isinstance(entropy_signals, list) or any(not isinstance(signal, dict) for signal in entropy_signals):
        return entropy_signals
    kept_version_by_index: dict[int, int] = {}
    kept_versions: set[int] = set()
    for signal_index, entropy_signal in enumerate(entropy_signals):
        version = entropy_signal.get("minimum_state_version")
        if isinstance(version, bool) or not isinstance(version, int) or version < 2 or version in kept_versions:
            continue
        kept_versions.add(version)
        kept_version_by_index[signal_index] = version
    if len(kept_version_by_index) == len(entropy_signals):
        return entropy_signals
    if not kept_version_by_index:
        spread_signals: list[Any] = []
        next_version = 2
        for signal_index, entropy_signal in enumerate(entropy_signals):
            replaced_signal = dict(entropy_signal)
            replaced_signal["minimum_state_version"] = next_version
            spread_signals.append(replaced_signal)
            next_version += entropy_version_gap(seed_text, signal_index)
        return spread_signals
    cursor = 2
    occupied_versions = set(kept_versions)
    spread_signals = []
    for signal_index, entropy_signal in enumerate(entropy_signals):
        replaced_signal = dict(entropy_signal)
        if signal_index in kept_version_by_index:
            replaced_signal["minimum_state_version"] = kept_version_by_index[signal_index]
        else:
            gap = entropy_version_gap(seed_text, signal_index)
            while cursor in occupied_versions:
                cursor += gap
            replaced_signal["minimum_state_version"] = cursor
            occupied_versions.add(cursor)
            cursor += gap
        spread_signals.append(replaced_signal)
    return spread_signals


def read_piece_seed(public_definition: dict[str, Any]) -> str:
    piece_identifier = public_definition.get("interactive_piece_identifier")
    return piece_identifier if isinstance(piece_identifier, str) and piece_identifier != "" else "pieza"


def read_order_position(order: tuple[str, ...], piece_identifier: str) -> int | None:
    if piece_identifier not in order:
        return None
    return order.index(piece_identifier)


def piece_identifier_positions(order: Sequence[str], piece_identifier: str) -> tuple[int, ...]:
    return tuple(index for index, identifier in enumerate(order) if identifier == piece_identifier)


def pair_rule_is_satisfied(rule_kind_name: str, positions: tuple[int, ...], other_positions: tuple[int, ...]) -> bool:
    if not positions or not other_positions:
        return False
    if rule_kind_name == "piece_immediately_before":
        return all(position + 1 in other_positions for position in positions) and all(
            other_position - 1 in positions for other_position in other_positions
        )
    if rule_kind_name == "pieces_not_adjacent":
        return all(abs(position - other_position) != 1 for position in positions for other_position in other_positions)
    if rule_kind_name == "piece_after":
        return min(positions) > max(other_positions)
    return False


def order_satisfies_rules(order: tuple[str, ...], rule_checks: list[Any]) -> bool:
    for rule_check in rule_checks:
        if not isinstance(rule_check, dict):
            return False
        rule_kind_name = rule_check.get("rule_kind_name")
        if rule_kind_name in ("exact_combination", "exact_shift"):
            continue
        piece_identifier = rule_check.get("piece_identifier")
        if not isinstance(piece_identifier, str):
            return False
        positions = piece_identifier_positions(order, piece_identifier)
        if rule_kind_name == "piece_at_position":
            position_index = rule_check.get("position_index")
            if isinstance(position_index, bool) or not isinstance(position_index, int):
                return False
            if len(positions) != 1 or positions[0] != position_index:
                return False
            continue
        other_piece_identifier = rule_check.get("other_piece_identifier")
        if not isinstance(other_piece_identifier, str):
            return False
        if not pair_rule_is_satisfied(
            rule_kind_name, positions, piece_identifier_positions(order, other_piece_identifier)
        ):
            return False
    return True


def playable_orders(piece_identifiers: list[str], rule_checks: list[Any], initial_order: tuple[str, ...]) -> list[tuple[str, ...]]:
    if len(piece_identifiers) < 2 or len(piece_identifiers) > maximum_ordered_piece_count:
        return []
    return [
        order
        for order in permutations(piece_identifiers)
        if order != initial_order and order_satisfies_rules(order, rule_checks)
    ]


def calculated_ordered_identifiers(
    piece_identifiers: list[str], rule_checks: list[Any], initial_order: tuple[str, ...], seed_text: str
) -> list[str] | None:
    orders = playable_orders(piece_identifiers, rule_checks, initial_order)
    if not orders:
        return None
    return list(orders[draw_index(draw_seed(seed_text, "ordered"), len(orders))])


spanish_letter_weights = {
    "A": 12.5,
    "E": 13.7,
    "I": 6.2,
    "O": 8.7,
    "U": 3.9,
    "S": 7.2,
    "R": 6.9,
    "N": 6.7,
    "L": 5.2,
    "D": 5.0,
    "C": 4.7,
    "T": 4.6,
    "M": 3.2,
    "P": 2.5,
    "B": 1.4,
    "G": 1.0,
    "V": 0.9,
    "Y": 0.9,
    "Q": 0.9,
    "H": 0.7,
    "F": 0.5,
    "Z": 0.5,
    "J": 0.4,
    "Ñ": 0.3,
    "X": 0.2,
    "K": 0.1,
    "W": 0.1,
}


def caesar_wheel_letters(alphabet_letters: list[str]) -> list[str]:
    wheel_letters: list[str] = []
    seen_letters: set[str] = set()
    for letter in alphabet_letters:
        if letter in seen_letters:
            continue
        seen_letters.add(letter)
        wheel_letters.append(letter)
    return wheel_letters


def decode_caesar_shift(ciphered_text: str, alphabet_letters: list[str], shift_positions: int) -> str:
    wheel_letters = caesar_wheel_letters(alphabet_letters)
    if not wheel_letters:
        return ciphered_text
    index_by_letter = {letter: letter_index for letter_index, letter in enumerate(wheel_letters)}
    alphabet_length = len(wheel_letters)
    decoded_characters: list[str] = []
    for character in ciphered_text:
        letter_index = index_by_letter.get(character)
        if letter_index is None:
            decoded_characters.append(character)
            continue
        decoded_characters.append(wheel_letters[(letter_index - shift_positions) % alphabet_length])
    return "".join(decoded_characters)


def letter_frequency_score(decoded_text: str) -> float:
    return sum(spanish_letter_weights.get(character.upper(), 0.0) for character in decoded_text)


def calculated_shift_positions(alphabet_letters: list[Any], ciphered_text: str, seed_text: str) -> int | None:
    if not isinstance(alphabet_letters, list) or len(alphabet_letters) < 2:
        return None
    if any(not isinstance(letter, str) or letter == "" for letter in alphabet_letters):
        return None
    wheel_letters = caesar_wheel_letters(alphabet_letters)
    if len(wheel_letters) < 2:
        return None
    if not isinstance(ciphered_text, str) or ciphered_text.strip() == "":
        return 1 + draw_index(draw_seed(seed_text, "shift"), len(wheel_letters) - 1)
    scored_shifts = [
        (
            letter_frequency_score(decode_caesar_shift(ciphered_text, wheel_letters, shift_positions)),
            shift_positions,
        )
        for shift_positions in range(1, len(wheel_letters))
    ]
    best_score = max(score for score, _shift_positions in scored_shifts)
    tied_shifts = [shift_positions for score, shift_positions in scored_shifts if score == best_score]
    if len(tied_shifts) == 1:
        return tied_shifts[0]
    return tied_shifts[draw_index(draw_seed(seed_text, "shift"), len(tied_shifts))]


def calculated_dial_symbols(dials: list[Any], seed_text: str) -> list[str] | None:
    chosen_symbols: list[str] = []
    for dial_index, dial in enumerate(dials):
        if not isinstance(dial, dict):
            return None
        symbols = dial.get("symbols")
        if not isinstance(symbols, list) or len(symbols) < 1 or any(not isinstance(symbol, str) for symbol in symbols):
            return None
        chosen_symbols.append(symbols[draw_index(mix_seed(draw_seed(seed_text, "dials"), str(dial_index)), len(symbols))])
    return chosen_symbols


def is_shift_in_range(shift_positions: Any, alphabet_length: int) -> bool:
    return (
        isinstance(shift_positions, int)
        and not isinstance(shift_positions, bool)
        and 0 < shift_positions < alphabet_length
    )


def replace_private_solution(interactive_piece: dict[str, Any], private_solution: dict[str, Any]) -> dict[str, Any]:
    replaced_piece = dict(interactive_piece)
    replaced_piece["private_solution"] = private_solution
    return replaced_piece


def repair_private_solution(interactive_piece: dict[str, Any]) -> dict[str, Any]:
    public_definition = interactive_piece.get("public_definition")
    private_solution = interactive_piece.get("private_solution")
    if not isinstance(public_definition, dict) or not isinstance(private_solution, dict):
        return interactive_piece
    public_state = public_definition.get("public_state")
    if not isinstance(public_state, dict):
        return interactive_piece
    seed_text = read_piece_seed(public_definition)
    widget_kind_name = public_state.get("widget_kind_name")
    rule_checks = interactive_piece.get("private_rule_checks")
    if not isinstance(rule_checks, list):
        rule_checks = []
    if widget_kind_name == "ordered_positions":
        pieces = public_state.get("pieces")
        if not isinstance(pieces, list):
            return interactive_piece
        piece_identifiers = [
            piece.get("piece_identifier")
            for piece in pieces
            if isinstance(piece, dict) and isinstance(piece.get("piece_identifier"), str)
        ]
        if len(piece_identifiers) != len(pieces):
            return interactive_piece
        initial_order_values = public_state.get("initial_order_piece_identifiers")
        initial_order = (
            tuple(initial_order_values)
            if isinstance(initial_order_values, list) and all(isinstance(piece_identifier, str) for piece_identifier in initial_order_values)
            else tuple()
        )
        authored_values = private_solution.get("ordered_piece_identifiers")
        authored_order = (
            tuple(authored_values)
            if isinstance(authored_values, list) and all(isinstance(piece_identifier, str) for piece_identifier in authored_values)
            else None
        )
        orders = playable_orders(piece_identifiers, rule_checks, initial_order)
        if private_solution.get("widget_kind_name") == "ordered_positions" and authored_order in orders:
            return interactive_piece
        calculated_order = calculated_ordered_identifiers(piece_identifiers, rule_checks, initial_order, seed_text)
        if calculated_order is None:
            return interactive_piece
        return replace_private_solution(
            interactive_piece,
            {"widget_kind_name": "ordered_positions", "ordered_piece_identifiers": calculated_order},
        )
    if widget_kind_name == "cipher_wheel":
        alphabet_letters = public_state.get("alphabet_letters")
        if isinstance(alphabet_letters, list) and all(isinstance(letter, str) for letter in alphabet_letters):
            alphabet_length = len(caesar_wheel_letters(alphabet_letters))
        else:
            alphabet_length = len(alphabet_letters) if isinstance(alphabet_letters, list) else 0
        if (
            private_solution.get("widget_kind_name") == "cipher_wheel"
            and is_shift_in_range(private_solution.get("shift_positions"), alphabet_length)
        ):
            return interactive_piece
        ciphered_text = public_state.get("ciphered_text")
        shift_positions = calculated_shift_positions(
            alphabet_letters if isinstance(alphabet_letters, list) else [],
            ciphered_text if isinstance(ciphered_text, str) else "",
            seed_text,
        )
        if shift_positions is None:
            return interactive_piece
        return replace_private_solution(
            interactive_piece,
            {"widget_kind_name": "cipher_wheel", "shift_positions": shift_positions},
        )
    if widget_kind_name == "combination_dials":
        dials = public_state.get("dials")
        if not isinstance(dials, list) or len(dials) < 1:
            return interactive_piece
        if private_solution.get("widget_kind_name") == "combination_dials":
            return interactive_piece
        chosen_symbols = calculated_dial_symbols(dials, seed_text)
        if chosen_symbols is None:
            return interactive_piece
        return replace_private_solution(
            interactive_piece,
            {"widget_kind_name": "combination_dials", "chosen_symbols": chosen_symbols},
        )
    return interactive_piece
