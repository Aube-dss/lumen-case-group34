import { createCockpitDecisionEngine } from "./src/data/cockpit-decision-data.js";
import { germanSurveyPurchaseFrequency } from "./src/data/prepared-german-survey.js";
import { createLaunchRecommendation, parseSeasonalityRows, compareToRecommendation } from "./src/engine/recommendation-engine.js";
import { localPriceTestCsv, localSeasonalityCsv } from "./src/data/local-csv-snapshots.js";

const channels = ["DTC Online", "Retail/Grocery", "Gym & Office"];
const prices = [1.79, 2.19, 2.59];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const presets = {
  recommendation: { price: 2.19, mix: { "DTC Online": 60, "Retail/Grocery": 20, "Gym & Office": 20 } },
  reach: { price: 1.79, mix: { "DTC Online": 40, "Retail/Grocery": 35, "Gym & Office": 25 } },
  premium: { price: 2.59, mix: { "DTC Online": 60, "Retail/Grocery": 20, "Gym & Office": 20 } }
};
const state = { selectedPrice: 2.19, channelAllocation: { ...presets.recommendation.mix } };
const $ = (selector) => document.querySelector(selector);
const euro = (value) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(value);
const euroLeading = (value) => "€" + Number(value).toFixed(2);
let evaluate;
let recommendation;

function isRecommended() {
  return state.selectedPrice === 2.19 && channels.every((channel) => state.channelAllocation[channel] === presets.recommendation.mix[channel]);
}

function cleanChannelName(channel) {
  return channel.replace(" Online", "").replace("/Grocery", "").replace(" & Office", "");
}

function renderControls() {
  $("#price-controls").innerHTML = prices.map((price) => `<button class="price ${state.selectedPrice === price ? "selected" : ""}" aria-pressed="${state.selectedPrice === price}" data-price="${price}">€${price.toFixed(2)}</button>`).join("");
  $("#mix-controls").innerHTML = channels.map((channel) => `<label>${cleanChannelName(channel)}<input type="range" min="0" max="100" value="${state.channelAllocation[channel]}" data-channel="${channel}" aria-label="${cleanChannelName(channel)} channel allocation"><output>${state.channelAllocation[channel]}%</output></label>`).join("");
  $("#price-controls").querySelectorAll("[data-price]").forEach((button) => button.addEventListener("click", () => { state.selectedPrice = Number(button.dataset.price); render(); }));
  $("#mix-controls").querySelectorAll("[data-channel]").forEach((input) => input.addEventListener("input", () => rebalance(input.dataset.channel, Number(input.value))));
  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => { const preset = presets[button.dataset.preset]; state.selectedPrice = preset.price; state.channelAllocation = { ...preset.mix }; render(); }));
  document.querySelectorAll("[data-preset]").forEach((button) => { const preset = presets[button.dataset.preset]; const selected = state.selectedPrice === preset.price && channels.every((channel) => state.channelAllocation[channel] === preset.mix[channel]); button.classList.toggle("active", selected); button.setAttribute("aria-pressed", selected); });
}

function rebalance(changed, next) {
  const other = channels.filter((channel) => channel !== changed);
  const previousOther = other.reduce((sum, channel) => sum + state.channelAllocation[channel], 0);
  state.channelAllocation[changed] = next;
  if (previousOther === 0) {
    state.channelAllocation[other[0]] = Math.round((100 - next) / 2);
    state.channelAllocation[other[1]] = 100 - next - state.channelAllocation[other[0]];
  } else {
    state.channelAllocation[other[0]] = Math.round((100 - next) * state.channelAllocation[other[0]] / previousOther);
    state.channelAllocation[other[1]] = 100 - next - state.channelAllocation[other[0]];
  }
  render();
}

function renderMixBar() {
  const values = channels.map((channel) => state.channelAllocation[channel]);
  $("#mix-bar").innerHTML = channels.map((channel, index) => `<span class="${index === 0 ? "dtc" : index === 1 ? "retail" : "gym"}" style="width:${values[index]}%" title="${cleanChannelName(channel)} ${values[index]}%"></span>`).join("");
  $("#mix-bar").setAttribute("aria-label", `Channel mix: ${values[0]} percent DTC, ${values[1]} percent Retail, ${values[2]} percent Gym`);
}

