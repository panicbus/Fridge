import {
  ANIMAL_DAIRY,
  ANIMAL_EGG,
  ANIMAL_FISH,
  ANIMAL_MEAT,
  ANIMAL_OTHER,
  ANIMAL_POULTRY,
  PLANT_ALTERNATIVES,
  PLANT_OVERRIDES,
  PLANT_QUALIFIERS,
} from './lexicons';
import { normalizeText, tokenize } from './normalize';

export type AnimalCategory =
  | 'meat'
  | 'poultry'
  | 'fish'
  | 'dairy'
  | 'egg'
  | 'other';

export interface DietMatch {
  ingredient: string;
  term: string;
  category: AnimalCategory;
}

export interface DietInferenceResult {
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  /** Internal — for debugging, never shown to users */
  explain: {
    animalMatches: DietMatch[];
    plantClaims: string[];
    glutenMatches: string[];
  };
}

/** Flags safe for UnifiedRecipe / storage — excludes internal `explain`. */
export type PublicDietFlags = Pick<
  DietInferenceResult,
  'vegan' | 'vegetarian' | 'glutenFree' | 'dairyFree'
>;

export function pickPublicDietFlags(
  result: DietInferenceResult,
): PublicDietFlags {
  return {
    vegan: result.vegan,
    vegetarian: result.vegetarian,
    glutenFree: result.glutenFree,
    dairyFree: result.dairyFree,
  };
}

export type DietInferBlobPart =
  | string
  | { name?: string; measure?: string };

const ANIMAL_CATEGORIES: { terms: string[]; category: AnimalCategory }[] = [
  { terms: ANIMAL_MEAT, category: 'meat' },
  { terms: ANIMAL_POULTRY, category: 'poultry' },
  { terms: ANIMAL_FISH, category: 'fish' },
  { terms: ANIMAL_DAIRY, category: 'dairy' },
  { terms: ANIMAL_EGG, category: 'egg' },
  { terms: ANIMAL_OTHER, category: 'other' },
];

/** Longest phrases first so multi-word hits claim tokens before shorter sub-phrases. */
function longestFirst(terms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.sort((a, b) => {
    const aw = a.split(' ').length;
    const bw = b.split(' ').length;
    if (bw !== aw) return bw - aw;
    return b.length - a.length;
  });
}

const PLANT_OVERRIDE_TERMS = longestFirst(PLANT_OVERRIDES);
const PLANT_ALT_TERMS = longestFirst(PLANT_ALTERNATIVES);

const ANIMAL_TERM_ROWS = ANIMAL_CATEGORIES.map(({ terms, category }) => ({
  category,
  terms: longestFirst(terms),
}));

// Gluten-bearing terms — separate concern, simpler list.
const GLUTEN_TERMS_RAW = [
  'wheat',
  'flour',
  'bread',
  'breadcrumb',
  'panko',
  'pasta',
  'noodle',
  'spaghetti',
  'macaroni',
  'couscous',
  'barley',
  'rye',
  'malt',
  'bulgur',
  'semolina',
  'farro',
  'spelt',
  'seitan',
  'soy sauce',
  'cracker',
  'tortilla',
  'pita',
  'bun',
  'roll',
  'cake flour',
  'all-purpose flour',
  'beer',
  'cereal',
];

const GLUTEN_FREE_OVERRIDES_RAW = [
  'gluten-free flour',
  'gluten free flour',
  'almond flour',
  'coconut flour',
  'rice flour',
  'corn flour',
  'chickpea flour',
  'oat flour',
  'tapioca flour',
  'gluten-free',
  'gluten free',
  'gluten-free pasta',
  'gluten free pasta',
  'rice noodle',
  'tamari',
  'corn tortilla',
];

const GLUTEN_TERMS = longestFirst(GLUTEN_TERMS_RAW);
const GLUTEN_FREE_OVERRIDES = longestFirst(GLUTEN_FREE_OVERRIDES_RAW);

/**
 * Phrase matcher: if `phrase` appears as a contiguous token subsequence in `tokens`,
 * the matched indices are added to `claimed` and returns true.
 */
