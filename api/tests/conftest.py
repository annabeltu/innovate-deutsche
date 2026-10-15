"""Shared pytest fixtures."""

import json
from pathlib import Path
from typing import Any

import pytest

from app.schemas.shared import LearnerProfile

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def profile_json() -> dict[str, Any]:
    """Sample LearnerProfile JSON, standing in for profile_store.get_profile().

    Will's get_profile() is not built yet; it will return this same JSON shape.
    """
    return json.loads((FIXTURES_DIR / "learner_profile_in_student.json").read_text())


@pytest.fixture
def learner_profile(profile_json: dict[str, Any]) -> LearnerProfile:
    """The sample profile validated the same way production code will."""
    return LearnerProfile.model_validate(profile_json)
