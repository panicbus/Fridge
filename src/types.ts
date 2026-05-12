/** Top-level app screen / route */
export type AppView =
  | 'home'
  | 'results'
  | 'detail'
  | 'saved'
  | 'history'
  | 'pantry-manage'
  | 'cook-mode';

export type RecipeSource = 'spoonacular' | 'mealdb';

export interface UnifiedRecipe {
  id: string;
  source: RecipeSource;
  /** Original source id without prefix (e.g. MealDB id or Spoonacular id). */
  sourceId: string;
  title: string;
  image: string;
  category?: string;
  area?: string;
  tags: string[];
  instructions: string[];
  ingredients: { name: string; measure: string }[];
  sourceUrl?: string;
  youtubeUrl?: string;
  readyInMinutes?: number;
  servings?: number;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
}

export interface RecipeMatch {
  recipe: UnifiedRecipe;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchScore: number;
}

export interface SavedRecipe {
  id: string;
  recipe: UnifiedRecipe;
  savedAt: number;
  updatedAt: number;
}

/** Diet ranking mode at search time (matches RankingMode). */
export type SearchHistoryDietPreference =
  | 'vegan-first'
  | 'vegetarian-friendly'
  | 'show-all';

export interface SearchHistoryEntry {
  id: string;
  timestamp: number;
  ingredients: string[];
  dietPreference: SearchHistoryDietPreference;
  resultCount: number;
}

export interface RecipeViewEntry {
  id: string;
  recipe: UnifiedRecipe;
  viewedAt: number;
  updatedAt: number;
}
