"""Endpoint tests for POST /v1/bonus-lessons and serving the lessons it creates."""

import json
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_llm_client
from app.llm.client import LlmError
from app.main import app

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
GENERATION_PROMPT_MARKER = "You plan short personal-finance lessons"


class FakeLlm:
    """Answers generation calls from a queue and echoes wording calls."""

    model_name = "fake"

    def __init__(self, *generation_replies: str | Exception) -> None:
        self.generation_replies = list(generation_replies)
        self.generation_calls = 0

    def complete_json(self, instructions: str, request_json: str) -> str:
        """Return the next generation reply, or the lesson unchanged for wording."""
        if not instructions.startswith(GENERATION_PROMPT_MARKER):
            return json.dumps(json.loads(request_json)["lesson"])
        self.generation_calls += 1
        reply = self.generation_replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def insurance_reply() -> str:
    """A valid generated lesson reply."""
    return (FIXTURES_DIR / "generation_reply_insurance.json").read_text()


@pytest.fixture
def onboarded(client: TestClient, onboarding_body: dict[str, object]) -> Iterator[str]:
    """A learner created through Will's onboarding API; yields their user_id."""
    started = client.post("/v1/onboarding", json=onboarding_body).json()
    user_id = started["user_id"]
    client.post(
        f"/v1/quiz/{started['quiz']['quiz_id']}/skip", json={"user_id": user_id}
    )
    yield user_id


def use_llm(llm: FakeLlm) -> FakeLlm:
    """Make every request in the test use this fake LLM."""
    app.dependency_overrides[get_llm_client] = lambda: llm
    return llm


def ask(client: TestClient, user_id: str, request: str = "teach me about insurance"):
    """POST a lesson request."""
    return client.post(
        "/v1/bonus-lessons", json={"user_id": user_id, "request": request}
    )


def test_serves_core_lesson_when_one_covers_the_request(
    client: TestClient, onboarded: str
) -> None:
    use_llm(FakeLlm(json.dumps({"core_topic": "saving"})))

    response = ask(client, onboarded, "how do I keep my money safe?")

    assert response.status_code == 201
    body = response.json()
    assert body["generated"] is False
    assert body["matched_topic"] == "saving"
    assert body["lesson"]["lesson_id"] == "saving"


def test_generates_stores_and_customizes_a_new_lesson(
    client: TestClient, onboarded: str
) -> None:
    use_llm(FakeLlm(insurance_reply()))

    response = ask(client, onboarded)

    assert response.status_code == 201
    body = response.json()
    assert body["generated"] is True
    lesson = body["lesson"]
    assert lesson["lesson_id"].startswith("bonus_")
    assert "KSh" in lesson["cards"][0]["text"]  # {cur} filled for Kenya
    profile = client.get(f"/v1/profile/{onboarded}").json()
    assert lesson["lesson_id"] in profile["bonus_lesson_ids"]


def test_generated_lesson_can_be_fetched_again_by_its_owner(
    client: TestClient, onboarded: str, onboarding_body: dict[str, object]
) -> None:
    use_llm(FakeLlm(insurance_reply()))
    lesson_id = ask(client, onboarded).json()["lesson"]["lesson_id"]

    again = client.get(f"/v1/lessons/{lesson_id}?user_id={onboarded}")
    started = client.post("/v1/onboarding", json=onboarding_body).json()
    stranger = client.get(f"/v1/lessons/{lesson_id}?user_id={started['user_id']}")

    assert again.status_code == 200
    assert again.json()["title"] == "Insurance Basics"
    assert stranger.status_code == 404


def test_off_topic_request_returns_422(client: TestClient, onboarded: str) -> None:
    use_llm(FakeLlm(json.dumps({"off_topic": True})))

    response = ask(client, onboarded, "what is the capital of France?")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "off_topic_request"


def test_returns_503_when_generation_keeps_failing(
    client: TestClient, onboarded: str
) -> None:
    llm = use_llm(FakeLlm(LlmError("timeout"), json.dumps({"lesson": None})))

    response = ask(client, onboarded)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "lesson_generation_failed"
    assert llm.generation_calls == 2


def test_unknown_learner_returns_404(client: TestClient) -> None:
    use_llm(FakeLlm())

    response = ask(client, "u_nobody")

    assert response.json()["error"]["code"] == "profile_not_found"


@pytest.mark.parametrize("request_text", ["", "x" * 301])
def test_rejects_empty_or_too_long_requests(
    client: TestClient, onboarded: str, request_text: str
) -> None:
    use_llm(FakeLlm())

    response = ask(client, onboarded, request_text)

    assert response.status_code == 400
