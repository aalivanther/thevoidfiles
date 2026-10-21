import os
from pathlib import Path


def write_file_atomically(destination_path: Path, content_bytes: bytes) -> None:
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = destination_path.with_name(destination_path.name + ".partial")
    with open(temporary_path, "wb") as temporary_file:
        temporary_file.write(content_bytes)
        temporary_file.flush()
        os.fsync(temporary_file.fileno())
    os.replace(temporary_path, destination_path)
