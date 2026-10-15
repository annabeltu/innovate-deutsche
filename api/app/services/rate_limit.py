"""In-memory sliding-window rate limiter for the AI-backed endpoints (AGENTS.md §7).

One API process serves the demo, so per-process memory is enough; a shared
store would be needed if the API ever runs as several processes.
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable
from threading import Lock

from app.services.errors import RateLimitedError

WINDOW_SECONDS = 60.0


class RateLimiter:
    """Allow at most `limit` calls per key within a rolling window."""

    def __init__(
        self,
        limit: int,
        window_seconds: float = WINDOW_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._limit = limit
        self._window = window_seconds
        self._clock = clock
        self._calls: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        """Record a call for `key`.

        Raises:
            RateLimitedError: If `key` already made `limit` calls in the window.
        """
        now = self._clock()
        with self._lock:
            calls = self._calls[key]
            while calls and now - calls[0] >= self._window:
                calls.popleft()
            if len(calls) >= self._limit:
                retry_after = round(self._window - (now - calls[0]), 1)
                raise RateLimitedError(
                    "Too many voice requests; try again shortly",
                    {"retry_after_seconds": retry_after},
                )
            calls.append(now)
