"""Turn the Global Findex 2025 country-level CSV into data/findex/{KE,US,MX}.json.

Source: World Bank, The Global Findex Database 2025.
  Report: https://www.worldbank.org/en/publication/globalfindex/report
  Data:   https://www.worldbank.org/en/publication/globalfindex/download-data
  CSV:    https://thedocs.worldbank.org/en/doc/be6615202d1f08a25855c8ac2d615122-0050012025/related/GlobalFindexDatabase2025.csv

Usage (from the repo root):
    pip install -r data/scripts/requirements.txt
    python data/scripts/process_findex.py path/to/GlobalFindexDatabase2025.csv

Why the rules below:
- Findex 2025 asked the detailed questions (saving, borrowing, emergency
  money) only in low- and middle-income economies, and the CSV stores
  "not asked" as 0. So for each country and indicator we take the latest
  survey year with a value above zero, and record that year (the US uses
  2021 for most indicators).
- Age groups map to Will's life stages: ages 15-24 for student/first_job,
  25+ for parent/retired. Findex only publishes a group when the all-adult
  value is above 10%, so a group may be missing; the API then uses all adults.
- The benchmark is the upper-middle-income economies average (latest year):
  the only aggregate with a value for every indicator, and a realistic next
  step for Kenya (lower middle income) and Mexico (upper middle income).
- Findex has no scam or fraud question. The scams topic uses digital payment
  use as exposure: people paying by phone or online are who scams target.
"""

import json
import sys
from pathlib import Path

import pandas as pd

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "findex"
SOURCE = "World Bank, The Global Findex Database 2025"
SOURCE_URL = "https://www.worldbank.org/en/publication/globalfindex/download-data"
BENCHMARK_ECONOMY = "Upper middle income"
BENCHMARK_NAME = "upper-middle-income countries"
COUNTRIES = {"KE": "KEN", "US": "USA", "MX": "MEX"}
AGE_GROUPS = {"ages_15_24": "ages 15-24", "age_25_plus": "age 25+"}
ALL_ADULTS = "all"
NOT_ASKED = 0.0
DECIMALS = 4

# Each indicator: Findex column, topic, kind of need, whether a higher rate is
# better, and a label that completes "N% of people your age ...".
INDICATORS = [
    ("account_t_d", "accounts", "lacking", True, "have an account"),
    ("fiaccount_t_d", "accounts", "lacking", True, "have a bank account"),
    ("fin2_t_d", "accounts", "could_use", True, "own a debit card"),
    ("save_any_t_d", "saving", "lacking", True, "saved any money in the past year"),
    ("fin17a", "saving", "lacking", True, "saved at a bank in the past year"),
    ("fin17e", "saving", "could_use", True, "earned interest on their savings"),
    (
        "fin22d",
        "borrowing",
        "struggle",
        False,
        "borrowed money to pay for health costs",
    ),
    ("fin22a", "borrowing", "could_use", True, "borrowed from a bank in the past year"),
    (
        "merchant_pay",
        "scams",
        "exposure",
        True,
        "paid a shop digitally in the past year",
    ),
    ("fin26a", "scams", "exposure", True, "paid bills by phone or online"),
    (
        "fin24aVD",
        "budget",
        "struggle",
        False,
        "would find it very hard to get emergency money within 30 days",
    ),
    ("fin24sav", "budget", "lacking", True, "would pay for an emergency from savings"),
    ("fin45d", "budget", "struggle", False, "worry most about paying monthly bills"),
]


def latest_value(rows: pd.DataFrame, column: str) -> tuple[float, int] | None:
    """Most recent (value, year) above zero, since the CSV stores "not asked" as 0."""
    asked = rows[rows[column] > NOT_ASKED].sort_values("year")
    if asked.empty:
        return None
    latest = asked.iloc[-1]
    return round(float(latest[column]), DECIMALS), int(latest["year"])


def group_rates(country_rows: pd.DataFrame, column: str, year: int) -> dict[str, float]:
    """All-adult rate plus each age group Findex published for that year.

    Unpublished groups are left out (not copied from all adults) so the API
    can tell a real age-group value from a fallback.
    """
    in_year = country_rows[country_rows["year"] == year]
    all_adults = in_year[in_year["group"] == ALL_ADULTS][column].iloc[0]
    rates = {ALL_ADULTS: round(float(all_adults), DECIMALS)}
    for group_id, findex_group in AGE_GROUPS.items():
        values = in_year[in_year["group2"] == findex_group][column]
        if not values.empty and values.iloc[0] > NOT_ASKED:
            rates[group_id] = round(float(values.iloc[0]), DECIMALS)
    return rates


def country_indicators(findex: pd.DataFrame, findex_code: str) -> list[dict]:
    """Every indicator with a value for one country, plus its benchmark."""
    country_rows = findex[findex["codewb"] == findex_code]
    country_all = country_rows[country_rows["group"] == ALL_ADULTS]
    benchmark_rows = findex[
        (findex["countrynewwb"] == BENCHMARK_ECONOMY) & (findex["group"] == ALL_ADULTS)
    ]
    indicators = []
    for column, topic, kind, higher_is_better, label in INDICATORS:
        latest = latest_value(country_all, column)
        if latest is None:
            continue
        _, year = latest
        benchmark = latest_value(benchmark_rows, column)
        indicators.append(
            {
                "indicator_id": column,
                "topic": topic,
                "kind": kind,
                "label": label,
                "higher_is_better": higher_is_better,
                "survey_year": year,
                "rates": group_rates(country_rows, column, year),
                "benchmark_rate": None if benchmark is None else benchmark[0],
            }
        )
    return indicators


def main(csv_path: Path) -> None:
    """Write one JSON file per country."""
    findex = pd.read_csv(csv_path, low_memory=False)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for country, findex_code in COUNTRIES.items():
        output = {
            "country": country,
            "source": SOURCE,
            "source_url": SOURCE_URL,
            "benchmark_name": BENCHMARK_NAME,
            "indicators": country_indicators(findex, findex_code),
        }
        path = OUTPUT_DIR / f"{country}.json"
        path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {path} ({len(output['indicators'])} indicators)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(
            "usage: python data/scripts/process_findex.py GlobalFindexDatabase2025.csv"
        )
    main(Path(sys.argv[1]))
