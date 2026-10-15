"""Builds LearnerNeeds from Global Findex data. Owner: Faraz (@faraz999shah).

load_findex() reads data/findex once at startup; build_learner_needs() is pure:
the learner's country picks the data, their life stage picks the age group,
and each indicator becomes a signal with a 0-1 gap against the benchmark.
"""

from pathlib import Path

from pydantic import ValidationError

from app.schemas.findex import FindexCountry, FindexIndicator
from app.schemas.shared import (
    AgeGroup,
    Country,
    LearnerNeeds,
    LearnerProfile,
    LifeStage,
    NeedKind,
    NeedSignal,
    Topic,
    TopicNeed,
)

FINDEX_DIR = Path(__file__).resolve().parents[3] / "data" / "findex"
GAP_DECIMALS = 4

AGE_GROUP_BY_LIFE_STAGE = {
    LifeStage.STUDENT: AgeGroup.YOUNG,
    LifeStage.FIRST_JOB: AgeGroup.YOUNG,
    LifeStage.PARENT: AgeGroup.OLDER,
    LifeStage.RETIRED: AgeGroup.OLDER,
}


def load_findex(directory: Path = FINDEX_DIR) -> dict[Country, FindexCountry]:
    """Load and validate the Findex file for every supported country.

    Raises:
        ValueError: If a country's file is missing or invalid, or every
            topic does not have at least one indicator.
    """
    findex = {}
    for country in Country:
        path = directory / f"{country}.json"
        try:
            data = FindexCountry.model_validate_json(path.read_text(encoding="utf-8"))
        except (OSError, ValidationError) as error:
            raise ValueError(f"cannot load Findex data {path.name}: {error}") from error
        missing = set(Topic) - {indicator.topic for indicator in data.indicators}
        if missing:
            raise ValueError(f"{path.name} has no indicators for {sorted(missing)}")
        findex[country] = data
    return findex


def build_learner_needs(profile: LearnerProfile, findex: FindexCountry) -> LearnerNeeds:
    """Work out what a learner likely needs from Findex data for people like them.

    Args:
        profile: The learner's profile from ProfileStore.get_profile().
        findex: Findex data for the learner's country.

    Returns:
        Needs per topic, biggest gaps first, plus topics in priority order.

    Raises:
        ValueError: If the Findex data is for a different country.
    """
    if findex.country != profile.country:
        raise ValueError(
            f"Findex data for {findex.country} cannot describe a learner in {profile.country}"
        )
    age_group = AGE_GROUP_BY_LIFE_STAGE[profile.life_stage]
    topic_needs = {
        topic: _topic_need(topic, findex.indicators, age_group) for topic in Topic
    }
    priorities = sorted(Topic, key=lambda topic: -topic_needs[topic].findex_gap)
    return LearnerNeeds(
        user_id=profile.user_id,
        country=profile.country,
        age_group=age_group,
        benchmark_name=findex.benchmark_name,
        source=findex.source,
        topic_needs=topic_needs,
        priorities=priorities,
    )


def findex_gaps(needs: LearnerNeeds) -> dict[Topic, float]:
    """Each topic's Findex gap, in the shape path scoring takes."""
    return {topic: need.findex_gap for topic, need in needs.topic_needs.items()}


def need_gap(
    group_rate: float, benchmark_rate: float | None, indicator: FindexIndicator
) -> float:
    """How far a rate is from the benchmark, 0 (at or past it) to 1.

    Exposure has no "good" level: the gap is the share exposed. Higher-is-
    better rates are measured as a share of the benchmark; lower-is-better
    rates as a share of the room above the benchmark.
    """
    if indicator.kind == NeedKind.EXPOSURE:
        return group_rate
    if benchmark_rate is None:
        return 0.0
    if indicator.higher_is_better:
        shortfall = (
            (benchmark_rate - group_rate) / benchmark_rate if benchmark_rate else 0.0
        )
    else:
        shortfall = (group_rate - benchmark_rate) / (1 - benchmark_rate)
    return round(min(max(shortfall, 0.0), 1.0), GAP_DECIMALS)


def _topic_need(
    topic: Topic, indicators: list[FindexIndicator], age_group: AgeGroup
) -> TopicNeed:
    """Turn one topic's indicators into signals and a mean gap."""
    signals = [
        _signal(indicator, age_group)
        for indicator in indicators
        if indicator.topic == topic
    ]
    if not signals:
        raise ValueError(f"no Findex indicators for topic {topic}")
    signals.sort(key=lambda signal: signal.gap, reverse=True)
    mean_gap = sum(signal.gap for signal in signals) / len(signals)
    return TopicNeed(
        topic=topic, findex_gap=round(mean_gap, GAP_DECIMALS), signals=signals
    )


def _signal(indicator: FindexIndicator, age_group: AgeGroup) -> NeedSignal:
    """One indicator for the learner's age group, or all adults if unpublished."""
    used_group = age_group if age_group in indicator.rates else AgeGroup.ALL_ADULTS
    group_rate = indicator.rates[used_group]
    return NeedSignal(
        indicator_id=indicator.indicator_id,
        label=indicator.label,
        kind=indicator.kind,
        group_rate=group_rate,
        age_group=used_group,
        benchmark_rate=indicator.benchmark_rate,
        gap=need_gap(group_rate, indicator.benchmark_rate, indicator),
        survey_year=indicator.survey_year,
    )
