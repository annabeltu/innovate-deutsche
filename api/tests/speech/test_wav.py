import struct

from app.speech.wav import ensure_wav, is_wav, pcm_to_wav


def test_pcm_to_wav_writes_a_header_gemini_audio_can_be_played_with() -> None:
    pcm = b"\x01\x00" * 240

    wav = pcm_to_wav(pcm)

    assert is_wav(wav)
    assert len(wav) == 44 + len(pcm)
    channels, sample_rate = struct.unpack("<HI", wav[22:28])
    assert (channels, sample_rate) == (1, 24_000)
    assert wav[44:] == pcm


def test_ensure_wav_leaves_existing_wav_untouched() -> None:
    wav = pcm_to_wav(b"\x00\x00")

    assert ensure_wav(wav) == wav


def test_ensure_wav_wraps_bare_pcm() -> None:
    assert is_wav(ensure_wav(b"\x00\x00\x00\x00"))
