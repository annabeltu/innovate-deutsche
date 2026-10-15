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


FOREIGN_ORIGIN = "https://evil.example"


def test_requests_without_an_origin_work_like_the_native_app() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_unlisted_browser_origins_are_not_allowed_by_default() -> None:
    response = TestClient(app).options(
        "/v1/voice/intent",
        headers={"Origin": FOREIGN_ORIGIN, "Access-Control-Request-Method": "POST"},
    )

    assert response.headers.get("access-control-allow-origin") != FOREIGN_ORIGIN
    assert response.headers.get("access-control-allow-origin") != "*"


def test_language_patch_is_allowed_from_expo_web() -> None:
    """One CORS layer covers both lesson and voice updates."""
    response = TestClient(app).options(
        "/v1/profile/u_test/language",
        headers={
            "Origin": "http://127.0.0.1:8081",
            "Access-Control-Request-Method": "PATCH",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:8081"
