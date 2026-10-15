"""Personalized path API. Owner: Faraz (@faraz999shah)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import get_lesson_sources, get_lesson_stores
from app.schemas.shared import ErrorResponse, LearningPath
from app.services.lesson_service import LessonSources, LessonStores
from app.services.path_service import build_path

SourcesDep = Annotated[LessonSources, Depends(get_lesson_sources)]
StoresDep = Annotated[LessonStores, Depends(get_lesson_stores)]

router = APIRouter(prefix="/v1", tags=["path"])


@router.get(
    "/path/{user_id}",
    response_model=LearningPath,
    summary="Get the learner's personalized lesson order",
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
def get_path(user_id: str, stores: StoresDep, sources: SourcesDep) -> LearningPath:
    """Build the current path from saved quiz results, confidence and local needs."""
    return build_path(user_id, stores, sources)
