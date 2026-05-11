import type { SavedRecipe, UnifiedRecipe } from '../types';
import { createStore } from './storage';

const store = createStore<SavedRecipe>('fridge.savedRecipes');

function cloneRecipe(recipe: UnifiedRecipe): UnifiedRecipe {
  return JSON.parse(JSON.stringify(recipe)) as UnifiedRecipe;
}

export function getSavedRecipes(): SavedRecipe[] {
  return [...store.getAll()].sort((a, b) => b.savedAt - a.savedAt);
}

export function isSaved(recipeId: string): boolean {
  return store.get(recipeId) !== null;
}

export function saveRecipe(recipe: UnifiedRecipe): SavedRecipe {
  const existing = store.get(recipe.id);
  if (existing) return existing;

  const now = Date.now();
  const saved: SavedRecipe = {
    id: recipe.id,
    recipe: cloneRecipe(recipe),
    savedAt: now,
    updatedAt: now,
  };
  return store.put(saved);
}

export function unsaveRecipe(recipeId: string): boolean {
  return store.remove(recipeId);
}

export function getSavedRecipeById(recipeId: string): SavedRecipe | null {
  return store.get(recipeId);
}

export { store as savedRecipesStore };
