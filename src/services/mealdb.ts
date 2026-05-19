import axios from 'axios';
import { COMMON_INGREDIENT_NAMES } from '../data/commonIngredients';
import type { RecipeMatch, UnifiedRecipe } from '../types';
import { normalizeInstructionSteps } from '../utils/instructionSteps';
import { dedupeRecipeTags } from '../utils/recipeTags';
import { getCustomIngredientNames } from './customIngredients';
import { inferDietFlags } from './diet/matcher';

export type {
  DietInferBlobPart,
  DietInferenceResult,
  PublicDietFlags,
} from './diet/matcher';

export { inferDietFlags, pickPublicDietFlags } from './diet/matcher';

const BASE = 'https://www.themealdb.com/api/json/v1/1';

const mealApi = axios.create({ baseURL: BASE, timeout: 20000 });

/** TheMealDB: append /small, /medium, or /large to strMealThumb for smaller files. */
export type MealImageSize = 'small' | 'medium' | 'large';

export function mealImageSrc(
  strMealThumb: string | null | undefined,
  size: MealImageSize = 'small',
): string | null {
  if (!strMealThumb?.trim()) return null;
  let base = strMealThumb.trim().replace(/\/+$/, '');
  if (base.startsWith('http://')) {
    base = `https://${base.slice(7)}`;
  }
  const sized = /\/(small|medium|large|preview)$/i;
  if (sized.test(base)) {
    base = base.replace(sized, '');
  }
  return `${base}/${size}`;
}

export interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strTags: string | null;
  strYoutube: string | null;
  strSource: string | null;
  [key: string]: string | null | undefined;
}

export interface ExtractedIngredient {
  name: string;
  measure: string;
}

export function extractIngredients(meal: Meal): ExtractedIngredient[] {
  const out: ExtractedIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const rawName = meal[`strIngredient${i}`];
    const rawMeasure = meal[`strMeasure${i}`];
    const name = typeof rawName === 'string' ? rawName.toLowerCase().trim() : '';
    if (!name) continue;
    const measure =
      typeof rawMeasure === 'string' ? rawMeasure.trim() : '';
    out.push({ name, measure });
  }
  return out;
}

export function mapMealToUnifiedRecipe(meal: Meal): UnifiedRecipe {
  const rows = extractIngredients(meal);
  const inferred = inferDietFlags(
    rows.map((r) => ({ name: r.name, measure: r.measure })),
    meal.strMeal,
  );
  const cat = (meal.strCategory ?? '').trim().toLowerCase();

  // Category can suggest vegan/vegetarian, but inference always wins on contradiction
  // (e.g. category "Vegan" with fish sauce in ingredients → not vegetarian).
  let vegan = inferred.vegan;
  let vegetarian = inferred.vegetarian;
  if (cat === 'vegan') {
    vegan = true;
    vegetarian = true;
  } else if (cat === 'vegetarian') {
    vegetarian = true;
  }
  if (!inferred.vegetarian) {
    vegetarian = false;
    vegan = false;
  } else if (!inferred.vegan) {
    vegan = false;
  }

  const rawTags: string[] = [];
  if (meal.strTags) {
    rawTags.push(
      ...meal.strTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    );
  }
  const tags = dedupeRecipeTags(
    rawTags,
    meal.strCategory ?? undefined,
    meal.strArea ?? undefined,
  );

  return {
    id: `mdb-${meal.idMeal}`,
    source: 'mealdb',
    sourceId: meal.idMeal,
    title: meal.strMeal,
    image: meal.strMealThumb ?? '',
    category: meal.strCategory ?? undefined,
    area: meal.strArea ?? undefined,
    tags: [...new Set(tags)],
    instructions: normalizeInstructionSteps(meal.strInstructions ?? ''),
    ingredients: rows.map((r) => ({ name: r.name, measure: r.measure })),
    sourceUrl: meal.strSource ?? undefined,
    youtubeUrl: meal.strYoutube ?? undefined,
    readyInMinutes: undefined,
    servings: undefined,
    vegan,
    vegetarian,
    glutenFree: inferred.glutenFree,
    dairyFree: inferred.dairyFree,
  };
}

function ingredientsMatch(userIng: string, recipeIng: string): boolean {
  if (!userIng || !recipeIng) return false;
  return userIng.includes(recipeIng) || recipeIng.includes(userIng);
}

