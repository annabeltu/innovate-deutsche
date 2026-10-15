"""HTTP behavior of /v1/voice/intent."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def voice_client() -> TestClient:
    return TestClient(app)


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code


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
