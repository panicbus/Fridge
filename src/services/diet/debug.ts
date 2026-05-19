import type { UnifiedRecipe } from '../../types';
import { inferDietFlags } from './matcher';

/**
 * Dev-only: explain why a recipe got its diet flags.
 * Call from devtools console: window.__explainDiet(recipe)
 */
export function explainDiet(recipe: UnifiedRecipe): void {
  const result = inferDietFlags(recipe.ingredients, recipe.title);
  console.group(`Diet inference: ${recipe.title}`);
  console.log(
    'vegan:',
    result.vegan,
    '| vegetarian:',
    result.vegetarian,
    '| GF:',
    result.glutenFree,
    '| dairy-free:',
    result.dairyFree,
  );
  if (result.explain.animalMatches.length) {
    console.log('Animal matches:');
    for (const m of result.explain.animalMatches) {
      console.log(`  "${m.term}" (${m.category}) in: ${m.ingredient}`);
    }
  }
  if (result.explain.plantClaims.length) {
    console.log('Plant claims:', result.explain.plantClaims.join(', '));
  }
  if (result.explain.glutenMatches.length) {
    console.log('Gluten matches:', result.explain.glutenMatches.join(', '));
  }
  console.groupEnd();
}
