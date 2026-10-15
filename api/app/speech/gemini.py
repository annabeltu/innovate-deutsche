"""Gemini speech client: the only code that sends audio or speech requests to Gemini.

Uses the Gemini Interactions API (see docs/adr/0007-gemini-for-speech.md).
Each job has an ordered list of models: when one is out of free-tier quota,
missing, or failing, the next one is tried, so voice keeps working.
"""

import base64
import logging
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, TypeVar

import httpx

from app.schemas.shared import Language
from app.speech.errors import SpeechProviderError
from app.speech.wav import ensure_wav

logger = logging.getLogger(__name__)

# BCP-47 codes from the gemini-3.5-transcribe language list. Spanish covers
# both US and Latin American speakers; Swahili is listed only as sw-KE.
TRANSCRIPTION_LANGUAGE_CODES: dict[Language, list[str]] = {
    Language.EN: ["en-US"],
    Language.ES: ["es-US", "es-419"],
    Language.SW: ["sw-KE"],
}
LANGUAGE_NAMES = {
    Language.EN: "English",
    Language.ES: "Spanish",
    Language.SW: "Swahili",
}
# Dedicated speech-to-text models take a language hint instead of a prompt.
DEDICATED_TRANSCRIBE_MODEL_MARKER = "-transcribe"
TRANSCRIBE_PROMPT_FILE = (
    Path(__file__).resolve().parents[1] / "prompts" / "transcribe_v1.txt"
)
MODEL_OUTPUT_STEP = "model_output"
# Kompass talks like a patient friend, not an announcement system.
SPEECH_STYLE = "warm, friendly and natural, like a patient guide, at a calm pace"
FIRST_SERVER_ERROR = 500
ATTEMPTS_PER_MODEL = 2

Result = TypeVar("Result")


@lru_cache
def load_transcribe_prompt() -> str:
    """Read the versioned prompt that tells general models to transcribe verbatim."""
    return TRANSCRIBE_PROMPT_FILE.read_text(encoding="utf-8")


@dataclass(frozen=True)
class GeminiSpeechConfig:
    """Everything the client needs from Settings, without the rest of the app."""

    api_key: str
    interactions_url: str
    transcribe_models: Sequence[str]
    tts_models: Sequence[str]
    tts_voice: str
    transcribe_prompt: str


class GeminiSpeechClient:
    """Calls Gemini for speech-to-text and text-to-speech, falling back across models."""

    def __init__(self, http: httpx.Client, config: GeminiSpeechConfig) -> None:
        self._http = http
        self._config = config

    def transcribe(self, audio: bytes, mime_type: str, language: Language) -> str:
        """Return the transcript of a short recording, hinting the expected language."""
        encoded = base64.b64encode(audio).decode("ascii")
        return self._first_success(
            self._config.transcribe_models,
            lambda model: self._transcribe_with(model, encoded, mime_type, language),
        )

    def synthesize(self, text: str) -> bytes:
        """Return WAV audio of the text read aloud; Gemini detects the language itself."""
        return self._first_success(
            self._config.tts_models, lambda model: self._synthesize_with(model, text)
        )

    def _first_success(
        self, models: Sequence[str], attempt: Callable[[str], Result]
    ) -> Result:
        """Try each model in order; retry a model once only on transient errors."""
        for model in models:
            for attempt_number in range(1, ATTEMPTS_PER_MODEL + 1):
                try:
                    return attempt(model)
                except SpeechProviderError as error:
                    if not error.retryable or attempt_number == ATTEMPTS_PER_MODEL:
                        logger.warning(
                            "gemini %s unavailable (%s); trying next model",
                            model,
                            error,
                        )
                        break
        raise SpeechProviderError("Every configured Gemini model failed")

    def _transcribe_with(
        self, model: str, encoded_audio: str, mime_type: str, language: Language
    ) -> str:
        audio_block = {"type": "audio", "mime_type": mime_type, "data": encoded_audio}
        body: dict[str, Any] = {"model": model}
        if DEDICATED_TRANSCRIBE_MODEL_MARKER in model:
            body["input"] = [audio_block]
            body["generation_config"] = {
                "transcription_config": {
                    "language_codes": TRANSCRIPTION_LANGUAGE_CODES[language]
                }
            }
        else:
            prompt = self._config.transcribe_prompt.format(
                language_name=LANGUAGE_NAMES[language]
            )
            body["input"] = [{"type": "text", "text": prompt}, audio_block]
        texts = _strings_of_type(self._model_output(model, body), "text", "text")
        if not texts:
            raise SpeechProviderError(f"{model} returned no text")
        return " ".join(text.strip() for text in texts).strip()

    def _synthesize_with(self, model: str, text: str) -> bytes:
        body = {
            "model": model,
            "input": [
                {
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": text,
                            "annotations": [
                                {"type": "speech_metadata", "style": SPEECH_STYLE}
                            ],
                        }
                    ],
                }
            ],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": self._config.tts_voice}]},
        }
        audio = _strings_of_type(self._model_output(model, body), "audio", "data")
        if not audio:
            raise SpeechProviderError(f"{model} returned no audio")
        try:
            return ensure_wav(base64.b64decode(audio[-1], validate=True))
        except ValueError as error:
            raise SpeechProviderError(f"{model} audio was not base64") from error

    def _model_output(self, model: str, body: dict[str, Any]) -> list[dict[str, Any]]:
        """POST an interaction and return the content blocks of its model output."""
        started = time.monotonic()
        try:
            response = self._http.post(
                self._config.interactions_url,
                json=body,
                headers={"x-goog-api-key": self._config.api_key},
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPStatusError as error:
            status = error.response.status_code
            raise SpeechProviderError(
                f"{model} answered HTTP {status}",
                retryable=status >= FIRST_SERVER_ERROR,
            ) from error
        except httpx.TransportError as error:
            raise SpeechProviderError(
                f"{model} {type(error).__name__}", retryable=True
            ) from error
        except ValueError as error:
            raise SpeechProviderError(f"{model} answered invalid JSON") from error
        logger.info("gemini %s answered in %.2fs", model, time.monotonic() - started)
        return _model_output_content(model, payload)


def _model_output_content(model: str, payload: Any) -> list[dict[str, Any]]:
    """Collect content blocks from every model_output step of an interaction."""
    if not isinstance(payload, dict) or not isinstance(payload.get("steps"), list):
        raise SpeechProviderError(f"{model} response had no steps")
    content: list[dict[str, Any]] = []
    for step in payload["steps"]:
        if isinstance(step, dict) and step.get("type") == MODEL_OUTPUT_STEP:
            content.extend(
                block for block in step.get("content", []) if isinstance(block, dict)
            )
    return content


def _strings_of_type(
    content: list[dict[str, Any]], block_type: str, field: str
) -> list[str]:
    """String values of `field` from blocks of `block_type`, skipping malformed ones."""
    return [
        block[field]
        for block in content
        if block.get("type") == block_type and isinstance(block.get(field), str)
    ]
