"""Shared Pydantic models. Owned jointly by Faraz and Will.

Mirrored in app/src/types/api.ts and documented in docs/API_CONTRACTS.md.
Change all three together.
"""

from datetime import datetime
from enum import IntEnum, StrEnum
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

UnitInterval = Annotated[float, Field(ge=0.0, le=1.0)]


class Country(StrEnum):
    """Countries Kompass supports."""

    US = "US"
    MX = "MX"
    KE = "KE"


class Language(StrEnum):
    """Languages Kompass supports. Valid pairs per country live in the question bank."""

    EN = "en"
    ES = "es"
    SW = "sw"


class Topic(StrEnum):
    """Core topics; each is also the lesson_id of its core lesson."""

    ACCOUNTS = "accounts"
    SAVING = "saving"
    BORROWING = "borrowing"
    SCAMS = "scams"
    BUDGET = "budget"


class LifeStage(StrEnum):
    """Where the learner is in life."""

    STUDENT = "student"
    FIRST_JOB = "first_job"
    PARENT = "parent"
    RETIRED = "retired"


class Goal(StrEnum):
    """The learner's main money goal."""

    SAVE_MORE = "save_more"
    AVOID_DEBT = "avoid_debt"
    STAY_SAFE_ONLINE = "stay_safe_online"
    HANDLE_EMERGENCIES = "handle_emergencies"


class SavingsHabit(StrEnum):
    """Where the learner usually keeps savings."""

    CASH_AT_HOME = "cash_at_home"
    SAVINGS_GROUP = "savings_group"
    BANK = "bank"
    GOLD_OR_ASSETS = "gold_or_assets"
    NONE = "none"


class Comfort(IntEnum):
    """Overall comfort with money, from 1 (low) to 3 (high)."""

    LOW = 1
    MEDIUM = 2
    HIGH = 3


class Difficulty(IntEnum):
    """Question and lesson difficulty, from 1 (easiest) to 3."""

    EASY = 1
    MEDIUM = 2
    HARD = 3


class Accessibility(BaseModel):
    """Display and voice settings chosen during setup."""

    model_config = ConfigDict(extra="forbid")

    voice_mode: bool = Field(default=False, description="Whole app driven by voice.")
    read_aloud: bool = Field(
        default=False, description="Read cards aloud automatically."
    )
    simple_mode: bool = Field(default=False, description="Shorter, simpler sentences.")
    large_text: bool = Field(default=False, description="Larger font sizes.")
    speech_rate: float = Field(
        default=1.0, ge=0.5, le=2.0, description="Text-to-speech speed multiplier."
    )


class TopicScore(BaseModel):
    """The learner's standing on one topic."""

    confidence: UnitInterval = Field(description="Onboarding slider value.")
    quiz_score: UnitInterval | None = Field(
        description="Share of baseline questions answered correctly; null if skipped."
    )
    proficiency: UnitInterval = Field(
        description="0.4 × confidence + 0.6 × quiz_score, or confidence if skipped."
    )
    completed: bool = Field(
        description="True once the topic's core lesson is finished."
    )


class LearnerProfile(BaseModel):
    """Everything Faraz's API needs to personalize the path. Will writes, Faraz reads."""

    user_id: str = Field(description="Created by POST /v1/onboarding.")
    country: Country
    language: Language
    accessibility: Accessibility
    life_stage: LifeStage
    goal: Goal
    comfort: Comfort
    savings_habit: SavingsHabit
    topic_scores: dict[Topic, TopicScore] = Field(description="One entry per topic.")
    bonus_lesson_ids: list[str] = Field(default_factory=list)
    updated_at: datetime = Field(description="UTC, ISO 8601.")


class OnboardingRequest(BaseModel):
    """Setup and onboarding answers sent by the app."""

    model_config = ConfigDict(extra="forbid")

    language: Language
    country: Country
    accessibility: Accessibility = Field(default_factory=Accessibility)
    life_stage: LifeStage
    goal: Goal
    comfort: Comfort
    savings_habit: SavingsHabit
    confidence: dict[Topic, UnitInterval] = Field(
        description="Confidence slider per topic, 0 to 1. Every topic is required.",
        min_length=len(Topic),
    )


class QuizOption(BaseModel):
    """One answer choice."""

    option_id: str = Field(description="Letter shown and spoken: a, b, c.")
    text: str


class QuestionVoice(BaseModel):
    """Spoken version of a question for voice mode."""

    speak_text: str = Field(
        description="Reads the question, every option with its letter, and how to answer."
    )


class QuizQuestion(BaseModel):
    """A baseline question as sent to the app. The answer key stays on the server."""

    question_id: str
    topic: Topic
    difficulty: Difficulty
    prompt: str
    options: list[QuizOption]
    voice: QuestionVoice


class Quiz(BaseModel):
    """The baseline quiz, written in the learner's language for their country."""

    quiz_id: str
    language: Language
    questions: list[QuizQuestion]


class OnboardingResponse(BaseModel):
    """Returned by POST /v1/onboarding."""

    user_id: str
    quiz: Quiz


class QuizAnswer(BaseModel):
    """One answer chosen by the learner."""

    model_config = ConfigDict(extra="forbid")

    question_id: str
    option_id: str


class QuizSubmitRequest(BaseModel):
    """Body of POST /v1/quiz/{quiz_id}/submit. Unanswered questions count as wrong."""

    model_config = ConfigDict(extra="forbid")

    user_id: str
    answers: list[QuizAnswer]


class QuestionResult(BaseModel):
    """Grading for one question, so the app can give feedback."""

    question_id: str
    correct: bool
    correct_option_id: str


class QuizSubmitResponse(BaseModel):
    """Returned by POST /v1/quiz/{quiz_id}/submit."""

    profile: LearnerProfile
    results: list[QuestionResult]


