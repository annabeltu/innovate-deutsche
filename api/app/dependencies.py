"""FastAPI dependencies, kept separate so tests can swap them with dependency_overrides."""

import random
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import Depends
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.llm.client import EchoLlmClient, LlmClient, OpenAiClient
from app.services.bonus_lesson_store import BonusLessonStore
from app.services.errors import VoiceUnavailableError
from app.services.gemini_voice import GeminiSynthesizer, GeminiTranscriber
from app.services.lesson_service import LessonSources, LessonStores
from app.services.lesson_templates import load_lesson_templates
from app.services.needs import load_findex
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank, load_question_bank
from app.services.speech_cache import SpeechCache
from app.services.speech_to_text import (
    FixtureTranscriber,
    SpeechToTextProvider,
    WhisperTranscriber,
)
from app.services.text_to_speech import OpenAISpeechSynthesizer, TextToSpeechProvider
from app.services.voice_provider_http import ProviderEndpoint
from app.speech.gemini import GeminiSpeechConfig, load_transcribe_prompt

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


def get_llm_client(settings: SettingsDep) -> LlmClient:
    """Return the OpenAI client, or the echo client when no key is configured.

    Raises:
        ValueError: If LLM_API_KEY is set without LLM_MODEL.
    """
    api_key = settings.llm_api_key.get_secret_value() if settings.llm_api_key else ""
    if not api_key:
        return EchoLlmClient()
    if not settings.llm_model:
        raise ValueError("LLM_MODEL must be set when LLM_API_KEY is set")
    return _openai_client(
        _OpenAiConfig(
            api_key=api_key,
            model_name=settings.llm_model,
            base_url=settings.llm_base_url,
            timeout_seconds=settings.llm_timeout_seconds,
            reasoning_effort=settings.llm_reasoning_effort,
        )
    )


@dataclass(frozen=True)
class _OpenAiConfig:
    """Hashable OpenAI settings, so one client is cached per configuration."""

    api_key: str
    model_name: str
    base_url: str
    timeout_seconds: float
    reasoning_effort: str | None


@lru_cache
def _openai_client(config: _OpenAiConfig) -> OpenAiClient:
    """Build one OpenAI client per configuration so connections are reused."""
    http_client = httpx.Client(base_url=config.base_url, timeout=config.timeout_seconds)
    return OpenAiClient(
        config.api_key, config.model_name, http_client, config.reasoning_effort
    )


def get_lesson_sources(
    settings: SettingsDep,
    question_bank: Annotated[QuestionBank, Depends(get_question_bank)],
    llm: Annotated[LlmClient, Depends(get_llm_client)],
) -> LessonSources:
    """Return the base lessons, Findex data, country facts and LLM (loaded once)."""
    return LessonSources(
        templates=load_lesson_templates(settings.lesson_templates_dir),
        findex=load_findex(settings.findex_dir),
        question_bank=question_bank,
        llm=llm,
    )


def get_bonus_lesson_store(settings: SettingsDep) -> BonusLessonStore:
    """Return the store for generated lessons, in the same SQLite file."""
    return BonusLessonStore(settings.database_path)


def get_lesson_stores(
    profiles: Annotated[ProfileStore, Depends(get_profile_store)],
    bonus_lessons: Annotated[BonusLessonStore, Depends(get_bonus_lesson_store)],
) -> LessonStores:
    """Return the learner and bonus lesson stores together."""
    return LessonStores(profiles=profiles, bonus_lessons=bonus_lessons)


def get_transcriber(settings: SettingsDep) -> SpeechToTextProvider:
    """Return Gemini or Whisper when a key is set, the fixture in development, else 503.

    Raises:
        VoiceUnavailableError: If no key is set and development fixtures are off.
    """
    gemini_config = _gemini_config(settings)
    if gemini_config:
        return GeminiTranscriber(gemini_config, settings.voice_provider_timeout_seconds)
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


def get_synthesizer(settings: SettingsDep) -> TextToSpeechProvider:
    """Return the hosted voice, or 503 so the app speaks on-device instead.

    Raises:
        VoiceUnavailableError: If no text-to-speech key is set.
    """
    gemini_config = _gemini_config(settings)
    if gemini_config:
        return GeminiSynthesizer(
            gemini_config, settings.voice_provider_timeout_seconds, get_speech_cache()
        )
    tts_key = _configured(settings.tts_api_key)
    if not tts_key:
        raise VoiceUnavailableError("Hosted text-to-speech is not configured")
    endpoint = ProviderEndpoint(
        url=settings.tts_api_url,
        api_key=tts_key,
        model=settings.tts_model,
        timeout_seconds=settings.voice_provider_timeout_seconds,
    )
    return OpenAISpeechSynthesizer(endpoint, settings.tts_voice)


def _gemini_config(settings: Settings) -> GeminiSpeechConfig | None:
    """Gemini speech settings, or None when no Gemini key is set."""
    key = _configured(settings.gemini_api_key)
    if not key:
        return None
    return GeminiSpeechConfig(
        api_key=key,
        interactions_url=settings.gemini_interactions_url,
        transcribe_models=tuple(settings.gemini_transcribe_models),
        tts_models=tuple(settings.gemini_tts_models),
        tts_voice=settings.gemini_tts_voice,
        transcribe_prompt=load_transcribe_prompt(),
    )


@lru_cache
def get_speech_cache() -> SpeechCache:
    """Return the process-wide cache of generated speech."""
    return SpeechCache(get_settings().speech_cache_max_bytes)


def _configured(secret: SecretStr | None) -> str:
    """The key's value, or "" when unset or left blank as in .env.example."""
    return secret.get_secret_value().strip() if secret else ""
