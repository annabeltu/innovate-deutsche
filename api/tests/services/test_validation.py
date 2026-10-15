"""Tests for checking that an LLM rewrite only changed wording."""

from collections.abc import Callable
from typing import Any

import pytest

from app.schemas.shared import Lesson
from app.services.validation import LessonValidationError, validate_rewrite

LessonEdit = Callable[[dict[str, Any]], None]


def card(lesson: dict[str, Any], card_id: str) -> dict[str, Any]:
    """Find a card in lesson JSON by id."""
    return next(item for item in lesson["cards"] if item["card_id"] == card_id)


def rewrite(lesson: Lesson, edit: LessonEdit) -> str:
    """Apply an edit to a copy of the lesson and return it as the LLM's JSON."""
    lesson_json = lesson.model_dump(mode="json")
    edit(lesson_json)
    return Lesson.model_validate(lesson_json).model_dump_json()


def test_accepts_lesson_with_new_wording(customized_lesson: Lesson) -> None:
    def translate_title(lesson: dict[str, Any]) -> None:
        lesson["title"] = "Kuweka Akiba Salama"

    result = validate_rewrite(
        customized_lesson, rewrite(customized_lesson, translate_title)
    )

    assert result.title == "Kuweka Akiba Salama"


def test_accepts_numbers_moved_within_a_card(customized_lesson: Lesson) -> None:
    def reorder_sentence(lesson: dict[str, Any]) -> None:
        card(lesson, "people-like-you")["text"] = (
            "Compared with 60% overall, only 38% of people like you "
            "saved at a bank in the past year."
        )

    validate_rewrite(customized_lesson, rewrite(customized_lesson, reorder_sentence))


def test_rejects_output_that_is_not_a_lesson(customized_lesson: Lesson) -> None:
    with pytest.raises(LessonValidationError, match="not a valid lesson"):
        validate_rewrite(customized_lesson, '{"title": "Hi"}')


def change_number(lesson: dict[str, Any]) -> None:
    card(lesson, "people-like-you")["text"] = "Only 40% of people like you save."


def change_answer(lesson: dict[str, Any]) -> None:
    card(lesson, "protected-quiz")["correct_option"] = "b"


def drop_card(lesson: dict[str, Any]) -> None:
    lesson["cards"].pop(0)


def reorder_cards(lesson: dict[str, Any]) -> None:
    lesson["cards"].reverse()


def change_difficulty(lesson: dict[str, Any]) -> None:
    lesson["difficulty"] = 1


def add_visual_word(lesson: dict[str, Any]) -> None:
    card(lesson, "where-money-lives")["voice"]["speak_text"] = "Tap to continue."


def skip_option_letter(lesson: dict[str, Any]) -> None:
    voice = card(lesson, "protected-quiz")["voice"]
    voice["speak_text"] = voice["speak_text"].replace("B:", "or")


@pytest.mark.parametrize(
    ("edit", "message"),
    [
        (change_number, "numbers changed"),
        (change_answer, "answers"),
        (drop_card, "card types"),
        (reorder_cards, "card types"),
        (change_difficulty, "difficulty"),
        (add_visual_word, "visual word"),
        (skip_option_letter, "option b"),
    ],
)
def test_rejects_rewrites_that_change_more_than_wording(
    customized_lesson: Lesson, edit: LessonEdit, message: str
) -> None:
    with pytest.raises(LessonValidationError, match=message):
        validate_rewrite(customized_lesson, rewrite(customized_lesson, edit))
