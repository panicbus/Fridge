import axios, { isAxiosError } from 'axios';
import type { RecipeMatch, UnifiedRecipe } from './mealdb';

const BASE = 'https://api.spoonacular.com';

const client = axios.create({ baseURL: BASE, timeout: 30000 });

export interface SpoonacularFindItem {
  id: number;
  title: string;
  image: string;
  usedIngredients: { name: string }[];
  missedIngredients: { name: string }[];
  usedIngredientCount: number;
  missedIngredientCount: number;
}

export interface SpoonacularRecipeInfo {
  id: number;
  title: string;
  image: string;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  cuisines: string[];
  dishTypes: string[];
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  instructions?: string;
  analyzedInstructions?: { steps: { step: string }[] }[];
  extendedIngredients: {
    name: string;
    nameClean?: string;
    original: string;
  }[];
}

/** Full recipe details shape from `/recipes/{id}/information`. */
export type SpoonacularRecipe = SpoonacularRecipeInfo;

let spoonacularErrorBanner: '401' | '402' | null = null;

export function clearSpoonacularError(): void {
  spoonacularErrorBanner = null;
}

export function getSpoonacularErrorBanner(): '401' | '402' | null {
  return spoonacularErrorBanner;
}

function setSpoonacularError(status: number): void {
  if (status === 401 || status === 402) {
    spoonacularErrorBanner = status === 401 ? '401' : '402';
  }
}

function getApiKey(): string {
  const k = import.meta.env.VITE_SPOONACULAR_API_KEY;
  return typeof k === 'string' ? k.trim() : '';
}

/**
 * Spoonacular sometimes returns protocol-relative or path-only image fields.
 * Builds a usable https URL; falls back to the standard recipe image pattern.
 */
export function normalizeSpoonacularImageUrl(
  image: string | null | undefined,
  recipeId: number,
): string {
  const s = (image ?? '').trim();
  if (!s) {
    return `https://img.spoonacular.com/recipes/${recipeId}-312x231.jpg`;
  }
  if (s.startsWith('//')) {
    return `https:${s}`;
  }
  if (/^https:\/\//i.test(s)) {
    return s;
  }
  if (/^http:\/\//i.test(s)) {
    return `https://${s.slice(7)}`;
  }
  const clean = s.replace(/^\//, '');
  if (clean.startsWith('recipeImages/')) {
    return `https://spoonacular.com/${clean}`;
  }
  if (/^\d+-\d+x\d+\.(jpe?g|png)$/i.test(clean)) {
    return `https://img.spoonacular.com/recipes/${clean}`;
  }
  if (clean.startsWith('recipes/')) {
    return `https://img.spoonacular.com/${clean}`;
  }
  return `https://img.spoonacular.com/${clean}`;
}

async function findByIngredients(
  ingredients: string[],
  apiKey: string,
): Promise<SpoonacularFindItem[]> {
  const comma = ingredients.map((s) => s.trim()).filter(Boolean).join(',');
  const { data } = await client.get<SpoonacularFindItem[]>(
    '/recipes/findByIngredients',
    {
      params: {
        ingredients: comma,
        number: 25,
        ranking: 2,
        ignorePantry: true,
        apiKey,
      },
    },
  );
  return Array.isArray(data) ? data : [];
}

async function getRecipeInfo(
  id: number,
  apiKey: string,
): Promise<SpoonacularRecipeInfo | null> {
  try {
    const { data } = await client.get<SpoonacularRecipeInfo>(
      `/recipes/${id}/information`,
      {
        params: {
          includeNutrition: false,
          apiKey,
        },
      },
    );
    return data;
  } catch (e) {
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s === 401 || s === 402) setSpoonacularError(s);
    }
    console.error('Spoonacular getRecipeInfo', e);
    return null;
  }
}

function mapInfoToUnified(
  info: SpoonacularRecipeInfo,
  findRow: SpoonacularFindItem,
): UnifiedRecipe {
  const tagSet = new Set<string>();
  for (const t of info.dishTypes ?? []) {
    if (t) tagSet.add(t.toLowerCase());
  }
  for (const t of info.cuisines ?? []) {
    if (t) tagSet.add(t.toLowerCase());
  }
  const tags = [...tagSet];

  let instructions: string[] = [];
  const analyzed = info.analyzedInstructions?.[0]?.steps;
  if (analyzed?.length) {
    instructions = analyzed.map((s) => s.step.trim()).filter(Boolean);
  } else if (info.instructions?.trim()) {
    instructions = info.instructions
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*\d+[\.\)]\s*/, '').trim())
      .filter((l) => l.length >= 4);
  }

  const ingredients = (info.extendedIngredients ?? []).map((ext) => ({
    name: (ext.nameClean || ext.name || '').toLowerCase().trim(),
    measure: ext.original ?? '',
  }));

  return {
    id: `spn-${info.id}`,
    source: 'spoonacular',
    title: info.title,
    image: normalizeSpoonacularImageUrl(info.image || findRow.image, info.id),
    category: info.dishTypes?.[0],
    area: info.cuisines?.[0],
    tags,
    instructions,
    ingredients,
    sourceUrl: info.sourceUrl || undefined,
    youtubeUrl: undefined,
    readyInMinutes: info.readyInMinutes,
    servings: info.servings,
    vegan: info.vegan,
    vegetarian: info.vegetarian,
    glutenFree: info.glutenFree,
    dairyFree: info.dairyFree,
  };
}

function matchFromFindAndUnified(
  unified: UnifiedRecipe,
  findRow: SpoonacularFindItem,
  normalizedUser: string[],
): RecipeMatch {
  const usedNames = findRow.usedIngredients.map((u) =>
    u.name.toLowerCase().trim(),
  );
  const missedNames = findRow.missedIngredients.map((m) =>
    m.name.toLowerCase().trim(),
  );
  const matchedSet = new Set<string>();
  for (const u of normalizedUser) {
    if (usedNames.some((n) => n.includes(u) || u.includes(n))) {
      matchedSet.add(u);
    }
  }
  const matchedIngredients = [...matchedSet];
  const total = findRow.usedIngredientCount + findRow.missedIngredientCount;
  const matchScore =
    total > 0 ? findRow.usedIngredientCount / total : 0;

  return {
    recipe: unified,
    matchedIngredients,
    missingIngredients: missedNames,
    matchScore,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

export async function findRecipesSpoonacular(
  userIngredients: string[],
): Promise<RecipeMatch[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const normalized = [
    ...new Set(
      userIngredients.map((s) => s.toLowerCase().trim()).filter(Boolean),
    ),
  ];
  if (normalized.length === 0) return [];

  try {
    const found = await findByIngredients(normalized, apiKey);
    if (!found.length) return [];

    const infos = await mapWithConcurrency(found, 5, async (row) => {
      const info = await getRecipeInfo(row.id, apiKey);
      return { row, info };
    });

    const results: RecipeMatch[] = [];
    for (const { row, info } of infos) {
      if (!info) continue;
      const unified = mapInfoToUnified(info, row);
      results.push(matchFromFindAndUnified(unified, row, normalized));
    }

    results.sort((a, b) => {
      const c = b.matchedIngredients.length - a.matchedIngredients.length;
      if (c !== 0) return c;
      return b.matchScore - a.matchScore;
    });

    return results;
  } catch (e) {
    console.error('findRecipesSpoonacular', e);
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s === 401 || s === 402) setSpoonacularError(s);
    }
    return [];
  }
}
