"""Summarize competitor price positioning and peak launch months."""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPETITORS = ROOT / "data" / "competitor_prices_by_channel.csv"
SEASONALITY = ROOT / "data" / "seasonality_and_weather.csv"


def main() -> int:
    prices: dict[str, list[float]] = {}
    with COMPETITORS.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            prices.setdefault(row["competitor"], []).append(float(row["price_eur"]))

    print("Competitor positioning")
    for name, values in prices.items():
        print(f"- {name}: €{min(values):.2f}–€{max(values):.2f}")

    with SEASONALITY.open(newline="", encoding="utf-8-sig") as handle:
        months = list(csv.DictReader(handle))
    peak = sorted(months, key=lambda row: float(row["seasonality_index_100_avg"]), reverse=True)[:3]
    print("\nPeak seasonality months")
    print(", ".join(f"month {row['month']} ({row['seasonality_index_100_avg']})" for row in peak))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
