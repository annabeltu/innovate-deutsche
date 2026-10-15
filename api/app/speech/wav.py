"""Pure WAV helpers. No I/O."""

import struct

WAV_MAGIC = b"RIFF"
GEMINI_SAMPLE_RATE = 24_000
GEMINI_CHANNELS = 1
GEMINI_SAMPLE_WIDTH_BYTES = 2
_HEADER_FORMAT = "<4sI4s4sIHHIIHH4sI"
_PCM_FORMAT_TAG = 1
_FMT_CHUNK_SIZE = 16
_RIFF_OVERHEAD = 36


def is_wav(audio: bytes) -> bool:
    """True when the bytes already start with a RIFF/WAVE header."""
    return audio[:4] == WAV_MAGIC and audio[8:12] == b"WAVE"


def pcm_to_wav(
    pcm: bytes,
    sample_rate: int = GEMINI_SAMPLE_RATE,
    channels: int = GEMINI_CHANNELS,
    sample_width: int = GEMINI_SAMPLE_WIDTH_BYTES,
) -> bytes:
    """Wrap raw little-endian PCM in a WAV header so any player can open it."""
    byte_rate = sample_rate * channels * sample_width
    header = struct.pack(
        _HEADER_FORMAT,
        WAV_MAGIC,
        _RIFF_OVERHEAD + len(pcm),
        b"WAVE",
        b"fmt ",
        _FMT_CHUNK_SIZE,
        _PCM_FORMAT_TAG,
        channels,
        sample_rate,
        byte_rate,
        channels * sample_width,
        sample_width * 8,
        b"data",
        len(pcm),
    )
    return header + pcm


def ensure_wav(audio: bytes) -> bytes:
    """Return WAV bytes whether the provider sent a WAV file or bare 24 kHz PCM."""
    return audio if is_wav(audio) else pcm_to_wav(audio)
