import type { RecipeMatch, UnifiedRecipe } from '../types';
import { normalizeInstructionSteps } from '../utils/instructionSteps';
import { inferDietFlags } from './mealdb';

export interface LocalRecipeRow {
  id: number;
  title: string;
  ingredients_json: string;
  directions_json: string;
  ner_json: string;
  source_url: string | null;
  source_name: string | null;
  image_path: string | null;
  total_time_minutes: number | null;
}

function parseIngredientLine(str: string): { name: string; measure: string } {
  const s = str.trim();
  const measureMatch = s.match(
    /^([\d\s/.¼½¾⅓⅔⅛⅜⅝⅞]+\s*[a-zA-Z]*\.?)\s+(.+)$/,
  );
  if (measureMatch) {
    return {
      measure: measureMatch[1].trim(),
      name: measureMatch[2].trim().toLowerCase(),
    };
  }
  return { name: s.toLowerCase(), measure: '' };
}

async function rowToRecipe(row: LocalRecipeRow): Promise<UnifiedRecipe> {
  const ingredientStrings: string[] = JSON.parse(row.ingredients_json);
  const directions: string[] = JSON.parse(row.directions_json);

  const ingredients = ingredientStrings.map(parseIngredientLine);
  const ingredientNames = ingredients.map((i) => i.name);

  let image = '';
  if (row.image_path?.trim() && window.localRecipes?.resolveImage) {
    image = await window.localRecipes.resolveImage(row.image_path.trim());
  }

  const dietFlags = inferDietFlags(
    [
      ...ingredients.map((i) => ({ name: i.name, measure: i.measure })),
      ...ingredientStrings.map((raw) => raw.toLowerCase()),
    ],
    row.title,
  );

  const instructionsBlob = directions.filter(Boolean).join('\n');

  return {
    id: `local-${row.id}`,
    source: 'local',
    sourceId: String(row.id),
    title: row.title,
    image,
    category: undefined,
    area: undefined,
    tags: [],
    instructions: normalizeInstructionSteps(instructionsBlob),
    ingredients,
    sourceUrl: row.source_url || undefined,
    youtubeUrl: undefined,
    readyInMinutes: row.total_time_minutes ?? undefined,
    servings: undefined,
    ...dietFlags,
  };
}

function ingredientsMatch(userIng: string, recipeIng: string): boolean {
  if (!userIng || !recipeIng) return false;
  return userIng.includes(recipeIng) || recipeIng.includes(userIng);
}

export async function findRecipesLocal(
  userIngredients: string[],
): Promise<RecipeMatch[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  if (!window.localRecipes?.search) {
    if (import.meta.env.DEV) {
      console.warn(
        '[recipe-search] Local trove skipped: window.localRecipes is missing. Use DevTools on the Electron app window (View → Toggle Developer Tools), not a standalone browser tab.',
      );
    }
    return [];
  }

  if (userIngredients.length === 0) {
    return [];
  }

  try {
    const rows = (await window.localRecipes.search(
      userIngredients,
      120,
    )) as unknown as LocalRecipeRow[];
    if (import.meta.env.DEV) {
      console.info(
        '[recipe-search] Local SQLite:',
        rows.length,
        'raw rows for ingredients',
        userIngredients,
      );
    }
    const recipes = await Promise.all(rows.map(rowToRecipe));
    const normalized = userIngredients
      .map((i) => i.toLowerCase().trim())
      .filter(Boolean);

    return recipes.map((recipe) => {
      const recipeNames = recipe.ingredients.map((i) => i.name);
      const matchedIngredients = normalized.filter((ui) =>
        recipeNames.some((ri) => ingredientsMatch(ui, ri)),
      );
      const missingIngredients = recipeNames.filter(
        (ri) =>
          !normalized.some((ui) => ingredientsMatch(ui, ri)),
      );
      const matchScore =
        recipeNames.length > 0
          ? matchedIngredients.length / recipeNames.length
          : 0;
      return {
        recipe,
        matchedIngredients,
        missingIngredients,
        matchScore,
      };
    });
  } catch (e) {
    console.error('Local recipe search failed:', e);
    return [];
  }
}
