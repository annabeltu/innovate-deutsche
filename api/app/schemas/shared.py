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


class TopicNeed(BaseModel):
    """How far the learner's group trails the Findex benchmark on one topic."""

    model_config = ConfigDict(extra="forbid")

    indicator: str = Field(min_length=1, description="Findex indicator name.")
    group_rate: float = Field(
        ge=0, le=1, description="Share of the learner's group meeting the indicator."
    )
    benchmark_rate: float = Field(
        ge=0, le=1, description="Benchmark share the group is compared against."
    )
    findex_gap: float = Field(
        ge=0, le=1, description="How far the group trails the benchmark, 0 to 1."
    )


class LearnerNeeds(BaseModel):
    """What a learner is likely to struggle with, from the Findex data."""

    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(min_length=1, description="Learner these needs belong to.")
    country: Country = Field(description="Country the Findex data comes from.")
    topic_needs: dict[Topic, TopicNeed] = Field(description="One entry per topic.")

    @field_validator("topic_needs")
    @classmethod
    def _require_every_topic(
        cls, topic_needs: dict[Topic, TopicNeed]
    ) -> dict[Topic, TopicNeed]:
        """Reject needs that skip a topic, since any lesson may be customized."""
        missing = set(Topic) - topic_needs.keys()
        if missing:
            raise ValueError(f"missing topic needs: {sorted(missing)}")
        return topic_needs


class CardType(StrEnum):
    """Lesson card layouts; final designs come from the front end."""

    CONCEPT = "concept"
    BRIDGE = "bridge"
    MC_QUIZ = "mc_quiz"
    DRAG_MATCH = "drag_match"
    COMPARE_CHART = "compare_chart"
    CLAUSE_TAP = "clause_tap"
    SCAM_SWIPE = "scam_swipe"
    BUDGET_SIM = "budget_sim"
    TAKEAWAY = "takeaway"


class AnswerMode(StrEnum):
    """How the learner answers a card in voice mode."""

    SAY_OPTION = "say_option"
    SAY_NEXT = "say_next"


class VoiceBlock(BaseModel):
    """Spoken version of a card, so every lesson works by voice alone."""

    model_config = ConfigDict(extra="forbid")

    speak_text: str = Field(
        min_length=1, description="Full spoken card, including every option letter."
    )
    answer_mode: AnswerMode = Field(description="How the learner answers by voice.")
    spoken_options: dict[str, str] = Field(
        default_factory=dict, description="Option letter to spoken option text."
    )
    correct_feedback: str | None = Field(
        default=None, description="Spoken feedback when right."
    )
    incorrect_feedback: str | None = Field(
        default=None, description="Spoken feedback when wrong, with the explanation."
    )


class LessonCard(BaseModel):
    """One screen of a lesson."""

    model_config = ConfigDict(extra="forbid")

    card_id: str = Field(min_length=1, description="Card id, unique in its lesson.")
    type: CardType = Field(description="Card layout.")
    text: str = Field(min_length=1, description="Text shown on the card.")
    options: dict[str, str] = Field(
        default_factory=dict, description="Option letter to option text."
    )
    correct_option: str | None = Field(
        default=None, description="Letter of the correct option, for quiz cards."
    )
    voice: VoiceBlock = Field(description="Required spoken version of the card.")


class Lesson(BaseModel):
    """A lesson customized for one learner."""

    model_config = ConfigDict(extra="forbid")

    lesson_id: str = Field(min_length=1, description="Base lesson id.")
    topic: Topic = Field(description="Topic the lesson teaches.")
    title: str = Field(min_length=1, description="Lesson title.")
    goal: str = Field(min_length=1, description="What the learner will be able to do.")
    difficulty: int = Field(ge=1, le=3, description="Difficulty served, 1 to 3.")
    cards: list[LessonCard] = Field(min_length=1, description="Cards in order.")
