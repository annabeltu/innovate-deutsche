"""Voice API: transcribe, intent, speak. Owner: voice teammate (@voice-placeholder).

HTTP only; logic lives in services/intent.py.
"""

from fastapi import APIRouter, status

from app.schemas.shared import ErrorResponse
from app.schemas.voice import IntentRequest, IntentResponse
from app.services import intent

router = APIRouter(prefix="/v1/voice", tags=["voice"])

VALIDATION_ERROR = {status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse}}


@router.post(
    "/intent",
    response_model=IntentResponse,
    summary="Map a short spoken reply to a voice command",
    responses=VALIDATION_ERROR,
)
def post_intent(request: IntentRequest) -> IntentResponse:
    """Return yes/no/repeat/next/back/help/start/option/number/scam/legitimate or unknown."""
    return intent.recognize_intent(request.text, request.language)
