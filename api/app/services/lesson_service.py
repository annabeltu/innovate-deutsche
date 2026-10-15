"""Serves one customized lesson to one learner. Owner: Faraz (@faraz999shah).

Joins the two inputs, Will's LearnerProfile and the Findex-based
LearnerNeeds, with the stored base lesson and country facts, then runs the
LLM wording step.
"""

import logging
from collections.abc import Mapping
from dataclasses import dataclass

from app.llm.client import LlmClient
from app.schemas.findex import FindexCountry
from app.schemas.lesson_template import LessonTemplate
from app.schemas.shared import Country, LearnerNeeds, Lesson, Topic
from app.services.errors import LessonBuildError, LessonNotFoundError
from app.services.lesson_builder import country_facts_for, customize_lesson
from app.services.lesson_wording import reword_lesson
from app.services.needs import build_learner_needs
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LessonSources:
    """Everything loaded once that customizing a lesson reads."""

    templates: Mapping[Topic, LessonTemplate]
    findex: Mapping[Country, FindexCountry]
    question_bank: QuestionBank
    llm: LlmClient


def learner_needs_for(
    user_id: str, store: ProfileStore, sources: LessonSources
) -> LearnerNeeds:
    """Build a stored learner's Findex needs.

    Raises:
        ProfileNotFoundError: If the learner has no profile.
    """
    profile = store.get_profile(user_id)
    return build_learner_needs(profile, sources.findex[profile.country])


def serve_lesson(
    lesson_id: str, user_id: str, store: ProfileStore, sources: LessonSources
) -> Lesson:
    """Return a core lesson customized and worded for one learner.

    Raises:
        ProfileNotFoundError: If the learner has no profile.
        LessonNotFoundError: If lesson_id is not a core lesson.
        LessonBuildError: If the stored lesson or data cannot be customized.
    """
    profile = store.get_profile(user_id)
    template = core_template(lesson_id, sources.templates)
    try:
        needs = build_learner_needs(profile, sources.findex[profile.country])
        facts = country_facts_for(sources.question_bank, profile.country)
        lesson = customize_lesson(template, profile, needs, facts)
    except (KeyError, ValueError) as error:
        logger.error(
            "lesson build failed: lesson=%s user=%s error=%s", lesson_id, user_id, error
        )
        raise LessonBuildError(
            f"Lesson {lesson_id} could not be prepared", {"lesson_id": lesson_id}
        ) from error
    return reword_lesson(
        lesson, profile.language, profile.accessibility.simple_mode, sources.llm
    )


def core_template(
    lesson_id: str, templates: Mapping[Topic, LessonTemplate]
) -> LessonTemplate:
    """The base lesson whose id is lesson_id (a core lesson's id is its topic).

    Raises:
        LessonNotFoundError: If no core lesson has this id.
    """
    template = next(
        (item for item in templates.values() if item.lesson_id == lesson_id), None
    )
    if template is None:
        raise LessonNotFoundError(f"No lesson {lesson_id}", {"lesson_id": lesson_id})
    return template
