"""Scenario-based LUMEN launch cockpit.

Run from the repository root, for example:
    python analysis/decision_cockpit.py --price 2.19 --channel "DTC Online" --customers 1000

The model is intentionally explicit: customers, CAC, and repeat purchases are
assumptions supplied by the user, not invented German sales observations.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data" / "price_test_results.csv"


def load_cases() -> dict[tuple[float, str], dict[str, float]]:
    with DATA.open(newline="", encoding="utf-8-sig") as handle:
        return {
            (float(row["price_eur"]), row["channel"]): {
                key: float(row[key])
                for key in (
                    "estimated_acceptance_pct_of_survey",
                    "net_price_to_lumen_eur",
                    "unit_contribution_eur",
                    "contribution_margin_pct",
                )
            }
            for row in csv.DictReader(handle)
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="LUMEN launch scenario cockpit")
    parser.add_argument("--price", type=float, choices=(1.79, 2.19, 2.59), required=True)
    parser.add_argument("--channel", choices=("DTC Online", "Retail/Grocery", "Gym & Office"), required=True)
    parser.add_argument("--customers", type=int, default=1000)
    parser.add_argument("--repeat-purchases", type=float, default=1.0)
    parser.add_argument("--cac", type=float, default=44.0)
    args = parser.parse_args()

    case = load_cases()[(args.price, args.channel)]
    units = args.customers * args.repeat_purchases
    contribution = units * case["unit_contribution_eur"]
    acquisition_spend = args.customers * args.cac
    payback_ratio = contribution / acquisition_spend if acquisition_spend else float("inf")

    print("LUMEN launch scenario")
    print(f"Price: €{args.price:.2f} | Channel: {args.channel}")
    print(f"Acceptance estimate: {case['estimated_acceptance_pct_of_survey']:.1f}%")
    print(f"Customers: {args.customers:,} | Units: {units:,.1f}")
    print(f"Net price to LUMEN: €{case['net_price_to_lumen_eur']:.2f}")
    print(f"Contribution per unit: €{case['unit_contribution_eur']:.2f}")
    print(f"Contribution margin: {case['contribution_margin_pct']:.1f}%")
    print(f"Total contribution: €{contribution:,.2f}")
    print(f"Acquisition spend: €{acquisition_spend:,.2f}")
    print(f"Contribution / acquisition spend: {payback_ratio:.2f}x")
    print("\nCaveat: this is a scenario, not a German sales forecast.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
