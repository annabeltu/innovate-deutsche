"""Speech-to-text for Ask Kiko and voice mode. Owner: voice teammate (@voice-placeholder).

The router hands over the raw upload; this module validates it and asks a provider for
the transcript. Providers share one small interface, so Whisper can be swapped for any
other service without changing POST /v1/voice/transcribe. Recordings stay in memory and
are never written to disk or logged.
"""

from dataclasses import dataclass
from typing import Protocol

from app.schemas.shared import Language
from app.schemas.voice import TranscriptionResponse
from app.services.errors import (
    AudioTooLargeError,
    InvalidRequestError,
    UnsupportedAudioError,
    VoiceProviderError,
)
from app.services.voice_provider_http import ProviderEndpoint, post_to_provider

# MIME type sent by the app → file extension Whisper uses to detect the format.
# expo-audio's default presets record AAC in an .m4a container on iOS and Android.
AUDIO_EXTENSIONS = {
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
}

# Development fixtures, clearly labeled with is_fixture=true. A typical Ask Kiko question.
FIXTURE_TRANSCRIPTS = {
    Language.EN: "How can I save money for an emergency?",
    Language.ES: "¿Cómo puedo ahorrar dinero para una emergencia?",
    Language.SW: "Ninawezaje kuweka akiba kwa ajili ya dharura?",
}


@dataclass(frozen=True)
class AudioClip:
    """A validated recording ready to send to a provider."""

    content: bytes
    content_type: str
    filename: str


class SpeechToTextProvider(Protocol):
    """Anything that turns a recording into text in the given language."""

    is_fixture: bool

    async def transcribe(self, clip: AudioClip, language: Language) -> str:
        """Return what was said, or an empty string if nothing was heard."""
        ...


class WhisperTranscriber:
    """OpenAI Whisper, or any server speaking the same /audio/transcriptions API."""

    is_fixture = False

    def __init__(self, endpoint: ProviderEndpoint) -> None:
        self._endpoint = endpoint

    async def transcribe(self, clip: AudioClip, language: Language) -> str:
        """Send the clip with the learner's language as a hint and return the text.

        Raises:
            VoiceProviderError: If the provider fails or its reply has no text.
            VoiceProviderTimeoutError: If the provider is too slow.
        """
        response = await post_to_provider(
            self._endpoint,
            data={
                "model": self._endpoint.model,
                "language": language.value,
                "response_format": "json",
            },
            files={"file": (clip.filename, clip.content, clip.content_type)},
        )
        try:
            text = response.json()["text"]
        except (ValueError, KeyError, TypeError):
            text = None
        if not isinstance(text, str):
            raise VoiceProviderError(
                "The speech service returned an unreadable transcript",
                {"model": self._endpoint.model},
            )
        return text


class FixtureTranscriber:
    """Development stand-in used only when VOICE_DEV_FIXTURES is on and no key is set."""

    is_fixture = True

    async def transcribe(self, clip: AudioClip, language: Language) -> str:
        """Ignore the audio and return the language's fixture question."""
        return FIXTURE_TRANSCRIPTS[language]


def validate_audio(
    content: bytes, content_type: str | None, max_bytes: int
) -> AudioClip:
    """Check the upload is a non-empty, supported recording within the size limit.

    Raises:
        UnsupportedAudioError: If the MIME type is not a supported audio format.
        AudioTooLargeError: If the recording is over `max_bytes`.
        InvalidRequestError: If the recording is empty.
    """
    mime_type = (content_type or "").split(";")[0].strip().lower()
    extension = AUDIO_EXTENSIONS.get(mime_type)
    if extension is None:
        raise UnsupportedAudioError(
            f"Audio type '{mime_type or 'missing'}' is not supported",
            {"allowed": sorted(AUDIO_EXTENSIONS)},
        )
    if len(content) > max_bytes:
        raise AudioTooLargeError("The recording is too long", {"max_bytes": max_bytes})
    if not content:
        raise InvalidRequestError("The recording is empty")
    return AudioClip(content, mime_type, f"recording.{extension}")


async def transcribe(
    clip: AudioClip, language: Language, provider: SpeechToTextProvider
) -> TranscriptionResponse:
    """Transcribe the clip and label fixture output so it is never mistaken for real."""
    text = await provider.transcribe(clip, language)
    return TranscriptionResponse(
        text=text.strip(), language=language, is_fixture=provider.is_fixture
    )
