"""Tests for building LearnerNeeds from the Global Findex data."""

import shutil
from pathlib import Path

import pytest

from app.schemas.findex import FindexIndicator
from app.schemas.shared import (
    AgeGroup,
    Country,
    LearnerProfile,
    LifeStage,
    NeedKind,
    Topic,
)
from app.services.needs import (
    FINDEX_DIR,
    build_learner_needs,
    findex_gaps,
    load_findex,
    need_gap,
)

FINDEX = load_findex()


def indicator(kind: NeedKind, higher_is_better: bool) -> FindexIndicator:
    """A minimal indicator for gap tests."""
    return FindexIndicator(
        indicator_id="test",
        topic=Topic.SAVING,
        kind=kind,
        label="did something",
        higher_is_better=higher_is_better,
        survey_year=2024,
        rates={AgeGroup.ALL_ADULTS: 0.5},
        benchmark_rate=0.5,
    )


def profile_in(
    profile: LearnerProfile, country: Country, life_stage: LifeStage
) -> LearnerProfile:
    """Copy the sample profile into another country and life stage."""
    return profile.model_copy(update={"country": country, "life_stage": life_stage})


@pytest.mark.parametrize(
    ("group_rate", "benchmark_rate", "expected"),
    [(0.2, 0.5, 0.6), (0.5, 0.5, 0.0), (0.9, 0.5, 0.0), (0.0, 0.5, 1.0)],
)
def test_gap_for_higher_is_better_is_shortfall_share(
    group_rate: float, benchmark_rate: float, expected: float
) -> None:
    gap = need_gap(group_rate, benchmark_rate, indicator(NeedKind.LACKING, True))

    assert gap == pytest.approx(expected)


@pytest.mark.parametrize(
    ("group_rate", "benchmark_rate", "expected"),
    [(0.6, 0.2, 0.5), (0.2, 0.2, 0.0), (0.1, 0.2, 0.0), (1.0, 0.2, 1.0)],
)
def test_gap_for_lower_is_better_is_excess_share(
    group_rate: float, benchmark_rate: float, expected: float
) -> None:
    gap = need_gap(group_rate, benchmark_rate, indicator(NeedKind.STRUGGLE, False))

    assert gap == pytest.approx(expected)


def test_gap_for_exposure_is_share_exposed() -> None:
    gap = need_gap(0.56, 0.68, indicator(NeedKind.EXPOSURE, True))

    assert gap == pytest.approx(0.56)


def test_gap_without_benchmark_is_zero() -> None:
    assert need_gap(0.3, None, indicator(NeedKind.LACKING, True)) == 0.0


@pytest.mark.parametrize(
    ("life_stage", "age_group"),
    [
        (LifeStage.STUDENT, AgeGroup.YOUNG),
        (LifeStage.FIRST_JOB, AgeGroup.YOUNG),
        (LifeStage.PARENT, AgeGroup.OLDER),
        (LifeStage.RETIRED, AgeGroup.OLDER),
    ],
)
def test_life_stage_picks_findex_age_group(
    learner_profile: LearnerProfile, life_stage: LifeStage, age_group: AgeGroup
) -> None:
    profile = profile_in(learner_profile, Country.KE, life_stage)

    needs = build_learner_needs(profile, FINDEX[Country.KE])

    assert needs.age_group == age_group


@pytest.mark.parametrize("country", list(Country))
@pytest.mark.parametrize("life_stage", list(LifeStage))
def test_every_learner_gets_needs_for_every_topic(
    learner_profile: LearnerProfile, country: Country, life_stage: LifeStage
) -> None:
    profile = profile_in(learner_profile, country, life_stage)

    needs = build_learner_needs(profile, FINDEX[country])

    assert set(needs.topic_needs) == set(Topic)
    assert sorted(needs.priorities) == sorted(Topic)
    for need in needs.topic_needs.values():
        gaps = [signal.gap for signal in need.signals]
        assert gaps == sorted(gaps, reverse=True)


def test_kenyan_students_most_lack_bank_saving(learner_profile: LearnerProfile) -> None:
    needs = build_learner_needs(learner_profile, FINDEX[Country.KE])

    headline = needs.topic_needs[Topic.SAVING].signals[0]
    assert headline.indicator_id == "fin17a"
    assert headline.group_rate == pytest.approx(0.2031)
    assert headline.age_group == AgeGroup.YOUNG


def test_uses_all_adults_when_findex_has_no_age_split(
    learner_profile: LearnerProfile,
) -> None:
    needs = build_learner_needs(learner_profile, FINDEX[Country.KE])

    emergency_savings = next(
        signal
        for signal in needs.topic_needs[Topic.BUDGET].signals
        if signal.indicator_id == "fin24sav"
    )
    assert emergency_savings.age_group == AgeGroup.ALL_ADULTS


def test_priorities_follow_findex_gap(learner_profile: LearnerProfile) -> None:
    profile = profile_in(learner_profile, Country.MX, LifeStage.PARENT)
    needs = build_learner_needs(profile, FINDEX[Country.MX])
    gaps = [needs.topic_needs[topic].findex_gap for topic in needs.priorities]

    assert gaps == sorted(gaps, reverse=True)
    assert findex_gaps(needs)[needs.priorities[0]] == gaps[0]


def test_struggles_lacking_and_could_use_group_signals_by_kind(
    learner_profile: LearnerProfile,
) -> None:
    needs = build_learner_needs(learner_profile, FINDEX[Country.KE])

    assert needs.struggles and needs.lacking and needs.could_use
    assert all(signal.kind == NeedKind.STRUGGLE for signal in needs.struggles)
    assert all(signal.kind == NeedKind.LACKING for signal in needs.lacking)
    assert all(signal.kind == NeedKind.COULD_USE for signal in needs.could_use)
    assert all(signal.gap > 0 for signal in needs.lacking)
    dumped = needs.model_dump(mode="json")
    assert {"struggles", "lacking", "could_use"} <= dumped.keys()


def test_rejects_findex_data_for_another_country(
    learner_profile: LearnerProfile,
) -> None:
    with pytest.raises(ValueError, match="US"):
        build_learner_needs(learner_profile, FINDEX[Country.US])


def test_load_rejects_missing_country_file(tmp_path: Path) -> None:
    shutil.copy(FINDEX_DIR / "KE.json", tmp_path)

    with pytest.raises(ValueError, match="cannot load Findex data"):
        load_findex(tmp_path)
