"""Profile LUMEN CSV exhibits without exposing survey identifiers.

Run from the repository root:
    python scripts/profile_data.py
"""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SURVEY_PII = {"respondent_id", "first_name", "last_name", "email"}
EXPECTED_FILES = [
    "market_context.csv",
    "competitor_prices_by_channel.csv",
    "competitor_price_history.csv",
    "customer_survey.csv",
    "customer_quotes.csv",
    "historical_sales_weekly.csv",
    "marketing_funnel_monthly.csv",
    "cost_breakdown.csv",
    "channel_economics.csv",
    "price_sensitivity_survey.csv",
    "price_test_results.csv",
    "seasonality_and_weather.csv",
]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        return reader.fieldnames or [], rows


def duplicate_count(rows: list[dict[str, str]], fields: list[str]) -> int:
    keys = [tuple(row.get(field, "") for field in fields) for row in rows]
    return sum(count - 1 for count in Counter(keys).values() if count > 1)


def main() -> int:
    warnings: list[str] = []
    print("LUMEN data profile (privacy-safe)")
    print("=" * 32)

    for filename in EXPECTED_FILES:
        path = DATA_DIR / filename
        if not path.exists():
            warnings.append(f"missing file: {filename}")
            continue

        fields, rows = read_csv(path)
        print(f"\n{filename}: {len(rows)} rows, {len(fields)} columns")

        if filename == "customer_survey.csv":
            pii_found = sorted(SURVEY_PII.intersection(fields))
            print(f"  survey identifier columns excluded: {', '.join(pii_found) or 'none'}")
            non_pii_fields = [field for field in fields if field not in SURVEY_PII]
            print(f"  analytical columns: {', '.join(non_pii_fields)}")
            duplicate_fields = non_pii_fields
        else:
            duplicate_fields = fields

        duplicates = duplicate_count(rows, duplicate_fields)
        if duplicates:
            warning = f"{filename}: {duplicates} duplicate row(s) detected"
            warnings.append(warning)
            print(f"  WARNING: {warning}")

    print("\nQuality summary")
    print("-" * 15)
    if warnings:
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("- no warnings")

    return 1 if any(warning.startswith("missing file:") for warning in warnings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
