"""Whisper and hosted TTS clients, against a fake network. No real provider is called."""

import asyncio
import json
from collections.abc import Callable

import httpx
import pytest

from app.schemas.shared import Language
from app.schemas.voice import SpeakRequest
from app.services.errors import (
    AudioTooLargeError,
    InvalidRequestError,
    UnsupportedAudioError,
    UnsupportedLanguageError,
    VoiceProviderError,
    VoiceProviderTimeoutError,
)
from app.services.speech_to_text import (
    AudioClip,
    FixtureTranscriber,
    WhisperTranscriber,
    transcribe,
    validate_audio,
)
from app.services.text_to_speech import OpenAISpeechSynthesizer, speak
from app.services.voice_provider_http import ProviderEndpoint

FAKE_KEY = "test-key-not-real"
CLIP = AudioClip(b"fake-m4a-bytes", "audio/m4a", "recording.m4a")
Handler = Callable[[httpx.Request], httpx.Response]


def endpoint(handler: Handler, model: str = "whisper-1") -> ProviderEndpoint:
    """A provider endpoint whose network is the given fake handler."""
    return ProviderEndpoint(
        url="https://provider.test/v1/audio",
        api_key=FAKE_KEY,
        model=model,
        timeout_seconds=1.0,
        transport=httpx.MockTransport(handler),
    )


def raise_timeout(request: httpx.Request) -> httpx.Response:
    raise httpx.ReadTimeout("slow", request=request)


def raise_connect_error(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("down", request=request)


@pytest.mark.parametrize(
    ("content_type", "filename"),
    [
        ("audio/m4a", "recording.m4a"),
        ("audio/x-m4a", "recording.m4a"),
        ("audio/mp4", "recording.m4a"),
        ("audio/wav", "recording.wav"),
        ("audio/webm; codecs=opus", "recording.webm"),
        ("AUDIO/MPEG", "recording.mp3"),
    ],
)
def test_validate_audio_accepts_supported_types(
    content_type: str, filename: str
) -> None:
    clip = validate_audio(b"audio", content_type, max_bytes=10)

    assert clip.filename == filename
    assert clip.content == b"audio"


@pytest.mark.parametrize("content_type", [None, "", "text/plain", "video/mp4"])
def test_validate_audio_rejects_other_types(content_type: str | None) -> None:
    with pytest.raises(UnsupportedAudioError):
        validate_audio(b"audio", content_type, max_bytes=10)


def test_validate_audio_rejects_oversized_recordings() -> None:
    with pytest.raises(AudioTooLargeError):
        validate_audio(b"x" * 11, "audio/m4a", max_bytes=10)


def test_validate_audio_rejects_empty_recordings() -> None:
    with pytest.raises(InvalidRequestError):
        validate_audio(b"", "audio/m4a", max_bytes=10)


@pytest.mark.parametrize("language", list(Language))
def test_whisper_sends_audio_model_and_language_hint(language: Language) -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(200, json={"text": "  next  "})

    result = asyncio.run(
        transcribe(CLIP, language, WhisperTranscriber(endpoint(handler)))
    )

    assert result.text == "next"
    assert result.language == language
    assert result.is_fixture is False
    body = captured[0].read()
    assert captured[0].headers["Authorization"] == f"Bearer {FAKE_KEY}"
    assert f'name="language"\r\n\r\n{language.value}'.encode() in body
    assert b'name="model"\r\n\r\nwhisper-1' in body
    assert b'filename="recording.m4a"' in body
    assert b"fake-m4a-bytes" in body


@pytest.mark.parametrize(
    ("handler", "error"),
    [
        (lambda _request: httpx.Response(500), VoiceProviderError),
        (lambda _request: httpx.Response(401), VoiceProviderError),
        (lambda _request: httpx.Response(200, text="not json"), VoiceProviderError),
        (lambda _request: httpx.Response(200, json={"txt": "x"}), VoiceProviderError),
        (lambda _request: httpx.Response(200, json={"text": 3}), VoiceProviderError),
        (raise_timeout, VoiceProviderTimeoutError),
        (raise_connect_error, VoiceProviderError),
    ],
)
def test_whisper_failures_become_domain_errors(
    handler: Handler, error: type[Exception]
) -> None:
    transcriber = WhisperTranscriber(endpoint(handler))

    with pytest.raises(error):
        asyncio.run(transcriber.transcribe(CLIP, Language.EN))


def test_provider_errors_never_include_the_key(
    caplog: pytest.LogCaptureFixture,
) -> None:
    transcriber = WhisperTranscriber(endpoint(lambda _request: httpx.Response(500)))

    with pytest.raises(VoiceProviderError) as raised:
        asyncio.run(transcriber.transcribe(CLIP, Language.EN))

    assert FAKE_KEY not in str(raised.value.details)
    assert FAKE_KEY not in caplog.text
    assert "whisper-1" in caplog.text


@pytest.mark.parametrize("language", list(Language))
def test_fixture_transcript_is_labeled(language: Language) -> None:
    result = asyncio.run(transcribe(CLIP, language, FixtureTranscriber()))

    assert result.is_fixture is True
    assert result.text


def test_tts_requests_mp3_at_the_learner_speech_rate() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(200, content=b"ID3-mp3-bytes")

    synthesizer = OpenAISpeechSynthesizer(endpoint(handler, model="tts-1"), "alloy")
    request = SpeakRequest(text="Swali la 1.", language=Language.SW, rate=0.8)

    audio = asyncio.run(speak(request, synthesizer, list(Language)))

    assert audio == b"ID3-mp3-bytes"
    assert json.loads(captured[0].read()) == {
        "model": "tts-1",
        "voice": "alloy",
        "input": "Swali la 1.",
        "speed": 0.8,
        "response_format": "mp3",
    }


def test_tts_refuses_languages_not_enabled_without_calling_provider() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        raise AssertionError("provider must not be called")

    synthesizer = OpenAISpeechSynthesizer(endpoint(handler), "alloy")
    request = SpeakRequest(text="Habari", language=Language.SW)

    with pytest.raises(UnsupportedLanguageError):
        asyncio.run(speak(request, synthesizer, [Language.EN, Language.ES]))


@pytest.mark.parametrize(
    ("handler", "error"),
    [
        (lambda _request: httpx.Response(200, content=b""), VoiceProviderError),
        (lambda _request: httpx.Response(429), VoiceProviderError),
        (raise_timeout, VoiceProviderTimeoutError),
    ],
)
def test_tts_failures_become_domain_errors(
    handler: Handler, error: type[Exception]
) -> None:
    synthesizer = OpenAISpeechSynthesizer(endpoint(handler), "alloy")

    with pytest.raises(error):
        asyncio.run(synthesizer.synthesize("Hello", Language.EN, 1.0))
