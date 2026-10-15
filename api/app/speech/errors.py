"""Errors shared by speech providers."""


class SpeechProviderError(Exception):
    """The provider failed, timed out, or answered in an unexpected shape."""
