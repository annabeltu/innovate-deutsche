"""FastAPI dependencies, kept separate so tests can swap them with dependency_overrides."""

import random
from typing import Annotated

from fastapi import Depends
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.services.errors import VoiceUnavailableError
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank, load_question_bank
from app.services.speech_to_text import (
    FixtureTranscriber,
    SpeechToTextProvider,
    WhisperTranscriber,
)
from app.services.voice_provider_http import ProviderEndpoint

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_profile_store(settings: SettingsDep) -> ProfileStore:
    """Return the profile store for the configured SQLite file."""
    return ProfileStore(settings.database_path)


def get_question_bank(settings: SettingsDep) -> QuestionBank:
    """Return the validated question bank (loaded once per directory)."""
    return load_question_bank(settings.question_bank_dir)


def get_rng() -> random.Random:
    """Return the randomness source for question selection; tests pass a seeded one."""
    return random.SystemRandom()


def get_transcriber(settings: SettingsDep) -> SpeechToTextProvider:
    """Return Whisper when a key is set, the labeled fixture in development, else 503.

    Raises:
        VoiceUnavailableError: If no key is set and development fixtures are off.
    """
    whisper_key = _configured(settings.whisper_api_key)
    if whisper_key:
        endpoint = ProviderEndpoint(
            url=settings.whisper_api_url,
            api_key=whisper_key,
            model=settings.whisper_model,
            timeout_seconds=settings.voice_provider_timeout_seconds,
        )
        return WhisperTranscriber(endpoint)
    if settings.voice_dev_fixtures:
        return FixtureTranscriber()
    raise VoiceUnavailableError("Speech-to-text is not configured on this server")


def _configured(secret: SecretStr | None) -> str:
    """The key's value, or "" when unset or left blank as in .env.example."""
    return secret.get_secret_value().strip() if secret else ""
