import type { RecipeMatch, UnifiedRecipe } from './mealdb';

export type DietPreference = 'vegan' | 'vegetarian' | 'pescatarian' | 'carnivore';

const RE_LAND_MEAT =
  /\b(beef|steak|chicken|pork|lamb|veal|bacon|sausage|ham|turkey|duck|prosciutto|chorizo|ground beef|mince|oxtail|rabbit)\b/i;

const RE_SEAFOOD =
  /\b(fish|salmon|tuna|cod|haddock|shrimp|prawn|crab|lobster|mussel|clam|oyster|anchov|sardine|tilapia|squid|scallop|halibut|trout|mackerel|sea bass|seafood)\b/i;

function ingBlob(r: UnifiedRecipe): string {
  return r.ingredients.map((i) => i.name).join(' ');
}

function hasLandMeatInRecipe(r: UnifiedRecipe): boolean {
  return RE_LAND_MEAT.test(ingBlob(r));
}

function hasSeafoodInRecipe(r: UnifiedRecipe): boolean {
  return RE_SEAFOOD.test(ingBlob(r));
}

function hasAnimalFlesh(r: UnifiedRecipe): boolean {
  return hasLandMeatInRecipe(r) || hasSeafoodInRecipe(r);
}

export function recipeMatchMeetsDietPreference(
  match: RecipeMatch,
  preference: DietPreference | null,
): boolean {
  if (preference === null) return true;
  const r = match.recipe;
  switch (preference) {
    case 'vegan':
      return r.vegan;
    case 'vegetarian':
      return r.vegetarian;
    case 'pescatarian':
      if (hasLandMeatInRecipe(r)) return false;
      return true;
    case 'carnivore':
      return hasAnimalFlesh(r);
    default:
      return true;
  }
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
