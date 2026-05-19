import axios from 'axios';
import { COMMON_INGREDIENT_NAMES } from '../data/commonIngredients';
import type { RecipeMatch, UnifiedRecipe } from '../types';
import { normalizeInstructionSteps } from '../utils/instructionSteps';
import { dedupeRecipeTags } from '../utils/recipeTags';
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

/** Strings or name/measure pairs — measure often carries meat wording Spoonacular strips from `name`. */
export type DietInferBlobPart =
  | string
  | { name: string; measure?: string | null };

function flattenDietBlobParts(parts: DietInferBlobPart[]): string[] {
  const chunks: string[] = [];
  for (const p of parts) {
    if (typeof p === 'string') {
      const s = p.toLowerCase().trim();
      if (s) chunks.push(s);
    } else {
      const n = p.name.toLowerCase().trim();
      if (n) chunks.push(n);
      const m = typeof p.measure === 'string' ? p.measure.toLowerCase().trim() : '';
      if (m) chunks.push(m);
    }
  }
  return chunks;
}

/** Pure inference from ingredient strings/lines and optional recipe title. */
export function inferDietFlags(
  ingredients: DietInferBlobPart[],
  title?: string | null,
): {
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
} {
  const chunks = flattenDietBlobParts(ingredients);
  if (title?.trim()) chunks.push(title.toLowerCase());
  const blob = chunks.join(' ');

  // Breadth matters more than rare edge cases (e.g. vegan hot dogs): processed meats,
  // deli cuts, and grinds often omit words like "beef" / "pork" on Spoonacular names.
  const meatFish =
    /\b(?:beef|steaks?|ground\s+beef|(?:ground|minced)\s+(?:beef|round|chuck|sirloin|pork|lamb|turkey|chicken|veal|bison|venison)|chickens?|hen|hens|poultry|pork|bacon|ham|sausages?|bratwurst|salami|pepperoni|prosciutto|chorizo|pastrami|frankfurters?|hot\s*dogs?|wieners?|weenies|franks?|knockwurst|bockwurst|kie(?:l|ł)basas?|polish\s+sausage|andouille|linguicas?|bologna|mortadella|capocollo|capicola|soppressata|spam|corned\s+beef|beef\s+jerky|jerky|pulled\s+pork|pulled\s+chicken|prime\s+rib|baby\s+back\s+ribs?|spareribs|spare[-\s]ribs?|short\s+ribs?|lamb|veal|mutton|turkeys?|duck|duckling|ducks?|goose|geese|rabbit|venison|bison|frog\s+legs?|snails?|escargot|fish|salmon|tuna|cod|halibut|trout|tilapia|bass|perch|sardines?|anchovies?|herring|mackerel|swordfish|catfish|eel|shrimp|shrimps|prawns?|scallops?|crabs?|lobsters?|crawfish|crayfish|oysters?|mussels?|clams?|squid|calamari|octopus|gelatin|lard)\b/i;

  /** Roasts, compound cuts, charcuterie, offal, game — separated for readability. */
  const meatFishExtra =
    /\b(?:st\.?\s+louis\s+ribs?|country\s+style\s+ribs|back\s+ribs|side\s+ribs|rib\s+tips|chuck\s+roast|chuck\s+steak|pot\s+roast|standing\s+rib|ribeye|rib\s+eyes?|delmonico|cowboy\s+steak|tomahawk|t[- ]bone|porterhouse|tri[- ]tip|flank\s+steak|skirt\s+steak|hanger\s+steak|flat\s+iron|denver\s+steak|sirloin\s+tip|sirloin\s+roast|rump\s+roast|eye\s+of\s+round|bottom\s+round|top\s+round|beef\s+tenderloin|pork\s+tenderloin|pork\s+belly|pork\s+butt|pork\s+shoulder|pork\s+loin|pork\s+chops?|pork\s+rinds?|lamb\s+chops?|lamb\s+rack|lamb\s+shank|lamb\s+leg|veal\s+chops?|veal\s+cutlet|veal\s+scaloppini|oxtails?|sweetbreads?|tripe|(?:beef|veal|lamb|pork)\s+kidneys?|(?:beef|veal|lamb)\s+liver|(?:chicken|duck|goose|turkey)\s+livers?|chicken\s+gizzards?|chicken\s+hearts?|duck\s+confit|beef\s+tongue|lamb\s+tongue|bone\s+marrow|head\s+cheese|scrapple|blood\s+sausage|moronga|pheasant|partridge|grouse|woodcock|quail|squab|cornish\s+game\s+hens?|guinea\s+fowl|capons?|elk|moose|caribou|wild\s+boar|antelope|ostrich|emu|alligator|crocodile|snapping\s+turtle|foie\s+gras|guanciale|pancetta|nduja|speck|cotechino|liverwurst)\b/i;

  const meatBroth =
    /\b(?:chicken|beef|turkey|fish|veal|lamb)\s+(?:broth|stock|bouillon)\b/i;
  const fishSauce = /\bfish\s+sauce\b/i;

  // Standalone "meat" / "ground meat" catches marinades & titles when cuts aren't listed,
  // but skip obvious plant/replica phrases ("coconut meat", "Beyond Meat", etc.).
  const plantOrReplicaMeatPhrase =
    /\b(?:coconut|jackfruit|almond|cashew|walnut|pecan|nut|mock|imitation|plant(?:y|-based)?|plant[- ]based|soy|tvp|textured\s+vegetable|meatless|vegan|vegetarian|beyond|impossible)\s+meat\b/i;
  const bareMeatMention =
    /\bmeat\b/i.test(blob) && !plantOrReplicaMeatPhrase.test(blob);

  const hasAnimalFlesh =
    meatFish.test(blob) ||
    meatFishExtra.test(blob) ||
    meatBroth.test(blob) ||
    fishSauce.test(blob) ||
    bareMeatMention;

  const dairyEggs =
    /\b(milk|butter|cheese|cream|yogurt|yoghurt|egg|eggs|honey|whey|casein)\b/i;

  const vegetarian = !hasAnimalFlesh;
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
  const inferred = inferDietFlags(
    rows.map((r) => ({ name: r.name, measure: r.measure })),
    meal.strMeal,
  );
  const cat = (meal.strCategory ?? '').trim().toLowerCase();

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
