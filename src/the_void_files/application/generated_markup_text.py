import html
import re
from typing import Any

html_entity_pattern = re.compile(r"&(?:#x?[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]+);")
maximum_markup_decode_passes = 3


def decode_generated_markup_text(raw_text: str) -> str:
    decoded_text = raw_text
    for _ in range(maximum_markup_decode_passes):
        if html_entity_pattern.search(decoded_text) is None:
            return decoded_text
        next_decoded_text = html.unescape(decoded_text)
        if next_decoded_text == decoded_text:
            return decoded_text
        decoded_text = next_decoded_text
    return decoded_text


def decode_generated_markup_in_value(value: Any) -> Any:
    if isinstance(value, str):
        return decode_generated_markup_text(value)
    if isinstance(value, list):
        return [decode_generated_markup_in_value(item) for item in value]
    if isinstance(value, dict):
        return {field_name: decode_generated_markup_in_value(field_value) for field_name, field_value in value.items()}
    return value
