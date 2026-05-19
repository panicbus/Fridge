import type { UnifiedRecipe } from '../types';
import { inferDietFlags, pickPublicDietFlags } from './mealdb';

/**
 * Re-runs diet inference on a recipe using the current inference logic.
 * Returns a new recipe object with fresh vegan/vegetarian/glutenFree/dairyFree flags.
 *
 * Diet flags are snapshotted at fetch/save time, but inference improves over time.
 * Recipes saved or recorded under older logic would otherwise keep stale badges.
 *
 * `inferDietFlags` is pure, so this is safe at any time. Storage is unchanged;
 * call this on read paths before UI sees the recipe.
 */
export function refreshDietFlags(recipe: UnifiedRecipe): UnifiedRecipe {
  const fresh = pickPublicDietFlags(
    inferDietFlags(recipe.ingredients, recipe.title),
  );
  if (
    fresh.vegan === recipe.vegan &&
    fresh.vegetarian === recipe.vegetarian &&
    fresh.glutenFree === recipe.glutenFree &&
    fresh.dairyFree === recipe.dairyFree
  ) {
    return recipe;
  }
  return {
    ...recipe,
    ...fresh,
  };
}

/** Convenience for collections (saved recipes, view history, etc.). */
export function refreshDietFlagsAll<T extends { recipe: UnifiedRecipe }>(
  items: T[],
): T[] {
  return items.map((item) => {
    const refreshed = refreshDietFlags(item.recipe);
    if (refreshed === item.recipe) return item;
    return { ...item, recipe: refreshed };
  });
}
