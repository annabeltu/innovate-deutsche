"""Lesson generation: answers "teach me about X". Owner: Faraz (@faraz999shah).

One LLM call decides whether a core lesson already covers the request, the
request is off topic, or a new base lesson is needed, and writes that lesson.
The reply is validated (validation.validate_generation) and retried once.
Generated lessons are English base lessons with {placeholders}; customization
and the wording step then treat them exactly like the five core lessons.
"""

import hashlib
import json
import logging
from collections.abc import Mapping

from app.llm.client import LlmClient, LlmError, load_prompt
from app.schemas.lesson_template import GenerationReply, LessonTemplate
from app.schemas.shared import Topic
from app.services.errors import LessonGenerationError
from app.services.validation import LessonValidationError, validate_generation

PROMPT_FILE = "lesson_generation_v2.md"
PROMPT_VERSION = "lesson_generation_v2"
MAX_ATTEMPTS = 2

# Lesson shapes a new lesson follows, so generated lessons don't all share one
# order. Code picks one per request; the LLM only writes the cards.
CARD_ORDERS: tuple[tuple[str, ...], ...] = (
    ("concept", "bridge", "mc_quiz", "concept", "mc_quiz", "takeaway"),
    ("mc_quiz", "concept", "bridge", "concept", "mc_quiz", "takeaway"),
    ("concept", "mc_quiz", "bridge", "mc_quiz", "concept", "takeaway"),
    ("concept", "mc_quiz", "concept", "bridge", "mc_quiz", "takeaway"),
)

logger = logging.getLogger(__name__)


def card_order_for(request_text: str) -> tuple[str, ...]:
    """The lesson shape for a request: varied across requests, stable for one.

    Hashing (not random) keeps it deterministic, so a retry or a repeated
    request gets the same shape.
    """
    normalized = " ".join(request_text.casefold().split())
    digest = hashlib.sha256(normalized.encode("utf-8")).digest()
    return CARD_ORDERS[digest[0] % len(CARD_ORDERS)]


def plan_lesson_request(
    request_text: str,
    core_lessons: Mapping[Topic, LessonTemplate],
    allowed_placeholders: frozenset[str],
    llm: LlmClient,
) -> GenerationReply:
    """Ask the LLM what to teach for a learner's request.

    Args:
        request_text: What the learner asked about, in any supported language.
        core_lessons: The five core lessons the LLM may point to instead.
        allowed_placeholders: Fact names a new lesson may use.
        llm: The LLM client.

    Returns:
        A validated reply: a core topic, off topic, or a new lesson draft.

    Raises:
        LessonGenerationError: If no valid reply comes back after retrying.
    """
    instructions = load_prompt(PROMPT_FILE)
    request_json = _build_request(request_text, core_lessons, allowed_placeholders)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            reply = llm.complete_json(instructions, request_json)
            return validate_generation(reply, allowed_placeholders)
        except (LlmError, LessonValidationError) as error:
            logger.warning(
                "lesson generation failed: model=%s prompt=%s attempt=%d error=%s",
                llm.model_name,
                PROMPT_VERSION,
                attempt,
                error,
            )
    raise LessonGenerationError("Could not create a lesson for this request")


def _build_request(
    request_text: str,
    core_lessons: Mapping[Topic, LessonTemplate],
    allowed_placeholders: frozenset[str],
) -> str:
    """The JSON the LLM receives: the request, core lessons, fact names and shape."""
    return json.dumps(
        {
            "request": request_text,
            "card_order": list(card_order_for(request_text)),
            "core_lessons": [
                {"topic": topic, "title": lesson.title, "goal": lesson.goal}
                for topic, lesson in core_lessons.items()
            ],
            "placeholders": sorted(allowed_placeholders),
        },
        ensure_ascii=False,
    )
