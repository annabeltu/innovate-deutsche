"""Tests for customizing a base lesson to one learner."""

import pytest

from app.config import Settings
from app.schemas.lesson_template import LessonTemplate
from app.schemas.shared import (
    Country,
    Goal,
    LearnerNeeds,
    LearnerProfile,
    LifeStage,
    Topic,
)
from app.services.lesson_builder import country_facts_for, customize_lesson
from app.services.question_bank import load_question_bank

FORBIDDEN_VOICE_WORDS = ("tap", "swipe", "see")
QUESTION_BANK = load_question_bank(Settings().question_bank_dir)
KENYA_FACTS = country_facts_for(QUESTION_BANK, Country.KE)


def card_ids(
    template: LessonTemplate, profile: LearnerProfile, needs: LearnerNeeds
) -> list[str]:
    """Customize the lesson and return the ids of the cards served."""
    return [
        card.card_id
        for card in customize_lesson(template, profile, needs, KENYA_FACTS).cards
    ]


def with_proficiency(profile: LearnerProfile, proficiency: float) -> LearnerProfile:
    """Copy the profile with a different saving proficiency."""
    scores = dict(profile.topic_scores)
    scores[Topic.SAVING] = scores[Topic.SAVING].model_copy(
        update={"proficiency": proficiency}
    )
    return profile.model_copy(update={"topic_scores": scores})


def test_customize_lesson_serves_cards_for_sample_student(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    lesson = customize_lesson(
        saving_template, learner_profile, learner_needs, KENYA_FACTS
    )

    assert lesson.lesson_id == "saving"
    assert lesson.difficulty == 2
    assert [card.card_id for card in lesson.cards] == [
        "where-money-lives",
        "people-like-you",
        "student-start-small",
        "protected-quiz",
        "interest-quiz",
        "takeaway",
    ]


def test_customize_lesson_fills_findex_facts_in_text_and_voice(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    lesson = customize_lesson(
        saving_template, learner_profile, learner_needs, KENYA_FACTS
    )
    bridge = next(card for card in lesson.cards if card.card_id == "people-like-you")

    # Kenyan 15-24 year olds: 20% saved at a bank vs 54% (Findex 2025).
    assert bridge.text == (
        "In your country, 20% of people your age saved at a bank in the past year. "
        "In upper-middle-income countries, it is 54%."
    )
    assert "20 percent" in bridge.voice.speak_text
    assert "54 percent" in bridge.voice.speak_text
    assert all("{" not in card.text for card in lesson.cards)


def test_customize_lesson_drops_harder_cards_for_beginners(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    beginner = with_proficiency(learner_profile, 0.1)

    lesson = customize_lesson(saving_template, beginner, learner_needs, KENYA_FACTS)

    assert lesson.difficulty == 1
    assert "interest-quiz" not in [card.card_id for card in lesson.cards]


@pytest.mark.parametrize(
    ("life_stage", "expected_card", "excluded_card"),
    [
        (LifeStage.STUDENT, "student-start-small", "parent-family-fund"),
        (LifeStage.FIRST_JOB, "student-start-small", "parent-family-fund"),
        (LifeStage.PARENT, "parent-family-fund", "student-start-small"),
    ],
)
def test_customize_lesson_picks_cards_for_life_stage(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
    life_stage: LifeStage,
    expected_card: str,
    excluded_card: str,
) -> None:
    profile = learner_profile.model_copy(update={"life_stage": life_stage})

    served = card_ids(saving_template, profile, learner_needs)

    assert expected_card in served
    assert excluded_card not in served


def test_customize_lesson_adds_goal_cards_only_for_that_goal(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    emergency_saver = learner_profile.model_copy(
        update={"goal": Goal.HANDLE_EMERGENCIES}
    )

    assert "emergency-fund" in card_ids(saving_template, emergency_saver, learner_needs)
    assert "emergency-fund" not in card_ids(
        saving_template, learner_profile, learner_needs
    )


def test_customize_lesson_does_not_change_the_base_lesson(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    before = saving_template.model_copy(deep=True)

    customize_lesson(saving_template, learner_profile, learner_needs, KENYA_FACTS)

    assert saving_template == before


def test_customize_lesson_keeps_voice_text_free_of_visual_words(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    lesson = customize_lesson(
        saving_template, learner_profile, learner_needs, KENYA_FACTS
    )

    for card in lesson.cards:
        spoken_words = card.voice.speak_text.lower().replace(".", " ").split()
        assert not set(FORBIDDEN_VOICE_WORDS) & set(spoken_words), card.card_id


def test_customize_lesson_rejects_needs_for_another_learner(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    other_needs = learner_needs.model_copy(update={"user_id": "u_someone_else"})

    with pytest.raises(ValueError, match="u_someone_else"):
        customize_lesson(saving_template, learner_profile, other_needs, KENYA_FACTS)


def test_customize_lesson_rejects_unknown_placeholder(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    broken_card = saving_template.cards[0].model_copy(
        update={"text": "You have {balance} saved."}
    )
    broken = saving_template.model_copy(update={"cards": [broken_card]})

    with pytest.raises(ValueError, match="balance"):
        customize_lesson(broken, learner_profile, learner_needs, KENYA_FACTS)


def test_customize_lesson_rejects_lesson_with_no_fitting_cards(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    parent_only = [
        card for card in saving_template.cards if card.card_id == "parent-family-fund"
    ]
    template = saving_template.model_copy(update={"cards": parent_only})

    with pytest.raises(ValueError, match="no cards"):
        customize_lesson(template, learner_profile, learner_needs, KENYA_FACTS)


@pytest.mark.parametrize(
    ("country", "mobile_money"),
    [
        (Country.KE, "M-Pesa"),
        (Country.US, "a payment app like Zelle or Venmo"),
        (Country.MX, "an SPEI or CoDi transfer"),
    ],
)
def test_customize_lesson_fills_local_country_facts(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
    country: Country,
    mobile_money: str,
) -> None:
    local_card = saving_template.cards[0].model_copy(
        update={"text": "Send money with {mobile_money}. Save {cur}100."}
    )
    template = saving_template.model_copy(update={"cards": [local_card]})
    facts = country_facts_for(QUESTION_BANK, country)

    lesson = customize_lesson(template, learner_profile, learner_needs, facts)

    assert lesson.cards[0].text == (
        f"Send money with {mobile_money}. Save {facts['cur']}100."
    )


def test_country_facts_are_in_the_base_lesson_language() -> None:
    assert KENYA_FACTS["scam_report_agency"] == "the police"


def test_customize_lesson_rejects_fact_name_used_twice(
    saving_template: LessonTemplate,
    learner_profile: LearnerProfile,
    learner_needs: LearnerNeeds,
) -> None:
    clashing_facts = {**KENYA_FACTS, "group_percent": "99"}

    with pytest.raises(ValueError, match="group_percent"):
        customize_lesson(
            saving_template, learner_profile, learner_needs, clashing_facts
        )
