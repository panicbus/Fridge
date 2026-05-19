import pluralize from 'pluralize';

/**
 * Normalize pantry tokens for recipe search (APIs + local SQLite).
 * Fixes common typos like "tomatos" → "tomato" via pluralize.singular.
 */
export function normalizeIngredientForSearch(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return '';
  const words = s.split(/\s+/).map((word) => {
    const w = word.replace(/[^a-z0-9']/gi, '');
    if (!w) return '';
    return pluralize.singular(w);
  });
  return words.filter(Boolean).join(' ');
}
