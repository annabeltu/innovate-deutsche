"""Profile storage on SQLite; exposes get_profile(user_id). Owner: Will (@willapat).

Will owns the `profiles` and `quizzes` tables. Other areas read profiles only
through ProfileStore.get_profile, never by querying the tables.
"""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, TypeAdapter

from app.schemas.shared import LearnerProfile, OnboardingRequest
from app.services.errors import ProfileNotFoundError
from app.services.question_bank import AnswerKeyEntry

SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    profile_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    onboarding_json TEXT NOT NULL,
    answer_key_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


ANSWER_KEY_ADAPTER = TypeAdapter(dict[str, AnswerKeyEntry])


class QuizStatus(StrEnum):
    """Lifecycle of a baseline quiz; only pending quizzes can be submitted or skipped."""

    PENDING = "pending"
    SUBMITTED = "submitted"
    SKIPPED = "skipped"


class StoredQuiz(BaseModel):
    """A served quiz plus the onboarding answers it was built from. Never sent to the app."""

    quiz_id: str
    user_id: str
    onboarding: OnboardingRequest
    answer_key: dict[str, AnswerKeyEntry]
    status: QuizStatus = QuizStatus.PENDING


class ProfileStore:
    """SQLite-backed storage for learner profiles and pending quizzes."""

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

    def get_profile(self, user_id: str) -> LearnerProfile:
        """Return the learner's profile.

        Raises:
            ProfileNotFoundError: If onboarding never finished for this user.
        """
        with self._connect() as connection:
            row = connection.execute(
                "SELECT profile_json FROM profiles WHERE user_id = ?", (user_id,)
            ).fetchone()
        if row is None:
            raise ProfileNotFoundError(
                f"No profile for {user_id}", {"user_id": user_id}
            )
        return LearnerProfile.model_validate_json(row[0])

    def update_profile(self, profile: LearnerProfile) -> None:
        """Overwrite an existing profile.

        Raises:
            ProfileNotFoundError: If the user has no profile yet.
        """
        with self._connect() as connection:
            updated = connection.execute(
                "UPDATE profiles SET profile_json = ?, updated_at = ? WHERE user_id = ?",
                (
                    profile.model_dump_json(),
                    profile.updated_at.isoformat(),
                    profile.user_id,
                ),
            ).rowcount
        if updated == 0:
            raise ProfileNotFoundError(
                f"No profile for {profile.user_id}", {"user_id": profile.user_id}
            )

    def save_quiz(self, quiz: StoredQuiz) -> None:
        """Store a newly served quiz and its answer key."""
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO quizzes (quiz_id, user_id, onboarding_json, answer_key_json, status,"
                " created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    quiz.quiz_id,
                    quiz.user_id,
                    quiz.onboarding.model_dump_json(),
                    ANSWER_KEY_ADAPTER.dump_json(quiz.answer_key).decode(),
                    quiz.status,
                    datetime.now(UTC).isoformat(),
                ),
            )

    def get_quiz(self, quiz_id: str) -> StoredQuiz | None:
        """Return a stored quiz, or None if the id is unknown."""
        with self._connect() as connection:
            row = connection.execute(
                "SELECT quiz_id, user_id, onboarding_json, answer_key_json, status"
                " FROM quizzes WHERE quiz_id = ?",
                (quiz_id,),
            ).fetchone()
        if row is None:
            return None
        return StoredQuiz.model_validate(
            {
                "quiz_id": row[0],
                "user_id": row[1],
                "onboarding": OnboardingRequest.model_validate_json(row[2]),
                "answer_key": ANSWER_KEY_ADAPTER.validate_json(row[3]),
                "status": row[4],
            }
        )

    def finish_quiz(
        self, quiz_id: str, status: QuizStatus, profile: LearnerProfile
    ) -> bool:
        """Close a pending quiz and save the profile in one transaction.

        Returns:
            False if the quiz was no longer pending (a repeat or concurrent submit),
            in which case nothing is written.
        """
        with self._connect() as connection:
            closed = connection.execute(
                "UPDATE quizzes SET status = ? WHERE quiz_id = ? AND status = ?",
                (status, quiz_id, QuizStatus.PENDING),
            ).rowcount
            if closed == 0:
                return False
            connection.execute(
                "INSERT INTO profiles (user_id, profile_json, updated_at) VALUES (?, ?, ?)"
                " ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json,"
                " updated_at = excluded.updated_at",
                (
                    profile.user_id,
                    profile.model_dump_json(),
                    profile.updated_at.isoformat(),
                ),
            )
        return True
