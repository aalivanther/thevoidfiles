import hashlib
import json
from typing import Any


def build_canonical_json_text(content: Any) -> str:
    return json.dumps(content, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_text_content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_bytes_content_hash(content_bytes: bytes) -> str:
    return hashlib.sha256(content_bytes).hexdigest()


def compute_json_content_hash(content: Any) -> str:
    return compute_text_content_hash(build_canonical_json_text(content))
