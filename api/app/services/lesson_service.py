"""Serves customized lessons and handles lesson requests. Owner: Faraz (@faraz999shah).

Joins the two inputs, Will's LearnerProfile and the Findex-based
LearnerNeeds, with a base lesson (core or generated) and country facts, then
runs the LLM wording step.
"""

import logging
import uuid
from collections.abc import Mapping
from dataclasses import dataclass

from app.llm.client import LlmClient
from app.schemas.findex import FindexCountry
from app.schemas.lesson_template import LessonDraft, LessonTemplate
from app.schemas.shared import (
    BonusLessonResponse,
    Country,
    LearnerNeeds,
    LearnerProfile,
    Lesson,
    Topic,
)
from app.services import lesson_generation
from app.services.bonus_lesson_store import BonusLessonStore
from app.services.errors import (
    LessonBuildError,
    LessonGenerationError,
    LessonNotFoundError,
    OffTopicRequestError,
)
from app.services.lesson_builder import (
    NEED_FACT_NAMES,
    country_facts_for,
    customize_lesson,
)
from app.services.lesson_wording import reword_lesson
from app.services.needs import build_learner_needs
from app.services.profile_store import ProfileStore
from app.services.question_bank import QuestionBank

BONUS_LESSON_PREFIX = "bonus_"
BONUS_ID_LENGTH = 8

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LessonSources:
    """Everything loaded once that customizing a lesson reads."""

    templates: Mapping[Topic, LessonTemplate]
    findex: Mapping[Country, FindexCountry]
    question_bank: QuestionBank
    llm: LlmClient


@dataclass(frozen=True)
class LessonStores:
    """Where learners and their generated lessons are kept."""

    profiles: ProfileStore
    bonus_lessons: BonusLessonStore


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
    lesson_id: str, user_id: str, stores: LessonStores, sources: LessonSources
) -> Lesson:
    """Return a core or bonus lesson customized and worded for one learner.

    Raises:
        ProfileNotFoundError: If the learner has no profile.
        LessonNotFoundError: If lesson_id is neither a core lesson nor one of
            this learner's bonus lessons.
        LessonBuildError: If the stored lesson or data cannot be customized.
    """
    profile = stores.profiles.get_profile(user_id)
    template = _find_template(lesson_id, user_id, stores, sources)
    return _personalize(template, profile, sources)


def request_lesson(
    user_id: str, request_text: str, stores: LessonStores, sources: LessonSources
) -> BonusLessonResponse:
    """Teach what the learner asked for: a core lesson or a new bonus lesson.

    A new lesson is stored and added to the learner's bonus_lesson_ids, so
    GET /v1/lessons/{lesson_id} and lesson results work with it later.

    Raises:
        ProfileNotFoundError: If the learner has no profile.
        OffTopicRequestError: If the request is not about personal money.
        LessonGenerationError: If no valid lesson could be generated.
    """
    profile = stores.profiles.get_profile(user_id)
    country_facts = country_facts_for(sources.question_bank, profile.country)
    reply = lesson_generation.plan_lesson_request(
        request_text,
        sources.templates,
        NEED_FACT_NAMES | country_facts.keys(),
        sources.llm,
    )
    if reply.off_topic:
        raise OffTopicRequestError(
            "Kompass lessons are about money; try asking about saving, "
            "borrowing, payments, budgeting or scams",
            {"request": request_text},
        )
    if reply.core_topic is not None:
        lesson = _personalize(sources.templates[reply.core_topic], profile, sources)
        return BonusLessonResponse(
            lesson=lesson, generated=False, matched_topic=reply.core_topic
        )

    template = _template_from_draft(reply.lesson)
    lesson = _personalize(template, profile, sources, LessonGenerationError)
    _save_bonus_lesson(template, profile, request_text, stores)
    return BonusLessonResponse(lesson=lesson, generated=True, matched_topic=None)


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


def _find_template(
    lesson_id: str, user_id: str, stores: LessonStores, sources: LessonSources
) -> LessonTemplate:
    """A core lesson, or one of the learner's own bonus lessons."""
    if lesson_id.startswith(BONUS_LESSON_PREFIX):
        template = stores.bonus_lessons.get(user_id, lesson_id)
        if template is None:
            raise LessonNotFoundError(
                f"No lesson {lesson_id}", {"lesson_id": lesson_id}
            )
        return template
    return core_template(lesson_id, sources.templates)


def _personalize(
    template: LessonTemplate,
    profile: LearnerProfile,
    sources: LessonSources,
    error_type: type[LessonBuildError | LessonGenerationError] = LessonBuildError,
) -> Lesson:
    """Customize a base lesson with both models, then reword it."""
    try:
        needs = build_learner_needs(profile, sources.findex[profile.country])
        facts = country_facts_for(sources.question_bank, profile.country)
        lesson = customize_lesson(template, profile, needs, facts)
    except (KeyError, ValueError) as error:
        logger.error(
            "lesson build failed: lesson=%s user=%s error=%s",
            template.lesson_id,
            profile.user_id,
            error,
        )
        raise error_type(
            f"Lesson {template.lesson_id} could not be prepared",
            {"lesson_id": template.lesson_id},
        ) from error
    return reword_lesson(
        lesson, profile.language, profile.accessibility.simple_mode, sources.llm
    )


def _save_bonus_lesson(
    template: LessonTemplate,
    profile: LearnerProfile,
    request_text: str,
    stores: LessonStores,
) -> None:
    """Store a generated lesson and add it to the learner's bonus_lesson_ids.

    Saved only after it customizes cleanly, so a stored lesson always serves.
    """
    stores.bonus_lessons.save(
        profile.user_id, request_text, template, lesson_generation.PROMPT_VERSION
    )
    stores.profiles.update_profile(
        profile.model_copy(
            update={"bonus_lesson_ids": [*profile.bonus_lesson_ids, template.lesson_id]}
        )
    )


def _template_from_draft(draft: LessonDraft | None) -> LessonTemplate:
    """Give a validated draft its bonus lesson id."""
    if draft is None:
        raise LessonGenerationError("The reply had no lesson")
    lesson_id = f"{BONUS_LESSON_PREFIX}{uuid.uuid4().hex[:BONUS_ID_LENGTH]}"
    return LessonTemplate(lesson_id=lesson_id, **draft.model_dump())
