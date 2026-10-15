import pytest

from app.schemas.shared import Language
from app.services import voice
from app.services.errors import (
    AudioTooLargeError,
    InvalidRequestError,
    SpeechUnavailableError,
    UnsupportedAudioTypeError,
)
from app.speech.errors import SpeechProviderError


class FakeSpeech:
    """Speech client that fails a set number of times before succeeding."""

    def __init__(self, failures: int = 0) -> None:
        self.failures = failures
        self.calls: list[tuple] = []

    def _maybe_fail(self) -> None:
        if len(self.calls) <= self.failures:
            raise SpeechProviderError("provider down")

    def transcribe(self, audio: bytes, mime_type: str, language: Language) -> str:
        self.calls.append((audio, mime_type, language))
        self._maybe_fail()
        return "How do I save?"

    def synthesize(self, text: str) -> bytes:
        self.calls.append((text,))
        self._maybe_fail()
        return b"RIFF....WAVE"


@pytest.mark.parametrize(
    ("content_type", "expected"),
    [
        ("audio/mp4", "audio/m4a"),
        ("audio/x-m4a", "audio/m4a"),
        ("audio/webm;codecs=opus", "audio/webm"),
        ("AUDIO/WAV", "audio/wav"),
        ("audio/x-wav", "audio/wav"),
        ("audio/mpeg", "audio/mpeg"),
    ],
)
def test_normalize_audio_type_maps_phone_and_browser_types(
    content_type: str, expected: str
) -> None:
    assert voice.normalize_audio_type(content_type) == expected


@pytest.mark.parametrize("content_type", [None, "", "video/mp4", "application/pdf"])
def test_normalize_audio_type_rejects_non_audio(content_type: str | None) -> None:
    with pytest.raises(UnsupportedAudioTypeError):
        voice.normalize_audio_type(content_type)


def test_transcribe_returns_text_and_echoes_language() -> None:
    speech = FakeSpeech()

    result = voice.transcribe(b"abc", "audio/mp4", Language.SW, speech, max_bytes=10)

    assert (result.text, result.language) == ("How do I save?", Language.SW)
    assert speech.calls == [(b"abc", "audio/m4a", Language.SW)]


def test_transcribe_rejects_empty_and_oversized_recordings() -> None:
    with pytest.raises(InvalidRequestError):
        voice.transcribe(b"", "audio/wav", Language.EN, FakeSpeech(), max_bytes=10)
    with pytest.raises(AudioTooLargeError):
        voice.transcribe(
            b"x" * 11, "audio/wav", Language.EN, FakeSpeech(), max_bytes=10
        )


def test_provider_failure_is_retried_once() -> None:
    speech = FakeSpeech(failures=1)

    assert voice.speak("Hola", speech) == b"RIFF....WAVE"
    assert len(speech.calls) == 2


def test_two_provider_failures_become_speech_unavailable() -> None:
    speech = FakeSpeech(failures=2)

    with pytest.raises(SpeechUnavailableError):
        voice.transcribe(b"abc", "audio/wav", Language.EN, speech, max_bytes=10)
    assert len(speech.calls) == 2
