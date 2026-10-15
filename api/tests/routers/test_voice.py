"""HTTP behavior of /v1/voice/*. Providers are replaced with fakes; nothing leaves the test."""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.dependencies import get_synthesizer, get_transcriber
from app.main import app
from app.schemas.shared import Language
from app.services.errors import VoiceProviderTimeoutError
from app.services.speech_to_text import AudioClip

MAX_AUDIO_BYTES = 64


class FakeTranscriber:
    """Records what it was asked and returns a fixed transcript."""

    is_fixture = False

    def __init__(self, text: str = "What is a savings group?") -> None:
        self.text = text
        self.calls: list[tuple[AudioClip, Language]] = []

    async def transcribe(self, clip: AudioClip, language: Language) -> str:
        self.calls.append((clip, language))
        return self.text


class FakeSynthesizer:
    """Returns fake MP3 bytes, or raises the given error."""

    media_type = "audio/mpeg"

    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.calls: list[tuple[str, Language, float]] = []

    async def synthesize(self, text: str, language: Language, rate: float) -> bytes:
        self.calls.append((text, language, rate))
        if self.error:
            raise self.error
        return b"ID3-fake-mp3"


def make_settings(**overrides: Any) -> Settings:
    """Settings that ignore any developer .env file."""
    return Settings(_env_file=None, voice_max_audio_bytes=MAX_AUDIO_BYTES, **overrides)


@pytest.fixture
def voice_client() -> Iterator[TestClient]:
    app.dependency_overrides[get_settings] = lambda: make_settings()
    yield TestClient(app)
    app.dependency_overrides.clear()


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code


def upload(
    client: TestClient,
    content: bytes = b"m4a-bytes",
    content_type: str = "audio/m4a",
    language: str = "sw",
) -> Any:
    return client.post(
        "/v1/voice/transcribe",
        files={"audio": ("recording.m4a", content, content_type)},
        data={"language": language},
    )


@pytest.mark.parametrize(
    ("body", "expected"),
    [
        ({"text": "Ndiyo", "language": "sw"}, {"intent": "yes"}),
        (
            {"text": "opción B", "language": "es"},
            {"intent": "option", "option_id": "b"},
        ),
        ({"text": "number 4", "language": "en"}, {"intent": "number", "number": 4}),
        ({"text": "What is interest?", "language": "en"}, {"intent": "unknown"}),
    ],
)
def test_intent_endpoint_returns_the_matched_intent(
    voice_client: TestClient, body: dict[str, str], expected: dict[str, object]
) -> None:
    response = voice_client.post("/v1/voice/intent", json=body)

    assert response.status_code == 200
    assert response.json().items() >= expected.items()


@pytest.mark.parametrize(
    "body",
    [
        {"text": "yes", "language": "de"},
        {"text": "yes"},
        {"text": "x" * 501, "language": "en"},
        {"text": "yes", "language": "en", "extra": True},
    ],
)
def test_intent_endpoint_rejects_invalid_requests(
    voice_client: TestClient, body: dict[str, object]
) -> None:
    assert_error(
        voice_client.post("/v1/voice/intent", json=body), 400, "validation_error"
    )


def test_transcribe_passes_audio_and_language_to_the_provider(
    voice_client: TestClient,
) -> None:
    transcriber = FakeTranscriber()
    app.dependency_overrides[get_transcriber] = lambda: transcriber

    response = upload(voice_client)

    assert response.status_code == 200
    assert response.json() == {
        "text": "What is a savings group?",
        "language": "sw",
        "is_fixture": False,
    }
    clip, language = transcriber.calls[0]
    assert clip.content == b"m4a-bytes"
    assert language == Language.SW


def test_transcribe_rejects_unsupported_audio(voice_client: TestClient) -> None:
    app.dependency_overrides[get_transcriber] = lambda: FakeTranscriber()

    assert_error(
        upload(voice_client, content_type="text/plain"), 415, "unsupported_audio"
    )


def test_transcribe_rejects_oversized_audio(voice_client: TestClient) -> None:
    app.dependency_overrides[get_transcriber] = lambda: FakeTranscriber()

    response = upload(voice_client, content=b"x" * (MAX_AUDIO_BYTES + 1))

    assert_error(response, 413, "audio_too_large")


