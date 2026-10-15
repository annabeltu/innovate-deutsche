"""Shared pytest fixtures."""

import json
from pathlib import Path
from typing import Any

import pytest

from app.schemas.shared import LearnerProfile

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def profile_json() -> dict[str, Any]:
    """Sample LearnerProfile JSON, as stored and as served by GET /v1/profile."""
    return json.loads((FIXTURES_DIR / "learner_profile_in_student.json").read_text())


@pytest.fixture
def learner_profile(profile_json: dict[str, Any]) -> LearnerProfile:
    """Stand-in for profile_store.get_profile(), which returns a LearnerProfile.

    Will's get_profile() is not built yet; pass this into services instead.
    """
    return LearnerProfile.model_validate(profile_json)
