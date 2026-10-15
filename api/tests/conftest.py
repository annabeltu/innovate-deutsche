"""Shared pytest fixtures.

Profile API: a temporary SQLite store, the real question bank, a seeded RNG.
Lessons API: a sample learner, needs, base lesson and customized lesson.
"""

import json
import random
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import get_bonus_lesson_store, get_profile_store, get_rng
from app.main import app
from app.schemas.lesson_template import LessonTemplate
from app.schemas.shared import (
    LearnerNeeds,
    LearnerProfile,
    Lesson,
    OnboardingRequest,
)
from app.services.bonus_lesson_store import BonusLessonStore
from app.services.needs import build_learner_needs, load_findex
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank, load_question_bank

SEED = 1234
FIXTURES_DIR = Path(__file__).parent / "fixtures"
FINDEX = load_findex()


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
def bonus_store(tmp_path: Path) -> BonusLessonStore:
    """A fresh bonus lesson store in the same throwaway SQLite file."""
    return BonusLessonStore(tmp_path / "test.db")


@pytest.fixture
def client(store: ProfileStore, bonus_store: BonusLessonStore) -> Iterator[TestClient]:
    """An API client wired to the temporary stores and seeded RNG."""
    app.dependency_overrides[get_profile_store] = lambda: store
    app.dependency_overrides[get_bonus_lesson_store] = lambda: bonus_store
    app.dependency_overrides[get_rng] = lambda: random.Random(SEED)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def profile_json() -> dict[str, Any]:
    """Sample LearnerProfile JSON, as stored and as served by GET /v1/profile."""
    return _load_fixture("learner_profile_ke_student.json")


@pytest.fixture
def learner_profile(profile_json: dict[str, Any]) -> LearnerProfile:
    """A Kenyan student's LearnerProfile, as ProfileStore.get_profile() returns it."""
    return LearnerProfile.model_validate(profile_json)


@pytest.fixture
def learner_needs(learner_profile: LearnerProfile) -> LearnerNeeds:
    """The sample learner's needs, built from the real data/findex files."""
    return build_learner_needs(learner_profile, FINDEX[learner_profile.country])


@pytest.fixture
def saving_template() -> LessonTemplate:
    """Stand-in base lesson for Lesson 2, Safe Saving."""
    return LessonTemplate.model_validate(_load_fixture("lesson_template_saving.json"))


@pytest.fixture
def customized_lesson() -> Lesson:
    """Safe Saving as customized for the sample student, before rewording."""
    return Lesson.model_validate(_load_fixture("lesson_saving_customized.json"))


def _load_fixture(file_name: str) -> dict[str, Any]:
    """Read one JSON file from tests/fixtures."""
    return json.loads((FIXTURES_DIR / file_name).read_text())
