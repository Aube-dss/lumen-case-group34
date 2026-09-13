import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createDecisionEngine, parseCsv } from "../src/engine/decision-engine.js";

const rows = parseCsv(await readFile(new URL("../data/price_test_results.csv", import.meta.url), "utf8"));
const evaluate = createDecisionEngine({ priceTestRows: rows });
const evaluateWithFrequency = createDecisionEngine({ priceTestRows: rows, surveyPurchaseFrequencyPerMonth: 2 });
const mix = (channel) => ({ "DTC Online": channel === "DTC Online" ? 100 : 0, "Retail/Grocery": channel === "Retail/Grocery" ? 100 : 0, "Gym & Office": channel === "Gym & Office" ? 100 : 0 });

test("all candidate prices return tested acceptance", () => {
  assert.equal(evaluate({ selectedPrice: 1.79, channelAllocation: mix("DTC Online") }).estimatedAcceptancePct, 61.7);
  assert.equal(evaluate({ selectedPrice: 2.19, channelAllocation: mix("DTC Online") }).estimatedAcceptancePct, 51.7);
  assert.equal(evaluate({ selectedPrice: 2.59, channelAllocation: mix("DTC Online") }).estimatedAcceptancePct, 26.7);
});
test("single and mixed channel economics are allocation-weighted", () => {
  assert.equal(evaluate({ selectedPrice: 2.19, channelAllocation: mix("DTC Online") }).contributionMarginPerUnitEur, 1.16);
  assert.equal(evaluate({ selectedPrice: 2.19, channelAllocation: mix("Retail/Grocery") }).contributionMarginPerUnitEur, 0.63);
  assert.equal(evaluate({ selectedPrice: 2.19, channelAllocation: mix("Gym & Office") }).contributionMarginPerUnitEur, 1.13);
  const result = evaluateWithFrequency({ selectedPrice: 2.19, channelAllocation: { "DTC Online": 50, "Retail/Grocery": 25, "Gym & Office": 25 } });
  assert.equal(result.contributionMarginPerUnitEur, 1.02);
  assert.equal(result.approximateCacPaybackMonths, 44 / 2.04);
});
test("bad allocations and missing values fail safely", () => {
  assert.throws(() => evaluate({ selectedPrice: 2.19, channelAllocation: { "DTC Online": 50, "Retail/Grocery": 20, "Gym & Office": 20 } }), /sum to 100/);
  assert.throws(() => evaluate({ selectedPrice: 3, channelAllocation: mix("DTC Online") }), /Selected price/);
  assert.throws(() => createDecisionEngine({ priceTestRows: rows, surveyPurchaseFrequencyPerMonth: 0 }), /greater than zero/);
  assert.throws(() => createDecisionEngine({ priceTestRows: [...rows, rows[0]] }), /Duplicate/);
  assert.throws(() => createDecisionEngine({ priceTestRows: [{ ...rows[0], unit_contribution_eur: "" }] }), /invalid/);
  assert.throws(() => createDecisionEngine({ priceTestRows: rows.filter((row) => row.channel !== "Gym & Office") })({ selectedPrice: 2.19, channelAllocation: mix("DTC Online") }), /incomplete/);
  assert.throws(() => createDecisionEngine({ priceTestRows: [{ ...rows[0], channel: "Wholesale" }] }), /Unexpected price-test channel/);
});
