/** Trailing retail hints Spoonacular attaches, e.g. `olive oil ($0.22)` */
const TRAILING_PRICE_PAREN = /\s*\(\$[\d,]+(?:\.[\d]+)?\)\s*$/i;

/**
 * Removes one or more trailing `($digits)` USD-style price tails from ingredient
 * text (usually the Spoonacular ingredient name column).
 */
export function stripIngredientRetailParen(text: string): string {
  let out = text;
  let prev: string;
  do {
    prev = out;
    out = out.replace(TRAILING_PRICE_PAREN, '').trimEnd();
  } while (out !== prev);
  return out;
}