class QuizSkipRequest(BaseModel):
    """Body of POST /v1/quiz/{quiz_id}/skip."""

    model_config = ConfigDict(extra="forbid")

    user_id: str


class QuizSkipResponse(BaseModel):
    """Returned by POST /v1/quiz/{quiz_id}/skip."""

    profile: LearnerProfile


class AccessibilityUpdate(BaseModel):
    """Body of PATCH /v1/profile/{user_id}/accessibility. Omitted fields keep their value."""

    model_config = ConfigDict(extra="forbid")

    voice_mode: bool | None = None
    read_aloud: bool | None = None
    simple_mode: bool | None = None
    large_text: bool | None = None
    speech_rate: float | None = Field(default=None, ge=0.5, le=2.0)


class LessonResultRequest(BaseModel):
    """Body of POST /v1/profile/{user_id}/lesson-results."""

    model_config = ConfigDict(extra="forbid")

    lesson_id: str = Field(min_length=1, description="A topic, or a bonus lesson id.")
    correct: int = Field(
        ge=0, description="Questions answered correctly in the lesson."
    )
    total: int = Field(ge=1, description="Questions in the lesson.")
    completed: bool = Field(description="True if the learner finished the lesson.")

    @model_validator(mode="after")
    def check_correct_within_total(self) -> Self:
        """A learner cannot get more questions right than the lesson has."""
        if self.correct > self.total:
            raise ValueError("correct cannot be greater than total")
        return self


class LessonResultResponse(BaseModel):
    """Returned by POST /v1/profile/{user_id}/lesson-results."""

    topic: Topic | None = Field(description="Null for bonus lessons.")
    proficiency: UnitInterval | None = Field(
        description="0.5 × old proficiency + 0.5 × correct / total; null for bonus lessons."
    )
    completed: bool
    path_refresh_needed: bool = Field(
        description="True when the topic's difficulty band changed; call POST /v1/path again."
    )


class ErrorDetail(BaseModel):
    """Body of every error response."""

    code: str
    message: str
    details: dict[str, object] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    """Every non-2xx response uses this shape."""

    error: ErrorDetail


# Path + Lessons API (Faraz)


class AgeGroup(StrEnum):
    """Findex age group a learner's numbers come from, set by life stage."""

    YOUNG = "ages_15_24"
    OLDER = "age_25_plus"
    ALL_ADULTS = "all"


class NeedKind(StrEnum):
    """What a Findex number says the learner's group needs."""

    STRUGGLE = "struggle"
    LACKING = "lacking"
    COULD_USE = "could_use"
    EXPOSURE = "exposure"


class NeedSignal(BaseModel):
    """One Findex number about people like the learner, compared to a benchmark."""

    model_config = ConfigDict(extra="forbid")

    indicator_id: str = Field(min_length=1, description="Findex series code.")
    label: str = Field(
        min_length=1, description='Completes "N% of people your age ...".'
    )
    kind: NeedKind = Field(description="Struggle, lacking, could use or exposure.")
    group_rate: UnitInterval = Field(description="Share of the learner's group.")
    age_group: AgeGroup = Field(
        description="Group group_rate is for; all adults when Findex has no age split."
    )
    benchmark_rate: UnitInterval | None = Field(
        description="Upper-middle-income average, or null if not published."
    )
    gap: UnitInterval = Field(
        description="How far the group is from the benchmark, 0 (none) to 1. "
        "For exposure, the share exposed."
    )
    survey_year: int = Field(description="Findex survey year the rates come from.")


class TopicNeed(BaseModel):
    """Everything the Findex data says the learner needs on one topic."""

    model_config = ConfigDict(extra="forbid")

    topic: Topic
    findex_gap: UnitInterval = Field(
        description="Mean gap of the topic's signals; feeds path priority."
    )
    signals: list[NeedSignal] = Field(
        min_length=1, description="Biggest gap first; the first is the headline."
    )


class LearnerNeeds(BaseModel):
    """What a learner likely needs, from Global Findex data for people like them.

    Built by Faraz's API from the learner's country and life stage; read
    together with Will's LearnerProfile to customize lessons and the path.
    """

    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(min_length=1, description="Learner these needs belong to.")
    country: Country
    age_group: AgeGroup = Field(description="Findex age group for the learner.")
    benchmark_name: str = Field(
        description='For example "upper-middle-income countries".'
    )
    source: str = Field(description="Data citation.")
    topic_needs: dict[Topic, TopicNeed] = Field(description="One entry per topic.")
    priorities: list[Topic] = Field(description="Topics by findex_gap, biggest first.")

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

    @computed_field
    @property
    def struggles(self) -> list[NeedSignal]:
        """Places the learner's group struggles, biggest gap first."""
        return self._signals_of(NeedKind.STRUGGLE)

    @computed_field
    @property
    def lacking(self) -> list[NeedSignal]:
        """Things the learner's group lacks, biggest gap first."""
        return self._signals_of(NeedKind.LACKING)

    @computed_field
    @property
    def could_use(self) -> list[NeedSignal]:
        """Things the learner's group could benefit from, biggest gap first."""
        return self._signals_of(NeedKind.COULD_USE)

    def _signals_of(self, kind: NeedKind) -> list[NeedSignal]:
        """Signals of one kind across all topics with a real gap, biggest first."""
        signals = [
            signal
            for need in self.topic_needs.values()
            for signal in need.signals
            if signal.kind == kind and signal.gap > 0
        ]
        return sorted(signals, key=lambda signal: signal.gap, reverse=True)


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
    difficulty: Difficulty = Field(description="Difficulty served, 1 to 3.")
    cards: list[LessonCard] = Field(min_length=1, description="Cards in order.")
