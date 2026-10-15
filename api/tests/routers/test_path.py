"""The new preview and roadmap use real onboarding and saved lesson results."""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize(
    ("country", "language"), [("US", "en"), ("MX", "es"), ("KE", "sw")]
)
def test_path_starts_fresh_and_prioritizes_low_confidence(
    client: TestClient, onboarding_body: dict[str, object], country: str, language: str
) -> None:
    """A new learner sees every core topic with no seeded completions."""
    started = client.post(
        "/v1/onboarding",
        json={
            **onboarding_body,
            "country": country,
            "language": language,
            "goal": "stay_safe_online",
            "confidence": {
                "accounts": 0.9,
                "saving": 0.9,
                "borrowing": 0.9,
                "scams": 0,
                "budget": 0.9,
            },
        },
    ).json()
    user_id = started["user_id"]
    client.post(
        f"/v1/quiz/{started['quiz']['quiz_id']}/skip", json={"user_id": user_id}
    )

    response = client.get(f"/v1/path/{user_id}")

    assert response.status_code == 200
    path = response.json()
    assert path["user_id"] == user_id
    assert len(path["lessons"]) == 5
    assert path["lessons"][0]["topic"] == "scams"
    assert all(not node["completed"] for node in path["lessons"])
    assert client.get(f"/v1/path/{user_id}").json() == path

    client.post(
        f"/v1/profile/{user_id}/lesson-results",
        json={
            "lesson_id": "scams",
            "correct": 1,
            "total": 1,
            "completed": True,
        },
    )
    refreshed = client.get(f"/v1/path/{user_id}").json()
    scams = next(node for node in refreshed["lessons"] if node["topic"] == "scams")
    assert scams["completed"] is True


def test_path_for_unknown_learner_returns_not_found(client: TestClient) -> None:
    """The preview can show a useful error rather than a fabricated path."""
    response = client.get("/v1/path/u_missing")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "profile_not_found"
