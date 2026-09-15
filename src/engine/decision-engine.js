export const CHANNELS = Object.freeze(["DTC Online", "Retail/Grocery", "Gym & Office"]);
export const CANDIDATE_PRICES = Object.freeze([1.79, 2.19, 2.59]);
export const METHODOLOGY_STATEMENT = "German estimate based on German survey, price tests, competitor evidence, and home-market benchmarks; not German sales history.";

const requiredNumber = (value, label) => {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    throw new Error("Missing or invalid " + label + ".");
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error("Missing or invalid " + label + ".");
  return numeric;
};

export function parseCsv(text) {
  if (typeof text !== "string" || !text.trim()) throw new Error("CSV text is required.");
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(",");
  return lines.filter(Boolean).map((line) => Object.fromEntries(columns.map((column, index) => [column, line.split(",")[index] ?? ""])));
}

function normaliseMix(mix) {
  if (!mix || typeof mix !== "object") throw new Error("A channel allocation is required.");
  if (Object.keys(mix).some((channel) => !CHANNELS.includes(channel))) throw new Error("Unsupported channel allocation.");
  const result = Object.fromEntries(CHANNELS.map((channel) => [channel, requiredNumber(mix[channel] ?? 0, channel + " allocation")]));
  const total = Object.values(result).reduce((sum, value) => sum + value, 0);
  if (Object.values(result).some((value) => value < 0)) throw new Error("Channel allocations cannot be negative.");
  if (Math.abs(total - 100) > 0.0001) throw new Error("Channel allocations must sum to 100%; received " + total + "%.");
  return result;
}

export function createDecisionEngine({ priceTestRows, blendedCacEur = 44, surveyPurchaseFrequencyPerMonth = null }) {
  if (!Array.isArray(priceTestRows)) throw new Error("Price-test rows must be an array.");
  const cac = requiredNumber(blendedCacEur, "blended CAC");
  if (cac <= 0) throw new Error("Blended CAC must be greater than zero.");
  const priceTests = new Map();
  for (const row of priceTestRows) {
    const price = requiredNumber(row.price_eur, "price");
    if (!CANDIDATE_PRICES.includes(price)) throw new Error("Unexpected price-test price: " + price + ".");
    if (!CHANNELS.includes(row.channel)) throw new Error("Unexpected price-test channel: " + row.channel + ".");
    const key = price.toFixed(2);
    if (!priceTests.has(key)) priceTests.set(key, {});
    if (priceTests.get(key)[row.channel]) {
      throw new Error("Duplicate price-test row for €" + key + " in " + row.channel + ".");
    }
    priceTests.get(key)[row.channel] = {
      acceptancePct: requiredNumber(row.estimated_acceptance_pct_of_survey, "acceptance"),
      contributionPerUnitEur: requiredNumber(row.unit_contribution_eur, "unit contribution"),
      evidence: { source: "data/price_test_results.csv", confidence: "German price-test evidence" }
    };
  }

  const surveyFrequency = surveyPurchaseFrequencyPerMonth == null
    ? null
    : requiredNumber(surveyPurchaseFrequencyPerMonth, "survey purchase frequency");
  if (surveyFrequency !== null && surveyFrequency <= 0) {
    throw new Error("Survey purchase frequency must be greater than zero.");
  }

  return ({ selectedPrice, channelAllocation } = {}) => {
    const price = requiredNumber(selectedPrice, "selected price");
    if (!CANDIDATE_PRICES.includes(price)) throw new Error("Selected price must be €1.79, €2.19, or €2.59.");
    const allocation = normaliseMix(channelAllocation);
    const channels = priceTests.get(price.toFixed(2));
    if (!channels || CHANNELS.some((channel) => !channels[channel])) throw new Error("Price-test data is incomplete for the selected price.");
    const weighted = (field) => CHANNELS.reduce((sum, channel) => sum + channels[channel][field] * allocation[channel] / 100, 0);
    const acceptancePct = weighted("acceptancePct");
    const contributionMarginPerUnitEur = weighted("contributionPerUnitEur");
    if (contributionMarginPerUnitEur <= 0) throw new Error("Weighted contribution must be greater than zero.");
    let approximateCacPaybackMonths = null;
    let paybackAssumption = "No payback months returned: provide an anonymised German-survey aggregate for purchases per customer per month.";
    if (surveyFrequency !== null) {
      approximateCacPaybackMonths = cac / (contributionMarginPerUnitEur * surveyFrequency);
      paybackAssumption = "€44 blended CAC ÷ (weighted contribution per unit × anonymised, survey-derived purchases per customer per month). This is not a German LTV forecast.";
    }
    const retailWeighted = allocation["Retail/Grocery"] >= 40;
    const highAcceptance = acceptancePct >= 55;
    const tradeoff = {
      optimizesFor: highAcceptance ? "broader potential customer acceptance" : "higher contribution per unit and premium positioning",
      givesUp: highAcceptance ? "some contribution per unit and potential payback speed" : "part of the tested audience",
      retailNote: retailWeighted ? "Retail/Grocery improves reach and availability, while retailer and distributor deductions lower unit contribution." : null
    };
    tradeoff.headline = "This configuration prioritises " + tradeoff.optimizesFor + " while giving up " + tradeoff.givesUp + ".";
    return {
      selectedPriceEur: price, channelAllocationPct: allocation, estimatedAcceptancePct: acceptancePct,
      contributionMarginPerUnitEur, approximateCacPaybackMonths, paybackAssumption,
      channelMetrics: Object.fromEntries(CHANNELS.map((channel) => [channel, { ...channels[channel], allocationPct: allocation[channel] }])),
      tradeoff,
      evidence: {
        priceTests: { source: "data/price_test_results.csv", confidence: "German price-test evidence" },
        survey: { source: "data/customer_survey.csv and data/price_sensitivity_survey.csv", confidence: "direct German evidence", privacy: "Only anonymised aggregates may be passed to this engine." },
        competitors: { source: "data/competitor_prices_by_channel.csv", confidence: "competitor evidence" },
        homeMarkets: { source: "data/historical_sales_weekly.csv", confidence: "NL/DK/SE calibration/context only", warning: "Not German sales and not a direct German forecast." },
        cacBenchmark: { source: "Case brief / data/marketing_funnel_monthly.csv", confidence: "home-market benchmark", valueEur: cac }
      },
      methodologyStatement: METHODOLOGY_STATEMENT
    };
  };
}
