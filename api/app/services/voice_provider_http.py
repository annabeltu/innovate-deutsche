"""One outbound call to a hosted speech provider. Owner: voice teammate (@voice-placeholder).

Speech-to-text and text-to-speech share this so every provider failure is logged the
same way (model, latency, status, never the key) and becomes the same domain error.
"""

import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.services.errors import VoiceProviderError, VoiceProviderTimeoutError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProviderEndpoint:
    """Where and how to reach one provider; `transport` lets tests fake the network."""

    url: str
    api_key: str
    model: str
    timeout_seconds: float
    transport: httpx.AsyncBaseTransport | None = None


async def post_to_provider(
    endpoint: ProviderEndpoint, **request: Any
) -> httpx.Response:
    """POST to the provider and return its successful response.

    `request` is passed to httpx (json=, data=, files=).

    Raises:
        VoiceProviderTimeoutError: If the provider does not answer within the timeout.
        VoiceProviderError: If the provider is unreachable or returns a non-2xx status.
    """
    started = time.perf_counter()
    headers = {"Authorization": f"Bearer {endpoint.api_key}"}
    try:
        async with httpx.AsyncClient(
            timeout=endpoint.timeout_seconds, transport=endpoint.transport
        ) as client:
            response = await client.post(endpoint.url, headers=headers, **request)
        response.raise_for_status()
    except httpx.TimeoutException as error:
        logger.warning("%s timed out after %.2fs", endpoint.model, _since(started))
        raise VoiceProviderTimeoutError(
            "The speech service took too long to answer", {"model": endpoint.model}
        ) from error
    except httpx.HTTPStatusError as error:
        status_code = error.response.status_code
        logger.error(
            "%s returned HTTP %s after %.2fs",
            endpoint.model,
            status_code,
            _since(started),
        )
        raise VoiceProviderError(
            "The speech service rejected the request",
            {"model": endpoint.model, "provider_status": status_code},
        ) from error
    except httpx.HTTPError as error:
        logger.error("%s request failed: %s", endpoint.model, type(error).__name__)
        raise VoiceProviderError(
            "The speech service could not be reached", {"model": endpoint.model}
        ) from error

    logger.info("%s answered in %.2fs", endpoint.model, _since(started))
    return response


def _since(started: float) -> float:
    """Seconds elapsed since `started`."""
    return time.perf_counter() - started
