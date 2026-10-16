"""Lesson validation rules. Owner: Faraz (@faraz999shah).

The LLM may only change wording. These checks compare its rewrite against
the lesson it was given and reject anything that changed structure, answers
or numbers, or that breaks the voice-mode rules.

Generated bonus lessons get the same voice rules plus content rules: every
number or fact must be a {placeholder} that code fills, never LLM text.
"""

import re
from collections.abc import Iterator

from pydantic import ValidationError

from app.schemas.lesson_template import CardTemplate, GenerationReply, LessonDraft
from app.schemas.shared import CardType, Lesson, LessonCard

FORBIDDEN_VOICE_WORDS = frozenset({"tap", "swipe", "see"})
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
_WORD = re.compile(r"[a-z]+")
_PLACEHOLDER = re.compile(r"\{([a-z_]+)\}")
_DIGIT = re.compile(r"\d")
# Generated lessons need practice, not just reading.
MIN_GENERATED_QUIZZES = 2
# A bridge links the topic to people like the learner, so it must use their Findex share.
BRIDGE_FACT = "{group_percent}"
GENERATED_CARD_TYPES = frozenset(
    {CardType.CONCEPT, CardType.BRIDGE, CardType.MC_QUIZ, CardType.TAKEAWAY}
)


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


def validate_generation(
    reply_json: str, allowed_placeholders: frozenset[str]
) -> GenerationReply:
    """Parse the LLM's reply to a lesson request and check any new lesson.

    Args:
        reply_json: The LLM's raw JSON output.
        allowed_placeholders: Fact names code can fill in.

    Returns:
        The reply, with a lesson that is safe to store if it has one.

    Raises:
        LessonValidationError: If the reply is malformed or the lesson breaks
            any rule.
    """
    try:
        reply = GenerationReply.model_validate_json(reply_json)
    except ValidationError as error:
        raise LessonValidationError(f"not a valid generation reply: {error}") from error
    if reply.lesson is not None:
        check_draft(reply.lesson, allowed_placeholders)
    return reply


def check_draft(draft: LessonDraft, allowed_placeholders: frozenset[str]) -> None:
    """Check a generated lesson's structure, facts and voice rules."""
    card_ids = [card.card_id for card in draft.cards]
    _require(len(card_ids) == len(set(card_ids)), "card ids repeat")
    _require(
        all(card.type in GENERATED_CARD_TYPES for card in draft.cards),
        "uses a card type generated lessons cannot use",
    )
    _require(draft.cards[-1].type == CardType.TAKEAWAY, "does not end with a takeaway")
    quizzes = sum(card.type == CardType.MC_QUIZ for card in draft.cards)
    _require(quizzes >= MIN_GENERATED_QUIZZES, "has fewer than two quizzes")
    for card in draft.cards:
        _require(
            card.type != CardType.BRIDGE or BRIDGE_FACT in card.text,
            f"bridge card {card.card_id} does not compare people like the learner",
        )
    texts = [draft.title, draft.goal]
    for card in draft.cards:
        _check_generated_card(card)
        texts.extend(_template_texts(card))
    for text in texts:
        names = set(_PLACEHOLDER.findall(text))
        _require(
            names <= allowed_placeholders,
            f"uses unknown placeholders {sorted(names - allowed_placeholders)}",
        )
        _require(
            not _DIGIT.search(_PLACEHOLDER.sub("", text)),
            f"writes a number instead of using a placeholder: {text[:60]!r}",
        )


def _check_generated_card(card: CardTemplate) -> None:
    """Quiz answers must line up, and voice text must work by ear."""
    if card.type == CardType.MC_QUIZ:
        _require(
            card.correct_option in card.options,
            f"quiz {card.card_id} has no valid answer",
        )
        _require(
            card.voice.spoken_options.keys() == card.options.keys(),
            f"quiz {card.card_id} does not speak every option",
        )
        _require(
            bool(card.voice.correct_feedback and card.voice.incorrect_feedback),
            f"quiz {card.card_id} has no spoken feedback",
        )
    spoken_words = set(_WORD.findall(card.voice.speak_text.lower()))
    _require(
        not FORBIDDEN_VOICE_WORDS & spoken_words,
        f"voice text on card {card.card_id} uses a visual word",
    )
    for letter in card.voice.spoken_options:
        _require(
            f"{letter.upper()}:" in card.voice.speak_text,
            f"voice text on card {card.card_id} does not read option {letter}",
        )


def _template_texts(card: CardTemplate) -> Iterator[str]:
    """Every piece of text on a base card, including feedback."""
    yield card.text
    yield from card.options.values()
    yield card.voice.speak_text
    yield from card.voice.spoken_options.values()
    for feedback in (card.voice.correct_feedback, card.voice.incorrect_feedback):
        if feedback:
            yield feedback
