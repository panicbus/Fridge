import type { RecipeViewEntry, UnifiedRecipe } from '../types';
import { refreshDietFlags, refreshDietFlagsAll } from './refreshDietFlags';
import { createCappedStore } from './storage';

export const recipeViewHistoryStore = createCappedStore<RecipeViewEntry>(
  'fridge.recipeViewHistory',
  {
    maxSize: 200,
    sortField: 'viewedAt',
  },
);

export function getRecipeViewHistory(): RecipeViewEntry[] {
  return refreshDietFlagsAll(
    [...recipeViewHistoryStore.getAll()].sort(
      (a, b) => b.viewedAt - a.viewedAt,
    ),
  );
}

export function recordRecipeView(recipe: UnifiedRecipe): RecipeViewEntry {
  const now = Date.now();
  const row: RecipeViewEntry = {
    id: recipe.id,
    recipe,
    viewedAt: now,
    updatedAt: now,
  };
  return recipeViewHistoryStore.put(row);
}

export function getRecipeViewById(recipeId: string): RecipeViewEntry | null {
  const row = recipeViewHistoryStore.get(recipeId);
  if (!row) return null;
  const refreshed = refreshDietFlags(row.recipe);
  if (refreshed === row.recipe) return row;
  return { ...row, recipe: refreshed };
}

/** Remove one recipe from recently viewed (e.g. History page). */
export function removeRecipeView(id: string): boolean {
  return recipeViewHistoryStore.remove(id);
}

export function clearRecipeViewHistory(): void {
  recipeViewHistoryStore.clear();
}
