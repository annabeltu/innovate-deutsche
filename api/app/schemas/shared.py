"""Shared Pydantic models. Owned jointly by Faraz and Will.

Mirrors docs/API_CONTRACTS.md and app/src/types/api.ts; change all three
together.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Country(StrEnum):
    """Countries Kompass has a country pack for."""

    INDIA = "IN"
    KENYA = "KE"
    GERMANY = "DE"


class Language(StrEnum):
    """Languages the app and lessons are available in."""

    ENGLISH = "en"
    HINDI = "hi"
    SWAHILI = "sw"
    GERMAN = "de"


class Topic(StrEnum):
    """Financial literacy topics a learning path is built from."""

    ACCOUNTS = "accounts"
    SAVING = "saving"
    BORROWING = "borrowing"
    SCAMS = "scams"
    BUDGET = "budget"


class LifeStage(StrEnum):
    """Learner's life stage, chosen during onboarding."""

    STUDENT = "student"
    FIRST_JOB = "first_job"
    PARENT = "parent"
    RETIRED = "retired"


class Goal(StrEnum):
    """Learner's main money goal, chosen during onboarding."""

    SAVE_MORE = "save_more"
    AVOID_DEBT = "avoid_debt"
    STAY_SAFE_ONLINE = "stay_safe_online"
    HANDLE_EMERGENCIES = "handle_emergencies"


class SavingsHabit(StrEnum):
    """Where the learner keeps their savings today."""

    CASH_AT_HOME = "cash_at_home"
    SAVINGS_GROUP = "savings_group"
    BANK = "bank"
    GOLD_OR_ASSETS = "gold_or_assets"
    NONE = "none"


class Accessibility(BaseModel):
    """Accessibility settings that change how lessons are presented."""

    model_config = ConfigDict(extra="forbid")

    voice_mode: bool = Field(description="Whole app is driven by speech.")
    read_aloud: bool = Field(description="Screen text is read aloud.")
    simple_mode: bool = Field(description="Shorter, simpler wording.")
    large_text: bool = Field(description="Larger font sizes.")
    speech_rate: float = Field(gt=0, description="Text-to-speech rate; 1.0 is normal.")


class TopicScore(BaseModel):
    """How well the learner knows one topic."""

    model_config = ConfigDict(extra="forbid")

    confidence: float = Field(ge=0, le=1, description="Self-rated confidence, 0 to 1.")
    quiz_score: float = Field(ge=0, le=1, description="Baseline quiz score, 0 to 1.")
    proficiency: float = Field(
        ge=0, le=1, description="0.4 x confidence + 0.6 x quiz_score, 0 to 1."
    )
    completed: bool = Field(description="Learner has finished this topic.")


class LearnerProfile(BaseModel):
    """Everything known about a learner; the only handoff between the two APIs."""

    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(min_length=1, description="Stable learner id.")
    country: Country = Field(description="Country used for data and examples.")
    language: Language = Field(description="Language for lessons and speech.")
    accessibility: Accessibility = Field(description="Accessibility settings.")
    life_stage: LifeStage = Field(description="Learner's life stage.")
    goal: Goal = Field(description="Learner's main money goal.")
    comfort: int = Field(description="Comfort with money, as recorded at onboarding.")
    savings_habit: SavingsHabit = Field(description="Where savings are kept today.")
    topic_scores: dict[Topic, TopicScore] = Field(
        description="One entry per topic.",
    )
    bonus_lesson_ids: list[str] = Field(
        default_factory=list, description="Ids of AI bonus lessons added to the path."
    )
    updated_at: datetime = Field(description="Last time the profile changed (UTC).")

    @field_validator("topic_scores")
    @classmethod
    def _require_every_topic(
        cls, topic_scores: dict[Topic, TopicScore]
    ) -> dict[Topic, TopicScore]:
        """Reject profiles that skip a topic, since every path node needs a score."""
        missing = set(Topic) - topic_scores.keys()
        if missing:
            raise ValueError(f"missing topic scores: {sorted(missing)}")
        return topic_scores
