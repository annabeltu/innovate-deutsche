"""Gemini speech client: the only code that sends audio or speech requests to Gemini.

Uses the Gemini Interactions API (see docs/adr/0007-gemini-for-speech.md):
transcription with gemini-3.5-transcribe and read-aloud with Gemini TTS.
"""

import base64
import logging
import time
from dataclasses import dataclass
from typing import Any

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
MODEL_OUTPUT_STEP = "model_output"


@dataclass(frozen=True)
class GeminiSpeechConfig:
    """Everything the client needs from Settings, without the rest of the app."""

    api_key: str
    interactions_url: str
    transcribe_model: str
    tts_model: str
    tts_voice: str


class GeminiSpeechClient:
    """Calls Gemini for speech-to-text and text-to-speech over HTTP."""

    def __init__(self, http: httpx.Client, config: GeminiSpeechConfig) -> None:
        self._http = http
        self._config = config

    def transcribe(self, audio: bytes, mime_type: str, language: Language) -> str:
        """Return the transcript of a short recording, hinting the expected language."""
        body = {
            "model": self._config.transcribe_model,
            "input": [
                {
                    "type": "audio",
                    "mime_type": mime_type,
                    "data": base64.b64encode(audio).decode("ascii"),
                }
            ],
            "generation_config": {
                "transcription_config": {
                    "language_codes": TRANSCRIPTION_LANGUAGE_CODES[language]
                }
            },
        }
        content = self._model_output(self._config.transcribe_model, body)
        texts = _strings_of_type(content, "text", "text")
        if not texts:
            raise SpeechProviderError("Transcription response had no text")
        return " ".join(text.strip() for text in texts).strip()

    def synthesize(self, text: str) -> bytes:
        """Return WAV audio of the text read aloud; Gemini detects the language itself."""
        body = {
            "model": self._config.tts_model,
            "input": [
                {"type": "user_input", "content": [{"type": "text", "text": text}]}
            ],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": self._config.tts_voice}]},
        }
        content = self._model_output(self._config.tts_model, body)
        audio = _strings_of_type(content, "audio", "data")
        if not audio:
            raise SpeechProviderError("Speech response had no audio")
        try:
            return ensure_wav(base64.b64decode(audio[-1], validate=True))
        except ValueError as error:
            raise SpeechProviderError("Speech response audio was not base64") from error

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
        except (httpx.HTTPError, ValueError) as error:
            logger.warning(
                "gemini %s failed after %.2fs: %s",
                model,
                time.monotonic() - started,
                type(error).__name__,
            )
            raise SpeechProviderError(f"Gemini {model} request failed") from error
        logger.info("gemini %s answered in %.2fs", model, time.monotonic() - started)
        return _model_output_content(payload)


def _model_output_content(payload: Any) -> list[dict[str, Any]]:
    """Collect content blocks from every model_output step of an interaction."""
    if not isinstance(payload, dict) or not isinstance(payload.get("steps"), list):
        raise SpeechProviderError("Gemini response had no steps")
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
