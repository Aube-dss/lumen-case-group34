import { createCockpitDecisionEngine } from "./src/data/cockpit-decision-data.js";
import { germanSurveyPurchaseFrequency } from "./src/data/prepared-german-survey.js";
import { createLaunchRecommendation, parseSeasonalityRows, compareToRecommendation } from "./src/engine/recommendation-engine.js";
import { localPriceTestCsv, localSeasonalityCsv } from "./src/data/local-csv-snapshots.js";

const polish = document.createElement("style");
polish.textContent = `
  body { background: linear-gradient(135deg, #fffdf8 0%, #f4f7f1 54%, #edf3ed 100%); }
  main { position: relative; }
  main::before { content: ""; position: absolute; inset: 0 0 auto; height: 190px; background: radial-gradient(circle at 87% 12%, rgba(212,154,54,.16), transparent 30%), radial-gradient(circle at 15% 5%, rgba(27,91,66,.08), transparent 28%); pointer-events: none; z-index: -1; }
  .explore { background: rgba(255,255,255,.58); padding: 22px 24px 28px; border: 1px solid #e1e9e1; border-radius: 12px; box-shadow: 0 10px 28px rgba(23,63,48,.05); }
  .explore legend { color: #173f30; }
  .price { box-shadow: 0 3px 0 #e9efe9; transition: transform .18s ease, box-shadow .18s ease; }
  .price.selected { box-shadow: 0 4px 0 #0f3f2c; }
  .price:hover { transform: translateY(-2px); box-shadow: 0 7px 14px rgba(23,63,48,.12); }
  .kpis { box-shadow: 0 8px 22px rgba(23,63,48,.06); }
  .kpis article { transition: transform .2s ease, box-shadow .2s ease; }
  .kpis article:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(23,63,48,.1); position: relative; z-index: 1; }
  .timing { background: rgba(255,255,255,.45); padding-left: 20px; padding-right: 20px; border-radius: 12px; }
  .methodology { color: #42554b; }
  .methodology strong { color: #173f30; }
  .hero { position: relative; padding: 18px 0 30px; }
  .hero::after { content: ""; position: absolute; right: 5%; top: 18px; width: 150px; height: 150px; border: 1px solid rgba(212,154,54,.35); border-radius: 50%; box-shadow: 0 0 0 18px rgba(212,154,54,.06), 0 0 0 38px rgba(27,91,66,.04); pointer-events: none; }
  .hero h1 { position: relative; z-index: 1; font-size: clamp(2.5rem, 7vw, 5rem); max-width: 760px; }
  .hero h2 { color: #8c5d14; font-size: .84rem; letter-spacing: .1em; text-transform: uppercase; }
  .hero-note { position: relative; z-index: 1; }
  .signal-rail { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 0 0 38px; background: #cbdacf; border: 1px solid #cbdacf; box-shadow: 0 12px 26px rgba(23,63,48,.08); }
  .signal-rail div { min-height: 104px; padding: 17px 18px; background: #173f30; color: #f5faf6; display: grid; align-content: space-between; gap: 5px; }
  .signal-rail div:nth-child(2) { background: #d49a36; color: #173f30; }
  .signal-rail div:nth-child(3) { background: #eaf2eb; color: #173f30; }
  .signal-rail div:nth-child(4) { background: #fffdf8; color: #173f30; }
  .signal-rail span { font-size: .64rem; font-weight: 800; letter-spacing: .12em; opacity: .78; }
  .signal-rail strong { font-size: 1.45rem; letter-spacing: -.03em; }
  .signal-rail small { font-size: .75rem; opacity: .78; }
  .signal-rail b { font-weight: 850; }
  @media (max-width: 700px) { .explore { padding: 18px 16px 22px; } }
  @media (max-width: 700px) { .hero::after { right: -30px; top: 12px; transform: scale(.7); } .signal-rail { grid-template-columns: 1fr 1fr; margin-bottom: 26px; } .signal-rail div { min-height: 92px; padding: 13px; } .signal-rail strong { font-size: 1.15rem; } }
`;
document.head.appendChild(polish);
document.querySelector(".hero-mark span:last-child").textContent = "Decision studio · Germany 2026";

