import { createCappedStore } from './storage';
import type { RecipeViewEntry, UnifiedRecipe } from '../types';

export const recipeViewHistoryStore = createCappedStore<RecipeViewEntry>(
  'fridge.recipeViewHistory',
  {
    maxSize: 200,
    sortField: 'viewedAt',
  },
);

export function getRecipeViewHistory(): RecipeViewEntry[] {
  return [...recipeViewHistoryStore.getAll()].sort(
    (a, b) => b.viewedAt - a.viewedAt,
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
  return recipeViewHistoryStore.get(recipeId);
}

export function clearRecipeViewHistory(): void {
  recipeViewHistoryStore.clear();
}
