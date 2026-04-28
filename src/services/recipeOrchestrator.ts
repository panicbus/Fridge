import { findRecipesMealDB, type RecipeMatch } from './mealdb';
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
    default:
      return { preferVegan: true, hideNonVegan: false };
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
  return (
    (preferVegan && r.vegan ? 1000 : 0) +
    (preferVegetarian && r.vegetarian ? 200 : 0) +
    matchedCount * 10 +
    m.matchScore * 50
  );
}

function dedupeMatches(matches: RecipeMatch[]): RecipeMatch[] {
  const byTitle = new Map<string, RecipeMatch>();
  for (const m of matches) {
    const key = normalizeTitle(m.recipe.title);
    if (!key) continue;
    const prev = byTitle.get(key);
    if (!prev) {
      byTitle.set(key, m);
      continue;
    }
    const mSpn = m.recipe.source === 'spoonacular';
    const pSpn = prev.recipe.source === 'spoonacular';
    if (mSpn && !pSpn) {
      byTitle.set(key, m);
    } else if (!mSpn && pSpn) {
      /* keep richer source */
    } else if (m.matchScore > prev.matchScore) {
      byTitle.set(key, m);
    }
  }
  return [...byTitle.values()];
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
  ]);

  let combined: RecipeMatch[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') combined.push(...r.value);
  }

  let list = dedupeMatches(combined);

  if (prefs.hideNonVegan) {
    list = list.filter((x) => x.recipe.vegan);
  }

  list.sort((a, b) => sortKey(b, prefs) - sortKey(a, prefs));

  return list.slice(0, 30);
}
