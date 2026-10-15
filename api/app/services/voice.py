"""Voice flow: validate uploads, transcribe them, and read text aloud.

Recordings are held in memory only and never written to disk or logged, so
there is nothing to delete after transcription (AGENTS.md §2.3).
"""

import logging
from collections.abc import Callable
from typing import Protocol, TypeVar

from app.schemas.shared import Language, TranscriptionResponse
from app.services.errors import (
    AudioTooLargeError,
    InvalidRequestError,
    SpeechUnavailableError,
    UnsupportedAudioTypeError,
)
from app.services.speech_cache import SpeechCache
from app.speech.errors import SpeechProviderError

logger = logging.getLogger(__name__)

# Upload types phones and browsers send, mapped to types Gemini accepts.
# iOS records AAC in an MPEG-4 container (audio/mp4), browsers send webm.
AUDIO_TYPE_ALIASES = {
    "audio/m4a": "audio/m4a",
    "audio/x-m4a": "audio/m4a",
    "audio/mp4": "audio/m4a",
    "audio/aac": "audio/aac",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mp3",
}

Result = TypeVar("Result")


class SpeechClient(Protocol):
    """What the voice flow needs from a speech provider."""

    def transcribe(self, audio: bytes, mime_type: str, language: Language) -> str:
        """Return the transcript of the recording."""
        ...

    def synthesize(self, text: str) -> bytes:
        """Return WAV audio of the text."""
        ...


def normalize_audio_type(content_type: str | None) -> str:
    """Map an upload's Content-Type to a provider type, ignoring parameters like codecs.

    Raises:
        UnsupportedAudioTypeError: If the type is missing or not an accepted audio type.
    """
    base_type = (content_type or "").split(";")[0].strip().lower()
    if base_type not in AUDIO_TYPE_ALIASES:
        raise UnsupportedAudioTypeError(
            f"Audio type {base_type or 'unknown'} is not supported",
            {"allowed": sorted(set(AUDIO_TYPE_ALIASES))},
        )
    return AUDIO_TYPE_ALIASES[base_type]


def transcribe(
    audio: bytes,
    content_type: str | None,
    language: Language,
    client: SpeechClient,
    max_bytes: int,
) -> TranscriptionResponse:
    """Validate a recording and return what was said.

    Raises:
        InvalidRequestError: The recording is empty.
        AudioTooLargeError: The recording is over max_bytes.
        UnsupportedAudioTypeError: The recording is not an accepted audio type.
        SpeechUnavailableError: Every configured model failed.
    """
    if not audio:
        raise InvalidRequestError("The recording is empty")
    if len(audio) > max_bytes:
        raise AudioTooLargeError("The recording is too long", {"max_bytes": max_bytes})
    mime_type = normalize_audio_type(content_type)
    text = _provider_call(lambda: client.transcribe(audio, mime_type, language))
    return TranscriptionResponse(text=text, language=language)


def speak(text: str, client: SpeechClient, cache: SpeechCache) -> bytes:
    """Return WAV audio of the text read aloud, reusing earlier audio for the same text.

    Raises:
        SpeechUnavailableError: Every configured model failed.
    """
    cached = cache.get(text)
    if cached is not None:
        return cached
    audio = _provider_call(lambda: client.synthesize(text))
    cache.put(text, audio)
    return audio


def _provider_call(call: Callable[[], Result]) -> Result:
    """Run a provider call; the client already falls back across models and retries."""
    try:
        return call()
    except SpeechProviderError as error:
        raise SpeechUnavailableError("Voice is unavailable right now") from error
