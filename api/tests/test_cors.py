from fastapi.testclient import TestClient

from app.main import app


def test_expo_web_origin_is_allowed() -> None:
    response = TestClient(app).get(
        "/health", headers={"Origin": "http://localhost:8081"}
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"


def test_unknown_origins_are_not_allowed() -> None:
    response = TestClient(app).get(
        "/health", headers={"Origin": "https://evil.example"}
    )

    assert "access-control-allow-origin" not in response.headers
