"""Stores generated (bonus) base lessons on SQLite. Owner: Faraz (@faraz999shah).

Faraz owns the bonus_lessons table. A bonus lesson belongs to the learner who
asked for it; its id is also added to their LearnerProfile.bonus_lesson_ids.
"""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

from app.schemas.lesson_template import LessonTemplate

SCHEMA = """
CREATE TABLE IF NOT EXISTS bonus_lessons (
    lesson_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    request_text TEXT NOT NULL,
    template_json TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


class BonusLessonStore:
    """SQLite-backed storage for generated base lessons."""

    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path
        with self._connect() as connection:
            connection.executescript(SCHEMA)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        """Open a connection that commits on success and rolls back on error."""
        connection = sqlite3.connect(self._database_path)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def save(
        self,
        user_id: str,
        request_text: str,
        template: LessonTemplate,
        prompt_version: str,
    ) -> None:
        """Store a generated lesson for the learner who asked for it."""
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO bonus_lessons VALUES (?, ?, ?, ?, ?, ?)",
                (
                    template.lesson_id,
                    user_id,
                    request_text,
                    template.model_dump_json(),
                    prompt_version,
                    datetime.now(UTC).isoformat(),
                ),
            )

    def get(self, user_id: str, lesson_id: str) -> LessonTemplate | None:
        """The learner's bonus lesson with this id, or None."""
        with self._connect() as connection:
            row = connection.execute(
                "SELECT template_json FROM bonus_lessons WHERE lesson_id = ? AND user_id = ?",
                (lesson_id, user_id),
            ).fetchone()
        return None if row is None else LessonTemplate.model_validate_json(row[0])
