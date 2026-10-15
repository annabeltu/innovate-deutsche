"""Local developer tools: the lesson tester page. Owner: Faraz (@faraz999shah).

Every route returns 404 unless DEV_TOOLS_ENABLED=true, so none of this is
reachable in a deployed API. HTTP only; logic lives in lesson_service.py.
"""

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse

from app.dependencies import SettingsDep, get_lesson_sources, get_profile_store
from app.schemas.lesson_template import LessonTemplate
from app.schemas.shared import LearnerNeeds
from app.services import lesson_service
from app.services.lesson_service import LessonSources
from app.services.profile_store import ProfileStore

LESSON_TESTER_PAGE = (
    Path(__file__).resolve().parent.parent / "dev" / "lesson_tester.html"
)


def require_dev_tools(settings: SettingsDep) -> None:
    """Hide every dev route unless dev tools are enabled."""
    if not settings.dev_tools_enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not Found")


router = APIRouter(
    prefix="/dev",
    tags=["dev"],
    include_in_schema=False,
    dependencies=[Depends(require_dev_tools)],
)

StoreDep = Annotated[ProfileStore, Depends(get_profile_store)]
SourcesDep = Annotated[LessonSources, Depends(get_lesson_sources)]


@router.get("/lesson-tester", response_class=HTMLResponse)
def lesson_tester() -> str:
    """Page that shows a base lesson, both models, and the customized lesson."""
    return LESSON_TESTER_PAGE.read_text(encoding="utf-8")


@router.get("/base-lessons/{lesson_id}", response_model=LessonTemplate)
def base_lesson(lesson_id: str, sources: SourcesDep) -> LessonTemplate:
    """The stored base lesson, before any customization."""
    return lesson_service.core_template(lesson_id, sources.templates)


@router.get("/needs/{user_id}", response_model=LearnerNeeds)
def learner_needs(user_id: str, store: StoreDep, sources: SourcesDep) -> LearnerNeeds:
    """The learner's Findex needs, as lesson customization sees them."""
    return lesson_service.learner_needs_for(user_id, store, sources)
