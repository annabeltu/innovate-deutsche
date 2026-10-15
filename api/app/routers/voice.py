"""Voice API: transcribe, intent, speak. Owner: voice teammate (@voice-placeholder).

HTTP only; logic lives in services/intent.py, services/speech_to_text.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.dependencies import SettingsDep, get_transcriber
from app.schemas.shared import ErrorResponse, Language
from app.schemas.voice import (
    IntentRequest,
    IntentResponse,
    TranscriptionResponse,
)
from app.services import intent, speech_to_text
from app.services.speech_to_text import SpeechToTextProvider

router = APIRouter(prefix="/v1/voice", tags=["voice"])

TranscriberDep = Annotated[SpeechToTextProvider, Depends(get_transcriber)]

VALIDATION_ERROR = {status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse}}
PROVIDER_ERRORS = {
    **VALIDATION_ERROR,
    status.HTTP_502_BAD_GATEWAY: {"model": ErrorResponse},
    status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    status.HTTP_504_GATEWAY_TIMEOUT: {"model": ErrorResponse},
}


@router.post(
    "/intent",
    response_model=IntentResponse,
    summary="Map a short spoken reply to a voice command",
    responses=VALIDATION_ERROR,
)
def post_intent(request: IntentRequest) -> IntentResponse:
    """Return yes/no/repeat/next/back/help/start/option/number/scam/legitimate or unknown."""
    return intent.recognize_intent(request.text, request.language)


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Turn a recording into text",
    responses={
        **PROVIDER_ERRORS,
        status.HTTP_413_CONTENT_TOO_LARGE: {"model": ErrorResponse},
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: {"model": ErrorResponse},
    },
)
async def post_transcribe(
    audio: Annotated[UploadFile, File(description="The recording, e.g. m4a or wav.")],
    language: Annotated[Language, Form(description="Language the learner spoke.")],
    settings: SettingsDep,
    transcriber: TranscriberDep,
) -> TranscriptionResponse:
    """Transcribe with the learner's language as a hint. The audio is not stored."""
    # Read one byte past the limit so an oversized upload is detected without reading it all.
    content = await audio.read(settings.voice_max_audio_bytes + 1)
    clip = speech_to_text.validate_audio(
        content, audio.content_type, settings.voice_max_audio_bytes
    )
    return await speech_to_text.transcribe(clip, language, transcriber)
