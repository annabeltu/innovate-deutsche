from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services.profile_store import ProfileStore


@pytest.fixture
def user_id(client: TestClient, onboarding_body: dict[str, object]) -> str:
    """A learner who finished onboarding by skipping the quiz (saving proficiency 0.3)."""
    body = client.post("/v1/onboarding", json=onboarding_body).json()
    client.post(
        f"/v1/quiz/{body['quiz']['quiz_id']}/skip", json={"user_id": body["user_id"]}
    )
    return body["user_id"]


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code


def test_patch_accessibility_changes_only_sent_fields(
    client: TestClient, user_id: str
) -> None:
    response = client.patch(
        f"/v1/profile/{user_id}/accessibility",
        json={"voice_mode": True, "speech_rate": 0.8},
    )

    assert response.status_code == 200
    accessibility = response.json()["accessibility"]
    assert accessibility == {
        "voice_mode": True,
        "read_aloud": True,
        "simple_mode": True,
        "large_text": False,
        "speech_rate": 0.8,
    }
    stored = client.get(f"/v1/profile/{user_id}").json()["accessibility"]
    assert stored == accessibility


@pytest.mark.parametrize("body", [{"speech_rate": 3.0}, {"font": "big"}])
def test_patch_accessibility_rejects_invalid_settings(
    client: TestClient, user_id: str, body: dict[str, object]
) -> None:
    response = client.patch(f"/v1/profile/{user_id}/accessibility", json=body)

    assert_error(response, 400, "validation_error")


def test_patch_accessibility_for_unknown_user_is_not_found(client: TestClient) -> None:
    response = client.patch("/v1/profile/u_missing/accessibility", json={})

    assert_error(response, 404, "profile_not_found")


def test_lesson_result_updates_proficiency_and_flags_band_change(
    client: TestClient, user_id: str
) -> None:
    response = client.post(
        f"/v1/profile/{user_id}/lesson-results",
        json={"lesson_id": "saving", "correct": 5, "total": 5, "completed": True},
    )

    assert response.status_code == 200
    assert response.json() == {
        "topic": "saving",
        "proficiency": 0.65,
        "completed": True,
        "path_refresh_needed": True,
    }
    saving = client.get(f"/v1/profile/{user_id}").json()["topic_scores"]["saving"]
    assert saving["proficiency"] == 0.65 and saving["completed"] is True


def test_lesson_result_within_same_band_needs_no_refresh(
    client: TestClient, user_id: str
) -> None:
    response = client.post(
        f"/v1/profile/{user_id}/lesson-results",
        json={"lesson_id": "saving", "correct": 1, "total": 5, "completed": False},
    )

    assert response.json()["proficiency"] == 0.25
    assert response.json()["path_refresh_needed"] is False


def test_completed_topic_stays_completed_after_a_retry(
    client: TestClient, user_id: str
) -> None:
    url = f"/v1/profile/{user_id}/lesson-results"
    client.post(
        url, json={"lesson_id": "budget", "correct": 3, "total": 5, "completed": True}
    )

    response = client.post(
        url, json={"lesson_id": "budget", "correct": 0, "total": 5, "completed": False}
    )

    assert response.json()["completed"] is True


def test_bonus_lesson_result_leaves_topic_scores_unchanged(
    client: TestClient, store: ProfileStore, user_id: str
) -> None:
    profile = store.get_profile(user_id)
    store.update_profile(profile.model_copy(update={"bonus_lesson_ids": ["bonus_x"]}))

    response = client.post(
        f"/v1/profile/{user_id}/lesson-results",
        json={"lesson_id": "bonus_x", "correct": 2, "total": 3, "completed": True},
    )

    assert response.json() == {
        "topic": None,
        "proficiency": None,
        "completed": True,
        "path_refresh_needed": False,
    }
    assert store.get_profile(user_id).topic_scores == profile.topic_scores


def test_unknown_lesson_is_not_found(client: TestClient, user_id: str) -> None:
    response = client.post(
        f"/v1/profile/{user_id}/lesson-results",
        json={
            "lesson_id": "bonus_unknown",
            "correct": 1,
            "total": 1,
            "completed": True,
        },
    )

    assert_error(response, 404, "lesson_not_found")


@pytest.mark.parametrize(
    "body",
    [
        {"lesson_id": "saving", "correct": 6, "total": 5, "completed": True},
        {"lesson_id": "saving", "correct": 0, "total": 0, "completed": True},
        {"lesson_id": "", "correct": 1, "total": 1, "completed": True},
    ],
)
def test_lesson_result_rejects_impossible_scores(
    client: TestClient, user_id: str, body: dict[str, object]
) -> None:
    response = client.post(f"/v1/profile/{user_id}/lesson-results", json=body)

    assert_error(response, 400, "validation_error")


def test_language_change_preserves_profile_progress_and_bonus_lessons(
    client: TestClient, user_id: str, store: ProfileStore
) -> None:
    """Language switching retains identity and all earned progress."""
    profile = store.get_profile(user_id)
    store.update_profile(
        profile.model_copy(update={"bonus_lesson_ids": ["bonus_test"]})
    )
    client.post(
        f"/v1/profile/{user_id}/lesson-results",
        json={"lesson_id": "saving", "correct": 1, "total": 1, "completed": True},
    )
    before = client.get(f"/v1/profile/{user_id}").json()

    response = client.patch(f"/v1/profile/{user_id}/language", json={"language": "en"})

    assert response.status_code == 200
    after = response.json()
    assert after["language"] == "en"
    assert after["user_id"] == before["user_id"]
    assert after["topic_scores"] == before["topic_scores"]
    assert after["bonus_lesson_ids"] == ["bonus_test"]
    assert client.get(f"/v1/profile/{user_id}").json() == after


@pytest.mark.parametrize(
    ("body", "status_code"),
    [
        ({"language": "de"}, 400),
        ({"language": "es"}, 422),
        ({}, 400),
        ({"language": "en", "extra": True}, 400),
    ],
)
def test_language_change_rejects_invalid_or_unavailable_languages(
    client: TestClient, user_id: str, body: dict[str, object], status_code: int
) -> None:
    """A Kenyan learner cannot select a language the country does not offer."""
    before = client.get(f"/v1/profile/{user_id}").json()
    response = client.patch(f"/v1/profile/{user_id}/language", json=body)
    assert response.status_code == status_code
    assert client.get(f"/v1/profile/{user_id}").json() == before


def test_language_change_for_unknown_learner(client: TestClient) -> None:
    """Missing learners receive a useful 404."""
    response = client.patch("/v1/profile/u_missing/language", json={"language": "en"})
    assert_error(response, 404, "profile_not_found")
