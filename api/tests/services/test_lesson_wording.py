"""Tests for the LLM wording step: rewrite, retry once, then fall back."""

import json
import logging

import pytest

from app.llm.client import EchoLlmClient, LlmError, load_prompt
from app.schemas.shared import Language, Lesson
from app.services.lesson_wording import PROMPT_FILE, PROMPT_VERSION, reword_lesson

SWAHILI_TITLE = "Kuweka Akiba Salama"


class FakeLlm:
    """Returns queued replies in order; a queued exception is raised instead."""

    model_name = "fake"

    def __init__(self, *replies: str | Exception) -> None:
        self.replies = list(replies)
        self.requests: list[dict[str, object]] = []

    def complete_json(self, instructions: str, request_json: str) -> str:
        """Record the request and return the next queued reply."""
        self.requests.append(json.loads(request_json))
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def translated(lesson: Lesson) -> str:
    """A valid rewrite: same lesson, new title."""
    return lesson.model_copy(update={"title": SWAHILI_TITLE}).model_dump_json()


def test_skips_the_llm_for_english_without_simple_mode(
    customized_lesson: Lesson,
) -> None:
    llm = FakeLlm()

    result = reword_lesson(customized_lesson, Language.EN, False, llm)

    assert result == customized_lesson
    assert llm.requests == []


@pytest.mark.parametrize(
    ("language", "simple_mode"),
    [(Language.SW, False), (Language.ES, True), (Language.EN, True)],
)
def test_sends_language_simple_mode_and_lesson(
    customized_lesson: Lesson, language: Language, simple_mode: bool
) -> None:
    llm = FakeLlm(translated(customized_lesson))

    result = reword_lesson(customized_lesson, language, simple_mode, llm)

    assert result.title == SWAHILI_TITLE
    assert llm.requests[0]["language"] == language
    assert llm.requests[0]["simple_mode"] is simple_mode
    assert llm.requests[0]["lesson"] == customized_lesson.model_dump(mode="json")


@pytest.mark.parametrize(
    "first_reply", ["not json", '{"title": "missing fields"}', LlmError("timeout")]
)
def test_retries_once_after_a_failed_attempt(
    customized_lesson: Lesson, first_reply: str | Exception
) -> None:
    llm = FakeLlm(first_reply, translated(customized_lesson))

    result = reword_lesson(customized_lesson, Language.SW, False, llm)

    assert result.title == SWAHILI_TITLE
    assert len(llm.requests) == 2


def test_falls_back_to_original_after_two_failures(
    customized_lesson: Lesson, caplog: pytest.LogCaptureFixture
) -> None:
    llm = FakeLlm(LlmError("timeout"), "not json")

    with caplog.at_level(logging.WARNING):
        result = reword_lesson(customized_lesson, Language.SW, False, llm)

    assert result == customized_lesson
    assert len(llm.requests) == 2
    assert "serving original wording" in caplog.text


def test_echo_client_returns_the_lesson_unchanged(customized_lesson: Lesson) -> None:
    result = reword_lesson(customized_lesson, Language.ES, True, EchoLlmClient())

    assert result == customized_lesson


def test_accepts_a_lesson_wrapped_in_a_lesson_key(customized_lesson: Lesson) -> None:
    wrapped = json.dumps({"lesson": json.loads(translated(customized_lesson))})
    llm = FakeLlm(wrapped)

    result = reword_lesson(customized_lesson, Language.SW, False, llm)

    assert result.title == SWAHILI_TITLE
    assert len(llm.requests) == 1


def test_uses_prompt_that_asks_for_an_unwrapped_lesson() -> None:
    assert PROMPT_VERSION == "lesson_wording_v2"
    assert "Do not wrap it" in load_prompt(PROMPT_FILE)
