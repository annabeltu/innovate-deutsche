from fastapi.testclient import TestClient

from app.main import app

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
