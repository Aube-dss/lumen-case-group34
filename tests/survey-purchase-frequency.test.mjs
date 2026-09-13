import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { prepareSurveyPurchaseFrequency } from "../src/data/survey-purchase-frequency.js";
import { createCockpitDecisionEngine } from "../src/data/cockpit-decision-data.js";

const surveyCsv = await readFile(new URL("../data/customer_survey.csv", import.meta.url), "utf8");
const priceTestCsv = await readFile(new URL("../data/price_test_results.csv", import.meta.url), "utf8");

test("creates a German aggregate without respondent data", () => {
  const aggregate = prepareSurveyPurchaseFrequency(surveyCsv);
  assert.equal(aggregate.respondentCountUsed, 420);
  assert.ok(Math.abs(aggregate.purchaseFrequencyPerMonth - 6.144285714285714) < 0.0000001);
  assert.deepEqual(Object.keys(aggregate).sort(), ["methodology", "purchaseFrequencyPerMonth", "respondentCountUsed", "source"]);
});
test("fails on missing, invalid, and empty frequency data", () => {
  const header = "respondent_id,purchase_frequency_per_month";
  assert.throws(() => prepareSurveyPurchaseFrequency(header + "\n1,"), /Missing/);
  assert.throws(() => prepareSurveyPurchaseFrequency(header + "\n1,no"), /Invalid/);
  assert.throws(() => prepareSurveyPurchaseFrequency(header), /no respondent/);
});
test("wires the aggregate into the engine so the frontend supplies only a selection", () => {
  const { evaluate } = createCockpitDecisionEngine({ priceTestCsv, customerSurveyCsv: surveyCsv });
  const output = evaluate({ selectedPrice: 2.19, channelAllocation: { "DTC Online": 100, "Retail/Grocery": 0, "Gym & Office": 0 } });
  assert.ok(output.approximateCacPaybackMonths > 0);
});
