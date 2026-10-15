"""Baseline quiz question bank: loading, selection and rendering. Owner: Will (@willapat).

Questions are pre-written in data/question_bank/ with human-checked answers.
Country details (currency, ID document, mobile money...) are placeholders filled
per country and language, so the quiz is local without any LLM call.
"""

import json
import random
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.schemas.shared import (
    Country,
    Difficulty,
    Language,
    QuestionVoice,
    Quiz,
    QuizOption,
    QuizQuestion,
    Topic,
)
from app.services.proficiency import difficulty_band

QUESTIONS_PER_TOPIC = 2
OPTION_IDS = ("a", "b", "c")

OptionId = Literal["a", "b", "c"]


class QuestionText(BaseModel):
    """One question in one language, before country placeholders are filled."""

    prompt: str
    options: list[str] = Field(min_length=len(OPTION_IDS), max_length=len(OPTION_IDS))


class BankQuestion(BaseModel):
    """A question with its answer key and every translation."""

    id: str
    topic: Topic
    difficulty: Difficulty
    correct: OptionId
    text: dict[Language, QuestionText]


class SpeechPhrases(BaseModel):
    """Templates for the spoken version of a question in one language."""

    intro: str
    option: str
    instruction: str


class CountryEntry(BaseModel):
    """Languages offered in a country and the placeholder values for each."""

    languages: list[Language] = Field(min_length=1)
    variables: dict[Language, dict[str, str]]


class AnswerKeyEntry(BaseModel):
    """What the server keeps for grading one served question."""

    topic: Topic
    correct_option_id: OptionId


class QuestionBank(BaseModel):
    """The whole bank, validated once at load so a bad edit fails at startup, not mid-demo."""

    questions: list[BankQuestion]
    speech: dict[Language, SpeechPhrases]
    countries: dict[Country, CountryEntry]

    @model_validator(mode="after")
    def check_complete(self) -> Self:
        """Every country/language pair must render every question, and every topic needs enough."""
        for topic in Topic:
            count = sum(1 for question in self.questions if question.topic == topic)
            if count < QUESTIONS_PER_TOPIC:
                raise ValueError(
                    f"topic {topic} has {count} questions, needs {QUESTIONS_PER_TOPIC}"
                )
        for country, entry in self.countries.items():
            for language in entry.languages:
                if language not in self.speech:
                    raise ValueError(f"no speech phrases for {language}")
                variables = entry.variables.get(language)
                if variables is None:
                    raise ValueError(f"no variables for {country}/{language}")
                for question in self.questions:
                    _check_question_renders(question, language, variables)
        return self

    def languages_for(self, country: Country) -> list[Language]:
        """Languages offered for a country, in preference order."""
        return self.countries[country].languages


def _check_question_renders(
    question: BankQuestion, language: Language, variables: dict[str, str]
) -> None:
    """Raise if a translation is missing or uses a placeholder the country does not define."""
    text = question.text.get(language)
    if text is None:
        raise ValueError(f"question {question.id} has no {language} text")
    try:
        for template in [text.prompt, *text.options]:
            template.format_map(variables)
    except KeyError as missing:
        raise ValueError(
            f"question {question.id} uses undefined placeholder {missing}"
        ) from None


@lru_cache
def load_question_bank(directory: Path) -> QuestionBank:
    """Read and validate questions.json and countries.json once per directory."""
    questions_file = json.loads(
        (directory / "questions.json").read_text(encoding="utf-8")
    )
    countries_file = json.loads(
        (directory / "countries.json").read_text(encoding="utf-8")
    )
    return QuestionBank.model_validate({**questions_file, "countries": countries_file})


def difficulty_for_confidence(confidence: float) -> Difficulty:
    """Map a slider value to question difficulty: below 0.4 → 1, below 0.7 → 2, else 3."""
    return difficulty_band(confidence)


def select_questions(
    bank: QuestionBank, confidence: dict[Topic, float], rng: random.Random
) -> list[BankQuestion]:
    """Pick QUESTIONS_PER_TOPIC questions per topic, closest to the slider's difficulty first.

    Questions at the exact difficulty are preferred; if there are too few, the
    nearest difficulty fills in. Topics come out in enum order.
    """
    selected: list[BankQuestion] = []
    for topic in Topic:
        target = difficulty_for_confidence(confidence[topic])
        candidates = [
            question for question in bank.questions if question.topic == topic
        ]
        rng.shuffle(candidates)
        candidates.sort(key=lambda question: abs(question.difficulty - target))
        selected.extend(candidates[:QUESTIONS_PER_TOPIC])
    return selected


@dataclass(frozen=True)
class _Locale:
    """Everything needed to render text for one country and language."""

    language: Language
    variables: dict[str, str]
    phrases: SpeechPhrases
    total: int


def _fill(template: str, variables: dict[str, str]) -> str:
    """Fill placeholders and capitalize the first letter, since values can start a sentence."""
    filled = template.format_map(variables)
    return filled[:1].upper() + filled[1:]


def _render_question(
    question: BankQuestion, question_id: str, number: int, locale: _Locale
) -> QuizQuestion:
    """Turn a bank question into the app-facing shape, including the spoken version."""
    text = question.text[locale.language]
    prompt = _fill(text.prompt, locale.variables)
    options = [
        QuizOption(option_id=option_id, text=_fill(option, locale.variables))
        for option_id, option in zip(OPTION_IDS, text.options, strict=True)
    ]
    spoken_parts = [
        locale.phrases.intro.format(number=number, total=locale.total),
        prompt,
        *(
            locale.phrases.option.format(letter=o.option_id.upper(), text=o.text)
            for o in options
        ),
        locale.phrases.instruction,
    ]
    return QuizQuestion(
        question_id=question_id,
        topic=question.topic,
        difficulty=question.difficulty,
        prompt=prompt,
        options=options,
        voice=QuestionVoice(speak_text=" ".join(spoken_parts)),
    )


def render_quiz(
    bank: QuestionBank,
    questions: list[BankQuestion],
    quiz_id: str,
    country: Country,
    language: Language,
) -> tuple[Quiz, dict[str, AnswerKeyEntry]]:
    """Render the selected questions for the learner and build the server-side answer key.

    Returns:
        The quiz to send to the app, and the answer key keyed by question_id.
    """
    locale = _Locale(
        language=language,
        variables=bank.countries[country].variables[language],
        phrases=bank.speech[language],
        total=len(questions),
    )
    rendered: list[QuizQuestion] = []
    answer_key: dict[str, AnswerKeyEntry] = {}
    for number, question in enumerate(questions, start=1):
        question_id = f"{quiz_id}_{number}"
        rendered.append(_render_question(question, question_id, number, locale))
        answer_key[question_id] = AnswerKeyEntry(
            topic=question.topic, correct_option_id=question.correct
        )
    return Quiz(quiz_id=quiz_id, language=language, questions=rendered), answer_key
