"""Shared pytest fixtures: a temporary SQLite store, the real question bank, a seeded RNG."""

import random
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import get_profile_store, get_rng
from app.main import app
from app.schemas.shared import OnboardingRequest
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank, load_question_bank

SEED = 1234


@pytest.fixture
def store(tmp_path: Path) -> ProfileStore:
    """A fresh profile store backed by a throwaway SQLite file."""
    return ProfileStore(tmp_path / "test.db")


@pytest.fixture
def bank() -> QuestionBank:
    """The real question bank from data/question_bank."""
    return load_question_bank(Settings().question_bank_dir)


@pytest.fixture
def rng() -> random.Random:
    """Deterministic randomness for question selection."""
    return random.Random(SEED)


@pytest.fixture
def onboarding_body() -> dict[str, object]:
    """A valid onboarding request for a Kenyan student answering in Swahili."""
    return {
        "language": "sw",
        "country": "KE",
        "accessibility": {"read_aloud": True, "simple_mode": True},
        "life_stage": "student",
        "goal": "save_more",
        "comfort": 1,
        "savings_habit": "cash_at_home",
        "confidence": {
            "accounts": 0.6,
            "saving": 0.3,
            "borrowing": 0.2,
            "scams": 0.5,
            "budget": 0.4,
        },
    }


@pytest.fixture
def onboarding_request(onboarding_body: dict[str, object]) -> OnboardingRequest:
    """The same onboarding answers as a validated model."""
    return OnboardingRequest.model_validate(onboarding_body)


@pytest.fixture
def client(store: ProfileStore) -> Iterator[TestClient]:
    """An API client wired to the temporary store and seeded RNG."""
    app.dependency_overrides[get_profile_store] = lambda: store
    app.dependency_overrides[get_rng] = lambda: random.Random(SEED)
    yield TestClient(app)
    app.dependency_overrides.clear()
