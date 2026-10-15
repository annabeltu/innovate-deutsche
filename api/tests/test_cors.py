"""CORS: the Expo web app may call the API; other origins may not."""

from fastapi.testclient import TestClient

from app.main import app

PREFLIGHT_HEADERS = {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
}


def test_allows_expo_web_origin() -> None:
    response = TestClient(app).options(
        "/v1/bonus-lessons",
        headers={"Origin": "http://localhost:8081", **PREFLIGHT_HEADERS},
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"


def test_rejects_unknown_origin() -> None:
    response = TestClient(app).options(
        "/v1/bonus-lessons",
        headers={"Origin": "https://evil.example", **PREFLIGHT_HEADERS},
    )

    assert "access-control-allow-origin" not in response.headers
