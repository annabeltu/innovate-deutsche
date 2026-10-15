"""Shared pytest fixtures."""

import json
from pathlib import Path
from typing import Any

import pytest

from app.schemas.lesson_template import LessonTemplate
from app.schemas.shared import LearnerNeeds, LearnerProfile, Lesson

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def profile_json() -> dict[str, Any]:
    """Sample LearnerProfile JSON, as stored and as served by GET /v1/profile."""
    return _load_fixture("learner_profile_ke_student.json")


@pytest.fixture
def learner_profile(profile_json: dict[str, Any]) -> LearnerProfile:
    """Stand-in for profile_store.get_profile(), which returns a LearnerProfile.

    Will's get_profile() is not built yet; pass this into services instead.
    """
    return LearnerProfile.model_validate(profile_json)


@pytest.fixture
def learner_needs() -> LearnerNeeds:
    """Stand-in for the data teammate's needs object for the same learner."""
    return LearnerNeeds.model_validate(_load_fixture("learner_needs_ke_student.json"))


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
