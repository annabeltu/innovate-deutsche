"""Turn every error into the contract's shape: {"error": {"code", "message", "details"}}."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.shared import ErrorDetail, ErrorResponse
from app.services.errors import KompassError

logger = logging.getLogger(__name__)

STATUS_BY_CODE = {
    "validation_error": status.HTTP_400_BAD_REQUEST,
    "profile_not_found": status.HTTP_404_NOT_FOUND,
    "quiz_not_found": status.HTTP_404_NOT_FOUND,
    "lesson_not_found": status.HTTP_404_NOT_FOUND,
    "quiz_already_submitted": status.HTTP_409_CONFLICT,
    "unsupported_language": status.HTTP_422_UNPROCESSABLE_CONTENT,
    "audio_too_large": status.HTTP_413_CONTENT_TOO_LARGE,
    "unsupported_audio_type": status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
    "rate_limited": status.HTTP_429_TOO_MANY_REQUESTS,
    "speech_unavailable": status.HTTP_503_SERVICE_UNAVAILABLE,
}


def error_response(
    status_code: int, code: str, message: str, details: dict[str, object] | None = None
) -> JSONResponse:
    """Build a JSON error response in the contract's shape."""
    body = ErrorResponse(
        error=ErrorDetail(code=code, message=message, details=details or {})
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


async def handle_kompass_error(_request: Request, error: Exception) -> JSONResponse:
    """Map a domain error raised by a service to its HTTP status."""
    assert isinstance(error, KompassError)
    status_code = STATUS_BY_CODE.get(error.code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    logger.info("request failed: %s %s", error.code, error.message)
    return error_response(status_code, error.code, error.message, error.details)


async def handle_validation_error(_request: Request, error: Exception) -> JSONResponse:
    """Pydantic rejected the request body or path; list the offending fields."""
    assert isinstance(error, RequestValidationError)
    fields = [
        {"field": ".".join(str(part) for part in issue["loc"]), "issue": issue["msg"]}
        for issue in error.errors()
    ]
    return error_response(
        status.HTTP_400_BAD_REQUEST,
        "validation_error",
        "Request is invalid",
        {"fields": fields},
    )


async def handle_http_error(_request: Request, error: Exception) -> JSONResponse:
    """Wrap framework errors such as unknown routes in the same shape."""
    assert isinstance(error, StarletteHTTPException)
    code = (
        "not_found" if error.status_code == status.HTTP_404_NOT_FOUND else "http_error"
    )
    return error_response(error.status_code, code, str(error.detail))


def register_error_handlers(app: FastAPI) -> None:
    """Install all handlers on the app."""
    app.add_exception_handler(KompassError, handle_kompass_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
