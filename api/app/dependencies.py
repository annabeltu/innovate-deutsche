"""FastAPI dependencies, kept separate so tests can swap them with dependency_overrides."""

import random
from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import Depends, Request

from app.config import Settings, get_settings
from app.services.errors import SpeechUnavailableError
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank, load_question_bank
from app.services.rate_limit import RateLimiter
from app.services.voice import SpeechClient
from app.speech.gemini import GeminiSpeechClient, GeminiSpeechConfig

SettingsDep = Annotated[Settings, Depends(get_settings)]
UNKNOWN_CLIENT = "unknown"


def get_profile_store(settings: SettingsDep) -> ProfileStore:
    """Return the profile store for the configured SQLite file."""
    return ProfileStore(settings.database_path)


def get_question_bank(settings: SettingsDep) -> QuestionBank:
    """Return the validated question bank (loaded once per directory)."""
    return load_question_bank(settings.question_bank_dir)


def get_rng() -> random.Random:
    """Return the randomness source for question selection; tests pass a seeded one."""
    return random.SystemRandom()


def get_speech_client(settings: SettingsDep) -> Iterator[SpeechClient]:
    """Yield a Gemini speech client with an explicit timeout, closed after the request.

    Raises:
        SpeechUnavailableError: If GEMINI_API_KEY is not set.
    """
    if settings.gemini_api_key is None:
        raise SpeechUnavailableError("Voice is not configured on this server")
    config = GeminiSpeechConfig(
        api_key=settings.gemini_api_key.get_secret_value(),
        interactions_url=settings.gemini_interactions_url,
        transcribe_model=settings.gemini_transcribe_model,
        tts_model=settings.gemini_tts_model,
        tts_voice=settings.gemini_tts_voice,
    )
    with httpx.Client(timeout=settings.speech_timeout_seconds) as http:
        yield GeminiSpeechClient(http, config)


@lru_cache
def get_voice_rate_limiter() -> RateLimiter:
    """Return the process-wide limiter for voice endpoints."""
    return RateLimiter(get_settings().voice_requests_per_minute)


def enforce_voice_rate_limit(
    request: Request, limiter: Annotated[RateLimiter, Depends(get_voice_rate_limiter)]
) -> None:
    """Reject the request with 429 when this client is over the voice limit."""
    limiter.check(request.client.host if request.client else UNKNOWN_CLIENT)
