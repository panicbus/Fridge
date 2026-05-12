/**
 * Best-effort metric → US customary for on-screen recipe text.
 * Mass (g) uses approximate cups (~125 g/cup); volumes prefer cups over fl oz.
 */

const KG_TO_LB = 2.2046226218487757;
const ML_PER_TSP = 4.92892159375;
const ML_PER_TBSP = 14.78676478125;
const ML_PER_CUP = 236.5882365;

/** Generic grams→cups when density unknown (between flour and packed sugar). */
const GRAMS_PER_CUP_APPROX = 125;

function roundToQuarter(n: number): number {
  return Math.round(n * 4) / 4;
}

/**
 * Positive amounts rounded to nearest ¼: "2", "1/4", "1/2", "3/4", "1 1/4".
 * Use minQuarterWhenPositive for tiny tsp/tbsp so non-zero inputs never format as "0".
 */
function fmtQuarterAmount(n: number, opts?: { minQuarterWhenPositive?: boolean }): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  let r = roundToQuarter(n);
  if (opts?.minQuarterWhenPositive && r === 0 && n > 0) r = 0.25;
  const quarters = Math.round(r * 4);
  const whole = Math.floor(quarters / 4);
  const rem = quarters % 4;
  if (rem === 0) return String(whole);
  const frac = rem === 1 ? '1/4' : rem === 2 ? '1/2' : '3/4';
  if (whole === 0) return frac;
  return `${whole} ${frac}`;
}

/** Singular "cup" for total ≤ 1 (after ¼ rounding); otherwise "cups". */
function cupLabel(cupsRoundedToQuarter: number): 'cup' | 'cups' {
  return cupsRoundedToQuarter <= 1 ? 'cup' : 'cups';
}

function phraseCupAmount(cups: number): string {
  const r = roundToQuarter(cups);
  return `${fmtQuarterAmount(cups)} ${cupLabel(r)}`;
}

function phraseCupRange(ca: number, cb: number): string {
  const ra = roundToQuarter(ca);
  const rb = roundToQuarter(cb);
  const unit = cupLabel(Math.max(ra, rb));
  return `${fmtQuarterAmount(ca)}–${fmtQuarterAmount(cb)} ${unit}`;
}

