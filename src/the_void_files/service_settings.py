import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from the_void_files.application.ports.access_key_vault import StoryProviderName, known_story_provider_names

ProviderModeName = Literal["synthetic", "real"]
CaseMaterialSourceName = Literal["curated", "generated"]
TurnAdjudicationSwitchName = Literal["on", "off"]

service_host_address = "127.0.0.1"
service_port_number = 8765
development_port_number = 5173
allowed_host_names = ("127.0.0.1", "localhost")
provider_mode_environment_variable_name = "THE_VOID_FILES_PROVIDER_MODE"
data_directory_environment_variable_name = "THE_VOID_FILES_DATA_DIRECTORY"
story_provider_mode_environment_variable_name = "THE_VOID_FILES_STORY_PROVIDER_MODE"
voice_provider_mode_environment_variable_name = "THE_VOID_FILES_VOICE_PROVIDER_MODE"
gemini_model_environment_variable_name = "THE_VOID_FILES_GEMINI_MODEL"
story_provider_name_environment_variable_name = "THE_VOID_FILES_STORY_PROVIDER_NAME"
deepseek_model_environment_variable_name = "THE_VOID_FILES_DEEPSEEK_MODEL"
case_material_source_environment_variable_name = "THE_VOID_FILES_CASE_MATERIAL_SOURCE"
turn_adjudication_environment_variable_name = "THE_VOID_FILES_TURN_ADJUDICATION"
project_root_directory = Path(__file__).resolve().parent.parent.parent


class ProviderModeUnknownError(ValueError):
    pass


class CaseMaterialSourceUnknownError(ValueError):
    pass


class TurnAdjudicationSwitchUnknownError(ValueError):
    pass


class StoryProviderNameUnknownError(ValueError):
    pass


@dataclass(frozen=True)
class ServiceSettings:
    data_directory: Path
    migrations_directory: Path
    frontend_distribution_directory: Path
    provider_mode_name: ProviderModeName
    story_provider_mode_name: ProviderModeName | None = None
    voice_provider_mode_name: ProviderModeName | None = None
    gemini_model_identifier: str | None = None
    story_provider_name: StoryProviderName = "gemini"
    deepseek_model_identifier: str | None = None
    openai_model_identifier: str | None = None
    groq_model_identifier: str | None = None
    story_model_identifier: str | None = None
    case_material_source_name: CaseMaterialSourceName = "curated"
    turn_adjudication_switch_name: TurnAdjudicationSwitchName = "on"

    @property
    def is_turn_adjudication_enabled(self) -> bool:
        return self.turn_adjudication_switch_name == "on"

    @property
    def chosen_story_provider_mode_name(self) -> ProviderModeName:
        return self.story_provider_mode_name if self.story_provider_mode_name is not None else self.provider_mode_name

    @property
    def chosen_voice_provider_mode_name(self) -> ProviderModeName:
        return self.voice_provider_mode_name if self.voice_provider_mode_name is not None else self.provider_mode_name

    @property
    def allowed_browser_origins(self) -> list[str]:
        return [
            f"http://{allowed_host_name}:{port_number}"
            for port_number in (development_port_number, service_port_number)
            for allowed_host_name in allowed_host_names
        ]


def parse_provider_mode_name(candidate_name: str) -> ProviderModeName:
    if candidate_name == "synthetic":
        return "synthetic"
    if candidate_name == "real":
        return "real"
    raise ProviderModeUnknownError(candidate_name)


def parse_case_material_source_name(candidate_name: str) -> CaseMaterialSourceName:
    if candidate_name == "curated":
        return "curated"
    if candidate_name == "generated":
        return "generated"
    raise CaseMaterialSourceUnknownError(candidate_name)


def case_material_source_name_for_provider_mode(provider_mode_name: ProviderModeName) -> CaseMaterialSourceName:
    if provider_mode_name == "real":
        return "generated"
    return "curated"


def parse_story_provider_name(candidate_name: str) -> StoryProviderName:
    for known_story_provider_name in known_story_provider_names:
        if known_story_provider_name == candidate_name:
            return known_story_provider_name
    raise StoryProviderNameUnknownError(candidate_name)


def parse_turn_adjudication_switch_name(candidate_name: str) -> TurnAdjudicationSwitchName:
    if candidate_name == "on":
        return "on"
    if candidate_name == "off":
        return "off"
    raise TurnAdjudicationSwitchUnknownError(candidate_name)


def build_default_service_settings(
    provider_mode_name: ProviderModeName = "synthetic",
    data_directory: Path | None = None,
    story_provider_mode_name: ProviderModeName | None = None,
    voice_provider_mode_name: ProviderModeName | None = None,
    gemini_model_identifier: str | None = None,
    story_provider_name: StoryProviderName = "gemini",
    deepseek_model_identifier: str | None = None,
    openai_model_identifier: str | None = None,
    groq_model_identifier: str | None = None,
    story_model_identifier: str | None = None,
    case_material_source_name: CaseMaterialSourceName | None = None,
    turn_adjudication_switch_name: TurnAdjudicationSwitchName = "on",
) -> ServiceSettings:
    return ServiceSettings(
        data_directory=data_directory if data_directory is not None else project_root_directory / "data",
        migrations_directory=project_root_directory / "database" / "migrations",
        frontend_distribution_directory=project_root_directory / "frontend" / "dist",
        provider_mode_name=provider_mode_name,
        story_provider_mode_name=story_provider_mode_name,
        voice_provider_mode_name=voice_provider_mode_name,
        gemini_model_identifier=gemini_model_identifier,
        story_provider_name=story_provider_name,
        deepseek_model_identifier=deepseek_model_identifier,
        openai_model_identifier=openai_model_identifier,
        groq_model_identifier=groq_model_identifier,
        story_model_identifier=story_model_identifier,
        case_material_source_name=(
            case_material_source_name
            if case_material_source_name is not None
            else case_material_source_name_for_provider_mode(provider_mode_name)
        ),
        turn_adjudication_switch_name=turn_adjudication_switch_name,
    )


def read_optional_provider_mode_name(environment_variable_name: str) -> ProviderModeName | None:
    configured_mode_name = os.environ.get(environment_variable_name)
    return parse_provider_mode_name(configured_mode_name) if configured_mode_name else None


def read_service_settings_from_environment() -> ServiceSettings:
    configured_data_directory = os.environ.get(data_directory_environment_variable_name)
    provider_mode_name = parse_provider_mode_name(
        os.environ.get(provider_mode_environment_variable_name, "synthetic")
    )
    configured_case_material_source_name = os.environ.get(case_material_source_environment_variable_name)
    return build_default_service_settings(
        provider_mode_name=provider_mode_name,
        data_directory=Path(configured_data_directory) if configured_data_directory else None,
        story_provider_mode_name=read_optional_provider_mode_name(story_provider_mode_environment_variable_name),
        voice_provider_mode_name=read_optional_provider_mode_name(voice_provider_mode_environment_variable_name),
        gemini_model_identifier=os.environ.get(gemini_model_environment_variable_name) or None,
        story_provider_name=parse_story_provider_name(
            os.environ.get(story_provider_name_environment_variable_name) or "gemini"
        ),
        deepseek_model_identifier=os.environ.get(deepseek_model_environment_variable_name) or None,
        case_material_source_name=(
            parse_case_material_source_name(configured_case_material_source_name)
            if configured_case_material_source_name
            else case_material_source_name_for_provider_mode(provider_mode_name)
        ),
        turn_adjudication_switch_name=parse_turn_adjudication_switch_name(
            os.environ.get(turn_adjudication_environment_variable_name) or "on"
        ),
    )
