"""Onboarding and baseline quiz flow. Owner: Will (@willapat).

Builds the quiz from the question bank, grades it on the server, and writes the
LearnerProfile through ProfileStore.
"""

import random
import secrets
from datetime import UTC, datetime

from app.schemas.shared import (
    LearnerProfile,
    OnboardingRequest,
    OnboardingResponse,
    QuestionResult,
    QuizAnswer,
    QuizSkipRequest,
    QuizSkipResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    Topic,
)
from app.services.errors import (
    InvalidRequestError,
    QuizAlreadySubmittedError,
    QuizNotFoundError,
    UnsupportedLanguageError,
)
from app.services.proficiency import build_topic_scores
from app.services.profile_store import ProfileStore, QuizStatus, StoredQuiz
from app.services.question_bank import (
    OPTION_IDS,
    AnswerKeyEntry,
    QuestionBank,
    render_quiz,
    select_questions,
)

ID_HEX_BYTES = 4


def new_id(prefix: str) -> str:
    """Return a short random id such as u_8f3c2a91."""
    return f"{prefix}_{secrets.token_hex(ID_HEX_BYTES)}"


def start_onboarding(
    request: OnboardingRequest,
    store: ProfileStore,
    bank: QuestionBank,
    rng: random.Random,
) -> OnboardingResponse:
    """Save the onboarding answers and serve a baseline quiz in the learner's language.

    Raises:
        UnsupportedLanguageError: If the language is not offered in the chosen country.
    """
    supported = bank.languages_for(request.country)
    if request.language not in supported:
        raise UnsupportedLanguageError(
            f"Language {request.language} is not offered in {request.country}",
            {"country": request.country, "supported_languages": supported},
        )
    user_id = new_id("u")
    quiz_id = new_id("qz")
    questions = select_questions(bank, request.confidence, rng)
    quiz, answer_key = render_quiz(
        bank, questions, quiz_id, request.country, request.language
    )
    store.save_quiz(
        StoredQuiz(
            quiz_id=quiz_id, user_id=user_id, onboarding=request, answer_key=answer_key
        )
    )
    return OnboardingResponse(user_id=user_id, quiz=quiz)


def submit_quiz(
    quiz_id: str, request: QuizSubmitRequest, store: ProfileStore
) -> QuizSubmitResponse:
    """Grade the quiz, compute proficiency per topic, and save the profile.

    Unanswered questions count as wrong.

    Raises:
        QuizNotFoundError: Unknown quiz, or it belongs to another user.
        QuizAlreadySubmittedError: The quiz was already submitted or skipped.
        InvalidRequestError: An answer names a question or option not in this quiz.
    """
    stored = _load_pending_quiz(quiz_id, request.user_id, store)
    chosen = _index_answers(request.answers, stored.answer_key)
    results = [
        QuestionResult(
            question_id=question_id,
            correct=chosen.get(question_id) == entry.correct_option_id,
            correct_option_id=entry.correct_option_id,
        )
        for question_id, entry in stored.answer_key.items()
    ]
    quiz_scores = topic_quiz_scores(stored.answer_key, results)
    profile = _build_profile(stored, quiz_scores)
    _finish(stored, QuizStatus.SUBMITTED, profile, store)
    return QuizSubmitResponse(profile=profile, results=results)


def skip_quiz(
    quiz_id: str, request: QuizSkipRequest, store: ProfileStore
) -> QuizSkipResponse:
    """Save the profile from confidence alone; quiz_score is null for every topic.

    Raises:
        QuizNotFoundError: Unknown quiz, or it belongs to another user.
        QuizAlreadySubmittedError: The quiz was already submitted or skipped.
    """
    stored = _load_pending_quiz(quiz_id, request.user_id, store)
    profile = _build_profile(stored, quiz_scores=None)
    _finish(stored, QuizStatus.SKIPPED, profile, store)
    return QuizSkipResponse(profile=profile)


def topic_quiz_scores(
    answer_key: dict[str, AnswerKeyEntry], results: list[QuestionResult]
) -> dict[Topic, float]:
    """Share of each topic's questions answered correctly, from 0 to 1."""
    correct_by_topic = dict.fromkeys(Topic, 0)
    total_by_topic = dict.fromkeys(Topic, 0)
    for result in results:
        topic = answer_key[result.question_id].topic
        total_by_topic[topic] += 1
        correct_by_topic[topic] += int(result.correct)
    return {
        topic: correct_by_topic[topic] / total_by_topic[topic]
        if total_by_topic[topic]
        else 0.0
        for topic in Topic
    }


def _load_pending_quiz(quiz_id: str, user_id: str, store: ProfileStore) -> StoredQuiz:
    """Fetch a quiz the user may still answer. Another user's quiz looks like a missing one."""
    stored = store.get_quiz(quiz_id)
    if stored is None or stored.user_id != user_id:
        raise QuizNotFoundError(
            f"No quiz {quiz_id} for {user_id}", {"quiz_id": quiz_id}
        )
    if stored.status != QuizStatus.PENDING:
        raise QuizAlreadySubmittedError(f"Quiz {quiz_id} is already {stored.status}")
    return stored


def _index_answers(
    answers: list[QuizAnswer], answer_key: dict[str, AnswerKeyEntry]
) -> dict[str, str]:
    """Map question_id to chosen option, rejecting unknown or repeated questions and options."""
    chosen: dict[str, str] = {}
    for answer in answers:
        if answer.question_id not in answer_key:
            raise InvalidRequestError(
                f"Question {answer.question_id} is not in this quiz",
                {"question_id": answer.question_id},
            )
        if answer.question_id in chosen:
            raise InvalidRequestError(
                f"Question {answer.question_id} was answered twice",
                {"question_id": answer.question_id},
            )
        if answer.option_id not in OPTION_IDS:
            raise InvalidRequestError(
                f"Option {answer.option_id} does not exist",
                {"question_id": answer.question_id, "allowed": list(OPTION_IDS)},
            )
        chosen[answer.question_id] = answer.option_id
    return chosen


def _build_profile(
    stored: StoredQuiz, quiz_scores: dict[Topic, float] | None
) -> LearnerProfile:
    """Assemble the LearnerProfile from onboarding answers and (optional) quiz scores."""
    onboarding = stored.onboarding
    return LearnerProfile(
        user_id=stored.user_id,
        country=onboarding.country,
        language=onboarding.language,
        accessibility=onboarding.accessibility,
        life_stage=onboarding.life_stage,
        goal=onboarding.goal,
        comfort=onboarding.comfort,
        savings_habit=onboarding.savings_habit,
        topic_scores=build_topic_scores(onboarding.confidence, quiz_scores),
        bonus_lesson_ids=[],
        updated_at=datetime.now(UTC),
    )


def _finish(
    stored: StoredQuiz, status: QuizStatus, profile: LearnerProfile, store: ProfileStore
) -> None:
    """Close the quiz atomically; a concurrent submit that lost the race gets a 409."""
    if not store.finish_quiz(stored.quiz_id, status, profile):
        raise QuizAlreadySubmittedError(f"Quiz {stored.quiz_id} is already finished")
