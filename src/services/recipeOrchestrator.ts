import type { RecipeMatch, UnifiedRecipe } from '../types';
import { findRecipesMealDB } from './mealdb';
import { findRecipesLocal } from './localRecipes';
import {
  clearSpoonacularError,
  findRecipesSpoonacular,
} from './spoonacular';

// Spoonacular is off by default. The bundled local trove + MealDB provides
// enough coverage. To re-enable, set VITE_ENABLE_SPOONACULAR=true in .env
// (and ensure VITE_SPOONACULAR_API_KEY is set).
const SPOONACULAR_ENABLED =
  import.meta.env.VITE_ENABLE_SPOONACULAR === 'true';

// Epicurious / Layer 2 vs API ranking in sortKey().
// was 5; bumped so Epicurious / Layer 2 results win ranking against API sources
// unless the API ingredient match is dramatically stronger.
// The bundled local trove is image-required, properly attributed, and pre-filtered
// for quality — it should surface preferentially over API results unless the API
// result has a meaningfully better ingredient match. +25 does that without
// entirely silencing the APIs.
const LOCAL_BOOST = 25;

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
  const localBoost = r.source === 'local' ? LOCAL_BOOST : 0;
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

/** Grid thumbnails: https MealDB/Spoonacular, or bundled `fridge://` WebPs. */
function hasUsableImage(recipe: UnifiedRecipe): boolean {
  const img = recipe.image;
  if (!img || typeof img !== 'string') return false;
  if (img === 'null' || img === 'undefined') return false;
  if (!/^(https?|fridge):\/\//.test(img)) return false;
  return true;
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

  const sources: Promise<RecipeMatch[]>[] = [
    findRecipesLocal(userIngredients),
    findRecipesMealDB(userIngredients),
  ];
  if (SPOONACULAR_ENABLED) {
    sources.push(findRecipesSpoonacular(userIngredients));
  }

  const sourceLabels = SPOONACULAR_ENABLED
    ? (['local', 'mealdb', 'spoonacular'] as const)
    : (['local', 'mealdb'] as const);

  const settled = await Promise.allSettled(sources);
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
  list = list.filter((m) => hasUsableImage(m.recipe));

  if (import.meta.env.DEV) {
    console.info('[recipe-search] after dedupe + image filter', {
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
