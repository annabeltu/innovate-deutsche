"""Application settings, read once from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.schemas.shared import Language

REPO_ROOT = Path(__file__).resolve().parents[2]
TEN_MEGABYTES = 10 * 1024 * 1024


class Settings(BaseSettings):
    """Every config value the API reads. Override any field with an env var of the same name."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_path: Path = Path("kompass.db")
    question_bank_dir: Path = REPO_ROOT / "data" / "question_bank"
    lesson_templates_dir: Path = REPO_ROOT / "data" / "lesson_templates"
    findex_dir: Path = REPO_ROOT / "data" / "findex"
    # Browser origins allowed to call the API (Expo web in local development).
    cors_allowed_origins: list[str] = Field(
        default=["http://localhost:8081", "http://127.0.0.1:8081"],
        validation_alias=AliasChoices("cors_allowed_origins", "cors_allow_origins"),
    )
    # Local-only test pages under /dev; off unless explicitly enabled.
    dev_tools_enabled: bool = False
    # LLM (OpenAI). With no key, lessons keep their original English wording.
    llm_api_key: SecretStr | None = None
    llm_model: str | None = None
    llm_base_url: str = "https://api.openai.com/v1"
    llm_timeout_seconds: float = Field(default=20.0, gt=0)
    # Optional reasoning effort for reasoning models, e.g. "low"; unset sends none.
    llm_reasoning_effort: str | None = None

    # Voice: speech-to-text (any OpenAI-compatible transcription endpoint).
    whisper_api_key: SecretStr | None = None
    whisper_api_url: str = "https://api.openai.com/v1/audio/transcriptions"
    whisper_model: str = "whisper-1"
    # Development only: return a labeled fixture transcript when no key is set.
    voice_dev_fixtures: bool = False
    voice_max_audio_bytes: int = TEN_MEGABYTES

    # Voice: text-to-speech (any OpenAI-compatible speech endpoint).
    tts_api_key: SecretStr | None = None
    tts_api_url: str = "https://api.openai.com/v1/audio/speech"
    tts_model: str = "tts-1"
    tts_voice: str = "alloy"
    # Languages the hosted voice serves; others get 422 so the app uses expo-speech.
    tts_languages: list[Language] = [Language.EN, Language.ES, Language.SW]

    voice_provider_timeout_seconds: float = 20.0


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings; tests override this with dependency_overrides."""
    return Settings()
