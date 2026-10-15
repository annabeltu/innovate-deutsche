"""In-memory cache of generated speech, so repeated screen text costs no TTS quota."""

from collections import OrderedDict
from threading import Lock


class SpeechCache:
    """Least-recently-used map from spoken text to WAV bytes, bounded by total size."""

    def __init__(self, max_bytes: int) -> None:
        self._max_bytes = max_bytes
        self._entries: OrderedDict[str, bytes] = OrderedDict()
        self._size = 0
        self._lock = Lock()

    def get(self, text: str) -> bytes | None:
        """Return cached audio for the text and mark it recently used."""
        with self._lock:
            audio = self._entries.get(text)
            if audio is not None:
                self._entries.move_to_end(text)
            return audio

    def put(self, text: str, audio: bytes) -> None:
        """Store audio, evicting the least recently used entries to stay under budget."""
        if len(audio) > self._max_bytes:
            return
        with self._lock:
            previous = self._entries.pop(text, None)
            if previous is not None:
                self._size -= len(previous)
            self._entries[text] = audio
            self._size += len(audio)
            while self._size > self._max_bytes:
                _, evicted = self._entries.popitem(last=False)
                self._size -= len(evicted)
