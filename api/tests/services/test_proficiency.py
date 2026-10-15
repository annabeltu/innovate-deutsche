import pytest

from app.schemas.shared import Topic
from app.services.proficiency import (
    build_topic_scores,
    compute_proficiency,
    difficulty_band,
    update_after_lesson,
)


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


@pytest.mark.parametrize(
    ("score", "expected"),
    [(0.0, 1), (0.39, 1), (0.4, 2), (0.69, 2), (0.7, 3), (1.0, 3)],
)
def test_difficulty_band_boundaries(score: float, expected: int) -> None:
    assert difficulty_band(score) == expected


@pytest.mark.parametrize(
    ("old", "correct", "total", "expected"),
    [
        (0.12, 4, 5, 0.46),
        (0.5, 0, 5, 0.25),
        (0.0, 3, 3, 0.5),
        (1.0, 3, 3, 1.0),
        (0.33, 1, 3, 0.33),
    ],
)
def test_update_after_lesson_moves_halfway_to_lesson_score(
    old: float, correct: int, total: int, expected: float
) -> None:
    assert update_after_lesson(old, correct, total) == expected
