import axios from 'axios';

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

export interface RecipeMatch {
  meal: Meal;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchScore: number;
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

function ingredientsMatch(userIng: string, recipeIng: string): boolean {
  if (!userIng || !recipeIng) return false;
  return userIng.includes(recipeIng) || recipeIng.includes(userIng);
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

export async function findRecipes(userIngredients: string[]): Promise<RecipeMatch[]> {
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
      /* ignore failed ingredient */
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

  const results: RecipeMatch[] = meals.map((meal) => {
    const recipeRows = extractIngredients(meal);
    const recipeNames = recipeRows.map((r) => r.name);
    const totalRecipe = recipeNames.length;

    const matchedSet = new Set<string>();
    for (const u of normalized) {
      for (const rName of recipeNames) {
        if (ingredientsMatch(u, rName)) {
          matchedSet.add(u);
          break;
        }
      }
    }
    const matchedIngredients = [...matchedSet];

    const missingIngredients = recipeNames.filter(
      (rName) => !normalized.some((u) => ingredientsMatch(u, rName)),
    );

    const matchScore =
      totalRecipe > 0 ? matchedIngredients.length / totalRecipe : 0;

    return {
      meal,
      matchedIngredients,
      missingIngredients,
      matchScore,
    };
  });

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
