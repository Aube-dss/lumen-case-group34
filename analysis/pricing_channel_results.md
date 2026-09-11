# LUMEN pricing and channel analysis

## Decision frame

The launch decision must balance adoption, unit economics, and speed of payback. The data supports a comparison of three candidate shelf prices across DTC Online, Retail/Grocery, and Gym & Office; it does not provide German historical sales, so acceptance remains a survey estimate.

## Price trade-off

| Price | Estimated acceptance | Contribution range across channels |
|---:|---:|---:|
| €1.79 | 61.7% | €0.40–€0.81 |
| €2.19 | 51.7% | €0.63–€1.16 |
| €2.59 | 26.7% | €0.86–€1.54 |

The €2.19 option is the clearest starting point for a balanced test: it retains about half of surveyed acceptance while materially improving contribution over €1.79. €2.59 maximizes unit contribution, but its acceptance is nearly half the €2.19 level and therefore carries the greatest adoption risk.

## Channel trade-off at €2.19

| Channel | Net price to LUMEN | Contribution / unit | Contribution margin |
|---|---:|---:|---:|
| DTC Online | €1.78 | €1.16 | 65.1% |
| Retail/Grocery | €1.25 | €0.63 | 50.3% |
| Gym & Office | €1.75 | €1.13 | 64.6% |

DTC Online and Gym & Office have similar unit economics, while Retail/Grocery offers the broadest physical reach but the lowest contribution after retailer and distributor cuts. This suggests using DTC Online or Gym & Office to learn and validate repeat purchase, with Retail/Grocery added selectively for trial and visibility.

## Acquisition economics caveat

The marketing-funnel exhibit reports acquisition channels—Paid Social, Influencer / Content, Retail Sampling, and Referral / Subscription—which are not the same as distribution channels. CAC should therefore be modeled as a separate marketing input rather than incorrectly assigned to DTC, retail, or gym sales.

The next decision-cockpit branch should allow an explicit marketing-channel budget and a separate distribution-channel mix. It should calculate payback only after the user supplies or selects an assumed units-per-customer or repeat-purchase scenario.

## Recommended test design

1. Use €2.19 as the base case and retain €1.79 and €2.59 as sensitivity cases.
2. Pilot DTC Online and Gym & Office first because their contribution per unit is highest at the balanced price.
3. Use Retail/Grocery as a controlled reach experiment, with sampling or promotion tracked separately.
4. Compare observed trial and repeat purchase against the survey acceptance assumption before scaling.

## Reproducibility

Run:

```bash
python analysis/pricing_channel_analysis.py
```

The script reads only `data/price_test_results.csv` and prints the channel-by-price comparison. It does not read or emit the personal fields in `customer_survey.csv`.
