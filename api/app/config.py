"""Application settings, read once from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Every config value the API reads. Override any field with an env var of the same name."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_path: Path = Path("kompass.db")
    question_bank_dir: Path = REPO_ROOT / "data" / "question_bank"

    gemini_api_key: SecretStr | None = None
    gemini_interactions_url: str = (
        "https://generativelanguage.googleapis.com/v1beta/interactions"
    )
    gemini_transcribe_model: str = "gemini-3.5-transcribe"
    # Flash-Lite TTS does not support Swahili, so the full Flash model is the default.
    gemini_tts_model: str = "gemini-3.8-flash-tts"
    gemini_tts_voice: str = "Kore"
    speech_timeout_seconds: float = 20.0
    # About 5 minutes of AAC at 128 kbps; the app records much shorter questions.
    max_audio_bytes: int = 5_000_000
    voice_requests_per_minute: int = 30


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings; tests override this with dependency_overrides."""
    return Settings()
