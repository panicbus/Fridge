import type { Meal, RecipeMatch } from './mealdb';
import { extractIngredients } from './mealdb';

export type DietPreference = 'vegan' | 'vegetarian' | 'pescatarian' | 'carnivore';

const LAND_MEAT_CATEGORIES = new Set([
  'beef',
  'chicken',
  'pork',
  'lamb',
  'goat',
  'duck',
]);

function cat(meal: Meal): string {
  return (meal.strCategory ?? '').trim().toLowerCase();
}

function tags(meal: Meal): string {
  return (meal.strTags ?? '').toLowerCase();
}

function ingBlob(meal: Meal): string {
  return extractIngredients(meal)
    .map((i) => i.name)
    .join(' ');
}

const RE_LAND_MEAT =
  /\b(beef|steak|chicken|pork|lamb|veal|bacon|sausage|ham|turkey|duck|prosciutto|chorizo|ground beef|mince|oxtail|rabbit)\b/i;

const RE_SEAFOOD =
  /\b(fish|salmon|tuna|cod|haddock|shrimp|prawn|crab|lobster|mussel|clam|oyster|anchov|sardine|tilapia|squid|scallop|halibut|trout|mackerel|sea bass|seafood)\b/i;

const RE_DAIRY_EGG =
  /\b(milk|cream|butter|cheese|yogurt|yoghurt|egg|eggs|parmesan|mozzarella|cheddar|feta|ricotta|gouda|mayonnaise|ghee)\b/i;

const RE_HONEY_GELATIN = /\b(honey|gelatin)\b/i;

function hasLandMeatCategory(meal: Meal): boolean {
  return LAND_MEAT_CATEGORIES.has(cat(meal));
}

function hasLandMeatInRecipe(meal: Meal): boolean {
  if (hasLandMeatCategory(meal)) return true;
  return RE_LAND_MEAT.test(ingBlob(meal));
}

function hasSeafoodCategory(meal: Meal): boolean {
  return cat(meal) === 'seafood';
}

function hasSeafoodInRecipe(meal: Meal): boolean {
  if (hasSeafoodCategory(meal)) return true;
  return RE_SEAFOOD.test(ingBlob(meal));
}

function hasAnimalFlesh(meal: Meal): boolean {
  return hasLandMeatInRecipe(meal) || hasSeafoodInRecipe(meal);
}

function isClearlyVeganLabeled(meal: Meal): boolean {
  return cat(meal) === 'vegan' || /\bvegan\b/.test(tags(meal));
}

function hasNonVeganIngredients(meal: Meal): boolean {
  if (hasAnimalFlesh(meal)) return true;
  if (RE_DAIRY_EGG.test(ingBlob(meal))) return true;
  if (RE_HONEY_GELATIN.test(ingBlob(meal))) return true;
  if (cat(meal) === 'vegetarian') return true;
  return false;
}

export function mealMatchesDietPreference(
  meal: Meal,
  preference: DietPreference,
): boolean {
  switch (preference) {
    case 'vegan':
      if (isClearlyVeganLabeled(meal)) return true;
      return !hasNonVeganIngredients(meal);

    case 'vegetarian':
      if (hasLandMeatInRecipe(meal) || hasSeafoodInRecipe(meal)) return false;
      return true;

    case 'pescatarian':
      if (hasLandMeatInRecipe(meal)) return false;
      return true;

    case 'carnivore':
      return hasAnimalFlesh(meal);

    default:
      return true;
  }
}

export function recipeMatchMeetsDietPreference(
  match: RecipeMatch,
  preference: DietPreference | null,
): boolean {
  if (preference === null) return true;
  return mealMatchesDietPreference(match.meal, preference);
}

export const DIET_OPTIONS: {
  id: DietPreference;
  label: string;
}[] = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'carnivore', label: 'Carnivore' },
];
