import type { UnifiedRecipe } from '../types';
import { stripIngredientRetailParen } from './ingredientRetailParen';

export interface StepIngredient {
  name: string;
  measure: string;
}

const EXTRA_WORD_SKIP = new Set([
  'about',
  'fresh',
  'dried',
  'finely',
  'roughly',
  'rough',
  'chopped',
  'sliced',
  'minced',
  'large',
  'small',
  'medium',
  'optional',
]);

/**
 * Phrases derived from how an ingredient appears in `recipe.ingredients` — used for
 * fuzzy substring matches against lowered step text ("chile" inside "… (Korean chile flakes)").
 * Longest matches win; parentheses and comma slashes become separate searchable chunks.
 */
function phrasesForIngredientName(rawName: string): string[] {
  const canon = stripIngredientRetailParen(rawName).trim().toLowerCase();
  const uniq = new Set<string>();
  const add = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim().toLowerCase();
    if (t.length >= 2) uniq.add(t);
  };

  add(canon);

  for (const m of canon.matchAll(/\(([^)]+)\)/g)) {
    const inner = m[1].trim().toLowerCase();
    add(inner);
    for (const part of inner.split(/[,/]|\bor\b|\band\b/i)) {
      add(part.trim());
    }
  }

  const withoutParen = canon
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  add(withoutParen);

  for (const seg of canon.split(/\s*[,\/]\s*/)) {
    add(seg.trim());
  }

  const words = withoutParen.split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (w.length >= 5 && !EXTRA_WORD_SKIP.has(w)) {
      add(w);
    }
  }

  return [...uniq].sort((a, b) => b.length - a.length);
}

export function extractStepIngredients(
  stepText: string,
  allIngredients: UnifiedRecipe['ingredients'],
): StepIngredient[] {
  const lower = stepText.toLowerCase();
  const sorted = [...allIngredients].sort(
    (a, b) => b.name.trim().length - a.name.trim().length,
  );

  let mask = lower;
  const staged: { ing: StepIngredient; index: number }[] = [];

  for (const row of sorted) {
    const rawName = row.name.trim();
    if (!rawName) continue;

    const phrases = phrasesForIngredientName(rawName);

    let best: { idx: number; len: number } | null = null;

    for (const phrase of phrases) {
      const idx = mask.indexOf(phrase);
      if (idx === -1) continue;
      const len = phrase.length;
      if (
        best === null ||
        idx < best.idx ||
        (idx === best.idx && len > best.len)
      ) {
        best = { idx, len };
      }
    }

    if (best === null) continue;

    staged.push({
      ing: { name: rawName, measure: row.measure },
      index: best.idx,
    });

    mask =
      mask.slice(0, best.idx) +
      '\u0000'.repeat(best.len) +
      mask.slice(best.idx + best.len);
  }

  staged.sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const out: StepIngredient[] = [];
  for (const { ing } of staged) {
    const key = ing.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ing);
  }

  return out;
}
