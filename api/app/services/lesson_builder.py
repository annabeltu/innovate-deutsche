"""Lesson pipeline: template fill, LLM rewrite, voice script, validate, cache. Owner: Faraz (@faraz999shah).

customize_lesson() is the deterministic first step: it picks the cards that
fit the learner and fills every {placeholder} with facts from code, so no
number in a lesson ever comes from the LLM.
"""

from collections.abc import Mapping

from app.schemas.lesson_template import CardTemplate, LessonTemplate
from app.schemas.shared import (
    Difficulty,
    LearnerNeeds,
    LearnerProfile,
    Lesson,
    LessonCard,
    TopicNeed,
    VoiceBlock,
)
from app.services.proficiency import difficulty_band

PERCENT = 100


def customize_lesson(
    template: LessonTemplate, profile: LearnerProfile, needs: LearnerNeeds
) -> Lesson:
    """Tailor a stored base lesson to one learner.

    Args:
        template: The base lesson, shared by every learner.
        profile: The learner's profile from profile_store.get_profile().
        needs: What the learner struggles with, from the Findex data.

    Returns:
        The lesson at the learner's difficulty, with only the cards that fit
        their life stage and goal, and every placeholder filled.

    Raises:
        ValueError: If profile and needs belong to different learners, no
            card fits the learner, or a placeholder has no fact.
    """
    if needs.user_id != profile.user_id:
        raise ValueError(
            f"needs for {needs.user_id} cannot customize a lesson for {profile.user_id}"
        )

    difficulty = difficulty_band(profile.topic_scores[template.topic].proficiency)
    facts = lesson_facts(needs.topic_needs[template.topic])
    cards = [
        _fill_card(card, facts, template.lesson_id)
        for card in template.cards
        if card_fits_learner(card, profile, difficulty)
    ]
    if not cards:
        raise ValueError(
            f"lesson {template.lesson_id} has no cards for {profile.user_id}"
        )

    return Lesson(
        lesson_id=template.lesson_id,
        topic=template.topic,
        title=_fill(template.title, facts, template.lesson_id),
        goal=_fill(template.goal, facts, template.lesson_id),
        difficulty=difficulty,
        cards=cards,
    )


def card_fits_learner(
    card: CardTemplate, profile: LearnerProfile, difficulty: Difficulty
) -> bool:
    """Whether a base card belongs in this learner's version of the lesson."""
    return (
        card.min_difficulty <= difficulty
        and (card.life_stages is None or profile.life_stage in card.life_stages)
        and (card.goals is None or profile.goal in card.goals)
    )


def lesson_facts(need: TopicNeed) -> dict[str, str]:
    """Facts a base lesson may reference as {placeholders}, as display text."""
    return {
        "indicator": need.indicator,
        "group_percent": _as_percent(need.group_rate),
        "benchmark_percent": _as_percent(need.benchmark_rate),
    }


def _fill_card(
    card: CardTemplate, facts: Mapping[str, str], lesson_id: str
) -> LessonCard:
    """Fill every text field of one card, including its voice block."""
    voice = card.voice
    return LessonCard(
        card_id=card.card_id,
        type=card.type,
        text=_fill(card.text, facts, lesson_id),
        options=_fill_all(card.options, facts, lesson_id),
        correct_option=card.correct_option,
        voice=VoiceBlock(
            speak_text=_fill(voice.speak_text, facts, lesson_id),
            answer_mode=voice.answer_mode,
            spoken_options=_fill_all(voice.spoken_options, facts, lesson_id),
            correct_feedback=_fill_optional(voice.correct_feedback, facts, lesson_id),
            incorrect_feedback=_fill_optional(
                voice.incorrect_feedback, facts, lesson_id
            ),
        ),
    )


def _fill_all(
    texts: Mapping[str, str], facts: Mapping[str, str], lesson_id: str
) -> dict[str, str]:
    """Fill each value of an option map."""
    return {key: _fill(text, facts, lesson_id) for key, text in texts.items()}


def _fill_optional(
    text: str | None, facts: Mapping[str, str], lesson_id: str
) -> str | None:
    """Fill text that a card may leave out."""
    return None if text is None else _fill(text, facts, lesson_id)


def _fill(text: str, facts: Mapping[str, str], lesson_id: str) -> str:
    """Fill {placeholders}, failing loudly so a broken template is never served."""
    try:
        return text.format_map(facts)
    except KeyError as error:
        raise ValueError(
            f"lesson {lesson_id} uses unknown placeholder {error}"
        ) from error
    except (IndexError, ValueError) as error:
        raise ValueError(
            f"lesson {lesson_id} has a malformed placeholder in {text!r}"
        ) from error


def _as_percent(rate: float) -> str:
    """Show a 0-1 rate as a whole percent, e.g. 0.384 -> '38'."""
    return str(round(rate * PERCENT))
