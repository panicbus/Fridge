import type { RecipeMatch } from '../types';
import { findRecipesMealDB } from './mealdb';
import { findRecipesLocal } from './localRecipes';
import {
  clearSpoonacularError,
  findRecipesSpoonacular,
} from './spoonacular';

export interface RecipePreferences {
  preferVegan?: boolean;
  preferVegetarian?: boolean;
  hideNonVegan?: boolean;
}

export type RankingMode =
  | 'vegan-first'
  | 'vegetarian-friendly'
  | 'show-all';

export function rankingModeToPreferences(mode: RankingMode): RecipePreferences {
  switch (mode) {
    case 'vegan-first':
      return { preferVegan: true, preferVegetarian: false, hideNonVegan: false };
    case 'vegetarian-friendly':
      return {
        preferVegan: true,
        preferVegetarian: true,
        hideNonVegan: false,
      };
    case 'show-all':
      return {
        preferVegan: false,
        preferVegetarian: false,
        hideNonVegan: false,
      };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortKey(m: RecipeMatch, prefs: RecipePreferences): number {
  const r = m.recipe;
  const preferVegan = prefs.preferVegan ?? true;
  const preferVegetarian = prefs.preferVegetarian ?? false;
  const matchedCount = m.matchedIngredients.length;
  const localBoost = r.source === 'local' ? 5 : 0;
  return (
    (preferVegan && r.vegan ? 1000 : 0) +
    (preferVegetarian && r.vegetarian ? 200 : 0) +
    matchedCount * 10 +
    m.matchScore * 50 +
    localBoost
  );
}

function countBySource(matches: RecipeMatch[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of matches) {
    const s = m.recipe.source;
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

function dedupeMatches(matches: RecipeMatch[]): RecipeMatch[] {
  const byKey = new Map<string, RecipeMatch>();
  for (const m of matches) {
    const titleKey = normalizeTitle(m.recipe.title);
    if (!titleKey) continue;
    const key = `${m.recipe.source}:${titleKey}`;
    const prev = byKey.get(key);
    if (!prev || m.matchScore > prev.matchScore) {
      byKey.set(key, m);
    }
  }
  return [...byKey.values()];
}

export async function findRecipes(
  userIngredients: string[],
  preferences?: RecipePreferences,
): Promise<RecipeMatch[]> {
  const prefs: RecipePreferences = {
    preferVegan: preferences?.preferVegan ?? true,
    preferVegetarian: preferences?.preferVegetarian ?? false,
    hideNonVegan: preferences?.hideNonVegan ?? false,
  };

  clearSpoonacularError();

  const settled = await Promise.allSettled([
    findRecipesSpoonacular(userIngredients),
    findRecipesMealDB(userIngredients),
    findRecipesLocal(userIngredients),
  ]);

  const sourceLabels = ['spoonacular', 'mealdb', 'local'] as const;
  if (import.meta.env.DEV) {
    settled.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`[recipe-search] ${sourceLabels[i]} rejected`, r.reason);
      }
    });
  }

  let combined: RecipeMatch[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') combined.push(...r.value);
  }

  if (import.meta.env.DEV) {
    console.info('[recipe-search] merged', {
      bySource: countBySource(combined),
      total: combined.length,
      ingredients: userIngredients,
    });
  }

  let list = dedupeMatches(combined);

  if (import.meta.env.DEV) {
    console.info('[recipe-search] after dedupe', {
      bySource: countBySource(list),
      total: list.length,
    });
  }

  if (prefs.hideNonVegan) {
    list = list.filter((x) => x.recipe.vegan);
  }

  list.sort((a, b) => sortKey(b, prefs) - sortKey(a, prefs));

  if (import.meta.env.DEV) {
    const top = list.slice(0, 30);
    console.info('[recipe-search] returning top 30', {
      bySource: countBySource(top),
      totalShown: top.length,
    });
  }

  return list.slice(0, 30);
}
