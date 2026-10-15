"""Tests for validating LearnerProfile JSON at the boundary."""

from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas.shared import Country, Language, LearnerProfile, Topic


def test_profile_json_validates_into_learner_profile(
    profile_json: dict[str, Any],
) -> None:
    profile = LearnerProfile.model_validate(profile_json)

    assert profile.country == Country.KENYA
    assert profile.topic_scores[Topic.BORROWING].proficiency == pytest.approx(0.08)


def test_profile_round_trips_to_the_same_json(profile_json: dict[str, Any]) -> None:
    profile = LearnerProfile.model_validate(profile_json)

    assert LearnerProfile.model_validate(profile.model_dump(mode="json")) == profile


def test_profile_rejects_missing_topic(profile_json: dict[str, Any]) -> None:
    del profile_json["topic_scores"]["budget"]

    with pytest.raises(ValidationError, match="missing topic scores"):
        LearnerProfile.model_validate(profile_json)


@pytest.mark.parametrize("country", list(Country))
@pytest.mark.parametrize("language", list(Language))
def test_profile_accepts_every_country_and_language(
    profile_json: dict[str, Any], country: Country, language: Language
) -> None:
    profile_json.update(country=country.value, language=language.value)

    profile = LearnerProfile.model_validate(profile_json)

    assert (profile.country, profile.language) == (country, language)


def test_supports_mvp_countries_and_languages() -> None:
    assert {"KE", "US", "MX"} <= {country.value for country in Country}
    assert {"en", "es", "sw"} <= {language.value for language in Language}


@pytest.mark.parametrize(
    ("field", "bad_value"),
    [("country", "FR"), ("language", "fr"), ("goal", "get_rich")],
)
def test_profile_rejects_unknown_enum_values(
    profile_json: dict[str, Any], field: str, bad_value: str
) -> None:
    profile_json[field] = bad_value

    with pytest.raises(ValidationError):
        LearnerProfile.model_validate(profile_json)


def test_profile_rejects_proficiency_above_one(profile_json: dict[str, Any]) -> None:
    profile_json["topic_scores"]["saving"]["proficiency"] = 1.5

    with pytest.raises(ValidationError):
        LearnerProfile.model_validate(profile_json)


def test_profile_rejects_unknown_fields(profile_json: dict[str, Any]) -> None:
    profile_json["nickname"] = "Asha"

    with pytest.raises(ValidationError):
        LearnerProfile.model_validate(profile_json)
