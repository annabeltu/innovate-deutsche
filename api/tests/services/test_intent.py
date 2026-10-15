import pytest

from app.schemas.shared import Language
from app.schemas.voice import VoiceIntent
from app.services import intent_vocabulary
from app.services.intent import normalize, recognize_intent

EN, ES, SW = Language.EN, Language.ES, Language.SW


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("¿Sí, ATRÁS!", "si atras"),
        ("Don't", "dont"),
        ("It’s a scam.", "its a scam"),
        ("  next   please ", "next please"),
        ("1,000", "1000"),
        ("2.500", "2500"),
        ("Añadir", "anadir"),
    ],
)
def test_normalize_strips_case_accents_and_punctuation(
    text: str, expected: str
) -> None:
    assert normalize(text) == expected


@pytest.mark.parametrize(
    ("language", "text", "expected"),
    [
        (EN, "yes", VoiceIntent.YES),
        (EN, "Yeah!", VoiceIntent.YES),
        (EN, "okay", VoiceIntent.YES),
        (EN, "no", VoiceIntent.NO),
        (EN, "not now", VoiceIntent.NO),
        (EN, "repeat", VoiceIntent.REPEAT),
        (EN, "say that again", VoiceIntent.REPEAT),
        (EN, "one more time", VoiceIntent.REPEAT),
        (EN, "next", VoiceIntent.NEXT),
        (EN, "next one", VoiceIntent.NEXT),
        (EN, "go on", VoiceIntent.NEXT),
        (EN, "back", VoiceIntent.BACK),
        (EN, "go back", VoiceIntent.BACK),
        (EN, "previous", VoiceIntent.BACK),
        (EN, "help", VoiceIntent.HELP),
        (EN, "What can I say?", VoiceIntent.HELP),
        (EN, "start", VoiceIntent.START),
        (EN, "let's go", VoiceIntent.START),
        (EN, "scam", VoiceIntent.SCAM),
        (EN, "legit", VoiceIntent.LEGITIMATE),
        (ES, "sí", VoiceIntent.YES),
        (ES, "Si", VoiceIntent.YES),
        (ES, "de acuerdo", VoiceIntent.YES),
        (ES, "no", VoiceIntent.NO),
        (ES, "repite", VoiceIntent.REPEAT),
        (ES, "otra vez", VoiceIntent.REPEAT),
        (ES, "siguiente", VoiceIntent.NEXT),
        (ES, "atrás", VoiceIntent.BACK),
        (ES, "anterior", VoiceIntent.BACK),
        (ES, "ayuda", VoiceIntent.HELP),
        (ES, "empezar", VoiceIntent.START),
        (ES, "vamos a empezar", VoiceIntent.START),
        (ES, "estafa", VoiceIntent.SCAM),
        (ES, "legítimo", VoiceIntent.LEGITIMATE),
        (SW, "ndiyo", VoiceIntent.YES),
        (SW, "sawa", VoiceIntent.YES),
        (SW, "hapana", VoiceIntent.NO),
        (SW, "rudia", VoiceIntent.REPEAT),
        (SW, "endelea", VoiceIntent.NEXT),
        (SW, "rudi nyuma", VoiceIntent.BACK),
        (SW, "msaada", VoiceIntent.HELP),
        (SW, "anza", VoiceIntent.START),
        (SW, "utapeli", VoiceIntent.SCAM),
        (SW, "halali", VoiceIntent.LEGITIMATE),
    ],
)
def test_recognizes_exact_commands_with_full_confidence(
    language: Language, text: str, expected: VoiceIntent
) -> None:
    result = recognize_intent(text, language)

    assert result.intent == expected
    assert result.confidence == 1.0


@pytest.mark.parametrize(
    ("language", "text", "expected"),
    [
        (EN, "next question please", VoiceIntent.NEXT),
        (EN, "yes please", VoiceIntent.YES),
        (EN, "Kiko, help", VoiceIntent.HELP),
        (ES, "siguiente, por favor", VoiceIntent.NEXT),
        (ES, "creo que sí", VoiceIntent.YES),
        (SW, "endelea tafadhali", VoiceIntent.NEXT),
    ],
)
def test_ignores_filler_words_with_lower_confidence(
    language: Language, text: str, expected: VoiceIntent
) -> None:
    result = recognize_intent(text, language)

    assert result.intent == expected
    assert result.confidence == 0.9


def test_swahili_back_and_repeat_are_not_confused() -> None:
    assert recognize_intent("rudi", SW).intent == VoiceIntent.BACK
    assert recognize_intent("rudia", SW).intent == VoiceIntent.REPEAT


@pytest.mark.parametrize(
    ("language", "text", "option_id"),
    [
        (EN, "A", "a"),
        (EN, "b.", "b"),
        (EN, "option C", "c"),
        (EN, "I think D", "d"),
        (EN, "the answer is bee", "b"),
        (EN, "letter see", "c"),
        (ES, "opción a", "a"),
        (ES, "la be", "b"),
        (ES, "respuesta c", "c"),
        (ES, "letra de", "d"),
        (SW, "chaguo a", "a"),
        (SW, "jibu b", "b"),
        (SW, "herufi c", "c"),
        (SW, "d", "d"),
    ],
)
def test_recognizes_option_letters(
    language: Language, text: str, option_id: str
) -> None:
    result = recognize_intent(text, language)

    assert result.intent == VoiceIntent.OPTION
    assert result.option_id == option_id
    assert result.number is None


