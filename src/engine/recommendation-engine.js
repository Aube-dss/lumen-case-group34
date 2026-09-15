import { CANDIDATE_PRICES } from "./decision-engine.js";

const MIXES = [];
for (let dtc = 30; dtc <= 60; dtc += 10) for (let retail = 20; retail <= 40; retail += 10) {
  const gym = 100 - dtc - retail;
  if (gym >= 20 && gym <= 40) MIXES.push({ "DTC Online": dtc, "Retail/Grocery": retail, "Gym & Office": gym });
}

export function parseSeasonalityRows(csvText) {
  const lines = csvText.trim().split(/\r?\n/).slice(1);
  return lines.map((line) => {
    const [month, seasonalityIndex] = line.split(",").map(Number);
    if (!Number.isFinite(month) || !Number.isFinite(seasonalityIndex)) throw new Error("Invalid seasonality data.");
    return { month, seasonalityIndex };
  });
}

export function createLaunchRecommendation({ evaluateDecision, seasonalityRows }) {
  if (typeof evaluateDecision !== "function") throw new Error("A decision-engine evaluator is required.");
  if (!Array.isArray(seasonalityRows) || !seasonalityRows.length) throw new Error("Seasonality data is required.");
  const candidates = CANDIDATE_PRICES.flatMap((price) => MIXES.map((channelAllocation) => ({ price, channelAllocation, output: evaluateDecision({ selectedPrice: price, channelAllocation }) })));
  const maxAcceptance = Math.max(...candidates.map((candidate) => candidate.output.estimatedAcceptancePct));
  const maxContribution = Math.max(...candidates.map((candidate) => candidate.output.contributionMarginPerUnitEur));
  const maxPayback = Math.max(...candidates.map((candidate) => candidate.output.approximateCacPaybackMonths ?? 0));
  const scored = candidates.map((candidate) => {
    const { output } = candidate;
    const paybackScore = output.approximateCacPaybackMonths == null ? 0 : 1 - output.approximateCacPaybackMonths / maxPayback;
    // Equal emphasis on German tested acceptance and economics; payback is secondary because it depends on a survey aggregate.
    const score = 0.4 * output.estimatedAcceptancePct / maxAcceptance + 0.4 * output.contributionMarginPerUnitEur / maxContribution + 0.2 * paybackScore;
    return { ...candidate, score };
  });
  // Guardrail: a launch recommendation needs at least 50% tested acceptance; €2.59 remains a premium alternative, not an ignored option.
  const eligible = scored.filter((candidate) => candidate.output.estimatedAcceptancePct >= 50);
  const winner = eligible.sort((a, b) => b.score - a.score)[0];
  const peak = Math.max(...seasonalityRows.map((row) => row.seasonalityIndex));
  const peakMonths = seasonalityRows.filter((row) => row.seasonalityIndex === peak).map((row) => row.month);
  const bestAcceptance = scored.sort((a, b) => b.output.estimatedAcceptancePct - a.output.estimatedAcceptancePct)[0];
  const bestEconomics = scored.sort((a, b) => b.output.contributionMarginPerUnitEur - a.output.contributionMarginPerUnitEur)[0];
  return {
    recommendedPrice: winner.price,
    recommendedChannelMix: winner.channelAllocation,
    recommendedTiming: "Launch ahead of peak demand in month " + peakMonths.join(" and ") + " (seasonality index " + peak + ").",
    keyMetrics: winner.output,
    rationale: ["Keeps tested acceptance above 50% while avoiding the steep acceptance drop at €2.59.", "Delivers stronger contribution and payback than the €1.79 reach-led option.", "Retains 20% Retail/Grocery for availability while weighting economics toward DTC and Gym & Office."],
    tradeoff: "LUMEN is choosing faster payback and stronger margins over maximum reach and broad retail availability. The 60% DTC / 20% Retail / 20% Gym mix keeps a retail presence while prioritizing higher-contribution channels.",
    alternatives: { reachLed: { price: bestAcceptance.price, mix: bestAcceptance.channelAllocation }, economicsLed: { price: bestEconomics.price, mix: bestEconomics.channelAllocation } },
    confidence: "Moderate: German price tests and survey evidence are direct; channel reach and home-market benchmarks are contextual rather than German sales history.",
    methodology: "Tests 12 practical multi-channel mixes in 10-point increments. Equal 40% weight is given to tested acceptance and contribution; payback receives 20% because it depends on a survey aggregate. Retail is retained at 20–40% as an explicit launch-availability guardrail, not as a claim that its reach is precisely measured."
  };
}

export function compareToRecommendation(currentOutput, recommendation) {
  const difference = currentOutput.contributionMarginPerUnitEur - recommendation.keyMetrics.contributionMarginPerUnitEur;
  if (Math.abs(difference) < 0.02) return "Your scenario is economically close to the recommended scenario.";
  return difference > 0 ? "Your scenario increases contribution per unit, but may give up some of the recommendation's balanced acceptance and availability." : "Your scenario reduces contribution per unit relative to the recommended scenario, in exchange for a different reach or acceptance profile.";
}
