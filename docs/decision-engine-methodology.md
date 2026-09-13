# Decision engine methodology

The engine takes price-test rows and a user-selected allocation. It weights each channel's tested acceptance and unit contribution by that allocation. It never uses a simple unweighted average unless allocations happen to be equal.

The €44 CAC benchmark comes from the case brief and marketing-funnel evidence. Payback is only returned when the engine is constructed with an anonymised aggregate for purchases per customer per month from German survey analysis. The frontend does not supply this behavioural assumption. The formula is €44 divided by weighted contribution per unit multiplied by that purchase frequency. The engine does not invent German repeat-purchase, LTV, or sales behaviour.

The purchase-frequency aggregate uses the German survey field 'purchase_frequency_per_month'. It is the simple arithmetic mean of all valid survey responses: 6.1443 purchases per customer per month across 420 respondents. There is no survey weighting field, so a weighted mean would add an unsupported assumption. Segments differ (from roughly 5.10 to 7.56 purchases per month), but the overall mean is appropriate for the cockpit's single blended planning view; future versions may show segment-specific scenarios. The aggregation function returns only the mean, respondent count, source, and methodology—never names, emails, IDs, or individual rows.

The returned evidence layer distinguishes German price tests, direct German survey evidence, competitor evidence, and NL/DK/SE history. Home-market sales are marked as calibration/context only, never German sales or a German forecast. Customer names, surnames, emails, and respondent-level records are not accepted by the engine.

German estimate based on German survey, price tests, competitor evidence, and home-market benchmarks; not German sales history.

## How the cockpit decides what to recommend

The cockpit compares practical multi-channel mixes at each candidate price. It gives equal importance to tested customer acceptance and contribution per unit, then gives a smaller role to CAC payback because payback depends on the survey-derived purchase-frequency assumption. It keeps a modest Retail/Grocery allocation in the recommended mix as an availability guardrail, while making clear that retail's reach is not precisely quantified in this data. The result is a qualified decision aid, not a false claim of certainty.
