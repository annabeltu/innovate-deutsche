import asyncio

import pytest

from app.config import Settings
from app.dependencies import get_synthesizer, get_transcriber
from app.schemas.shared import Language
from app.services.errors import VoiceProviderError
from app.services.gemini_voice import (
    GeminiSynthesizer,
    GeminiTranscriber,
    gemini_audio_type,
)
from app.services.speech_cache import SpeechCache
from app.services.speech_to_text import AudioClip
from app.speech.errors import SpeechProviderError
from app.speech.gemini import GeminiSpeechConfig

CONFIG = GeminiSpeechConfig(
    "key", "https://gemini.test", ("m",), ("t",), "Kore", "{language_name}"
)


@pytest.mark.parametrize(
    ("content_type", "expected"),
    [
        ("audio/mp4", "audio/m4a"),
        ("audio/webm;codecs=opus", "audio/webm"),
        ("audio/wav", "audio/wav"),
    ],
)
def test_upload_types_map_to_gemini_types(content_type: str, expected: str) -> None:
    assert gemini_audio_type(content_type) == expected


def test_gemini_is_chosen_when_its_key_is_set() -> None:
    settings = Settings(
        gemini_api_key="g-key", whisper_api_key="w-key", tts_api_key="t-key"
    )

    assert isinstance(get_transcriber(settings), GeminiTranscriber)
    assert isinstance(get_synthesizer(settings), GeminiSynthesizer)


def test_whisper_is_used_without_a_gemini_key() -> None:
    settings = Settings(gemini_api_key="", whisper_api_key="w-key")

    assert not isinstance(get_transcriber(settings), GeminiTranscriber)


def test_synthesizer_reuses_cached_audio(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def fake_synthesize(self: object, text: str) -> bytes:
        calls.append(text)
        return b"RIFF"

    monkeypatch.setattr(
        "app.speech.gemini.GeminiSpeechClient.synthesize", fake_synthesize
    )
    synthesizer = GeminiSynthesizer(CONFIG, 1.0, SpeechCache(max_bytes=100))

    first = asyncio.run(synthesizer.synthesize("Hola", Language.ES, 1.0))
    second = asyncio.run(synthesizer.synthesize("Hola", Language.ES, 1.0))

    assert first == second == b"RIFF"
    assert calls == ["Hola"]


def test_provider_failures_become_voice_provider_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def failing(self: object, audio: bytes, mime_type: str, language: Language) -> str:
        raise SpeechProviderError("quota")

    monkeypatch.setattr("app.speech.gemini.GeminiSpeechClient.transcribe", failing)
    clip = AudioClip(content=b"x", content_type="audio/mp4", filename="q.m4a")

    with pytest.raises(VoiceProviderError):
        asyncio.run(GeminiTranscriber(CONFIG, 1.0).transcribe(clip, Language.SW))
