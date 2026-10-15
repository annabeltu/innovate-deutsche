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


class UnsupportedLanguageError(KompassError):
    """The language is valid but not offered for the chosen country."""

    code = "unsupported_language"
