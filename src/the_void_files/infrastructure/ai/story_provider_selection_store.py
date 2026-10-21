import json
from pathlib import Path

from pydantic import BaseModel, ValidationError

from the_void_files.application.ports.access_key_vault import StoryProviderName
from the_void_files.application.use_cases.story_provider_catalog import is_story_provider_selection_allowed

story_provider_selection_file_name = "story_provider_selection.json"


class StoryProviderSelection(BaseModel):
    provider_name: StoryProviderName
    model_identifier: str


def story_provider_selection_path(data_directory: Path) -> Path:
    return data_directory / story_provider_selection_file_name


def read_story_provider_selection(data_directory: Path) -> StoryProviderSelection | None:
    selection_path = story_provider_selection_path(data_directory)
    if not selection_path.is_file():
        return None
    try:
        selection = StoryProviderSelection.model_validate(json.loads(selection_path.read_text(encoding="utf-8")))
    except (OSError, ValueError, ValidationError):
        return None
    if not is_story_provider_selection_allowed(selection.provider_name, selection.model_identifier):
        return None
    return selection


def write_story_provider_selection(data_directory: Path, selection: StoryProviderSelection) -> None:
    data_directory.mkdir(parents=True, exist_ok=True)
    story_provider_selection_path(data_directory).write_text(
        selection.model_dump_json(),
        encoding="utf-8",
    )
