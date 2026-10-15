"""LearnerProfile API: onboarding, baseline quiz, profile. Owner: Will (@willapat).

HTTP only; all logic lives in services/onboarding.py and services/profile_store.py.
"""

import random
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import get_profile_store, get_question_bank, get_rng
from app.schemas.shared import (
    AccessibilityUpdate,
    ErrorResponse,
    LanguageUpdate,
    LearnerProfile,
    LessonResultRequest,
    LessonResultResponse,
    OnboardingRequest,
    OnboardingResponse,
    QuizSkipRequest,
    QuizSkipResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services import onboarding, profile_updates
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank

router = APIRouter(prefix="/v1", tags=["profile"])

StoreDep = Annotated[ProfileStore, Depends(get_profile_store)]
BankDep = Annotated[QuestionBank, Depends(get_question_bank)]
RngDep = Annotated[random.Random, Depends(get_rng)]

VALIDATION_ERROR = {status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse}}
QUIZ_ERRORS = {
    **VALIDATION_ERROR,
    status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    status.HTTP_409_CONFLICT: {"model": ErrorResponse},
}


@router.post(
    "/onboarding",
    response_model=OnboardingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save onboarding answers and return the baseline quiz",
    responses={
        **VALIDATION_ERROR,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
def post_onboarding(
    request: OnboardingRequest, store: StoreDep, bank: BankDep, rng: RngDep
) -> OnboardingResponse:
    """Create the user and serve 10 questions (2 per topic) in their language."""
    return onboarding.start_onboarding(request, store, bank, rng)


@router.post(
    "/quiz/{quiz_id}/submit",
    response_model=QuizSubmitResponse,
    summary="Grade the baseline quiz and return the learner profile",
    responses=QUIZ_ERRORS,
)
def post_quiz_submit(
    quiz_id: str, request: QuizSubmitRequest, store: StoreDep
) -> QuizSubmitResponse:
    """Grade answers on the server, save the profile, and return per-question results."""
    return onboarding.submit_quiz(quiz_id, request, store)


@router.post(
    "/quiz/{quiz_id}/skip",
    response_model=QuizSkipResponse,
    summary="Skip the baseline quiz; proficiency uses confidence only",
    responses=QUIZ_ERRORS,
)
def post_quiz_skip(
    quiz_id: str, request: QuizSkipRequest, store: StoreDep
) -> QuizSkipResponse:
    """Save the profile without quiz scores."""
    return onboarding.skip_quiz(quiz_id, request, store)


@router.get(
    "/profile/{user_id}",
    response_model=LearnerProfile,
    summary="Return the current learner profile",
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
def get_profile(user_id: str, store: StoreDep) -> LearnerProfile:
    """Return the profile, or 404 profile_not_found if onboarding never finished."""
    return store.get_profile(user_id)


@router.patch(
    "/profile/{user_id}/language",
    response_model=LearnerProfile,
    summary="Change language while keeping the learner's progress",
    responses={
        **VALIDATION_ERROR,
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
def patch_language(
    user_id: str, update: LanguageUpdate, store: StoreDep, bank: BankDep
) -> LearnerProfile:
    """Save the language used by subsequent customized and generated lessons."""
    return profile_updates.update_language(user_id, update, store, bank)


@router.patch(
    "/profile/{user_id}/accessibility",
    response_model=LearnerProfile,
    summary="Change accessibility settings at any time",
    responses={**VALIDATION_ERROR, status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
def patch_accessibility(
    user_id: str, update: AccessibilityUpdate, store: StoreDep
) -> LearnerProfile:
    """Update only the settings sent and return the full profile."""
    return profile_updates.update_accessibility(user_id, update, store)


@router.post(
    "/profile/{user_id}/lesson-results",
    response_model=LessonResultResponse,
    summary="Update a topic's proficiency after a lesson",
    responses={**VALIDATION_ERROR, status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
def post_lesson_results(
    user_id: str, result: LessonResultRequest, store: StoreDep
) -> LessonResultResponse:
    """Record a finished lesson; path_refresh_needed tells the app to rebuild the path."""
    return profile_updates.record_lesson_result(user_id, result, store)
