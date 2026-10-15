"""Tests for the five stored base lessons and their loader."""

import itertools
import json
import re
import shutil
from pathlib import Path

import pytest

from app.config import Settings
from app.schemas.lesson_template import CardTemplate, LessonTemplate
from app.schemas.shared import (
    AnswerMode,
    Country,
    Goal,
    LearnerNeeds,
    LearnerProfile,
    LifeStage,
    Topic,
)
from app.services.lesson_builder import country_facts_for, customize_lesson
from app.services.lesson_templates import LESSON_TEMPLATES_DIR, load_lesson_templates
from app.services.question_bank import load_question_bank

FORBIDDEN_VOICE_WORDS = {"tap", "swipe", "see"}
PROFICIENCY_PER_DIFFICULTY = (0.1, 0.5, 0.9)
TEMPLATES = load_lesson_templates()
QUESTION_BANK = load_question_bank(Settings().question_bank_dir)
ALL_CARDS = [
    pytest.param(card, id=f"{template.topic}/{card.card_id}")
    for template in TEMPLATES.values()
    for card in template.cards
]


def test_every_topic_has_one_base_lesson() -> None:
    assert set(TEMPLATES) == set(Topic)


@pytest.mark.parametrize("template", TEMPLATES.values(), ids=lambda t: t.topic)
def test_card_ids_are_unique_in_each_lesson(template: LessonTemplate) -> None:
    card_ids = [card.card_id for card in template.cards]

    assert len(card_ids) == len(set(card_ids))


@pytest.mark.parametrize("card", ALL_CARDS)
def test_voice_text_never_uses_visual_words(card: CardTemplate) -> None:
    spoken_words = set(re.findall(r"[a-z]+", card.voice.speak_text.lower()))

    assert not FORBIDDEN_VOICE_WORDS & spoken_words


@pytest.mark.parametrize(
    "card",
    [param for param in ALL_CARDS if param.values[0].options],
)
def test_quiz_cards_read_every_option_with_its_letter(card: CardTemplate) -> None:
    assert card.voice.answer_mode == AnswerMode.SAY_OPTION
    assert card.correct_option in card.options
    assert card.voice.spoken_options.keys() == card.options.keys()
    for letter, spoken_option in card.voice.spoken_options.items():
        assert f"{letter.upper()}: {spoken_option}" in card.voice.speak_text
    assert card.voice.correct_feedback and card.voice.incorrect_feedback


@pytest.mark.parametrize(
    ("topic", "life_stage", "goal", "proficiency"),
    list(itertools.product(Topic, LifeStage, Goal, PROFICIENCY_PER_DIFFICULTY)),
)
@pytest.mark.parametrize("country", list(Country))
def test_every_learner_gets_a_complete_lesson(
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
    country: Country,
    topic: Topic,
    life_stage: LifeStage,
    goal: Goal,
    proficiency: float,
) -> None:
    scores = dict(learner_profile.topic_scores)
    scores[topic] = scores[topic].model_copy(update={"proficiency": proficiency})
    profile = learner_profile.model_copy(
        update={"life_stage": life_stage, "goal": goal, "topic_scores": scores}
    )

    lesson = customize_lesson(
        TEMPLATES[topic],
        profile,
        learner_needs,
        country_facts_for(QUESTION_BANK, country),
    )

    card_types = [card.type for card in lesson.cards]
    assert card_types[-1] == "takeaway"
    assert any(card.options for card in lesson.cards), "lesson has no quiz"
    assert all("{" not in card.voice.speak_text for card in lesson.cards)


def test_load_rejects_missing_topic(tmp_path: Path) -> None:
    for path in LESSON_TEMPLATES_DIR.glob("*.json"):
        if path.stem != "budget":
            shutil.copy(path, tmp_path)

    with pytest.raises(ValueError, match="budget"):
        load_lesson_templates(tmp_path)


def test_load_rejects_two_lessons_for_one_topic(tmp_path: Path) -> None:
    for path in LESSON_TEMPLATES_DIR.glob("*.json"):
        shutil.copy(path, tmp_path)
    shutil.copy(LESSON_TEMPLATES_DIR / "saving.json", tmp_path / "saving_copy.json")

    with pytest.raises(ValueError, match="second lesson"):
        load_lesson_templates(tmp_path)


def test_load_names_the_broken_file(tmp_path: Path) -> None:
    for path in LESSON_TEMPLATES_DIR.glob("*.json"):
        shutil.copy(path, tmp_path)
    broken = json.loads((tmp_path / "scams.json").read_text())
    del broken["cards"][0]["voice"]
    (tmp_path / "scams.json").write_text(json.dumps(broken))

    with pytest.raises(ValueError, match="scams.json"):
        load_lesson_templates(tmp_path)


def test_load_rejects_lesson_id_that_is_not_its_topic(tmp_path: Path) -> None:
    for path in LESSON_TEMPLATES_DIR.glob("*.json"):
        shutil.copy(path, tmp_path)
    renamed = json.loads((tmp_path / "saving.json").read_text())
    renamed["lesson_id"] = "safe-saving"
    (tmp_path / "saving.json").write_text(json.dumps(renamed))

    with pytest.raises(ValueError, match="must be its topic"):
        load_lesson_templates(tmp_path)


def test_core_lesson_ids_are_their_topics() -> None:
    assert all(template.lesson_id == topic for topic, template in TEMPLATES.items())
