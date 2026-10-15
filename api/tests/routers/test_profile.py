from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.schemas.shared import Topic

TOPICS = [topic.value for topic in Topic]


def onboard(client: TestClient, body: dict[str, object]) -> dict[str, Any]:
    response = client.post("/v1/onboarding", json=body)
    assert response.status_code == 201
    return response.json()


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code
    assert set(response.json()["error"]) == {"code", "message", "details"}


def test_onboarding_returns_user_and_ten_question_quiz_in_learner_language(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)

    quiz = body["quiz"]
    assert body["user_id"].startswith("u_")
    assert quiz["language"] == "sw"
    assert len(quiz["questions"]) == 10
    assert [question["topic"] for question in quiz["questions"]] == [
        t for t in TOPICS for _ in range(2)
    ]
    assert quiz["questions"][0]["voice"]["speak_text"].startswith(
        "Swali la 1 kati ya 10."
    )


@pytest.mark.parametrize(
    ("country", "language"), [("US", "sw"), ("MX", "sw"), ("KE", "es")]
)
def test_onboarding_rejects_language_not_offered_in_country(
    client: TestClient, onboarding_body: dict[str, object], country: str, language: str
) -> None:
    response = client.post(
        "/v1/onboarding",
        json={**onboarding_body, "country": country, "language": language},
    )

    assert_error(response, 422, "unsupported_language")


@pytest.mark.parametrize(
    "change",
    [
        {"country": "IN"},
        {"comfort": 4},
        {"confidence": {"accounts": 0.5}},
        {"confidence": {topic: 1.5 for topic in TOPICS}},
        {"unexpected": True},
    ],
)
def test_onboarding_rejects_invalid_body_with_validation_error(
    client: TestClient, onboarding_body: dict[str, object], change: dict[str, object]
) -> None:
    response = client.post("/v1/onboarding", json={**onboarding_body, **change})

    assert_error(response, 400, "validation_error")
    assert response.json()["error"]["details"]["fields"]


def test_submit_grades_answers_and_returns_profile(
    client: TestClient, store: Any, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)
    quiz_id = body["quiz"]["quiz_id"]
    answer_key = store.get_quiz(quiz_id).answer_key
    first_two = [question["question_id"] for question in body["quiz"]["questions"][:2]]
    answers = [
        {"question_id": qid, "option_id": answer_key[qid].correct_option_id}
        for qid in first_two
    ]

    response = client.post(
        f"/v1/quiz/{quiz_id}/submit",
        json={"user_id": body["user_id"], "answers": answers},
    )

    assert response.status_code == 200
    payload = response.json()
    accounts = payload["profile"]["topic_scores"]["accounts"]
    saving = payload["profile"]["topic_scores"]["saving"]
    assert accounts == {
        "confidence": 0.6,
        "quiz_score": 1.0,
        "proficiency": 0.84,
        "completed": False,
    }
    assert saving == {
        "confidence": 0.3,
        "quiz_score": 0.0,
        "proficiency": 0.12,
        "completed": False,
    }
    assert len(payload["results"]) == 10
    assert sum(result["correct"] for result in payload["results"]) == 2


def test_submitted_profile_is_returned_by_get_profile(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)
    submitted = client.post(
        f"/v1/quiz/{body['quiz']['quiz_id']}/submit",
        json={"user_id": body["user_id"], "answers": []},
    ).json()["profile"]

    response = client.get(f"/v1/profile/{body['user_id']}")

    assert response.status_code == 200
    assert response.json() == submitted
    assert response.json()["country"] == "KE"
    assert response.json()["accessibility"]["read_aloud"] is True


def test_second_submit_returns_conflict(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)
    url = f"/v1/quiz/{body['quiz']['quiz_id']}/submit"
    client.post(url, json={"user_id": body["user_id"], "answers": []})

    response = client.post(url, json={"user_id": body["user_id"], "answers": []})

    assert_error(response, 409, "quiz_already_submitted")


def test_submit_rejects_answer_for_question_not_in_quiz(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)

    response = client.post(
        f"/v1/quiz/{body['quiz']['quiz_id']}/submit",
        json={
            "user_id": body["user_id"],
            "answers": [{"question_id": "qz_other_1", "option_id": "a"}],
        },
    )

    assert_error(response, 400, "validation_error")


def test_submit_rejects_unknown_option(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)
    question_id = body["quiz"]["questions"][0]["question_id"]

    response = client.post(
        f"/v1/quiz/{body['quiz']['quiz_id']}/submit",
        json={
            "user_id": body["user_id"],
            "answers": [{"question_id": question_id, "option_id": "z"}],
        },
    )

    assert_error(response, 400, "validation_error")


def test_submit_for_another_users_quiz_is_not_found(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)

    response = client.post(
        f"/v1/quiz/{body['quiz']['quiz_id']}/submit",
        json={"user_id": "u_someone_else", "answers": []},
    )

    assert_error(response, 404, "quiz_not_found")


def test_skip_sets_proficiency_to_confidence(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)

    response = client.post(
        f"/v1/quiz/{body['quiz']['quiz_id']}/skip", json={"user_id": body["user_id"]}
    )

    assert response.status_code == 200
    scores = response.json()["profile"]["topic_scores"]
    assert scores["borrowing"] == {
        "confidence": 0.2,
        "quiz_score": None,
        "proficiency": 0.2,
        "completed": False,
    }


def test_skip_after_submit_returns_conflict(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)
    quiz_id = body["quiz"]["quiz_id"]
    client.post(
        f"/v1/quiz/{quiz_id}/submit", json={"user_id": body["user_id"], "answers": []}
    )

    response = client.post(
        f"/v1/quiz/{quiz_id}/skip", json={"user_id": body["user_id"]}
    )

    assert_error(response, 409, "quiz_already_submitted")


def test_unknown_quiz_is_not_found(client: TestClient) -> None:
    response = client.post("/v1/quiz/qz_missing/skip", json={"user_id": "u_1"})

    assert_error(response, 404, "quiz_not_found")


def test_profile_not_found_before_quiz_is_finished(
    client: TestClient, onboarding_body: dict[str, object]
) -> None:
    body = onboard(client, onboarding_body)

    response = client.get(f"/v1/profile/{body['user_id']}")

    assert_error(response, 404, "profile_not_found")
