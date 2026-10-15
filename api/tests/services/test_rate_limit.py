import pytest

from app.services.errors import RateLimitedError
from app.services.rate_limit import RateLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_allows_up_to_the_limit_then_rejects() -> None:
    limiter = RateLimiter(limit=2, window_seconds=60, clock=FakeClock())
    limiter.check("phone")
    limiter.check("phone")

    with pytest.raises(RateLimitedError) as raised:
        limiter.check("phone")

    assert raised.value.details["retry_after_seconds"] == 60


def test_window_slides_so_old_calls_stop_counting() -> None:
    clock = FakeClock()
    limiter = RateLimiter(limit=1, window_seconds=60, clock=clock)
    limiter.check("phone")
    clock.now = 60.0

    limiter.check("phone")


def test_each_client_has_its_own_budget() -> None:
    limiter = RateLimiter(limit=1, window_seconds=60, clock=FakeClock())
    limiter.check("phone-a")

    limiter.check("phone-b")
