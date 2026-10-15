"""Endpoint tests for GET /v1/lessons/{lesson_id}: onboard through Will's API, then fetch."""

import json
from collections.abc import Iterator
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import get_lesson_sources, get_llm_client
from app.llm.client import EchoLlmClient, LlmError
from app.main import app
from app.schemas.shared import Topic
from app.services.lesson_service import LessonSources
from app.services.lesson_templates import load_lesson_templates
from app.services.needs import load_findex
from app.services.question_bank import load_question_bank

SWAHILI_TITLE = "Kuweka Akiba Salama"


class FakeLlm:
    """Records requests and returns a queued reply (or raises a queued error)."""

    model_name = "fake"

    def __init__(self, reply: str | Exception) -> None:
        self.reply = reply
        self.requests: list[dict[str, object]] = []

    def complete_json(self, instructions: str, request_json: str) -> str:
        """Record the request; return or raise the queued reply."""
        request = json.loads(request_json)
        self.requests.append(request)
        if isinstance(self.reply, Exception):
            raise self.reply
        return json.dumps({**request["lesson"], "title": self.reply})


@pytest.fixture
def lessons_client(client: TestClient) -> Iterator[TestClient]:
    """Will's test client with the echo LLM, so no test ever calls OpenAI."""
    app.dependency_overrides[get_llm_client] = EchoLlmClient
    yield client


def onboard(client: TestClient, body: dict[str, object]) -> str:
    """Create a learner through Will's onboarding API (quiz skipped); return user_id."""
    started = client.post("/v1/onboarding", json=body).json()
    skip_body = {"user_id": started["user_id"]}
    client.post(f"/v1/quiz/{started['quiz']['quiz_id']}/skip", json=skip_body)
    return started["user_id"]


def card_by_id(lesson: dict, card_id: str) -> dict:
    """Find a card in a lesson response."""
    return next(card for card in lesson["cards"] if card["card_id"] == card_id)


def test_serves_lesson_customized_with_profile_findex_and_country(
    lessons_client: TestClient, onboarding_body: dict[str, object]
) -> None:
    user_id = onboard(lessons_client, onboarding_body)

    response = lessons_client.get(f"/v1/lessons/saving?user_id={user_id}")

    assert response.status_code == 200
    lesson = response.json()
    assert lesson["lesson_id"] == "saving"
    card_ids = [card["card_id"] for card in lesson["cards"]]
    assert "start-small" in card_ids  # student card
    assert "family-fund" not in card_ids  # parent card
    assert "save-first" in card_ids  # save_more goal card
    bridge = card_by_id(lesson, "people-like-you")
    assert bridge["text"].startswith("In your country, 20% of people your age")
    quiz = card_by_id(lesson, "protected-quiz")
    assert "Kenya Deposit Insurance Corporation" in quiz["voice"]["correct_feedback"]


def test_two_learners_get_different_versions_of_one_lesson(
    lessons_client: TestClient, onboarding_body: dict[str, object]
) -> None:
    kenyan_student = onboard(lessons_client, onboarding_body)
    mexican_parent = onboard(
        lessons_client,
        {
            **onboarding_body,
            "country": "MX",
            "language": "es",
            "life_stage": "parent",
            "goal": "avoid_debt",
        },
    )

    student = lessons_client.get(f"/v1/lessons/borrowing?user_id={kenyan_student}")
    parent = lessons_client.get(f"/v1/lessons/borrowing?user_id={mexican_parent}")

    student_ids = {card["card_id"] for card in student.json()["cards"]}
    parent_ids = {card["card_id"] for card in parent.json()["cards"]}
    assert "build-credit" in student_ids and "build-credit" not in parent_ids
    assert "compare-lenders" in parent_ids and "can-you-afford-it" in parent_ids
    assert "KSh" in json.dumps(student.json()) and "MX$" in json.dumps(parent.json())


@pytest.mark.parametrize(
    "topic", ["accounts", "saving", "borrowing", "scams", "budget"]
)
def test_every_core_lesson_is_served(
    lessons_client: TestClient, onboarding_body: dict[str, object], topic: str
) -> None:
    user_id = onboard(lessons_client, onboarding_body)

    response = lessons_client.get(f"/v1/lessons/{topic}?user_id={user_id}")

    assert response.status_code == 200
    assert response.json()["topic"] == topic


def test_rewords_lesson_in_learners_language(
    lessons_client: TestClient, onboarding_body: dict[str, object]
) -> None:
    llm = FakeLlm(SWAHILI_TITLE)
    app.dependency_overrides[get_llm_client] = lambda: llm
    user_id = onboard(lessons_client, onboarding_body)

    response = lessons_client.get(f"/v1/lessons/saving?user_id={user_id}")

    assert response.json()["title"] == SWAHILI_TITLE
    assert llm.requests[0]["language"] == "sw"
    assert llm.requests[0]["simple_mode"] is True


def test_serves_english_lesson_when_llm_fails(
    lessons_client: TestClient, onboarding_body: dict[str, object]
) -> None:
    app.dependency_overrides[get_llm_client] = lambda: FakeLlm(LlmError("timeout"))
    user_id = onboard(lessons_client, onboarding_body)

    response = lessons_client.get(f"/v1/lessons/saving?user_id={user_id}")

    assert response.status_code == 200
    assert response.json()["title"] == "Safe Saving"


def test_unknown_lesson_returns_404(
    lessons_client: TestClient, onboarding_body: dict[str, object]
) -> None:
    user_id = onboard(lessons_client, onboarding_body)

    response = lessons_client.get(f"/v1/lessons/crypto?user_id={user_id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "lesson_not_found"


def test_unknown_learner_returns_404(lessons_client: TestClient) -> None:
    response = lessons_client.get("/v1/lessons/saving?user_id=u_nobody")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "profile_not_found"


def test_missing_user_id_returns_400(lessons_client: TestClient) -> None:
    response = lessons_client.get("/v1/lessons/saving")

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_broken_base_lesson_returns_500_in_error_shape(
    lessons_client: TestClient, onboarding_body: dict[str, object]
) -> None:
    user_id = onboard(lessons_client, onboarding_body)
    settings = Settings()
    healthy = LessonSources(
        templates=load_lesson_templates(settings.lesson_templates_dir),
        findex=load_findex(settings.findex_dir),
        question_bank=load_question_bank(settings.question_bank_dir),
        llm=EchoLlmClient(),
    )
    saving = healthy.templates[Topic.SAVING]
    broken_card = saving.cards[0].model_copy(update={"text": "Hi {nickname}"})
    broken = replace(
        healthy,
        templates={
            **healthy.templates,
            Topic.SAVING: saving.model_copy(update={"cards": [broken_card]}),
        },
    )
    app.dependency_overrides[get_lesson_sources] = lambda: broken

    response = lessons_client.get(f"/v1/lessons/saving?user_id={user_id}")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "lesson_build_failed"
