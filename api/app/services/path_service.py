"""Build the roadmap from the stored profile and published Findex gaps."""

from app.schemas.shared import LearningPath, PathNode
from app.services.lesson_service import LessonSources, LessonStores
from app.services.needs import build_learner_needs
from app.services.scoring import score_topics


def build_path(
    user_id: str, stores: LessonStores, sources: LessonSources
) -> LearningPath:
    """Order core lessons using confidence/quiz proficiency, goal and Findex needs."""
    profile = stores.profiles.get_profile(user_id)
    needs = build_learner_needs(profile, sources.findex[profile.country])
    priorities = score_topics(
        profile, {topic: need.findex_gap for topic, need in needs.topic_needs.items()}
    )
    return LearningPath(
        user_id=user_id,
        lessons=[
            PathNode(
                lesson_id=sources.templates[item.topic].lesson_id,
                topic=item.topic,
                priority=item.priority,
                difficulty=item.difficulty,
                completed=item.completed,
            )
            for item in priorities
        ],
    )