/** Parse quantities produced by fmtQuarterAmount / plain integers / fractions (for prose fixes). */
function parsePhraseQuantity(raw: string): number | null {
  const s = raw.trim();
  const mixed = /^(\d+)\s+(1\/4|1\/2|3\/4)$/.exec(s);
  if (mixed) {
    const w = Number(mixed[1]);
    const f =
      mixed[2] === '1/4' ? 0.25 : mixed[2] === '1/2' ? 0.5 : 0.75;
    return w + f;
  }
  if (/^(1\/4|1\/2|3\/4)$/.test(s))
    return s === '1/4' ? 0.25 : s === '1/2' ? 0.5 : 0.75;
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

/** Fix "1 cups", "1/2 cups", etc. anywhere in instruction/measure text. */
function fixTrailingCupPlural(input: string): string {
  return input.replace(
    /\b((?:\d+\s+)?(?:1\/4|1\/2|3\/4)|\d+)\s+cups\b/g,
    (full, amt: string) => {
      const n = parsePhraseQuantity(amt.trim());
      if (n === null) return full;
      const unit = cupLabel(roundToQuarter(n));
      return `${amt.trim()} ${unit}`;
    },
  );
}

function normalizeUnitAbbreviations(input: string): string {
  let s = input;
  s = s.replace(/\btblsp\b/gi, 'tbsp');
  s = s.replace(/\btablespoons?\b/gi, 'tbsp');
  s = s.replace(/\bteaspoons?\b/gi, 'tsp');
  return s;
}

function gramsToPhrase(g: number): string {
  if (g < 8) {
    const tsp = g / 5;
    return `${fmtQuarterAmount(tsp, { minQuarterWhenPositive: true })} tsp`;
  }
  if (g < 35) {
    const tbsp = g / 15;
    return `${fmtQuarterAmount(tbsp, { minQuarterWhenPositive: true })} tbsp`;
  }
  const cups = g / GRAMS_PER_CUP_APPROX;
  return phraseCupAmount(cups);
}

function gramsRangePhrase(a: number, b: number): string {
  if (Math.max(a, b) < 35) {
    const ta = a / 15;
    const tb = b / 15;
    return `${fmtQuarterAmount(ta, { minQuarterWhenPositive: true })}–${fmtQuarterAmount(tb, { minQuarterWhenPositive: true })} tbsp`;
  }
  const ca = a / GRAMS_PER_CUP_APPROX;
  const cb = b / GRAMS_PER_CUP_APPROX;
  return phraseCupRange(ca, cb);
}

function kgToPhrase(kg: number): string {
  const lb = kg * KG_TO_LB;
  return `${fmtQuarterAmount(lb)} lb`;
}

function kgRangePhrase(a: number, b: number): string {
  const la = a * KG_TO_LB;
  const lb = b * KG_TO_LB;
  return `${fmtQuarterAmount(la)}–${fmtQuarterAmount(lb)} lb`;
}

function mlToPhrase(ml: number): string {
  if (ml < 7.5) {
    const tsp = ml / ML_PER_TSP;
    return `${fmtQuarterAmount(tsp, { minQuarterWhenPositive: true })} tsp`;
  }
  if (ml < 59) {
    const tbsp = ml / ML_PER_TBSP;
    return `${fmtQuarterAmount(tbsp, { minQuarterWhenPositive: true })} tbsp`;
  }
  const cups = ml / ML_PER_CUP;
  if (cups >= 16)
    return `${fmtQuarterAmount(ml / (ML_PER_CUP * 16))} gal`;
  if (cups >= 4) return `${fmtQuarterAmount(ml / (ML_PER_CUP * 4))} qt`;
  return phraseCupAmount(cups);
}

function mlRangePhrase(a: number, b: number): string {
  const ca = a / ML_PER_CUP;
  const cb = b / ML_PER_CUP;
  if (Math.max(a, b) < 59) {
    const ta = a / ML_PER_TBSP;
    const tb = b / ML_PER_TBSP;
    return `${fmtQuarterAmount(ta, { minQuarterWhenPositive: true })}–${fmtQuarterAmount(tb, { minQuarterWhenPositive: true })} tbsp`;
  }
  return phraseCupRange(ca, cb);
}

function litersToPhrase(l: number): string {
  const cups = (l * 1000) / ML_PER_CUP;
  if (cups >= 16) return `${fmtQuarterAmount(l * 0.264172052)} gal`;
  if (cups >= 4) return `${fmtQuarterAmount(l * 1.056688209432593)} qt`;
  return phraseCupAmount(cups);
}

function litersRangePhrase(a: number, b: number): string {
  const ca = (a * 1000) / ML_PER_CUP;
  const cb = (b * 1000) / ML_PER_CUP;
  return phraseCupRange(ca, cb);
}

function dlToPhrase(dl: number): string {
  return mlToPhrase(dl * 100);
}

function dlRangePhrase(a: number, b: number): string {
  return mlRangePhrase(a * 100, b * 100);
}

function clToPhrase(cl: number): string {
  return mlToPhrase(cl * 10);
}

function clRangePhrase(a: number, b: number): string {
  return mlRangePhrase(a * 10, b * 10);
}

/** US fl oz → cups (8 fl oz = 1 cup). */
function fluidOuncesToCupsPhrase(n: number): string {
  const cups = n / 8;
  return phraseCupAmount(cups);
}

/** Apply numeric metric → imperial replacements (ranges before singles). */
function replaceMetricQuantities(input: string): string {
  let s = input;

  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilos?)\b/gi,
    (_, a: string, b: string) => kgRangePhrase(Number(a), Number(b)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)\b/gi,
    (_, a: string, b: string) => gramsRangePhrase(Number(a), Number(b)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:ml|mLs?|milliliters?|millilitres?|ccs?|cc)\b/gi,
    (_, a: string, b: string) => mlRangePhrase(Number(a), Number(b)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:dl|deciliters?|decilitres?)\b/gi,
    (_, a: string, b: string) => dlRangePhrase(Number(a), Number(b)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:cl|centiliters?|centilitres?)\b/gi,
    (_, a: string, b: string) => clRangePhrase(Number(a), Number(b)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:l|liters?|litres?)\b/gi,
    (_, a: string, b: string) => litersRangePhrase(Number(a), Number(b)),
  );

  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilos?)\b/gi,
    (_, n: string) => kgToPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)\b/gi,
    (_, n: string) => gramsToPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*(?:ml|mLs?|milliliters?|millilitres?|ccs?|cc)\b/gi,
    (_, n: string) => mlToPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*(?:dl|deciliters?|decilitres?)\b/gi,
    (_, n: string) => dlToPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*(?:cl|centiliters?|centilitres?)\b/gi,
    (_, n: string) => clToPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*(?:l|liters?|litres?)\b/gi,
    (_, n: string) => litersToPhrase(Number(n)),
  );

  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*fl\.?\s*oz\b/gi,
    (_, n: string) => fluidOuncesToCupsPhrase(Number(n)),
  );

  /* Weight ounces (avoirdupois) → approximate cups via grams heuristic */
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*oz\b/gi, (_, n: string) =>
    gramsToPhrase(Number(n) * 28.349523125),
  );

  return s;
}

/**
 * Converts metric mass/volume tokens in a short ingredient measure line.
 */
export function convertMetricMeasureToImperial(measure: string): string {
  const t = measure.trim();
  if (!t) return measure;
  let s = replaceMetricQuantities(t);
  s = normalizeUnitAbbreviations(s);
  s = fixTrailingCupPlural(s);
  return s;
}

function celsiusToFahrenheitPhrase(c: number): string {
  const f = Math.round((c * 9) / 5 + 32);
  return `${f}°F`;
}

function replaceCelsius(input: string): string {
  let s = input;
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*℃\b/g,
    (_, n: string) => celsiusToFahrenheitPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*°\s*C\b/gi,
    (_, n: string) => celsiusToFahrenheitPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*degrees?\s+Celsius\b/gi,
    (_, n: string) => celsiusToFahrenheitPhrase(Number(n)),
  );
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*degrees?\s+C\b(?![a-z])/gi,
    (_, n: string) => celsiusToFahrenheitPhrase(Number(n)),
  );
  return s;
}

/**
 * Metric masses/volumes plus °C (oven temps) for full instruction sentences.
 */
export function convertRecipeStepTextToImperial(text: string): string {
  if (!text.trim()) return text;
  let s = replaceMetricQuantities(text);
  s = replaceCelsius(s);
  s = normalizeUnitAbbreviations(s);
  s = fixTrailingCupPlural(s);
  return s;
}
