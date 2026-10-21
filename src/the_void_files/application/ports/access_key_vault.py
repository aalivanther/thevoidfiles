from typing import Literal, Protocol, get_args

AccessKeyName = Literal["elevenlabs", "gemini", "deepseek", "openai", "groq"]
StoryProviderName = Literal["gemini", "deepseek", "openai", "groq"]

known_access_key_names: tuple[AccessKeyName, ...] = get_args(AccessKeyName)
known_story_provider_names: tuple[StoryProviderName, ...] = get_args(StoryProviderName)


def read_narrative_access_key_name(provider_name: str) -> AccessKeyName | None:
    if provider_name == "gemini":
        return "gemini"
    if provider_name == "deepseek":
        return "deepseek"
    if provider_name == "openai":
        return "openai"
    if provider_name == "groq":
        return "groq"
    return None


class AccessKeyVault(Protocol):
    def read_access_key(self, access_key_name: AccessKeyName) -> str | None: ...

    def store_access_key(self, access_key_name: AccessKeyName, access_key: str) -> None: ...

    def delete_access_key(self, access_key_name: AccessKeyName) -> None: ...
