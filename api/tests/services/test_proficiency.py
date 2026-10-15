import pytest

from app.schemas.shared import Topic
from app.services.proficiency import build_topic_scores, compute_proficiency


@pytest.mark.parametrize(
    ("confidence", "quiz_score", "expected"),
    [
        (0.6, 0.5, 0.54),
        (0.3, 0.0, 0.12),
        (0.5, 1.0, 0.8),
        (0.0, 0.0, 0.0),
        (1.0, 1.0, 1.0),
        (0.125, 0.125, 0.13),
    ],
)
def test_proficiency_weights_quiz_over_confidence(
    confidence: float, quiz_score: float, expected: float
) -> None:
    assert compute_proficiency(confidence, quiz_score) == expected


def test_proficiency_equals_confidence_when_quiz_skipped() -> None:
    assert compute_proficiency(0.37, None) == 0.37


def test_build_topic_scores_covers_every_topic_and_starts_incomplete() -> None:
    confidence = dict.fromkeys(Topic, 0.5)
    quiz_scores = dict.fromkeys(Topic, 1.0)

    scores = build_topic_scores(confidence, quiz_scores)

    assert set(scores) == set(Topic)
    assert all(
        score.proficiency == 0.8 and not score.completed for score in scores.values()
    )


def test_build_topic_scores_leaves_quiz_score_null_when_skipped() -> None:
    scores = build_topic_scores(dict.fromkeys(Topic, 0.4), None)

    assert all(
        score.quiz_score is None and score.proficiency == 0.4
        for score in scores.values()
    )
