"""Small, readable pricing analysis for the LUMEN Germany case.

Run with: python analyze_price.py
"""

from __future__ import annotations

import csv
from pathlib import Path


DATA_DIR = Path(__file__).parent / "data"
PRICES = (1.79, 2.19, 2.59)


def read_csv(filename: str) -> list[dict[str, str]]:
    with (DATA_DIR / filename).open(newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def average(rows: list[dict[str, str]], column: str) -> float:
    values = [float(row[column]) for row in rows if row.get(column)]
    return sum(values) / len(values)


def main() -> None:
    price_tests = read_csv("price_test_results.csv")
    sensitivity = read_csv("price_sensitivity_survey.csv")

    print("LUMEN — analyse pédagogique du prix (Allemagne)\n")
    print("Prix   Acceptation   Contribution moyenne par canal")
    print("-----  ------------  -------------------------------")

    summary: dict[float, tuple[float, float]] = {}
    for price in PRICES:
        rows = [row for row in price_tests if float(row["price_eur"]) == price]
        acceptance = float(rows[0]["estimated_acceptance_pct_of_survey"])
        contribution = average(rows, "unit_contribution_eur")
        summary[price] = (acceptance, contribution)
        print(f"€{price:>4.2f}    {acceptance:>6.1f}%                 €{contribution:>5.2f}")

    print("\nPrix perçu par les répondants (moyennes Van Westendorp)")
    print(f"  Trop bon marché : €{average(sensitivity, 'too_cheap_eur'):.2f}")
    print(f"  Bon marché      : €{average(sensitivity, 'cheap_eur'):.2f}")
    print(f"  Cher            : €{average(sensitivity, 'expensive_eur'):.2f}")
    print(f"  Trop cher       : €{average(sensitivity, 'too_expensive_eur'):.2f}")

    # This is deliberately explicit so a student can change the rule and study it.
    balanced_price = 2.19
    acceptance, contribution = summary[balanced_price]
    print("\nRecommandation de départ")
    print(
        f"  Tester €{balanced_price:.2f} en priorité : {acceptance:.1f}% d'acceptation "
        f"et €{contribution:.2f} de contribution moyenne par canal."
    )
    print(
        "  Limite : les résultats sont des estimations d'enquête et de tests, "
        "pas des ventes allemandes observées."
    )


if __name__ == "__main__":
    main()
