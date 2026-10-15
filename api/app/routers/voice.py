"""Voice API: transcribe, intent, speak. Owner: voice teammate (@voice-placeholder)."""
from fastapi import APIRouter

router = APIRouter(prefix="/v1/voice", tags=["voice"])
