"""Domain errors raised by services. app/error_handlers.py maps each code to an HTTP status."""


class KompassError(Exception):
    """Base error carrying the contract's error code, message and details."""

    code = "internal_error"

    def __init__(self, message: str, details: dict[str, object] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class InvalidRequestError(KompassError):
    """The request is well-formed JSON but breaks a rule Pydantic cannot check."""

    code = "validation_error"


class ProfileNotFoundError(KompassError):
    """No profile exists, usually because onboarding never finished."""

    code = "profile_not_found"


class QuizNotFoundError(KompassError):
    """No quiz with this id belongs to this user."""

    code = "quiz_not_found"


class QuizAlreadySubmittedError(KompassError):
    """The quiz was already submitted or skipped."""

    code = "quiz_already_submitted"


class LessonNotFoundError(KompassError):
    """The lesson id is neither a core topic nor one of the learner's bonus lessons."""

    code = "lesson_not_found"


class LessonBuildError(KompassError):
    """A stored lesson could not be customized; a content or data bug, not the user's."""

    code = "lesson_build_failed"


class LessonGenerationError(KompassError):
    """The LLM could not produce a valid lesson for the request, even after a retry."""

    code = "lesson_generation_failed"


class OffTopicRequestError(KompassError):
    """The learner asked for a lesson that is not about personal money."""

    code = "off_topic_request"


class UnsupportedLanguageError(KompassError):
    """The language is valid but not offered for the chosen country."""

    code = "unsupported_language"


class UnsupportedAudioError(KompassError):
    """The uploaded recording is not an audio type speech-to-text accepts."""

    code = "unsupported_audio"


class AudioTooLargeError(KompassError):
    """The uploaded recording is over the configured size limit."""

    code = "audio_too_large"


class VoiceUnavailableError(KompassError):
    """No speech provider is configured; the app falls back to on-device speech."""

    code = "voice_unavailable"


class VoiceProviderError(KompassError):
    """The speech provider rejected the request or returned something unusable."""

    code = "voice_provider_error"


class VoiceProviderTimeoutError(KompassError):
    """The speech provider did not answer in time."""

    code = "voice_provider_timeout"


class LessonTranslationError(KompassError):
    """A lesson could not be fully rewritten in the requested language."""

    code = "lesson_translation_failed"