function tryClaimPhrase(
  phrase: string,
  tokens: string[],
  claimed: Set<number>,
): boolean {
  const phraseTokens = phrase.split(' ').filter(Boolean);
  if (!phraseTokens.length) return false;

  outer: for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
    for (let j = 0; j < phraseTokens.length; j++) {
      if (claimed.has(i + j) || tokens[i + j] !== phraseTokens[j]) {
        continue outer;
      }
    }
    for (let j = 0; j < phraseTokens.length; j++) claimed.add(i + j);
    return true;
  }
  return false;
}

/**
 * POLICY: ambiguous cases err toward NOT vegan / NOT vegetarian. For a vegan-first app,
 * wrongly hiding a borderline recipe is safer than wrongly badging an animal product as vegan.
 */

function analyzeIngredient(raw: string): {
  animal: DietMatch[];
  plantClaims: string[];
  gluten: string[];
} {
  const normalized = normalizeText(raw);
  const tokens = tokenize(normalized);
  const claimed = new Set<number>();
  const plantClaims: string[] = [];

  // --- STEP 1: claim plant tokens FIRST ---

  for (const term of PLANT_OVERRIDE_TERMS) {
    if (tryClaimPhrase(term, tokens, claimed)) plantClaims.push(term);
  }

  for (const term of PLANT_ALT_TERMS) {
    if (tryClaimPhrase(term, tokens, claimed)) plantClaims.push(term);
  }

  for (let i = 0; i < tokens.length; i++) {
    if (PLANT_QUALIFIERS.includes(tokens[i])) {
      claimed.add(i);
      if (i + 1 < tokens.length) {
        claimed.add(i + 1);
        plantClaims.push(`${tokens[i]} ${tokens[i + 1]}`);
      } else {
        plantClaims.push(tokens[i]);
      }
    }
  }

  // --- STEP 2: animal matching on remaining tokens ---
  const animal: DietMatch[] = [];
  for (const { terms, category } of ANIMAL_TERM_ROWS) {
    for (const term of terms) {
      if (tryClaimPhrase(term, tokens, claimed)) {
        animal.push({ ingredient: raw, term, category });
      }
    }
  }

  // --- STEP 3: gluten (independent of animal/plant logic) ---
  const glutenClaimed = new Set<number>();
  for (const term of GLUTEN_FREE_OVERRIDES) {
    tryClaimPhrase(term, tokens, glutenClaimed);
  }

  const gluten: string[] = [];
  for (const term of GLUTEN_TERMS) {
    if (tryClaimPhrase(term, tokens, glutenClaimed)) {
      gluten.push(term);
    }
  }

  return { animal, plantClaims, gluten };
}

function partToString(part: DietInferBlobPart): string {
  if (typeof part === 'string') return part;
  return [part.measure, part.name].filter(Boolean).join(' ');
}

/**
 * Infer diet flags for a recipe from its ingredient list (and optional title).
 * Pure function — same input always yields same output.
 */
export function inferDietFlags(
  ingredients: DietInferBlobPart[],
  title?: string | null,
): DietInferenceResult {
  const lines = ingredients.map(partToString);
  if (title?.trim()) lines.push(title);

  const animalMatches: DietMatch[] = [];
  const plantClaims: string[] = [];
  const glutenMatches: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const { animal, plantClaims: pc, gluten } = analyzeIngredient(line);
    animalMatches.push(...animal);
    plantClaims.push(...pc);
    glutenMatches.push(...gluten);
  }

  const hasMeatFishPoultry = animalMatches.some(
    (m) =>
      m.category === 'meat' ||
      m.category === 'fish' ||
      m.category === 'poultry',
  );
  const hasDairy = animalMatches.some((m) => m.category === 'dairy');
  const hasOtherAnimal = animalMatches.some((m) => m.category === 'other');

  const vegan = animalMatches.length === 0;
  const vegetarian = !hasMeatFishPoultry && !hasOtherAnimal;
  const dairyFree = !hasDairy;
  const glutenFree = glutenMatches.length === 0;

  return {
    vegan,
    vegetarian,
    glutenFree,
    dairyFree,
    explain: { animalMatches, plantClaims, glutenMatches },
  };
}
