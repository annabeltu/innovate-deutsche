"""Lesson validation rules. Owner: Faraz (@faraz999shah).

The LLM may only change wording. These checks compare its rewrite against
the lesson it was given and reject anything that changed structure, answers
or numbers, or that breaks the voice-mode rules.
"""

import re
from collections.abc import Iterator

from pydantic import ValidationError

from app.schemas.shared import Lesson, LessonCard

FORBIDDEN_VOICE_WORDS = frozenset({"tap", "swipe", "see"})
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
_WORD = re.compile(r"[a-z]+")


class LessonValidationError(ValueError):
    """A rewritten lesson broke a rule and must not be served."""


def validate_rewrite(original: Lesson, rewritten_json: str) -> Lesson:
    """Parse the LLM's rewrite and check it only changed wording.

    Args:
        original: The customized lesson sent to the LLM.
        rewritten_json: The LLM's raw JSON output.

    Returns:
        The rewritten lesson, safe to serve.

    Raises:
        LessonValidationError: If the output is not a valid lesson or breaks
            any rule.
    """
    try:
        rewritten = Lesson.model_validate_json(rewritten_json)
    except ValidationError as error:
        raise LessonValidationError(f"not a valid lesson: {error}") from error

    _require(
        _lesson_shape(rewritten) == _lesson_shape(original),
        "ids, card types, options, answers or difficulty changed",
    )
    for before, after in zip(original.cards, rewritten.cards, strict=True):
        _check_card(before, after)
    return rewritten


def _lesson_shape(lesson: Lesson) -> tuple[object, ...]:
    """Everything about a lesson the LLM must leave exactly as it was."""
    return (
        lesson.lesson_id,
        lesson.topic,
        lesson.difficulty,
        [
            (
                card.card_id,
                card.type,
                card.options.keys(),
                card.correct_option,
                card.voice.answer_mode,
                card.voice.spoken_options.keys(),
            )
            for card in lesson.cards
        ],
    )


def _check_card(before: LessonCard, after: LessonCard) -> None:
    """Check one rewritten card kept its numbers and stayed voice-friendly."""
    _require(
        _numbers(_card_texts(before)) == _numbers(_card_texts(after)),
        f"numbers changed on card {after.card_id}",
    )
    spoken_words = set(_WORD.findall(after.voice.speak_text.lower()))
    _require(
        not FORBIDDEN_VOICE_WORDS & spoken_words,
        f"voice text on card {after.card_id} uses a visual word",
    )
    for letter in after.voice.spoken_options:
        _require(
            f"{letter.upper()}:" in after.voice.speak_text,
            f"voice text on card {after.card_id} does not read option {letter}",
        )


def _card_texts(card: LessonCard) -> Iterator[str]:
    """Every piece of text on a card that carries facts."""
    yield card.text
    yield from card.options.values()
    yield card.voice.speak_text
    yield from card.voice.spoken_options.values()


def _numbers(texts: Iterator[str]) -> list[str]:
    """All numbers in the texts, sorted, so wording can move them around."""
    return sorted(number for text in texts for number in _NUMBER.findall(text))


def _require(condition: bool, message: str) -> None:
    """Raise LessonValidationError with message unless condition holds."""
    if not condition:
        raise LessonValidationError(message)
