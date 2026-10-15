from app.services.speech_cache import SpeechCache


def test_returns_stored_audio() -> None:
    cache = SpeechCache(max_bytes=10)
    cache.put("hola", b"abc")

    assert cache.get("hola") == b"abc"
    assert cache.get("adios") is None


def test_evicts_least_recently_used_to_stay_under_budget() -> None:
    cache = SpeechCache(max_bytes=6)
    cache.put("a", b"111")
    cache.put("b", b"222")
    cache.get("a")

    cache.put("c", b"333")

    assert cache.get("a") == b"111"
    assert cache.get("b") is None
    assert cache.get("c") == b"333"


def test_ignores_audio_larger_than_the_whole_budget() -> None:
    cache = SpeechCache(max_bytes=2)
    cache.put("long", b"12345")

    assert cache.get("long") is None
