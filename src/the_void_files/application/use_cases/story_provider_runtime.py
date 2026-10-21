from dataclasses import replace

import httpx
from fastapi import FastAPI

from the_void_files.application.ports.access_key_vault import AccessKeyVault, read_narrative_access_key_name
from the_void_files.application.ports.narrative_provider import NarrativeProvider
from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.application.use_cases.director_failures import StoryProviderSelectionRejectedError
from the_void_files.application.use_cases.story_provider_catalog import is_story_provider_selection_allowed
from the_void_files.infrastructure.ai.deepseek_provider import DeepSeekNarrativeProvider, deepseek_default_model_identifier
from the_void_files.infrastructure.ai.gemini_provider import GeminiNarrativeProvider, gemini_default_model_identifier
from the_void_files.infrastructure.ai.groq_provider import GroqNarrativeProvider, groq_default_model_identifier
from the_void_files.infrastructure.ai.openai_provider import OpenAINarrativeProvider, openai_default_model_identifier
from the_void_files.infrastructure.ai.story_provider_selection_store import (
    StoryProviderSelection,
    read_story_provider_selection,
    write_story_provider_selection,
)
from the_void_files.infrastructure.ai.synthetic_narrative_provider import SyntheticNarrativeProvider
from the_void_files.service_settings import ServiceSettings


def overlay_persisted_story_provider_selection(service_settings: ServiceSettings) -> ServiceSettings:
    story_provider_selection = read_story_provider_selection(service_settings.data_directory)
    if story_provider_selection is None:
        return service_settings
    return replace(
        service_settings,
        story_provider_name=story_provider_selection.provider_name,
        story_model_identifier=story_provider_selection.model_identifier,
    )


def read_story_model_identifier(service_settings: ServiceSettings) -> str:
    if service_settings.story_model_identifier:
        return service_settings.story_model_identifier
    if service_settings.story_provider_name == "deepseek":
        return service_settings.deepseek_model_identifier or deepseek_default_model_identifier
    if service_settings.story_provider_name == "openai":
        return service_settings.openai_model_identifier or openai_default_model_identifier
    if service_settings.story_provider_name == "groq":
        return service_settings.groq_model_identifier or groq_default_model_identifier
    return service_settings.gemini_model_identifier or gemini_default_model_identifier


def build_unwrapped_narrative_provider(
    service_settings: ServiceSettings,
    access_key_vault: AccessKeyVault,
    narrative_transport: httpx.AsyncBaseTransport | None = None,
) -> NarrativeProvider:
    if service_settings.chosen_story_provider_mode_name == "synthetic":
        return SyntheticNarrativeProvider()
    chosen_model_identifier = read_story_model_identifier(service_settings)
    if service_settings.story_provider_name == "deepseek":
        return DeepSeekNarrativeProvider(
            access_key_vault, transport=narrative_transport, model_identifier=chosen_model_identifier
        )
    if service_settings.story_provider_name == "openai":
        return OpenAINarrativeProvider(
            access_key_vault, transport=narrative_transport, model_identifier=chosen_model_identifier
        )
    if service_settings.story_provider_name == "groq":
        return GroqNarrativeProvider(
            access_key_vault, transport=narrative_transport, model_identifier=chosen_model_identifier
        )
    return GeminiNarrativeProvider(
        access_key_vault, transport=narrative_transport, model_identifier=chosen_model_identifier
    )


async def apply_story_provider_selection(application: FastAPI, story_provider_selection: StoryProviderSelection) -> None:
    if not is_story_provider_selection_allowed(
        story_provider_selection.provider_name, story_provider_selection.model_identifier
    ):
        raise StoryProviderSelectionRejectedError()
    service_dependencies = application.state.service_dependencies
    if service_dependencies.service_settings.chosen_story_provider_mode_name != "real":
        raise StoryProviderSelectionRejectedError()
    narrative_access_key_name = read_narrative_access_key_name(story_provider_selection.provider_name)
    if (
        narrative_access_key_name is None
        or service_dependencies.access_key_vault.read_access_key(narrative_access_key_name) is None
    ):
        raise StoryProviderSelectionRejectedError()
    write_story_provider_selection(service_dependencies.service_settings.data_directory, story_provider_selection)
    replaced_service_settings = replace(
        service_dependencies.service_settings,
        story_provider_name=story_provider_selection.provider_name,
        story_model_identifier=story_provider_selection.model_identifier,
    )
    previous_narrative_provider = service_dependencies.narrative_provider
    replacement_narrative_provider = RecordingNarrativeProvider(
        build_unwrapped_narrative_provider(replaced_service_settings, service_dependencies.access_key_vault),
        previous_narrative_provider.interaction_recorder,
    )
    application.state.service_dependencies = replace(
        service_dependencies,
        service_settings=replaced_service_settings,
        narrative_provider=replacement_narrative_provider,
    )
    await previous_narrative_provider.close()
