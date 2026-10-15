"""Lessons, Ask Kiko and bonus lessons API. Owner: Faraz (@faraz999shah).

HTTP only; all logic lives in services/lesson_service.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import get_lesson_sources, get_lesson_stores
from app.schemas.shared import (
    BonusLessonRequest,
    BonusLessonResponse,
    ErrorResponse,
    Lesson,
)
from app.services import lesson_service
from app.services.lesson_service import LessonSources, LessonStores

router = APIRouter(prefix="/v1", tags=["lessons"])

StoresDep = Annotated[LessonStores, Depends(get_lesson_stores)]
SourcesDep = Annotated[LessonSources, Depends(get_lesson_sources)]


@router.get(
    "/lessons/{lesson_id}",
    response_model=Lesson,
    summary="Get a lesson customized for one learner",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
)
def get_lesson(
    lesson_id: str,
    user_id: Annotated[
        str, Query(min_length=1, description="Learner to customize for.")
    ],
    stores: StoresDep,
    sources: SourcesDep,
) -> Lesson:
    """Customize a core lesson (its id is its topic, e.g. "saving") or one of the
    learner's bonus lessons with their profile and Findex needs, then reword it
    for their language."""
    return lesson_service.serve_lesson(lesson_id, user_id, stores, sources)


@router.post(
    "/bonus-lessons",
    response_model=BonusLessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Get a lesson for what the learner asked to learn about",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
)
def post_bonus_lesson(
    request: BonusLessonRequest, stores: StoresDep, sources: SourcesDep
) -> BonusLessonResponse:
    """Serve the matching core lesson, or generate, store and serve a new one,
    customized for the learner. Off-topic requests return 422."""
    return lesson_service.request_lesson(
        request.user_id, request.request, stores, sources
    )