function renderKpis(result) {
  $("#acceptance").textContent = `${result.estimatedAcceptancePct.toFixed(1)}%`;
  $("#contribution").textContent = euro(result.contributionMarginPerUnitEur);
  $("#payback").textContent = result.approximateCacPaybackMonths == null ? "Not available" : `${result.approximateCacPaybackMonths.toFixed(1)} months`;
  $("#acceptance-track").style.width = `${Math.min(100, result.estimatedAcceptancePct)}%`;
  $("#contribution-track").style.width = `${Math.min(100, result.contributionMarginPerUnitEur / 1.6 * 100)}%`;
  $("#payback-track").style.width = `${Math.min(100, result.approximateCacPaybackMonths == null ? 0 : (1 - result.approximateCacPaybackMonths / 12) * 100)}%`;
}

function renderPriceVisual() {
  const mix = recommendation.recommendedChannelMix;
  $("#price-visual").innerHTML = prices.map((price) => {
    const output = evaluate({ selectedPrice: price, channelAllocation: mix });
    const paybackWidth = output.approximateCacPaybackMonths == null ? 0 : Math.max(8, (1 - output.approximateCacPaybackMonths / 12) * 100);
    return `<div class="price-visual-row ${price === recommendation.recommendedPrice ? "recommended" : ""}"><strong>€${price.toFixed(2)}</strong><div class="price-metric-bars"><span class="metric-line">Acceptance <i style="width:${output.estimatedAcceptancePct}%"></i> ${output.estimatedAcceptancePct.toFixed(1)}%</span><span class="metric-line">Contribution <i style="width:${Math.min(100, output.contributionMarginPerUnitEur / 1.6 * 100)}%"></i> ${euroLeading(output.contributionMarginPerUnitEur)}</span><span class="metric-line">Payback <i style="width:${paybackWidth}%"></i> ${output.approximateCacPaybackMonths.toFixed(1)} mo</span></div><span>${price === recommendation.recommendedPrice ? "Recommended" : ""}</span></div>`;
  }).join("");
}

function render() {
  renderControls();
  renderMixBar();
  try {
    const result = evaluate(state);
    const same = isRecommended();
    $("#error").hidden = true;
    $("#rail-price").textContent = `€${state.selectedPrice.toFixed(2)}`;
    $("#recommended-badge").hidden = !same;
    renderKpis(result);
    const shortMix = (mix) => Object.entries(mix).map(([channel, value]) => `${cleanChannelName(channel)} ${value}%`).join("<br>");
    $("#tradeoff").textContent = "This configuration supports the recommended balance of acceptance, contribution, and payback.";
    $("#retail-note").textContent = result.tradeoff.retailNote ?? "";
    $("#scenario-label").textContent = same ? "Recommended route active" : "Exploring an alternative route";
    $("#scenario-insight").textContent = same ? "This opening scenario balances tested acceptance with contribution and payback." : compareToRecommendation(result, recommendation);
    $("#comparison").innerHTML = `<div class="scenario-grid"><div><span>Your selection</span><strong>€${state.selectedPrice.toFixed(2)}</strong><p>${shortMix(state.channelAllocation)}</p></div><div><span>Recommended</span><strong>€${recommendation.recommendedPrice.toFixed(2)}</strong><p>${shortMix(recommendation.recommendedChannelMix)}</p></div></div><p class="muted">${same ? "You’re on the recommended route." : compareToRecommendation(result, recommendation)}</p>`;
  } catch (error) { $("#error").textContent = error.message; $("#error").hidden = false; }
}

function renderSeasonality(rows) {
  const peak = Math.max(...rows.map((row) => row.seasonalityIndex));
  const peakMonths = rows.filter((row) => row.seasonalityIndex === peak).map((row) => monthNames[row.month - 1] ?? row.month).join(", ");
  $("#seasonality-summary").textContent = `Demand peaks in month ${peakMonths}, with a seasonality index of ${peak} versus the 100 average.`;
  $("#seasonality-bars").innerHTML = rows.map((row) => { const monthName = monthNames[row.month - 1] ?? row.month; return `<div class="${row.seasonalityIndex === peak ? "peak" : ""}" title="${monthName}: ${row.seasonalityIndex}"><b>${row.seasonalityIndex}</b><i style="height:${Math.max(32, row.seasonalityIndex * 1.1)}px"></i><span>${monthName}</span></div>`; }).join("");
}

function setupNavigation() {
  const toggle = $(".sidebar-toggle");
  const menu = $("#sidebar-menu");
  toggle.addEventListener("click", () => { const open = menu.classList.toggle("open"); toggle.setAttribute("aria-expanded", open); toggle.querySelector("span").textContent = open ? "−" : "+"; });
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => menu.classList.remove("open")));
  const sections = [...document.querySelectorAll(".section-anchor")];
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) menu.querySelectorAll("a").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)); }), { rootMargin: "-20% 0px -65% 0px" });
  sections.forEach((section) => observer.observe(section));
  $("#reset-recommendation").addEventListener("click", () => { state.selectedPrice = presets.recommendation.price; state.channelAllocation = { ...presets.recommendation.mix }; render(); document.querySelector("#scenario-inputs").scrollIntoView({ behavior: "smooth" }); });
}

