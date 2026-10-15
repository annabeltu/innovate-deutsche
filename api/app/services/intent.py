"""Deterministic voice-intent matching. Owner: voice teammate (@voice-placeholder).

No LLM: a transcript is normalized, split into words and scanned for whole phrases from
services/intent_vocabulary.py, longest first. The utterance is a command only if every
word is part of a phrase or is a filler and all phrases agree on one meaning; otherwise
it is `unknown` and the app re-asks (or, on the Ask Kiko screen, treats it as a question).
"""

import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache

from app.schemas.shared import Language
from app.schemas.voice import IntentResponse, VoiceIntent
from app.services import intent_vocabulary as vocabulary

# Commands are short. Anything longer is a question or a sentence, never a command.
MAX_COMMAND_WORDS = 8
EXACT_CONFIDENCE = 1.0
FILLER_CONFIDENCE = 0.9
MAX_NUMBER_DIGITS = 9

_APOSTROPHES = re.compile(r"['’`´]")
_THOUSANDS_SEPARATOR = re.compile(r"(?<=\d)[.,](?=\d{3}(?!\d))")
_NOT_ALPHANUMERIC = re.compile(r"[^a-z0-9]+")
_DIGITS = re.compile(rf"\d{{1,{MAX_NUMBER_DIGITS}}}")


@dataclass(frozen=True)
class Command:
    """One meaning a phrase can carry; equal commands from several phrases agree."""

    intent: VoiceIntent
    option_id: str | None = None
    number: int | None = None


# A phrase maps to a Command, or to None when it is a filler word.
Lexicon = dict[tuple[str, ...], Command | None]


def normalize(text: str) -> str:
    """Lowercase, strip accents and punctuation, and collapse spaces.

    "¿Sí, ATRÁS!" becomes "si atras"; "don't" becomes "dont"; "1,000" becomes "1000".
    """
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    without_accents = "".join(
        char for char in decomposed if not unicodedata.combining(char)
    )
    joined = _APOSTROPHES.sub("", without_accents)
    joined = _THOUSANDS_SEPARATOR.sub("", joined)
    return _NOT_ALPHANUMERIC.sub(" ", joined).strip()


def recognize_intent(text: str, language: Language) -> IntentResponse:
    """Map a short spoken reply to an intent, or `unknown` if it is not clearly a command."""
    normalized = normalize(text)
    words = tuple(normalized.split())
    unknown = IntentResponse(
        intent=VoiceIntent.UNKNOWN, confidence=0.0, normalized_text=normalized
    )
    if not words or len(words) > MAX_COMMAND_WORDS:
        return unknown

    matched = _scan(words, _lexicon(language))
    if matched is None:
        return unknown
    commands, filler_count = matched
    if len(set(commands)) != 1:
        return unknown

    command = commands[0]
    exact = filler_count == 0 and len(commands) == 1
    return IntentResponse(
        intent=command.intent,
        option_id=command.option_id,
        number=command.number,
        confidence=EXACT_CONFIDENCE if exact else FILLER_CONFIDENCE,
        normalized_text=normalized,
    )


def _scan(words: tuple[str, ...], lexicon: Lexicon) -> tuple[list[Command], int] | None:
    """Cover every word with the longest phrase starting there; None if a word is unknown."""
    longest_phrase = max(len(phrase) for phrase in lexicon)
    commands: list[Command] = []
    filler_count = 0
    position = 0
    while position < len(words):
        for length in range(min(longest_phrase, len(words) - position), 0, -1):
            phrase = words[position : position + length]
            if phrase in lexicon:
                break
        else:
            if not _DIGITS.fullmatch(words[position]):
                return None
            commands.append(Command(VoiceIntent.NUMBER, number=int(words[position])))
            position += 1
            continue

        command = lexicon[phrase]
        if command is None:
            filler_count += 1
        else:
            commands.append(command)
        position += length
    return commands, filler_count


@lru_cache
def _lexicon(language: Language) -> Lexicon:
    """Build the normalized phrase table for one language, once.

    Raises:
        ValueError: If one phrase is listed under two meanings in the vocabulary.
    """
    entries: list[tuple[tuple[str, ...], Command | None]] = []
    entries += [(filler, None) for filler in _synonyms(vocabulary.FILLERS[language])]
    for intent, phrases in vocabulary.PHRASES[language].items():
        entries += [(phrase, Command(intent)) for phrase in _synonyms(phrases)]
    for option_id, names in vocabulary.LETTER_NAMES[language].items():
        option = Command(VoiceIntent.OPTION, option_id=option_id)
        entries += [(name, option) for name in _synonyms(names)]
    for value, word in enumerate(_synonyms(vocabulary.NUMBER_WORDS[language])):
        entries.append((word, Command(VoiceIntent.NUMBER, number=value)))

    lexicon: Lexicon = {}
    for phrase, command in entries:
        if phrase in lexicon and lexicon[phrase] != command:
            raise ValueError(f"'{' '.join(phrase)}' has two meanings in {language}")
        lexicon[phrase] = command
    return lexicon


def _synonyms(entry: str) -> list[tuple[str, ...]]:
    """Split a comma-separated vocabulary entry into normalized word tuples."""
    return [tuple(normalize(phrase).split()) for phrase in entry.split(",")]
