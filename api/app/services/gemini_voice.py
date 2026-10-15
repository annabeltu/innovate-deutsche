"""Gemini speech-to-text and text-to-speech behind the voice providers' interfaces.

The voice router stays provider-agnostic: these classes satisfy
SpeechToTextProvider and TextToSpeechProvider, and app/speech/gemini.py does
the Gemini calls, including falling back across models when quota runs out.
"""

import asyncio
from collections.abc import Callable
from typing import TypeVar

import httpx

from app.schemas.shared import Language
from app.services.errors import VoiceProviderError
from app.services.speech_cache import SpeechCache
from app.services.speech_to_text import AudioClip
from app.speech.errors import SpeechProviderError
from app.speech.gemini import GeminiSpeechClient, GeminiSpeechConfig

WAV_MEDIA_TYPE = "audio/wav"
# Upload types phones and browsers send, mapped to types Gemini accepts.
# iOS records AAC in an MPEG-4 container (audio/mp4); browsers send webm.
GEMINI_AUDIO_TYPES = {
    "audio/mp4": "audio/m4a",
    "audio/x-m4a": "audio/m4a",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
}

Result = TypeVar("Result")


def gemini_audio_type(content_type: str) -> str:
    """Gemini's name for an upload's audio type, ignoring parameters like codecs."""
    base_type = content_type.split(";")[0].strip().lower()
    return GEMINI_AUDIO_TYPES.get(base_type, base_type)


class _GeminiProvider:
    """Runs blocking Gemini calls off the event loop with a fresh, timed client."""

    def __init__(self, config: GeminiSpeechConfig, timeout_seconds: float) -> None:
        self._config = config
        self._timeout = timeout_seconds

    async def _call(self, work: Callable[[GeminiSpeechClient], Result]) -> Result:
        def run() -> Result:
            with httpx.Client(timeout=self._timeout) as http:
                return work(GeminiSpeechClient(http, self._config))

        try:
            return await asyncio.to_thread(run)
        except SpeechProviderError as error:
            raise VoiceProviderError(
                "Gemini could not handle the voice request"
            ) from error


class GeminiTranscriber(_GeminiProvider):
    """Speech-to-text with Gemini, hinting the learner's language."""

    is_fixture = False

    async def transcribe(self, clip: AudioClip, language: Language) -> str:
        """Return what was said in the recording.

        Raises:
            VoiceProviderError: If every configured Gemini model failed.
        """
        mime_type = gemini_audio_type(clip.content_type)
        return await self._call(
            lambda client: client.transcribe(clip.content, mime_type, language)
        )


class GeminiSynthesizer(_GeminiProvider):
    """Natural-sounding read-aloud with Gemini TTS, cached by text."""

    media_type = WAV_MEDIA_TYPE

    def __init__(
        self, config: GeminiSpeechConfig, timeout_seconds: float, cache: SpeechCache
    ) -> None:
        super().__init__(config, timeout_seconds)
        self._cache = cache

    async def synthesize(self, text: str, language: Language, rate: float) -> bytes:
        """Return WAV audio of the text; Gemini detects the language from the text.

        `rate` is not supported by Gemini TTS; the app adjusts playback speed.

        Raises:
            VoiceProviderError: If every configured Gemini model failed.
        """
        cached = self._cache.get(text)
        if cached is not None:
            return cached
        audio = await self._call(lambda client: client.synthesize(text))
        self._cache.put(text, audio)
        return audio
