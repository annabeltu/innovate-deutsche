"""Lessons, Ask Kiko and bonus lessons API. Owner: Faraz (@faraz999shah).

HTTP only; all logic lives in services/lesson_service.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import get_lesson_sources, get_profile_store
from app.schemas.shared import ErrorResponse, Lesson
from app.services import lesson_service
from app.services.lesson_service import LessonSources
from app.services.profile_store import ProfileStore

router = APIRouter(prefix="/v1", tags=["lessons"])

StoreDep = Annotated[ProfileStore, Depends(get_profile_store)]
SourcesDep = Annotated[LessonSources, Depends(get_lesson_sources)]


@router.get(
    "/lessons/{lesson_id}",
    response_model=Lesson,
    summary="Get a lesson customized for one learner",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
def get_lesson(
    lesson_id: str,
    user_id: Annotated[
        str, Query(min_length=1, description="Learner to customize for.")
    ],
    store: StoreDep,
    sources: SourcesDep,
) -> Lesson:
    """Customize a core lesson (its id is its topic, e.g. "saving") with the
    learner's profile and Findex needs, then reword it for their language."""
    return lesson_service.serve_lesson(lesson_id, user_id, store, sources)
