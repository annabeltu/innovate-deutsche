"""Pure proficiency math for the LearnerProfile. No I/O."""

from decimal import ROUND_HALF_UP, Decimal

from app.schemas.shared import Topic, TopicScore

CONFIDENCE_WEIGHT = Decimal("0.4")
QUIZ_WEIGHT = Decimal("0.6")
SCORE_PLACES = Decimal("0.01")


def round_score(value: Decimal) -> float:
    """Round to 2 decimals, half up, so 0.125 always becomes 0.13."""
    return float(value.quantize(SCORE_PLACES, rounding=ROUND_HALF_UP))


def compute_proficiency(confidence: float, quiz_score: float | None) -> float:
    """Blend slider confidence with quiz score; the quiz weighs more because self-ratings run high.

    Args:
        confidence: Onboarding slider value, 0 to 1.
        quiz_score: Share of the topic's quiz answered correctly, or None if skipped.

    Returns:
        0.4 × confidence + 0.6 × quiz_score, or confidence alone when skipped.
    """
    confidence_decimal = Decimal(str(confidence))
    if quiz_score is None:
        return round_score(confidence_decimal)
    return round_score(
        CONFIDENCE_WEIGHT * confidence_decimal + QUIZ_WEIGHT * Decimal(str(quiz_score))
    )


def build_topic_scores(
    confidence: dict[Topic, float], quiz_scores: dict[Topic, float] | None
) -> dict[Topic, TopicScore]:
    """Build one TopicScore per topic. Pass quiz_scores=None when the quiz was skipped."""
    topic_scores: dict[Topic, TopicScore] = {}
    for topic in Topic:
        quiz_score = None if quiz_scores is None else quiz_scores[topic]
        topic_scores[topic] = TopicScore(
            confidence=confidence[topic],
            quiz_score=quiz_score,
            proficiency=compute_proficiency(confidence[topic], quiz_score),
            completed=False,
        )
    return topic_scores
