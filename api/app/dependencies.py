"""FastAPI dependencies, kept separate so tests can swap them with dependency_overrides."""

import random
from typing import Annotated

from fastapi import Depends

from app.config import Settings, get_settings
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