def test_transcribe_rejects_empty_audio(voice_client: TestClient) -> None:
    app.dependency_overrides[get_transcriber] = lambda: FakeTranscriber()

    assert_error(upload(voice_client, content=b""), 400, "validation_error")


def test_transcribe_rejects_unknown_language(voice_client: TestClient) -> None:
    app.dependency_overrides[get_transcriber] = lambda: FakeTranscriber()

    assert_error(upload(voice_client, language="hi"), 400, "validation_error")


def test_transcribe_without_key_or_fixtures_is_unavailable(
    voice_client: TestClient,
) -> None:
    assert_error(upload(voice_client), 503, "voice_unavailable")


def test_transcribe_without_key_uses_labeled_fixture_in_development(
    voice_client: TestClient,
) -> None:
    app.dependency_overrides[get_settings] = lambda: make_settings(
        voice_dev_fixtures=True
    )

    response = upload(voice_client, language="en")

    assert response.status_code == 200
    assert response.json()["is_fixture"] is True


def test_transcribe_maps_provider_timeout_to_504(voice_client: TestClient) -> None:
    class SlowTranscriber(FakeTranscriber):
        async def transcribe(self, clip: AudioClip, language: Language) -> str:
            raise VoiceProviderTimeoutError("too slow")

    app.dependency_overrides[get_transcriber] = lambda: SlowTranscriber()

    assert_error(upload(voice_client), 504, "voice_provider_timeout")


def test_speak_returns_mp3_at_the_requested_rate(voice_client: TestClient) -> None:
    synthesizer = FakeSynthesizer()
    app.dependency_overrides[get_synthesizer] = lambda: synthesizer

    response = voice_client.post(
        "/v1/voice/speak", json={"text": "Hola", "language": "es", "rate": 0.75}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"ID3-fake-mp3"
    assert synthesizer.calls == [("Hola", Language.ES, 0.75)]


@pytest.mark.parametrize(
    "body",
    [
        {"text": "", "language": "en"},
        {"text": "x" * 1501, "language": "en"},
        {"text": "Hi", "language": "en", "rate": 3.0},
        {"text": "Hi", "language": "en", "rate": 0.1},
        {"text": "Hi", "language": "fr"},
    ],
)
def test_speak_rejects_invalid_or_unbounded_requests(
    voice_client: TestClient, body: dict[str, object]
) -> None:
    app.dependency_overrides[get_synthesizer] = lambda: FakeSynthesizer()

    assert_error(
        voice_client.post("/v1/voice/speak", json=body), 400, "validation_error"
    )


def test_speak_without_key_is_unavailable(voice_client: TestClient) -> None:
    response = voice_client.post(
        "/v1/voice/speak", json={"text": "Hi", "language": "en"}
    )

    assert_error(response, 503, "voice_unavailable")


def test_speak_in_a_disabled_language_tells_the_app_to_use_device_speech(
    voice_client: TestClient,
) -> None:
    app.dependency_overrides[get_settings] = lambda: make_settings(
        tts_languages=[Language.EN, Language.ES]
    )
    app.dependency_overrides[get_synthesizer] = lambda: FakeSynthesizer()

    response = voice_client.post(
        "/v1/voice/speak", json={"text": "Habari", "language": "sw"}
    )

    assert_error(response, 422, "unsupported_language")


def test_speak_maps_provider_timeout_to_504(voice_client: TestClient) -> None:
    app.dependency_overrides[get_synthesizer] = lambda: FakeSynthesizer(
        VoiceProviderTimeoutError("too slow")
    )

    response = voice_client.post(
        "/v1/voice/speak", json={"text": "Hi", "language": "en"}
    )

    assert_error(response, 504, "voice_provider_timeout")


def test_real_providers_are_built_from_settings_keys() -> None:
    settings = make_settings(whisper_api_key="k1", tts_api_key="k2")

    assert get_transcriber(settings).is_fixture is False
    assert get_synthesizer(settings).media_type == "audio/mpeg"


def test_blank_keys_from_env_example_count_as_not_configured(
    voice_client: TestClient,
) -> None:
    app.dependency_overrides[get_settings] = lambda: make_settings(
        whisper_api_key="", tts_api_key="  "
    )

    assert_error(upload(voice_client), 503, "voice_unavailable")
    response = voice_client.post(
        "/v1/voice/speak", json={"text": "Hi", "language": "en"}
    )
    assert_error(response, 503, "voice_unavailable")