const channels = ["DTC Online", "Retail/Grocery", "Gym & Office"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const presets = {
  recommendation: { label: "Recommended route", price: 2.19, mix: { "DTC Online": 60, "Retail/Grocery": 20, "Gym & Office": 20 } },
  reach: { label: "Reach-led", price: 1.79, mix: { "DTC Online": 40, "Retail/Grocery": 35, "Gym & Office": 25 } },
  premium: { label: "Premium economics", price: 2.59, mix: { "DTC Online": 60, "Retail/Grocery": 20, "Gym & Office": 20 } }
};
const state = { selectedPrice: 2.19, channelAllocation: { "DTC Online": 60, "Retail/Grocery": 20, "Gym & Office": 20 } };
const $ = (selector) => document.querySelector(selector);
const euro = (value) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(value);
const euroLeading = (value) => "€" + Number(value).toFixed(2);
let evaluate, recommendation;

function renderControls() {
  $("#price-controls").innerHTML = [1.79, 2.19, 2.59].map((price) => '<button class="price ' + (state.selectedPrice === price ? "selected" : "") + '" data-price="' + price + '">€' + price.toFixed(2) + "</button>").join("");
  $("#mix-controls").innerHTML = channels.map((channel) => '<label>' + channel + '<input type="range" min="0" max="100" value="' + state.channelAllocation[channel] + '" data-channel="' + channel + '"><output>' + state.channelAllocation[channel] + '%</output></label>').join("");
  document.querySelectorAll("[data-price]").forEach((button) => button.addEventListener("click", () => { state.selectedPrice = Number(button.dataset.price); render(); }));
  document.querySelectorAll("[data-channel]").forEach((input) => input.addEventListener("input", () => rebalance(input.dataset.channel, Number(input.value))));
  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    const preset = presets[button.dataset.preset];
    state.selectedPrice = preset.price;
    state.channelAllocation = { ...preset.mix };
    render();
  }));
  document.querySelectorAll("[data-preset]").forEach((button) => {
    const preset = presets[button.dataset.preset];
    const selected = state.selectedPrice === preset.price && channels.every((channel) => state.channelAllocation[channel] === preset.mix[channel]);
    button.classList.toggle("active", selected);
  });
}
function rebalance(changed, next) {
  const other = channels.filter((channel) => channel !== changed);
  const previousOther = other.reduce((sum, channel) => sum + state.channelAllocation[channel], 0);
  state.channelAllocation[changed] = next;
  other.forEach((channel, index) => { state.channelAllocation[channel] = index === 0 ? Math.round((100 - next) * state.channelAllocation[channel] / previousOther) : 100 - next - state.channelAllocation[other[0]]; });
  if (previousOther === 0) { state.channelAllocation[other[0]] = Math.round((100 - next) / 2); state.channelAllocation[other[1]] = 100 - next - state.channelAllocation[other[0]]; }
  render();
}
function render() {
  renderControls();
  try {
    const result = evaluate(state);
    $("#error").hidden = true;
    $("#acceptance").textContent = result.estimatedAcceptancePct.toFixed(1) + "%";
    $("#rail-price").textContent = "€" + state.selectedPrice.toFixed(2);
    $("#contribution").textContent = euro(result.contributionMarginPerUnitEur);
    $("#payback").textContent = result.approximateCacPaybackMonths == null ? "Not available" : result.approximateCacPaybackMonths.toFixed(1) + " months";
    $("#tradeoff").textContent = result.tradeoff.headline;
    $("#retail-note").textContent = result.tradeoff.retailNote ?? "";
    const shortMix = (mix) => Object.entries(mix).map(([channel, value]) => channel.replace(" Online", "").replace("/Grocery", "").replace(" & Office", "") + " " + value + "%").join("<br>");
    const same = state.selectedPrice === recommendation.recommendedPrice && Object.keys(state.channelAllocation).every((channel) => state.channelAllocation[channel] === recommendation.recommendedChannelMix[channel]);
    $("#comparison").innerHTML = '<div class="scenario-grid"><div><span>Your selection</span><strong>€' + state.selectedPrice.toFixed(2) + '</strong><p>' + shortMix(state.channelAllocation) + '</p></div><div><span>Recommended</span><strong>€' + recommendation.recommendedPrice.toFixed(2) + '</strong><p>' + shortMix(recommendation.recommendedChannelMix) + '</p></div></div><p class="muted">' + (same ? "You’re on the recommended route." : compareToRecommendation(result, recommendation)) + '</p>';
    $("#scenario-label").textContent = same ? "Recommended route active" : "Exploring an alternative route";
    $("#scenario-insight").textContent = same ? "This opening scenario balances 51.7% tested acceptance with €1.05 contribution per unit." : compareToRecommendation(result, recommendation);
  } catch (error) { $("#error").textContent = error.message; $("#error").hidden = false; }
}
async function load() {
  try {
    const loadCsv = async (path, label) => {
      const response = await fetch(new URL(path, import.meta.url));
      if (!response.ok) throw new Error("Unable to load " + label + " (" + response.status + ").");
      const text = await response.text();
      if (!text.trim()) throw new Error(label + " is empty.");
      return text;
    };
    const [priceTestCsv, seasonalityCsv] = window.location.protocol === "file:"
      ? [localPriceTestCsv, localSeasonalityCsv]
      : await Promise.all([
        loadCsv("./data/price_test_results.csv", "price-test data"),
        loadCsv("./data/seasonality_and_weather.csv", "seasonality data")
      ]);
    evaluate = createCockpitDecisionEngine({ priceTestCsv, surveyAggregate: germanSurveyPurchaseFrequency }).evaluate;
    const rows = parseSeasonalityRows(seasonalityCsv); const peak = Math.max(...rows.map((row) => row.seasonalityIndex)); const peakMonths = rows.filter((row) => row.seasonalityIndex === peak).map((row) => row.month).join(", ");
    const peakMonthName = monthNames[Number(peakMonths) - 1] || peakMonths;
    $("#seasonality-summary").textContent = "Demand peaks in " + peakMonthName + ", with a seasonality index of " + peak + "—" + (peak - 100) + "% above the 100 average.";
    $("#seasonality").innerHTML = rows.map((row) => '<div class="' + (row.seasonalityIndex === peak ? "peak" : "") + '" title="' + monthNames[row.month - 1] + ': ' + row.seasonalityIndex + '"><b>' + row.seasonalityIndex + '</b><i style="height:' + Math.max(32, row.seasonalityIndex * 1.1) + 'px"></i><span>' + monthNames[row.month - 1] + "</span></div>").join("");
    recommendation = createLaunchRecommendation({ evaluateDecision: evaluate, seasonalityRows: rows });
    $("#recommended-price").textContent = "Recommended price: €" + recommendation.recommendedPrice.toFixed(2);
    $("#recommended-mix").textContent = Object.entries(recommendation.recommendedChannelMix).map(([channel, value]) => channel.replace(" Online", "").replace("/Grocery", "").replace(" & Office", "") + " " + value + "%").join(" / ");
    $("#recommended-timing").textContent = "Launch April–May to build awareness before the July demand peak.";
    $("#decision-line").textContent = "Choose the balanced route: protect acceptance while improving contribution and payback.";
    $("#recommendation-metrics").innerHTML = '<div><span>Customer acceptance · Exhibit 11</span><strong>' + recommendation.keyMetrics.estimatedAcceptancePct.toFixed(1) + '%</strong></div><div><span>Contribution / unit · Exhibits 9 and 11</span><strong>' + euro(recommendation.keyMetrics.contributionMarginPerUnitEur) + '</strong></div><div><span>CAC · Exhibit 7</span><strong>€44 benchmark</strong></div>';
    const recommendedContribution = recommendation.keyMetrics.contributionMarginPerUnitEur;
    const payback = recommendation.keyMetrics.approximateCacPaybackMonths;
    $("#calculation-note").innerHTML = '<div><strong>Contribution per unit · Exhibits 9 and 11</strong><span>60% DTC × €1.16 + 20% Retail × €0.63 + 20% Gym × €1.13 = ' + euroLeading(recommendedContribution) + '</span></div><div><strong>Estimated CAC payback · Exhibits 4 and 7</strong><span>€44 CAC ÷ (' + euroLeading(recommendedContribution) + ' contribution × 6.14 purchases per month) = ' + payback.toFixed(1) + ' months</span></div><p>This is a survey-based directional estimate, not a guaranteed forecast, because German sales data is not yet available.</p>';
    const downside = 44 / (recommendedContribution * 0.8 * 6.144285714285714 * 0.8);
    const upside = 44 / (recommendedContribution * 1.2 * 6.144285714285714 * 1.2);
    $("#scenario-note").innerHTML = '<strong>Scenario range:</strong> ' + payback.toFixed(1) + ' months base case · ' + upside.toFixed(1) + ' months upside case · ' + downside.toFixed(1) + ' months downside case.<br><span>Estimated CAC payback: approximately ' + payback.toFixed(1) + ' months in the base case. This estimate uses survey-reported purchase frequency and the €44 CAC benchmark, so it is directional and not yet validated by German sales. The estimated range is ' + upside.toFixed(1) + ' months in an upside case to ' + downside.toFixed(1) + ' months in a downside case.</span>';
    $("#price-comparison-body").innerHTML = [1.79, 2.19, 2.59].map((price) => {
      const output = evaluate({ selectedPrice: price, channelAllocation: recommendation.recommendedChannelMix });
      return '<tr class="' + (price === recommendation.recommendedPrice ? "recommended" : "") + '"><th scope="row">€' + price.toFixed(2) + (price === recommendation.recommendedPrice ? " <span>Recommended</span>" : "") + '</th><td>' + output.estimatedAcceptancePct.toFixed(1) + '%</td><td>' + euroLeading(output.contributionMarginPerUnitEur) + '</td><td>' + (output.approximateCacPaybackMonths == null ? "N/A" : output.approximateCacPaybackMonths.toFixed(1) + " mo") + '</td></tr>';
    }).join("");
    $("#recommendation-reasons").innerHTML = recommendation.rationale.map((reason) => "<li>" + reason + "</li>").join("");
    $("#recommendation-tradeoff").textContent = recommendation.tradeoff;
    render();
  } catch (error) { $("#error").textContent = error.message || "Unable to load launch data. Check the data files or connection."; $("#error").hidden = false; }
}
load();
