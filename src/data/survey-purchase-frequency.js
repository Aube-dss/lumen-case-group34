const PURCHASE_FREQUENCY_FIELD = "purchase_frequency_per_month";

export function prepareSurveyPurchaseFrequency(csvText) {
  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new Error("German customer survey CSV text is required.");
  }
  const [header, ...lines] = csvText.trim().split(/\r?\n/);
  const fields = header.split(",");
  const frequencyIndex = fields.indexOf(PURCHASE_FREQUENCY_FIELD);
  if (frequencyIndex < 0) {
    throw new Error("Customer survey is missing " + PURCHASE_FREQUENCY_FIELD + ".");
  }
  if (!lines.length) throw new Error("Customer survey contains no respondent rows.");

  const frequencies = lines.map((line, index) => {
    const value = line.split(",")[frequencyIndex];
    if (value === undefined || value.trim() === "") {
      throw new Error("Missing purchase frequency in survey row " + (index + 2) + ".");
    }
    const frequency = Number(value);
    if (!Number.isFinite(frequency) || frequency <= 0) {
      throw new Error("Invalid purchase frequency in survey row " + (index + 2) + ".");
    }
    return frequency;
  });

  return {
    purchaseFrequencyPerMonth: frequencies.reduce((sum, frequency) => sum + frequency, 0) / frequencies.length,
    respondentCountUsed: frequencies.length,
    source: "German customer survey",
    methodology: "Simple arithmetic mean of purchase_frequency_per_month across all valid German survey respondents. The survey provides no respondent weighting field, so each respondent is counted once. This is a cockpit-wide planning average, not a segment-specific forecast."
  };
}

export { PURCHASE_FREQUENCY_FIELD };
