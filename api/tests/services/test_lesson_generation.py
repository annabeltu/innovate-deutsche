"""Tests for planning a lesson request and validating generated lessons."""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from app.llm.client import LlmError
from app.schemas.lesson_template import LessonTemplate
from app.schemas.shared import Topic
from app.services.errors import LessonGenerationError
from app.services.lesson_generation import plan_lesson_request
from app.services.lesson_templates import load_lesson_templates
from app.services.validation import LessonValidationError, validate_generation

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
ALLOWED = frozenset({"cur", "mobile_money", "group_percent", "who", "indicator"})
CORE_LESSONS: dict[Topic, LessonTemplate] = load_lesson_templates()

ReplyEdit = Callable[[dict[str, Any]], None]
QUIZ_AS_CONCEPT = {
    "type": "concept",
    "options": {},
    "correct_option": None,
    "voice": {"speak_text": "A premium is a payment.", "answer_mode": "say_next"},
}


def insurance_reply() -> dict[str, Any]:
    """A valid generated lesson reply."""
    return json.loads((FIXTURES_DIR / "generation_reply_insurance.json").read_text())


def edited(edit: ReplyEdit) -> str:
    """The insurance reply with one change applied, as JSON."""
    reply = insurance_reply()
    edit(reply)
    return json.dumps(reply)


class FakeLlm:
    """Returns queued replies in order; a queued exception is raised instead."""

    model_name = "fake"

    def __init__(self, *replies: str | Exception) -> None:
        self.replies = list(replies)
        self.requests: list[dict[str, Any]] = []

    def complete_json(self, instructions: str, request_json: str) -> str:
        """Record the request and return the next reply."""
        self.requests.append(json.loads(request_json))
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def test_accepts_a_valid_generated_lesson() -> None:
    reply = validate_generation(json.dumps(insurance_reply()), ALLOWED)

    assert reply.lesson is not None
    assert reply.lesson.title == "Insurance Basics"


@pytest.mark.parametrize("reply", [{"core_topic": "saving"}, {"off_topic": True}])
def test_accepts_core_topic_and_off_topic_replies(reply: dict[str, Any]) -> None:
    validate_generation(json.dumps(reply), ALLOWED)


def cards(reply: dict[str, Any]) -> list[dict[str, Any]]:
    """The cards of a reply's lesson."""
    return reply["lesson"]["cards"]


@pytest.mark.parametrize(
    ("edit", "message"),
    [
        (lambda r: r.update(core_topic="saving"), "exactly one"),
        (lambda r: r.pop("lesson"), "exactly one"),
        (lambda r: cards(r)[0].update(text="Insurance costs 50 a month."), "number"),
        (lambda r: cards(r)[0].update(text="Use {bank_name}."), "unknown placeholders"),
        (lambda r: cards(r)[2].update(type="concept"), "takeaway"),
        (lambda r: cards(r)[1].update(QUIZ_AS_CONCEPT), "no quiz"),
        (lambda r: cards(r)[0].update(type="budget_sim"), "card type"),
        (lambda r: cards(r)[1].update(correct_option="d"), "no valid answer"),
        (
            lambda r: cards(r)[0]["voice"].update(speak_text="Tap to continue."),
            "visual word",
        ),
        (
            lambda r: cards(r)[1]["voice"].update(
                speak_text="Which is it? Say A or B."
            ),
            "does not read option",
        ),
        (lambda r: cards(r)[2].update(card_id="premium-quiz"), "repeat"),
    ],
)
def test_rejects_generated_lessons_that_break_rules(
    edit: ReplyEdit, message: str
) -> None:
    with pytest.raises(LessonValidationError, match=message):
        validate_generation(edited(edit), ALLOWED)


def test_sends_request_core_lessons_and_placeholders() -> None:
    llm = FakeLlm(json.dumps({"core_topic": "saving"}))

    plan_lesson_request("¿Cómo ahorro dinero?", CORE_LESSONS, ALLOWED, llm)

    request = llm.requests[0]
    assert request["request"] == "¿Cómo ahorro dinero?"
    assert {lesson["topic"] for lesson in request["core_lessons"]} == set(Topic)
    assert request["placeholders"] == sorted(ALLOWED)


def test_retries_once_after_an_invalid_reply() -> None:
    no_takeaway = edited(lambda r: cards(r)[2].update(type="concept"))
    llm = FakeLlm(no_takeaway, json.dumps(insurance_reply()))

    reply = plan_lesson_request("insurance", CORE_LESSONS, ALLOWED, llm)

    assert reply.lesson is not None
    assert len(llm.requests) == 2


def test_gives_up_after_two_failures() -> None:
    llm = FakeLlm(LlmError("timeout"), "not json")

    with pytest.raises(LessonGenerationError):
        plan_lesson_request("insurance", CORE_LESSONS, ALLOWED, llm)
