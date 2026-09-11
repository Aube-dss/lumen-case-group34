# LUMEN data contract

## Purpose

This contract defines the safe analytical inputs for the Germany launch decision cockpit. The source exhibits remain unchanged; derived outputs should be reproducible from the files in `data/`.

## Source map

| Exhibit | File | Analytical role |
|---|---|---|
| 1 | `market_context.csv` | German market and regional sizing |
| 2–3 | `competitor_prices_by_channel.csv`, `competitor_price_history.csv` | Competitive price and promotion benchmarks |
| 4 | `customer_survey.csv` | Segment, geography, channel preference, intent |
| 5 | `customer_quotes.csv` | Qualitative context by segment |
| 6 | `historical_sales_weekly.csv` | Home-market demand patterns only; never treat as German sales |
| 7 | `marketing_funnel_monthly.csv` | CAC, LTV, and channel acquisition performance |
| 8–9 | `cost_breakdown.csv`, `channel_economics.csv` | Unit economics and contribution |
| 10–11 | `price_sensitivity_survey.csv`, `price_test_results.csv` | Price acceptance and contribution trade-offs |
| 12 | `seasonality_and_weather.csv` | Timing context |

## Privacy rules

- `customer_survey.csv` contains `respondent_id`, `first_name`, `last_name`, and `email`.
- These fields must not be used as model features, included in aggregate outputs, or returned by any application endpoint.
- Analytical survey outputs may use segment, age band, city, channel preference, spend, price sensitivity, awareness flags, and purchase intent.
- No derived file should contain direct identifiers.

## Quality rules

- Preserve the distinction between German survey/market evidence and home-market sales evidence.
- Treat duplicate rows as a data-quality issue and report them before deduplication; do not silently delete observations.
- Keep monetary values in EUR and percentages as percentage points unless a field is explicitly documented as a ratio.
- Retain source row counts and validation warnings in profiling output.
- Any imputation, aggregation, or Germany extrapolation must be documented with its assumption.

## Planned downstream outputs

The next branch can consume a privacy-safe profile and use these fields for pricing, channel, CAC/LTV, and scenario calculations. This branch intentionally does not make a launch recommendation.
