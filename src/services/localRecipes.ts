import type { RecipeMatch, UnifiedRecipe } from '../types';
import { normalizeInstructionSteps } from '../utils/instructionSteps';
import { inferDietFlags, pickPublicDietFlags } from './mealdb';

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

function parseStringArrayJson(
  raw: string,
  field: string,
  rowId: number,
): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    if (import.meta.env.DEV) {
      console.warn(
        `[local-recipes] Invalid JSON for ${field} on recipe id=${rowId}`,
      );
    }
    return null;
  }
  if (!Array.isArray(parsed)) {
    if (import.meta.env.DEV) {
      console.warn(
        `[local-recipes] Expected array for ${field} on recipe id=${rowId}`,
      );
    }
    return null;
  }
  const lines: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') {
      if (import.meta.env.DEV) {
        console.warn(
          `[local-recipes] Non-string entry in ${field} on recipe id=${rowId}`,
        );
      }
      return null;
    }
    lines.push(item);
  }
  return lines;
}

/** Bundled WebPs are served by the `fridge://` protocol in the Electron main process. */
function localRecipeImageUrl(filename: string | null | undefined): string {
  if (!filename?.trim()) return '';
  const base = filename.trim().split(/[/\\]/).pop() ?? '';
  if (!/^[\w.-]+\.webp$/i.test(base)) return '';
  return `fridge://recipe-images/${encodeURIComponent(base)}`;
}

function rowToRecipe(row: LocalRecipeRow): UnifiedRecipe | null {
  const ingredientStrings = parseStringArrayJson(
    row.ingredients_json,
    'ingredients_json',
    row.id,
  );
  const directions = parseStringArrayJson(
    row.directions_json,
    'directions_json',
    row.id,
  );
  if (!ingredientStrings || !directions) return null;

  const ingredients = ingredientStrings.map(parseIngredientLine);

  const image = localRecipeImageUrl(row.image_path);

  const diet = pickPublicDietFlags(
    inferDietFlags(
      [
        ...ingredients.map((i) => ({ name: i.name, measure: i.measure })),
        ...ingredientStrings.map((raw) => raw.toLowerCase()),
      ],
      row.title,
    ),
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
    sourceName: row.source_name?.trim() || 'Epicurious',
    youtubeUrl: undefined,
    readyInMinutes: row.total_time_minutes ?? undefined,
    servings: undefined,
    ...diet,
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
    let skipped = 0;
    const recipes: UnifiedRecipe[] = [];
    for (const row of rows) {
      const r = rowToRecipe(row);
      if (r) recipes.push(r);
      else skipped++;
    }
    if (import.meta.env.DEV && skipped > 0) {
      console.warn(
        `[local-recipes] Skipped ${skipped} row(s) with invalid JSON or shape`,
      );
    }

    const normalized = userIngredients
      .map((i) => i.toLowerCase().trim())
      .filter(Boolean);

    return recipes.map((recipe) => {
      const recipeNames = recipe.ingredients.map((i) => i.name);
      const matchedIngredients = normalized.filter((ui) =>
        recipeNames.some((ri) => ingredientsMatch(ui, ri)),
      );
      const missingIngredients = recipeNames.filter(
        (ri) => !normalized.some((ui) => ingredientsMatch(ui, ri)),
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
