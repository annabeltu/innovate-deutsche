import pytest

from app.schemas.shared import LearnerProfile, OnboardingRequest
from app.services.errors import ProfileNotFoundError
from app.services.profile_store import ProfileStore, QuizStatus, StoredQuiz
from app.services.question_bank import AnswerKeyEntry


@pytest.fixture
def stored_quiz(onboarding_request: OnboardingRequest) -> StoredQuiz:
    return StoredQuiz(
        quiz_id="qz_1",
        user_id="u_1",
        onboarding=onboarding_request,
        answer_key={"qz_1_1": AnswerKeyEntry(topic="saving", correct_option_id="b")},
    )


@pytest.fixture
def profile() -> LearnerProfile:
    return LearnerProfile.model_validate(
        {
            "user_id": "u_1",
            "country": "MX",
            "language": "es",
            "accessibility": {},
            "life_stage": "parent",
            "goal": "avoid_debt",
            "comfort": 2,
            "savings_habit": "savings_group",
            "topic_scores": {
                topic: {
                    "confidence": 0.5,
                    "quiz_score": None,
                    "proficiency": 0.5,
                    "completed": False,
                }
                for topic in ["accounts", "saving", "borrowing", "scams", "budget"]
            },
            "updated_at": "2026-10-15T15:30:00Z",
        }
    )


def test_get_profile_raises_when_onboarding_never_finished(store: ProfileStore) -> None:
    with pytest.raises(ProfileNotFoundError):
        store.get_profile("u_missing")


def test_saved_quiz_round_trips_with_answer_key(
    store: ProfileStore, stored_quiz: StoredQuiz
) -> None:
    store.save_quiz(stored_quiz)

    assert store.get_quiz("qz_1") == stored_quiz


def test_get_quiz_returns_none_for_unknown_id(store: ProfileStore) -> None:
    assert store.get_quiz("qz_missing") is None


def test_finish_quiz_saves_profile_and_closes_quiz(
    store: ProfileStore, stored_quiz: StoredQuiz, profile: LearnerProfile
) -> None:
    store.save_quiz(stored_quiz)

    assert store.finish_quiz("qz_1", QuizStatus.SUBMITTED, profile) is True

    assert store.get_profile("u_1") == profile
    assert store.get_quiz("qz_1").status == QuizStatus.SUBMITTED


def test_finish_quiz_refuses_a_second_finish(
    store: ProfileStore, stored_quiz: StoredQuiz, profile: LearnerProfile
) -> None:
    store.save_quiz(stored_quiz)
    store.finish_quiz("qz_1", QuizStatus.SUBMITTED, profile)

    assert store.finish_quiz("qz_1", QuizStatus.SKIPPED, profile) is False
    assert store.get_quiz("qz_1").status == QuizStatus.SUBMITTED
