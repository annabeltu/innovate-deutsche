"""Application settings, read once from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.schemas.shared import Language

REPO_ROOT = Path(__file__).resolve().parents[2]
TEN_MEGABYTES = 10 * 1024 * 1024


class Settings(BaseSettings):
    """Every config value the API reads. Override any field with an env var of the same name."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_path: Path = Path("kompass.db")
    question_bank_dir: Path = REPO_ROOT / "data" / "question_bank"

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
