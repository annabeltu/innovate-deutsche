"""Base lesson models: the stored lesson before it is customized. Owner: Faraz.

Text fields may contain {placeholders} that code fills with facts at
customization time. These models are internal to the Lessons API; the app
only ever receives the customized Lesson from shared.py.
"""

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.shared import CardType, Goal, LifeStage, Topic, VoiceBlock


class CardTemplate(BaseModel):
    """One base card plus the rules for which learners get it."""

    model_config = ConfigDict(extra="forbid")

    card_id: str = Field(min_length=1, description="Card id, unique in its lesson.")
    type: CardType = Field(description="Card layout.")
    text: str = Field(min_length=1, description="Card text with {placeholders}.")
    options: dict[str, str] = Field(
        default_factory=dict, description="Option letter to option text."
    )
    correct_option: str | None = Field(
        default=None, description="Letter of the correct option, for quiz cards."
    )
    voice: VoiceBlock = Field(description="Spoken card with {placeholders}.")
    min_difficulty: int = Field(
        default=1, ge=1, le=3, description="Lowest learner difficulty that gets it."
    )
    life_stages: frozenset[LifeStage] | None = Field(
        default=None, description="Only these life stages get it; None means all."
    )
    goals: frozenset[Goal] | None = Field(
        default=None,
        description="Only learners with these goals get it; None means all.",
    )


class LessonTemplate(BaseModel):
    """A stored base lesson, shared by every learner before customization."""

    model_config = ConfigDict(extra="forbid")

    lesson_id: str = Field(min_length=1, description="Base lesson id.")
    topic: Topic = Field(description="Topic the lesson teaches.")
    title: str = Field(min_length=1, description="Lesson title.")
    goal: str = Field(min_length=1, description="What the learner will be able to do.")
    cards: list[CardTemplate] = Field(min_length=1, description="Cards in order.")


MIN_GENERATED_CARDS = 3
MAX_GENERATED_CARDS = 6


class LessonDraft(BaseModel):
    """A base lesson written by the LLM; code adds the lesson_id after checks."""

    model_config = ConfigDict(extra="forbid")

    topic: Topic = Field(description="Core topic whose data and difficulty apply.")
    title: str = Field(min_length=1)
    goal: str = Field(min_length=1)
    cards: list[CardTemplate] = Field(
        min_length=MIN_GENERATED_CARDS, max_length=MAX_GENERATED_CARDS
    )


class GenerationReply(BaseModel):
    """The LLM's answer to a lesson request: exactly one of the three outcomes."""

    model_config = ConfigDict(extra="forbid")

    core_topic: Topic | None = Field(
        default=None, description="Set when a core lesson already covers the request."
    )
    off_topic: bool = Field(
        default=False, description="True when the request is not about personal money."
    )
    lesson: LessonDraft | None = Field(
        default=None, description="A new lesson for a request no core lesson covers."
    )

    @model_validator(mode="after")
    def _exactly_one_outcome(self) -> "GenerationReply":
        """Reject replies that pick no outcome or several."""
        outcomes = [
            self.core_topic is not None,
            self.off_topic,
            self.lesson is not None,
        ]
        if sum(outcomes) != 1:
            raise ValueError(
                "reply must set exactly one of core_topic, off_topic, lesson"
            )
        return self
