"""Tests for the local lesson tester routes under /dev."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.dependencies import get_llm_client
from app.llm.client import EchoLlmClient
from app.main import app


@pytest.fixture
def dev_client(client: TestClient) -> Iterator[TestClient]:
    """Will's test client with dev tools on and the echo LLM."""
    app.dependency_overrides[get_settings] = lambda: Settings(dev_tools_enabled=True)
    app.dependency_overrides[get_llm_client] = EchoLlmClient
    yield client


@pytest.mark.parametrize(
    "path", ["/dev/lesson-tester", "/dev/base-lessons/saving", "/dev/needs/u_any"]
)
def test_dev_routes_are_hidden_by_default(client: TestClient, path: str) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(dev_tools_enabled=False)

    response = client.get(path)

    assert response.status_code == 404


def test_serves_lesson_tester_page(dev_client: TestClient) -> None:
    response = dev_client.get("/dev/lesson-tester")

    assert response.status_code == 200
    assert "Customize lesson" in response.text
    assert "Generate lesson" in response.text
    for country in ("Mexico", "USA", "Kenya"):
        assert country in response.text


def test_returns_base_lesson_with_placeholders(dev_client: TestClient) -> None:
    response = dev_client.get("/dev/base-lessons/saving")

    assert response.status_code == 200
    bridge = next(
        card
        for card in response.json()["cards"]
        if card["card_id"] == "people-like-you"
    )
    assert "{group_percent}" in bridge["text"]


def test_unknown_base_lesson_returns_404(dev_client: TestClient) -> None:
    response = dev_client.get("/dev/base-lessons/crypto")

    assert response.json()["error"]["code"] == "lesson_not_found"


def test_returns_needs_for_an_onboarded_learner(
    dev_client: TestClient, onboarding_body: dict[str, object]
) -> None:
    started = dev_client.post("/v1/onboarding", json=onboarding_body).json()
    user_id = started["user_id"]
    dev_client.post(
        f"/v1/quiz/{started['quiz']['quiz_id']}/skip", json={"user_id": user_id}
    )

    response = dev_client.get(f"/dev/needs/{user_id}")

    assert response.status_code == 200
    needs = response.json()
    assert needs["country"] == "KE"
    assert needs["age_group"] == "ages_15_24"
    assert set(needs["topic_needs"]) == {
        "accounts",
        "saving",
        "borrowing",
        "scams",
        "budget",
    }
