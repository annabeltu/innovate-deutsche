"""Hosted text-to-speech, an optional higher-quality voice. Owner: voice teammate (@voice-placeholder).

The app's default and fallback is on-device expo-speech. When this service is not
configured, fails, or does not serve a language, the endpoint returns an error and the
app speaks the same text on the device instead.
"""

from typing import Protocol

from app.schemas.shared import Language
from app.schemas.voice import SpeakRequest
from app.services.errors import UnsupportedLanguageError, VoiceProviderError
from app.services.voice_provider_http import ProviderEndpoint, post_to_provider

MP3_MEDIA_TYPE = "audio/mpeg"


class TextToSpeechProvider(Protocol):
    """Anything that reads text aloud and returns the audio bytes."""

    media_type: str

    async def synthesize(self, text: str, language: Language, rate: float) -> bytes:
        """Return audio of `text` spoken at `rate` times normal speed."""
        ...


class OpenAISpeechSynthesizer:
    """OpenAI's /audio/speech API, or any server speaking the same API.

    The provider detects the language from the text itself, so `language` is only used
    to decide whether the language is served at all (see Settings.tts_languages).
    """

    media_type = MP3_MEDIA_TYPE

    def __init__(self, endpoint: ProviderEndpoint, voice: str) -> None:
        self._endpoint = endpoint
        self._voice = voice

    async def synthesize(self, text: str, language: Language, rate: float) -> bytes:
        """Request an MP3 of the text.

        Raises:
            VoiceProviderError: If the provider fails or returns no audio.
            VoiceProviderTimeoutError: If the provider is too slow.
        """
        response = await post_to_provider(
            self._endpoint,
            json={
                "model": self._endpoint.model,
                "voice": self._voice,
                "input": text,
                "speed": rate,
                "response_format": "mp3",
            },
        )
        if not response.content:
            raise VoiceProviderError(
                "The speech service returned no audio", {"model": self._endpoint.model}
            )
        return response.content


async def speak(
    request: SpeakRequest,
    provider: TextToSpeechProvider,
    supported_languages: list[Language],
) -> bytes:
    """Synthesize the request's text if the hosted voice serves its language.

    Raises:
        UnsupportedLanguageError: If the hosted voice is not enabled for the language.
    """
    if request.language not in supported_languages:
        raise UnsupportedLanguageError(
            f"Hosted voice is not available in '{request.language}'; use on-device speech",
            {"language": request.language.value},
        )
    return await provider.synthesize(request.text, request.language, request.rate)
