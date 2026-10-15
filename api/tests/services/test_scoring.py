"""Tests for path priority and difficulty scoring."""

import pytest

from app.schemas.shared import Goal, LearnerProfile, Topic
from app.services.scoring import (
    GOAL_TOPICS,
    difficulty_for,
    score_topics,
    topic_priority,
)

EVEN_GAPS = {topic: 0.5 for topic in Topic}


@pytest.mark.parametrize(
    ("findex_gap", "proficiency", "goal_match", "expected"),
    [
        (0.0, 1.0, False, 0.0),
        (1.0, 0.0, True, 1.0),
        (0.5, 0.5, False, 0.4),
        (0.5, 0.5, True, 0.6),
        (0.25, 0.75, False, 0.2),
    ],
)
def test_topic_priority_applies_contract_weights(
    findex_gap: float, proficiency: float, goal_match: bool, expected: float
) -> None:
    assert topic_priority(findex_gap, proficiency, goal_match) == pytest.approx(
        expected
    )


@pytest.mark.parametrize(
    ("findex_gap", "proficiency"), [(-0.1, 0.5), (1.1, 0.5), (0.5, -0.1), (0.5, 1.1)]
)
def test_topic_priority_rejects_values_outside_unit_interval(
    findex_gap: float, proficiency: float
) -> None:
    with pytest.raises(ValueError):
        topic_priority(findex_gap, proficiency, goal_match=False)


@pytest.mark.parametrize(
    ("proficiency", "expected"),
    [(0.0, 1), (0.39, 1), (0.4, 2), (0.69, 2), (0.7, 3), (1.0, 3)],
)
def test_difficulty_rises_with_proficiency(proficiency: float, expected: int) -> None:
    assert difficulty_for(proficiency) == expected


def test_every_goal_has_matching_topics() -> None:
    assert set(GOAL_TOPICS) == set(Goal)
    assert all(GOAL_TOPICS[goal] for goal in Goal)


def test_score_topics_returns_every_topic_once(learner_profile: LearnerProfile) -> None:
    path = score_topics(learner_profile, EVEN_GAPS)

    assert sorted(item.topic for item in path) == sorted(Topic)


def test_score_topics_prioritizes_low_proficiency_topics(
    learner_profile: LearnerProfile,
) -> None:
    path = score_topics(learner_profile, EVEN_GAPS)
    order = [item.topic for item in path]

    # Neither is a goal topic; borrowing (0.08) is far weaker than accounts (0.54).
    assert order.index(Topic.BORROWING) < order.index(Topic.ACCOUNTS)
    assert path[order.index(Topic.BORROWING)].difficulty == 1


def test_score_topics_orders_sample_profile(learner_profile: LearnerProfile) -> None:
    path = score_topics(learner_profile, EVEN_GAPS)

    # budget 0.616, saving 0.600, borrowing 0.568, accounts 0.384, scams completed.
    assert [item.topic for item in path] == [
        Topic.BUDGET,
        Topic.SAVING,
        Topic.BORROWING,
        Topic.ACCOUNTS,
        Topic.SCAMS,
    ]
    assert path[0].priority == pytest.approx(0.616)


def test_score_topics_boosts_goal_topics(learner_profile: LearnerProfile) -> None:
    path = score_topics(learner_profile, EVEN_GAPS)
    order = [item.topic for item in path]

    # saving (0.50, goal) beats accounts (0.54) only because of goal_match.
    assert order.index(Topic.SAVING) < order.index(Topic.ACCOUNTS)


def test_score_topics_puts_completed_topics_last(
    learner_profile: LearnerProfile,
) -> None:
    gaps = {**EVEN_GAPS, Topic.SCAMS: 1.0}

    path = score_topics(learner_profile, gaps)

    assert path[-1].topic == Topic.SCAMS
    assert path[-1].completed is True


def test_score_topics_uses_findex_gap(learner_profile: LearnerProfile) -> None:
    gaps = {**EVEN_GAPS, Topic.ACCOUNTS: 1.0, Topic.BORROWING: 0.0}

    path = score_topics(learner_profile, gaps)
    order = [item.topic for item in path]

    # The Findex gap outweighs accounts' higher proficiency.
    assert order.index(Topic.ACCOUNTS) < order.index(Topic.BORROWING)


def test_score_topics_breaks_ties_in_topic_order() -> None:
    tied_scores = {
        topic: {
            "confidence": 0.5,
            "quiz_score": 0.5,
            "proficiency": 0.5,
            "completed": False,
        }
        for topic in Topic
    }
    profile = LearnerProfile.model_validate(
        {
            "user_id": "u_tie",
            "country": "KE",
            "language": "sw",
            "accessibility": {
                "voice_mode": False,
                "read_aloud": False,
                "simple_mode": False,
                "large_text": False,
                "speech_rate": 1.0,
            },
            "life_stage": "parent",
            "goal": "stay_safe_online",
            "comfort": 2,
            "savings_habit": "savings_group",
            "topic_scores": tied_scores,
            "updated_at": "2026-10-15T15:30:00Z",
        }
    )

    path = score_topics(profile, EVEN_GAPS)

    assert [item.topic for item in path] == [
        Topic.ACCOUNTS,
        Topic.SCAMS,
        Topic.SAVING,
        Topic.BORROWING,
        Topic.BUDGET,
    ]


def test_score_topics_rejects_missing_findex_gap(
    learner_profile: LearnerProfile,
) -> None:
    gaps = {topic: 0.5 for topic in Topic if topic != Topic.BUDGET}

    with pytest.raises(ValueError, match="budget"):
        score_topics(learner_profile, gaps)
