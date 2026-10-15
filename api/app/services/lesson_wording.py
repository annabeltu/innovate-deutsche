"""LLM wording step: rewrites a customized lesson for the learner's language. Owner: Faraz.

The lesson is already customized and every fact filled in by code. The LLM
only rewrites wording; its output is validated, retried once on failure,
and otherwise the original lesson is served, so learners always get a
working lesson.
"""

import json
import logging
import time

from app.llm.client import LlmClient, LlmError, load_prompt
from app.schemas.shared import Language, Lesson
from app.services.validation import LessonValidationError, validate_rewrite

PROMPT_FILE = "lesson_wording_v1.md"
PROMPT_VERSION = "lesson_wording_v1"
MAX_ATTEMPTS = 2
BASE_LESSON_LANGUAGE = Language.ENGLISH

logger = logging.getLogger(__name__)


def reword_lesson(
    lesson: Lesson, language: Language, simple_mode: bool, llm: LlmClient
) -> Lesson:
    """Rewrite a lesson's wording for the learner, never its facts.

    Args:
        lesson: A customized lesson with every fact already filled in.
        language: The learner's language.
        simple_mode: Whether the learner wants very simple wording.
        llm: The LLM client to use.

    Returns:
        The reworded lesson, or the original lesson if no rewrite is needed
        or every attempt failed validation.
    """
    if language == BASE_LESSON_LANGUAGE and not simple_mode:
        return lesson

    instructions = load_prompt(PROMPT_FILE)
    request_json = _build_request(lesson, language, simple_mode)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        started = time.perf_counter()
        try:
            rewritten = validate_rewrite(
                lesson, llm.complete_json(instructions, request_json)
            )
        except (LlmError, LessonValidationError) as error:
            logger.warning(
                "lesson rewrite failed: lesson=%s model=%s prompt=%s attempt=%d "
                "error=%s",
                lesson.lesson_id,
                llm.model_name,
                PROMPT_VERSION,
                attempt,
                error,
            )
            continue
        _log_success(lesson, llm, attempt, started)
        return rewritten

    logger.error(
        "serving original wording after %d failed rewrites: lesson=%s language=%s",
        MAX_ATTEMPTS,
        lesson.lesson_id,
        language,
    )
    return lesson


def _build_request(lesson: Lesson, language: Language, simple_mode: bool) -> str:
    """The JSON the LLM receives: target language, simple mode and the lesson."""
    return json.dumps(
        {
            "language": language,
            "simple_mode": simple_mode,
            "lesson": lesson.model_dump(mode="json"),
        }
    )


def _log_success(lesson: Lesson, llm: LlmClient, attempt: int, started: float) -> None:
    """Log model, prompt version and latency for a successful rewrite."""
    logger.info(
        "lesson rewritten: lesson=%s model=%s prompt=%s attempt=%d latency_ms=%d",
        lesson.lesson_id,
        llm.model_name,
        PROMPT_VERSION,
        attempt,
        (time.perf_counter() - started) * 1000,
    )
