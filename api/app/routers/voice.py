"""Voice API: transcribe and speak. HTTP only; logic lives in services/voice.py."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status

from app.dependencies import SettingsDep, enforce_voice_rate_limit, get_speech_client
from app.schemas.shared import (
    ErrorResponse,
    Language,
    SpeakQuery,
    TranscriptionResponse,
)
from app.services import voice
from app.services.voice import SpeechClient

router = APIRouter(
    prefix="/v1/voice",
    tags=["voice"],
    dependencies=[Depends(enforce_voice_rate_limit)],
)

SpeechClientDep = Annotated[SpeechClient, Depends(get_speech_client)]
WAV_MEDIA_TYPE = "audio/wav"
# Spoken screen text rarely changes, so the app may reuse audio for a day.
SPEAK_CACHE_CONTROL = "private, max-age=86400"
VOICE_ERRORS = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
    status.HTTP_429_TOO_MANY_REQUESTS: {"model": ErrorResponse},
    status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
}


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Turn a short spoken recording into text",
    responses={
        **VOICE_ERRORS,
        status.HTTP_413_CONTENT_TOO_LARGE: {"model": ErrorResponse},
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: {"model": ErrorResponse},
    },
)
def post_transcribe(
    audio: Annotated[UploadFile, File(description="m4a, wav, webm, ogg, mp3 or aac")],
    language: Annotated[Language, Form(description="Language the learner speaks")],
    client: SpeechClientDep,
    settings: SettingsDep,
) -> TranscriptionResponse:
    """Transcribe in memory; one byte over the limit is enough to reject the upload."""
    recording = audio.file.read(settings.max_audio_bytes + 1)
    return voice.transcribe(
        recording, audio.content_type, language, client, settings.max_audio_bytes
    )


@router.get(
    "/speak",
    response_class=Response,
    summary="Read text aloud as audio/wav (used when the phone lacks a voice)",
    responses={
        **VOICE_ERRORS,
        status.HTTP_200_OK: {"content": {WAV_MEDIA_TYPE: {}}},
    },
)
def get_speak(
    query: Annotated[SpeakQuery, Query()], client: SpeechClientDep
) -> Response:
    """GET so the app's audio player can stream it straight from the URL."""
    return Response(
        content=voice.speak(query.text, client),
        media_type=WAV_MEDIA_TYPE,
        headers={"Cache-Control": SPEAK_CACHE_CONTROL},
    )
