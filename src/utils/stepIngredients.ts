import type { UnifiedRecipe } from '../types';

export interface StepIngredient {
  name: string;
  measure: string;
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
    const n = rawName.toLowerCase();
    if (!n) continue;

    const idx = mask.indexOf(n);
    if (idx === -1) continue;

    staged.push({
      ing: { name: rawName, measure: row.measure },
      index: idx,
    });

    mask =
      mask.slice(0, idx) +
      '\u0000'.repeat(n.length) +
      mask.slice(idx + n.length);
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
