import axios from 'axios';
import { COMMON_INGREDIENT_NAMES } from '../data/commonIngredients';
import { getCustomIngredientNames } from './customIngredients';

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

export type RecipeSource = 'spoonacular' | 'mealdb';

export interface UnifiedRecipe {
  id: string;
  source: RecipeSource;
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

/** Pure inference from ingredient name strings; defaults true unless a trigger matches. */
export function inferDietFlags(ingredientNames: string[]): {
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
} {
  const blob = ingredientNames.map((n) => n.toLowerCase()).join(' ');

  const meatFish =
    /\b(beef|chicken|pork|lamb|fish|shrimp|prawn|salmon|tuna|bacon|ham|sausage|turkey|duck|goat|veal|anchovy|crab|lobster|oyster|mussel|clam|octopus|squid|gelatin|lard)\b/i;
  const dairyEggs =
    /\b(milk|butter|cheese|cream|yogurt|yoghurt|egg|eggs|honey|whey|casein)\b/i;

  const vegetarian = !meatFish.test(blob);
  const vegan = vegetarian && !dairyEggs.test(blob);

  let glutenFree = true;
  if (
    /\b(wheat|bread|noodle|barley|rye|couscous|semolina|breadcrumb)\b/i.test(
      blob,
    )
  ) {
    glutenFree = false;
  }
  if (/\bflour\b/i.test(blob) && !/gluten[- ]?free flour/i.test(blob)) {
    glutenFree = false;
  }
  if (/\bsoy sauce\b/i.test(blob)) glutenFree = false;
  if (/\bpasta\b/i.test(blob)) glutenFree = false;

  let dairyFree = true;
  if (/\b(milk|butter|cheese|cream|yogurt|yoghurt|whey)\b/i.test(blob)) {
    dairyFree = false;
  }

  return { vegan, vegetarian, glutenFree, dairyFree };
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
  const names = rows.map((r) => r.name);
  let flags = inferDietFlags(names);
  const cat = (meal.strCategory ?? '').trim().toLowerCase();
  if (cat === 'vegan') {
    flags = { ...flags, vegan: true, vegetarian: true };
  } else if (cat === 'vegetarian') {
    flags = { ...flags, vegetarian: true };
  }

  const tags: string[] = [];
  if (meal.strTags) {
    tags.push(
      ...meal.strTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    );
  }
  if (meal.strCategory) tags.push(meal.strCategory.toLowerCase());

  return {
    id: `mdb-${meal.idMeal}`,
    source: 'mealdb',
    title: meal.strMeal,
    image: meal.strMealThumb ?? '',
    category: meal.strCategory ?? undefined,
    area: meal.strArea ?? undefined,
    tags: [...new Set(tags)],
    instructions: parseSteps(meal.strInstructions ?? ''),
    ingredients: rows.map((r) => ({ name: r.name, measure: r.measure })),
    sourceUrl: meal.strSource ?? undefined,
    youtubeUrl: meal.strYoutube ?? undefined,
    readyInMinutes: undefined,
    servings: undefined,
    vegan: flags.vegan,
    vegetarian: flags.vegetarian,
    glutenFree: flags.glutenFree,
    dairyFree: flags.dairyFree,
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

export function parseSteps(instructions: string): string[] {
  if (!instructions) return [];
  return instructions
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/^\s*\d+[\.\)]\s*/, '').trim(),
    )
    .filter((line) => line.length >= 10);
}