@pytest.mark.parametrize(
    ("language", "text", "number"),
    [
        (EN, "three", 3),
        (EN, "number 7", 7),
        (EN, "zero", 0),
        (EN, "1,000", 1000),
        (ES, "dos", 2),
        (ES, "número diez", 10),
        (SW, "tatu", 3),
        (SW, "namba tano", 5),
        (SW, "500", 500),
    ],
)
def test_recognizes_spoken_and_digit_numbers(
    language: Language, text: str, number: int
) -> None:
    result = recognize_intent(text, language)

    assert result.intent == VoiceIntent.NUMBER
    assert result.number == number
    assert result.option_id is None


@pytest.mark.parametrize(
    ("language", "text", "expected"),
    [
        (EN, "it's a scam", VoiceIntent.SCAM),
        (EN, "that is a scam", VoiceIntent.SCAM),
        (EN, "not a scam", VoiceIntent.LEGITIMATE),
        (EN, "it's not fake", VoiceIntent.LEGITIMATE),
        (ES, "es una estafa", VoiceIntent.SCAM),
        (ES, "sí es estafa", VoiceIntent.SCAM),
        (ES, "no es una estafa", VoiceIntent.LEGITIMATE),
        (SW, "ni utapeli", VoiceIntent.SCAM),
        (SW, "si utapeli", VoiceIntent.LEGITIMATE),
    ],
)
def test_negated_scam_means_legitimate(
    language: Language, text: str, expected: VoiceIntent
) -> None:
    assert recognize_intent(text, language).intent == expected


@pytest.mark.parametrize(
    ("language", "text"),
    [
        (EN, "What is a loan?"),
        (EN, "How do I save money for school?"),
        (EN, "I want a loan"),
        (EN, "is there a way to go back to school cheaply"),
        (EN, "what is next month's budget"),
        (ES, "¿Qué es un préstamo?"),
        (ES, "¿Cómo ahorro para una emergencia?"),
        (SW, "Mkopo ni nini?"),
        (SW, "Ninawezaje kuweka akiba?"),
    ],
)
def test_open_questions_are_unknown(language: Language, text: str) -> None:
    result = recognize_intent(text, language)

    assert result.intent == VoiceIntent.UNKNOWN
    assert result.confidence == 0.0


@pytest.mark.parametrize(
    ("language", "text"),
    [
        (EN, "yes no"),
        (EN, "next back"),
        (EN, "a or b"),
        (EN, "b c"),
        (EN, "two three"),
        (ES, "sí no"),
        (SW, "ndiyo hapana"),
    ],
)
def test_conflicting_commands_are_unknown(language: Language, text: str) -> None:
    assert recognize_intent(text, language).intent == VoiceIntent.UNKNOWN


@pytest.mark.parametrize(
    ("language", "text"),
    [
        (EN, "nextdoor"),
        (EN, "yesterday"),
        (EN, "backpack"),
        (EN, "helpful"),
        (ES, "nosotros"),
        (SW, "rudishwa"),
    ],
)
def test_commands_inside_other_words_do_not_match(
    language: Language, text: str
) -> None:
    assert recognize_intent(text, language).intent == VoiceIntent.UNKNOWN


@pytest.mark.parametrize("text", ["", "   ", "?!", "please", "option", "um uh"])
def test_empty_or_filler_only_input_is_unknown(text: str) -> None:
    assert recognize_intent(text, EN).intent == VoiceIntent.UNKNOWN


def test_words_from_another_language_are_not_commands() -> None:
    assert recognize_intent("hapana", EN).intent == VoiceIntent.UNKNOWN
    assert recognize_intent("siguiente", SW).intent == VoiceIntent.UNKNOWN


def test_long_utterance_is_unknown_even_if_made_of_commands() -> None:
    assert recognize_intent("yes " * 9, EN).intent == VoiceIntent.UNKNOWN


def test_repeated_same_command_still_matches() -> None:
    assert recognize_intent("yes yes", EN).intent == VoiceIntent.YES


def test_decimal_numbers_are_unknown() -> None:
    assert recognize_intent("2.5", EN).intent == VoiceIntent.UNKNOWN


def test_reports_the_normalized_text() -> None:
    assert recognize_intent("¡Sí!", ES).normalized_text == "si"


@pytest.mark.parametrize("language", list(Language))
def test_every_language_has_every_command_intent(language: Language) -> None:
    expected = set(VoiceIntent) - {
        VoiceIntent.OPTION,
        VoiceIntent.NUMBER,
        VoiceIntent.UNKNOWN,
    }

    assert set(intent_vocabulary.PHRASES[language]) == expected
    assert set(intent_vocabulary.LETTER_NAMES[language]) == {"a", "b", "c", "d"}
    assert len(intent_vocabulary.NUMBER_WORDS[language].split(",")) == 11
