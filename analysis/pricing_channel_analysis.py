"""Compare LUMEN launch prices and channels using the supplied price tests.

Run from the repository root:
    python analysis/pricing_channel_analysis.py
"""

from __future__ import annotations

import csv
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data" / "price_test_results.csv"


def rows() -> list[dict[str, str]]:
    with DATA.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def main() -> int:
    records = rows()
    records.sort(key=lambda r: (float(r["price_eur"]), -float(r["unit_contribution_eur"])))

    print("price_eur | channel | acceptance_pct | contribution_eur | margin_pct")
    print("-" * 73)
    for row in records:
        print(
            f'{float(row["price_eur"]):9.2f} | '
            f'{row["channel"]:15} | '
            f'{float(row["estimated_acceptance_pct_of_survey"]):14.1f} | '
            f'{float(row["unit_contribution_eur"]):16.2f} | '
            f'{float(row["contribution_margin_pct"]):9.1f}'
        )

    print("\nInterpretation guardrails:")
    print("- Acceptance is a survey estimate, not observed German sales.")
    print("- Contribution is per unit after channel economics, before acquisition spend.")
    print("- Do not combine channel rows into a blended result without an explicit mix.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
