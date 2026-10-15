import random
import re

import pytest

from app.schemas.shared import Country, Difficulty, Topic
from app.services.question_bank import (
    QUESTIONS_PER_TOPIC,
    QuestionBank,
    difficulty_for_confidence,
    render_quiz,
    select_questions,
)

UNFILLED_PLACEHOLDER = re.compile(r"\{\w+\}")
COUNTRY_LANGUAGE_PAIRS = [
    ("US", "en"),
    ("US", "es"),
    ("MX", "es"),
    ("MX", "en"),
    ("KE", "en"),
    ("KE", "sw"),
]


@pytest.mark.parametrize(
    ("confidence", "expected"),
    [
        (0.0, Difficulty.EASY),
        (0.39, Difficulty.EASY),
        (0.4, Difficulty.MEDIUM),
        (0.69, Difficulty.MEDIUM),
        (0.7, Difficulty.HARD),
        (1.0, Difficulty.HARD),
    ],
)
def test_difficulty_follows_confidence_slider(
    confidence: float, expected: Difficulty
) -> None:
    assert difficulty_for_confidence(confidence) == expected


def test_bank_offers_expected_languages_per_country(bank: QuestionBank) -> None:
    offered = {
        (country, language)
        for country in Country
        for language in bank.languages_for(country)
    }

    assert offered == set(COUNTRY_LANGUAGE_PAIRS)


def test_select_questions_picks_two_per_topic_at_slider_difficulty(
    bank: QuestionBank, rng: random.Random
) -> None:
    confidence = {
        Topic.ACCOUNTS: 0.1,
        Topic.SAVING: 0.5,
        Topic.BORROWING: 0.9,
        Topic.SCAMS: 0.2,
        Topic.BUDGET: 0.8,
    }

    questions = select_questions(bank, confidence, rng)

    assert len(questions) == QUESTIONS_PER_TOPIC * len(Topic)
    for topic in Topic:
        picked = [question for question in questions if question.topic == topic]
        assert len(picked) == QUESTIONS_PER_TOPIC
        assert len({question.id for question in picked}) == QUESTIONS_PER_TOPIC
        assert all(
            question.difficulty == difficulty_for_confidence(confidence[topic])
            for question in picked
        )


def test_select_questions_is_deterministic_for_a_seed(bank: QuestionBank) -> None:
    confidence = dict.fromkeys(Topic, 0.5)

    first = select_questions(bank, confidence, random.Random(7))
    second = select_questions(bank, confidence, random.Random(7))

    assert [question.id for question in first] == [question.id for question in second]


@pytest.mark.parametrize(("country", "language"), COUNTRY_LANGUAGE_PAIRS)
def test_every_question_renders_fully_in_every_offered_language(
    bank: QuestionBank, country: str, language: str
) -> None:
    quiz, answer_key = render_quiz(
        bank, bank.questions, "qz_test", Country(country), language
    )

    assert quiz.language == language
    assert set(answer_key) == {question.question_id for question in quiz.questions}
    for question in quiz.questions:
        texts = [
            question.prompt,
            question.voice.speak_text,
            *(option.text for option in question.options),
        ]
        assert not any(UNFILLED_PLACEHOLDER.search(text) for text in texts)
        assert [option.option_id for option in question.options] == ["a", "b", "c"]


@pytest.mark.parametrize(("country", "language"), COUNTRY_LANGUAGE_PAIRS)
def test_speak_text_reads_every_option_with_its_letter_and_never_says_tap(
    bank: QuestionBank, country: str, language: str
) -> None:
    quiz, _ = render_quiz(
        bank, bank.questions[:1], "qz_test", Country(country), language
    )
    question = quiz.questions[0]

    for option in question.options:
        assert f"{option.option_id.upper()}: {option.text}" in question.voice.speak_text
    assert not re.search(
        r"\b(tap|swipe|see)\b", question.voice.speak_text, re.IGNORECASE
    )


def test_country_details_are_filled_for_the_learners_country(
    bank: QuestionBank,
) -> None:
    mobile_money_question = next(
        question for question in bank.questions if question.id == "accounts_2b"
    )

    quiz, _ = render_quiz(bank, [mobile_money_question], "qz_test", Country.KE, "en")

    assert quiz.questions[0].options[0].text == "M-Pesa"


def test_answer_key_is_not_in_the_app_facing_quiz(bank: QuestionBank) -> None:
    quiz, _ = render_quiz(bank, bank.questions[:2], "qz_test", Country.US, "en")

    dumped = quiz.model_dump_json()

    assert "correct" not in dumped