async function load() {
  try {
    const loadCsv = async (path, label) => { const response = await fetch(new URL(path, import.meta.url)); if (!response.ok) throw new Error(`Unable to load ${label} (${response.status}).`); const text = await response.text(); if (!text.trim()) throw new Error(`${label} is empty.`); return text; };
    const [priceTestCsv, seasonalityCsv] = window.location.protocol === "file:" ? [localPriceTestCsv, localSeasonalityCsv] : await Promise.all([loadCsv("./data/price_test_results.csv", "price-test data"), loadCsv("./data/seasonality_and_weather.csv", "seasonality data")]);
    evaluate = createCockpitDecisionEngine({ priceTestCsv, surveyAggregate: germanSurveyPurchaseFrequency }).evaluate;
    const rows = parseSeasonalityRows(seasonalityCsv);
    renderSeasonality(rows);
    recommendation = createLaunchRecommendation({ evaluateDecision: evaluate, seasonalityRows: rows });
    $("#recommended-price").textContent = `Recommended price: €${recommendation.recommendedPrice.toFixed(2)}`;
    $("#recommended-mix").textContent = Object.entries(recommendation.recommendedChannelMix).map(([channel, value]) => `${cleanChannelName(channel)} ${value}%`).join(" / ");
    $("#recommended-timing").textContent = "Launch April–May to build awareness before the July demand peak.";
    $("#decision-line").textContent = "Choose the balanced route: protect acceptance while improving contribution and payback.";
    $("#recommendation-metrics").innerHTML = `<div><span>Customer acceptance · Exhibit 11</span><strong>${recommendation.keyMetrics.estimatedAcceptancePct.toFixed(1)}%</strong></div><div><span>Contribution / unit · Exhibits 9 and 11</span><strong>${euro(recommendation.keyMetrics.contributionMarginPerUnitEur)}</strong></div><div><span>CAC · Exhibit 7</span><strong>€44 benchmark</strong></div>`;
    const recommendedContribution = recommendation.keyMetrics.contributionMarginPerUnitEur;
    const payback = recommendation.keyMetrics.approximateCacPaybackMonths;
    $("#calculation-note").innerHTML = `<div><strong>Contribution per unit · Exhibits 9 and 11</strong><span>60% DTC × €1.16 + 20% Retail × €0.63 + 20% Gym × €1.13 = ${euroLeading(recommendedContribution)}</span></div><div><strong>Estimated CAC payback · Exhibits 4 and 7</strong><span>€44 CAC ÷ (${euroLeading(recommendedContribution)} contribution × 6.14 purchases per month) = ${payback.toFixed(1)} months</span></div><p>This is a survey-based directional estimate, not a guaranteed forecast, because German sales data is not yet available.</p>`;
    const downside = 44 / (recommendedContribution * 0.8 * 6.144285714285714 * 0.8);
    const upside = 44 / (recommendedContribution * 1.2 * 6.144285714285714 * 1.2);
    $("#scenario-note").innerHTML = `<strong>Scenario range:</strong> ${upside.toFixed(1)} months upside · ${payback.toFixed(1)} months base · ${downside.toFixed(1)} months downside.`;
    renderPriceVisual();
    $("#price-comparison-body").innerHTML = prices.map((price) => { const output = evaluate({ selectedPrice: price, channelAllocation: recommendation.recommendedChannelMix }); return `<tr class="${price === recommendation.recommendedPrice ? "recommended-row" : ""}"><th scope="row">€${price.toFixed(2)}${price === recommendation.recommendedPrice ? " <span>Recommended</span>" : ""}</th><td>${output.estimatedAcceptancePct.toFixed(1)}%</td><td>${euroLeading(output.contributionMarginPerUnitEur)}</td><td>${output.approximateCacPaybackMonths == null ? "N/A" : `${output.approximateCacPaybackMonths.toFixed(1)} mo`}</td></tr>`; }).join("");
    $("#recommendation-reasons").innerHTML = recommendation.rationale.map((reason) => `<li>${reason}</li>`).join("");
    $("#recommendation-tradeoff").textContent = recommendation.tradeoff;
    setupNavigation();
    render();
  } catch (error) { $("#error").textContent = error.message || "Unable to load launch data. Check the data files or connection."; $("#error").hidden = false; }
}

load();