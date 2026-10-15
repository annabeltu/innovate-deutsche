"""Voice API request/response models. Owner: voice teammate (@voice-placeholder).

Kept out of schemas/shared.py until Faraz and Will approve adding them to the shared
contract (docs/VOICE_API.md lists the proposal). Mirrored in app/src/voice/types.ts.
"""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.shared import Language

MAX_INTENT_TEXT_LENGTH = 500


class VoiceIntent(StrEnum):
    """What a short spoken reply means. Anything else is `unknown` so the app re-asks."""

    YES = "yes"
    NO = "no"
    REPEAT = "repeat"
    NEXT = "next"
    BACK = "back"
    HELP = "help"
    START = "start"
    OPTION = "option"
    NUMBER = "number"
    SCAM = "scam"
    LEGITIMATE = "legitimate"
    UNKNOWN = "unknown"


class IntentRequest(BaseModel):
    """Body of POST /v1/voice/intent."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(
        max_length=MAX_INTENT_TEXT_LENGTH,
        description="Transcript of what the learner said.",
    )
    language: Language = Field(description="Language the learner spoke in.")


class IntentResponse(BaseModel):
    """Returned by POST /v1/voice/intent."""

    intent: VoiceIntent
    option_id: str | None = Field(
        default=None, description="Lowercase letter a to d when intent is `option`."
    )
    number: int | None = Field(
        default=None, ge=0, description="The spoken number when intent is `number`."
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="1 for an exact command, lower when filler words were ignored, 0 for unknown.",
    )
    normalized_text: str = Field(
        description="Lowercased, accent- and punctuation-free text that was matched."
    )


class TranscriptionResponse(BaseModel):
    """Returned by POST /v1/voice/transcribe."""

    text: str = Field(description="What the learner said; empty if nothing was heard.")
    language: Language
    is_fixture: bool = Field(
        default=False,
        description="True only in development when no speech-to-text key is set.",
    )
