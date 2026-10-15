"""Changes to an existing LearnerProfile after onboarding. Owner: Will (@willapat)."""

from datetime import UTC, datetime

from app.schemas.shared import (
    AccessibilityUpdate,
    LearnerProfile,
    LessonResultRequest,
    LessonResultResponse,
    Topic,
)
from app.services.errors import LessonNotFoundError
from app.services.proficiency import difficulty_band, update_after_lesson
from app.services.profile_store import ProfileStore

CORE_LESSON_IDS = {topic.value for topic in Topic}


def update_accessibility(
    user_id: str, update: AccessibilityUpdate, store: ProfileStore
) -> LearnerProfile:
    """Apply only the settings sent, so voice mode can be toggled without resending the rest.

    Raises:
        ProfileNotFoundError: If onboarding never finished for this user.
    """
    profile = store.get_profile(user_id)
    accessibility = profile.accessibility.model_copy(
        update=update.model_dump(exclude_none=True)
    )
    updated = profile.model_copy(
        update={"accessibility": accessibility, "updated_at": datetime.now(UTC)}
    )
    store.update_profile(updated)
    return updated


def record_lesson_result(
    user_id: str, result: LessonResultRequest, store: ProfileStore
) -> LessonResultResponse:
    """Move a topic's proficiency toward the lesson score and mark it completed.

    Bonus lessons do not change topic_scores; they only acknowledge the result.

    Raises:
        ProfileNotFoundError: If onboarding never finished for this user.
        LessonNotFoundError: If the lesson is not a topic or one of the user's bonus lessons.
    """
    profile = store.get_profile(user_id)
    if result.lesson_id not in CORE_LESSON_IDS:
        if result.lesson_id not in profile.bonus_lesson_ids:
            raise LessonNotFoundError(
                f"No lesson {result.lesson_id} for {user_id}",
                {"lesson_id": result.lesson_id},
            )
        return LessonResultResponse(
            topic=None,
            proficiency=None,
            completed=result.completed,
            path_refresh_needed=False,
        )
    topic = Topic(result.lesson_id)
    old_score = profile.topic_scores[topic]
    new_score = old_score.model_copy(
        update={
            "proficiency": update_after_lesson(
                old_score.proficiency, result.correct, result.total
            ),
            "completed": old_score.completed or result.completed,
        }
    )
    store.update_profile(
        profile.model_copy(
            update={
                "topic_scores": {**profile.topic_scores, topic: new_score},
                "updated_at": datetime.now(UTC),
            }
        )
    )
    return LessonResultResponse(
        topic=topic,
        proficiency=new_score.proficiency,
        completed=new_score.completed,
        path_refresh_needed=difficulty_band(new_score.proficiency)
        != difficulty_band(old_score.proficiency),
    )
