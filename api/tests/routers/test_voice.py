from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.dependencies import (
    get_speech_cache,
    get_speech_client,
    get_voice_rate_limiter,
)
from app.main import app
from app.services.rate_limit import RateLimiter
from app.services.speech_cache import SpeechCache
from tests.services.test_voice import FakeSpeech

MAX_BYTES = 100


@pytest.fixture
def speech() -> FakeSpeech:
    return FakeSpeech()


@pytest.fixture
def voice_client(speech: FakeSpeech) -> Iterator[TestClient]:
    app.dependency_overrides[get_speech_client] = lambda: speech
    app.dependency_overrides[get_settings] = lambda: Settings(max_audio_bytes=MAX_BYTES)
    app.dependency_overrides[get_voice_rate_limiter] = lambda: RateLimiter(limit=100)
    cache = SpeechCache(max_bytes=1_000)
    app.dependency_overrides[get_speech_cache] = lambda: cache
    yield TestClient(app)
    app.dependency_overrides.clear()


def upload(content: bytes = b"audio", content_type: str = "audio/mp4") -> dict:
    return {"audio": ("question.m4a", content, content_type)}


def test_transcribe_returns_text(voice_client: TestClient) -> None:
    response = voice_client.post(
        "/v1/voice/transcribe", files=upload(), data={"language": "es"}
    )

    assert response.status_code == 200
    assert response.json() == {"text": "How do I save?", "language": "es"}


@pytest.mark.parametrize(
    ("files", "data", "status", "code"),
    [
        (upload(b"x" * (MAX_BYTES + 1)), {"language": "en"}, 413, "audio_too_large"),
        (
            upload(content_type="video/mp4"),
            {"language": "en"},
            415,
            "unsupported_audio_type",
        ),
        (upload(), {"language": "de"}, 400, "validation_error"),
        (upload(), {}, 400, "validation_error"),
        (upload(b""), {"language": "en"}, 400, "validation_error"),
    ],
)
def test_transcribe_rejects_bad_uploads(
    voice_client: TestClient, files: dict, data: dict, status: int, code: str
) -> None:
    response = voice_client.post("/v1/voice/transcribe", files=files, data=data)

    assert response.status_code == status
    assert response.json()["error"]["code"] == code


def test_speak_returns_cacheable_wav(voice_client: TestClient) -> None:
    response = voice_client.get(
        "/v1/voice/speak", params={"text": "Karibu", "language": "sw"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert "max-age" in response.headers["cache-control"]
    assert response.content == b"RIFF....WAVE"


@pytest.mark.parametrize(
    "params",
    [
        {"text": "", "language": "en"},
        {"text": "x" * 1001, "language": "en"},
        {"text": "hi"},
    ],
)
def test_speak_rejects_bad_text(voice_client: TestClient, params: dict) -> None:
    response = voice_client.get("/v1/voice/speak", params=params)

    assert response.status_code == 400


def test_provider_outage_returns_503(
    speech: FakeSpeech, voice_client: TestClient
) -> None:
    speech.failures = 5

    response = voice_client.get(
        "/v1/voice/speak", params={"text": "Hi", "language": "en"}
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "speech_unavailable"


def test_missing_api_key_returns_503() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(gemini_api_key=None)
    try:
        response = TestClient(app).get(
            "/v1/voice/speak", params={"text": "Hi", "language": "en"}
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503


def test_voice_endpoints_are_rate_limited(voice_client: TestClient) -> None:
    limiter = RateLimiter(limit=1)
    app.dependency_overrides[get_voice_rate_limiter] = lambda: limiter
    params = {"text": "Hi", "language": "en"}
    voice_client.get("/v1/voice/speak", params=params)

    response = voice_client.get("/v1/voice/speak", params=params)

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"