export function buildRecipeMatch(
  recipe: UnifiedRecipe,
  normalizedUser: string[],
): RecipeMatch {
  const recipeNames = recipe.ingredients.map((r) => r.name);
  const totalRecipe = recipeNames.length;

  const matchedSet = new Set<string>();
  for (const u of normalizedUser) {
    for (const rName of recipeNames) {
      if (ingredientsMatch(u, rName)) {
        matchedSet.add(u);
        break;
      }
    }
  }
  const matchedIngredients = [...matchedSet];

  const missingIngredients = recipeNames.filter(
    (rName) => !normalizedUser.some((u) => ingredientsMatch(u, rName)),
  );

  const matchScore =
    totalRecipe > 0 ? matchedIngredients.length / totalRecipe : 0;

  return {
    recipe,
    matchedIngredients,
    missingIngredients,
    matchScore,
  };
}

export function recipeCardImageSrc(recipe: UnifiedRecipe): string | null {
  if (!recipe.image?.trim()) return null;
  if (recipe.source === 'mealdb') {
    return mealImageSrc(recipe.image, 'medium');
  }
  return recipe.image;
}

export function recipeHeroImageSrc(recipe: UnifiedRecipe): string | null {
  if (!recipe.image?.trim()) return null;
  if (recipe.source === 'mealdb') {
    return mealImageSrc(recipe.image, 'large');
  }
  return recipe.image;
}

export async function getAllIngredients(): Promise<string[]> {
  try {
    const { data } = await mealApi.get<{
      meals: { strIngredient: string }[] | null;
    }>('/list.php?i=list');
    if (!data.meals) return [];
    return data.meals
      .map((m) => m.strIngredient.toLowerCase().trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Merges TheMealDB names, static commons, and locally saved user lexicon; deduped, sorted A–Z. */
export function mergeIngredientAutocompleteLists(
  fromApi: string[],
): string[] {
  const set = new Set<string>();
  for (const raw of COMMON_INGREDIENT_NAMES) {
    const n = raw.toLowerCase().trim();
    if (n) set.add(n);
  }
  for (const raw of fromApi) {
    const n = raw.toLowerCase().trim();
    if (n) set.add(n);
  }
  for (const raw of getCustomIngredientNames()) {
    const n = raw.toLowerCase().trim();
    if (n) set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Ingredient list for tag autocomplete: API + static commons (offline still has commons). */
export async function getAllIngredientsForAutocomplete(): Promise<string[]> {
  const api = await getAllIngredients();
  return mergeIngredientAutocompleteLists(api);
}

export async function findRecipesMealDB(
  userIngredients: string[],
): Promise<RecipeMatch[]> {
  const normalized = [
    ...new Set(
      userIngredients.map((s) => s.toLowerCase().trim()).filter(Boolean),
    ),
  ];
  if (normalized.length === 0) return [];

  const idToFrequency = new Map<string, number>();

  for (const ing of normalized) {
    try {
      const { data } = await mealApi.get<{
        meals: { idMeal: string }[] | null;
      }>(`/filter.php?i=${encodeURIComponent(ing)}`);
      const list = data.meals;
      if (!list) continue;
      for (const row of list) {
        idToFrequency.set(row.idMeal, (idToFrequency.get(row.idMeal) ?? 0) + 1);
      }
    } catch {
      /* ignore */
    }
  }

  const topIds = [...idToFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  const meals: Meal[] = [];
  for (const id of topIds) {
    try {
      const { data } = await mealApi.get<{ meals: Meal[] | null }>(
        `/lookup.php?i=${encodeURIComponent(id)}`,
      );
      const m = data.meals?.[0];
      if (m) meals.push(m);
    } catch {
      /* skip */
    }
  }

  const results: RecipeMatch[] = meals.map((meal) =>
    buildRecipeMatch(mapMealToUnifiedRecipe(meal), normalized),
  );

  results.sort((a, b) => {
    const byCount =
      b.matchedIngredients.length - a.matchedIngredients.length;
    if (byCount !== 0) return byCount;
    return b.matchScore - a.matchScore;
  });

  return results;
}

/** @deprecated Prefer {@link normalizeInstructionSteps} from `utils/instructionSteps`. */
export function parseSteps(instructions: string): string[] {
  return normalizeInstructionSteps(instructions);
}
