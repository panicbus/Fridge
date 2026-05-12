import pluralize from 'pluralize';

/**
 * Canonical lowercase key so "carrot", "carrots", and "Carrots" collide.
 * Multi-word phrases singularize the last token only ("green beans" → "green bean").
 */
export function ingredientDedupeKey(name: string): string {
  const raw = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!raw) return '';

  const words = raw.split(' ');
  const last = words[words.length - 1]!;
  const singularLast = pluralize.singular(last);
  return [...words.slice(0, -1), singularLast].join(' ');
}

export function ingredientsSameItem(a: string, b: string): boolean {
  return ingredientDedupeKey(a) === ingredientDedupeKey(b);
}

/** Keep first spelling/casing; drop later entries that match the same food item. */
export function dedupeIngredientNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const trimmed = n.trim();
    if (!trimmed) continue;
    const k = ingredientDedupeKey(trimmed);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(trimmed);
  }
  return out;
}
