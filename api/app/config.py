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
    # Tried in order. Measured on a Swahili clip: 3.5 Flash-Lite answered in about
    # 2 s (500 free a day); the dedicated transcribe model took about 9 s (25 a day)
    # and is kept as the backup. Override with JSON, e.g.
    # GEMINI_TRANSCRIBE_MODELS='["gemini-3.5-transcribe"]'.
    gemini_transcribe_models: list[str] = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-transcribe",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
    ]
    # Each TTS model allows 10 requests a day on the free tier. Swahili needs a
    # full Flash TTS model, so Flash-Lite TTS is the last resort (en/es only).
    gemini_tts_models: list[str] = [
        "gemini-3.8-flash-tts",
        "gemini-3.1-flash-tts-preview",
        "gemini-2.5-flash-preview-tts",
        "gemini-3.8-flash-lite-tts",
    ]
    gemini_tts_voice: str = "Kore"
    speech_timeout_seconds: float = 20.0
    # About 5 minutes of AAC at 128 kbps; the app records much shorter questions.
    max_audio_bytes: int = 5_000_000
    voice_requests_per_minute: int = 30
    # Generated speech is reused for repeated text, which saves the small TTS quota.
    speech_cache_max_bytes: int = 50_000_000
    # Browser origins allowed to call the API (the Expo web dev server by default).
    # Native apps do not send an Origin, so they are unaffected.
    cors_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings; tests override this with dependency_overrides."""
    return Settings()
