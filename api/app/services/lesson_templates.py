"""Loads the stored base lessons from data/lesson_templates. Owner: Faraz (@faraz999shah).

Loaded once at startup and validated up front, so a broken lesson file stops
the API from starting instead of failing when a learner opens the lesson.
"""

from pathlib import Path

from pydantic import ValidationError

from app.schemas.lesson_template import LessonTemplate
from app.schemas.shared import Language, Topic

BASE_LESSON_LANGUAGE = Language.EN
LESSON_TEMPLATES_DIR = Path(__file__).resolve().parents[3] / "data" / "lesson_templates"


def load_lesson_templates(
    directory: Path = LESSON_TEMPLATES_DIR,
) -> dict[Topic, LessonTemplate]:
    """Load and validate one base lesson per topic.

    Args:
        directory: Folder of lesson JSON files.

    Returns:
        The base lesson for each topic.

    Raises:
        ValueError: If a file is invalid, its lesson id is not its topic, two
            files share a topic, or a topic has no lesson.
    """
    templates: dict[Topic, LessonTemplate] = {}
    for path in sorted(directory.glob("*.json")):
        template = _load_template(path)
        if template.lesson_id != template.topic:
            raise ValueError(
                f"{path.name}: core lesson id must be its topic {template.topic!r}"
            )
        if template.topic in templates:
            raise ValueError(f"{path.name}: second lesson for topic {template.topic}")
        templates[template.topic] = template

    missing = set(Topic) - templates.keys()
    if missing:
        raise ValueError(f"no base lesson for topics: {sorted(missing)}")
    return templates


def _load_template(path: Path) -> LessonTemplate:
    """Validate one lesson file, naming the file in any error."""
    try:
        return LessonTemplate.model_validate_json(path.read_text(encoding="utf-8"))
    except ValidationError as error:
        raise ValueError(f"{path.name} is not a valid base lesson: {error}") from error
