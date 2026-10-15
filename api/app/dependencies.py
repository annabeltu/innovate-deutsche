"""FastAPI dependencies, kept separate so tests can swap them with dependency_overrides."""

import random
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import Depends

from app.config import Settings, get_settings
from app.llm.client import EchoLlmClient, LlmClient, OpenAiClient
from app.services.lesson_service import LessonSources
from app.services.lesson_templates import load_lesson_templates
from app.services.needs import load_findex
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank, load_question_bank

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
