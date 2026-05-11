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
