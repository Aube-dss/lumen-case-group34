import { createDecisionEngine, parseCsv } from "../engine/decision-engine.js";
import { prepareSurveyPurchaseFrequency } from "./survey-purchase-frequency.js";

export function createCockpitDecisionEngine({ priceTestCsv, customerSurveyCsv, surveyAggregate: suppliedSurveyAggregate, blendedCacEur = 44 }) {
  const surveyAggregate = suppliedSurveyAggregate ?? prepareSurveyPurchaseFrequency(customerSurveyCsv);
  if (!surveyAggregate || !Number.isFinite(surveyAggregate.purchaseFrequencyPerMonth)) {
    throw new Error("A valid anonymised German survey purchase-frequency aggregate is required.");
  }
  const evaluate = createDecisionEngine({
    priceTestRows: parseCsv(priceTestCsv),
    blendedCacEur,
    surveyPurchaseFrequencyPerMonth: surveyAggregate.purchaseFrequencyPerMonth
  });
  return { evaluate, surveyAggregate };
}
