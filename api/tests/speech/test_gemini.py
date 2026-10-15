import base64
import json

import httpx
import pytest

from app.schemas.shared import Language
from app.speech.errors import SpeechProviderError
from app.speech.gemini import GeminiSpeechClient, GeminiSpeechConfig
from app.speech.wav import is_wav, pcm_to_wav

CONFIG = GeminiSpeechConfig(
    api_key="test-key",
    interactions_url="https://gemini.test/v1beta/interactions",
    transcribe_model="gemini-3.5-transcribe",
    tts_model="gemini-3.8-flash-tts",
    tts_voice="Kore",
)


def client_returning(payload: object, status: int = 200, seen: list | None = None):
    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(request)
        return httpx.Response(status, json=payload)

    return GeminiSpeechClient(
        httpx.Client(transport=httpx.MockTransport(handler)), CONFIG
    )


def model_output(*blocks: dict) -> dict:
    return {
        "steps": [
            {"type": "user_input"},
            {"type": "model_output", "content": list(blocks)},
        ]
    }


@pytest.mark.parametrize(
    ("language", "codes"),
    [
        (Language.EN, ["en-US"]),
        (Language.ES, ["es-US", "es-419"]),
        (Language.SW, ["sw-KE"]),
    ],
)
def test_transcribe_sends_inline_audio_with_language_hint(
    language: Language, codes: list[str]
) -> None:
    seen: list[httpx.Request] = []
    client = client_returning(
        model_output({"type": "text", "text": " Habari "}), seen=seen
    )

    text = client.transcribe(b"audio-bytes", "audio/m4a", language)

    assert text == "Habari"
    body = json.loads(seen[0].content)
    assert seen[0].headers["x-goog-api-key"] == "test-key"
    assert body["model"] == "gemini-3.5-transcribe"
    assert body["input"][0] == {
        "type": "audio",
        "mime_type": "audio/m4a",
        "data": base64.b64encode(b"audio-bytes").decode(),
    }
    assert body["generation_config"]["transcription_config"]["language_codes"] == codes


def test_synthesize_returns_wav_from_bare_pcm_and_sends_voice() -> None:
    seen: list[httpx.Request] = []
    pcm = b"\x01\x00" * 10
    client = client_returning(
        model_output({"type": "audio", "data": base64.b64encode(pcm).decode()}),
        seen=seen,
    )

    audio = client.synthesize("Hola")

    assert is_wav(audio) and audio.endswith(pcm)
    body = json.loads(seen[0].content)
    assert body["model"] == "gemini-3.8-flash-tts"
    assert body["generation_config"]["speech_config"] == [{"voice": "Kore"}]
    assert body["input"][0]["content"][0]["text"] == "Hola"


def test_synthesize_keeps_wav_that_already_has_a_header() -> None:
    wav = pcm_to_wav(b"\x00\x00")
    client = client_returning(
        model_output({"type": "audio", "data": base64.b64encode(wav).decode()})
    )

    assert client.synthesize("Hi") == wav


@pytest.mark.parametrize(
    ("payload", "status"),
    [
        ({"error": "boom"}, 500),
        ({"error": "slow down"}, 429),
        ({"no": "steps"}, 200),
        (model_output({"type": "audio", "data": 7}), 200),
        (model_output(), 200),
    ],
)
def test_bad_responses_raise_provider_error(payload: object, status: int) -> None:
    client = client_returning(payload, status)

    with pytest.raises(SpeechProviderError):
        client.transcribe(b"x", "audio/wav", Language.EN)


def test_invalid_base64_audio_raises_provider_error() -> None:
    client = client_returning(model_output({"type": "audio", "data": "not base64!"}))

    with pytest.raises(SpeechProviderError):
        client.synthesize("Hi")


def test_timeout_raises_provider_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    client = GeminiSpeechClient(
        httpx.Client(transport=httpx.MockTransport(handler)), CONFIG
    )

    with pytest.raises(SpeechProviderError):
        client.synthesize("Hi")
