"""Shape of data/findex/{country}.json, written by data/scripts/process_findex.py.

Internal to the API: services turn these files into the shared LearnerNeeds.
"""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.shared import AgeGroup, Country, NeedKind, Topic, UnitInterval


class FindexIndicator(BaseModel):
    """One Findex indicator for one country."""

    model_config = ConfigDict(extra="forbid")

    indicator_id: str = Field(min_length=1)
    topic: Topic
    kind: NeedKind
    label: str = Field(min_length=1)
    higher_is_better: bool
    survey_year: int
    rates: dict[AgeGroup, UnitInterval] = Field(
        description="Always has all adults; age groups only when Findex publishes them."
    )
    benchmark_rate: UnitInterval | None


class FindexCountry(BaseModel):
    """All Findex indicators for one country."""

    model_config = ConfigDict(extra="forbid")

    country: Country
    source: str
    source_url: str
    benchmark_name: str
    indicators: list[FindexIndicator] = Field(min_length=1)
