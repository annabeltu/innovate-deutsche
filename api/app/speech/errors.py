"""Errors shared by speech providers."""


class SpeechProviderError(Exception):
    """The provider failed, timed out, or answered in an unexpected shape.

    `retryable` is True for timeouts, network errors and 5xx responses, where
    the same model may succeed a moment later. Quota (429), auth and
    unknown-model errors are not retryable: the next model should be tried.
    """

    def __init__(self, message: str, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable
