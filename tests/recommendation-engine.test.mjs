import assert from "node:assert/strict";
import test from "node:test";
import { createLaunchRecommendation, compareToRecommendation } from "../src/engine/recommendation-engine.js";
const evaluate = ({ selectedPrice, channelAllocation }) => ({ estimatedAcceptancePct: selectedPrice === 1.79 ? 61.7 : selectedPrice === 2.19 ? 51.7 : 26.7, contributionMarginPerUnitEur: selectedPrice === 2.19 ? 1.1 : selectedPrice === 1.79 ? .7 : 1.5, approximateCacPaybackMonths: selectedPrice === 2.19 ? 6 : selectedPrice === 1.79 ? 9 : 4 });
const seasonalityRows = [{ month: 6, seasonalityIndex: 132 }, { month: 7, seasonalityIndex: 138 }];
test("considers all prices and returns a valid deterministic mix", () => { const first = createLaunchRecommendation({ evaluateDecision: evaluate, seasonalityRows }); const second = createLaunchRecommendation({ evaluateDecision: evaluate, seasonalityRows }); assert.equal(first.recommendedPrice, 2.19); assert.equal(Object.values(first.recommendedChannelMix).reduce((a,b)=>a+b,0), 100); assert.deepEqual(first, second); });
test("comparison and timing remain available", () => { const recommendation = createLaunchRecommendation({ evaluateDecision: evaluate, seasonalityRows }); assert.match(recommendation.recommendedTiming, /month 7/); assert.match(compareToRecommendation({ contributionMarginPerUnitEur: .7 }, recommendation), /reduces/); });
