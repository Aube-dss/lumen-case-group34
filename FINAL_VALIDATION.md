# LUMEN final validation checklist

## Reproducibility

Run from the repository root:

```bash
python analysis/profile_data.py
python analysis/pricing_channel_analysis.py
python analysis/positioning_launch_timing.py
python analysis/decision_cockpit.py --price 2.19 --channel "DTC Online" --customers 1000 --repeat-purchases 2 --cac 44
```

The scripts use the committed exhibits and expose assumptions through command-line inputs.

## Business checks

- [x] The decision compares price, channel, positioning, city, and timing.
- [x] German demand is treated as an estimate because historical German sales do not exist.
- [x] Home-market sales are not presented as German performance.
- [x] Distribution channels and marketing acquisition channels remain separate.
- [x] CAC, repeat purchases, and customer count are explicit scenario assumptions.
- [x] The recommendation is explainable to a non-technical decision-maker.

## Privacy checks

- [x] The survey's name and email columns are excluded from analysis outputs.
- [x] No API key or external data source is required.
- [x] No raw customer-level survey data is returned by the analysis scripts.
- [x] Derived outputs are aggregate or scenario-level only.

## Robustness notes

- Empty or malformed CSV files should fail visibly rather than silently producing a recommendation.
- Duplicate source rows are reported by the profiler and require analyst review.
- Scenarios with zero customers do not create an acquisition-spend denominator error.
- The cockpit is a decision aid, not a demand forecast or financial guarantee.
