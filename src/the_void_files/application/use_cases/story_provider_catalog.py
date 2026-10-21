from the_void_files.infrastructure.ai.deepseek_provider import deepseek_default_model_identifier
from the_void_files.infrastructure.ai.gemini_provider import gemini_default_model_identifier
from the_void_files.infrastructure.ai.groq_provider import groq_default_model_identifier
from the_void_files.infrastructure.ai.openai_provider import openai_default_model_identifier

allowed_model_identifiers_by_provider_name: dict[str, tuple[str, ...]] = {
    "gemini": (gemini_default_model_identifier, "gemini-3.5-flash", "gemini-flash-latest"),
    "deepseek": (deepseek_default_model_identifier, "deepseek-flash"),
    "openai": (openai_default_model_identifier, "gpt-4.1", "gpt-4o-mini"),
    "groq": (groq_default_model_identifier, "openai/gpt-oss-20b", "qwen/qwen3.8-27b"),
}

default_model_identifier_by_provider_name: dict[str, str] = {
    "gemini": gemini_default_model_identifier,
    "deepseek": deepseek_default_model_identifier,
    "openai": openai_default_model_identifier,
    "groq": groq_default_model_identifier,
}


def build_public_story_provider_catalog() -> dict[str, list[dict[str, object]]]:
    return {
        "providers": [
            {
                "provider_name": provider_name,
                "model_identifiers": list(allowed_model_identifiers_by_provider_name[provider_name]),
                "default_model_identifier": default_model_identifier_by_provider_name[provider_name],
            }
            for provider_name in allowed_model_identifiers_by_provider_name
        ]
    }


def is_story_provider_selection_allowed(provider_name: str, model_identifier: str) -> bool:
    return model_identifier in allowed_model_identifiers_by_provider_name.get(provider_name, ())
