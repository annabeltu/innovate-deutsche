"""Path priority and difficulty scoring. Owner: Faraz (@faraz999shah).

Pure functions only: no I/O, deterministic, so the path a learner gets can
always be explained from their profile and the Findex gaps.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from types import MappingProxyType

from app.schemas.shared import Difficulty, Goal, LearnerProfile, Topic
from app.services.proficiency import difficulty_band

FINDEX_GAP_WEIGHT = 0.4
LOW_PROFICIENCY_WEIGHT = 0.4
GOAL_MATCH_WEIGHT = 0.2

# Topics that directly serve each onboarding goal get the goal_match bonus.
GOAL_TOPICS: Mapping[Goal, frozenset[Topic]] = MappingProxyType(
    {
        Goal.SAVE_MORE: frozenset({Topic.SAVING, Topic.BUDGET}),
        Goal.AVOID_DEBT: frozenset({Topic.BORROWING, Topic.BUDGET}),
        Goal.STAY_SAFE_ONLINE: frozenset({Topic.SCAMS, Topic.ACCOUNTS}),
        Goal.HANDLE_EMERGENCIES: frozenset({Topic.SAVING, Topic.BORROWING}),
    }
)

# Stable tie-break so equal priorities always produce the same path.
_TOPIC_ORDER = {topic: index for index, topic in enumerate(Topic)}


@dataclass(frozen=True)
class TopicPriority:
    """One scored topic, ready to become a path node."""

    topic: Topic
    priority: float
    difficulty: Difficulty
    completed: bool


def topic_priority(findex_gap: float, proficiency: float, goal_match: bool) -> float:
    """Score how urgently a topic should be taught.

    Args:
        findex_gap: How far the learner's group trails the benchmark, 0 to 1.
        proficiency: The learner's proficiency in the topic, 0 to 1.
        goal_match: Whether the topic serves the learner's goal.

    Returns:
        Priority from 0 to 1; higher is taught sooner.

    Raises:
        ValueError: If findex_gap or proficiency is outside 0 to 1.
    """
    _require_unit_interval("findex_gap", findex_gap)
    _require_unit_interval("proficiency", proficiency)
    return (
        FINDEX_GAP_WEIGHT * findex_gap
        + LOW_PROFICIENCY_WEIGHT * (1 - proficiency)
        + GOAL_MATCH_WEIGHT * float(goal_match)
    )


def score_topics(
    profile: LearnerProfile, findex_gaps: Mapping[Topic, float]
) -> list[TopicPriority]:
    """Order every topic for a learner's path, most urgent first.

    Completed topics stay in the list (the path still shows them) but always
    come after unfinished ones.

    Args:
        profile: The learner's validated profile.
        findex_gaps: Findex gap per topic for the learner's country and group.

    Returns:
        One TopicPriority per topic, in path order.

    Raises:
        ValueError: If a topic has no Findex gap or a gap is outside 0 to 1.
    """
    missing = set(Topic) - findex_gaps.keys()
    if missing:
        raise ValueError(f"missing findex gaps: {sorted(missing)}")

    goal_topics = GOAL_TOPICS[profile.goal]
    scored = [
        TopicPriority(
            topic=topic,
            priority=topic_priority(
                findex_gaps[topic], score.proficiency, topic in goal_topics
            ),
            difficulty=difficulty_band(score.proficiency),
            completed=score.completed,
        )
        for topic, score in profile.topic_scores.items()
    ]
    return sorted(
        scored,
        key=lambda item: (item.completed, -item.priority, _TOPIC_ORDER[item.topic]),
    )


def _require_unit_interval(name: str, value: float) -> None:
    """Fail fast on scores outside 0 to 1 instead of producing a silent bad path."""
    if not 0 <= value <= 1:
        raise ValueError(f"{name} must be between 0 and 1, got {value}")
