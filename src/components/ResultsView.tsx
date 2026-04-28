import React from 'react';
import type { DietPreference } from '../services/dietFilter';
import DietFilterBar from './DietFilterBar';
import ResultsHeader from './ResultsHeader';
import ResultsEmptyState from './ResultsEmptyState';
import ResultsGrid from './ResultsGrid';
import type { RecipeMatch } from '../services/mealdb';
import type { RankingMode } from '../services/recipeOrchestrator';
import './ResultsView.css';

export interface ResultsViewProps {
  recipes: RecipeMatch[];
  totalRecipeCount: number;
  ingredients: string[];
  plateFilter: DietPreference | null;
  onPlateFilterChange: (v: DietPreference | null) => void;
  rankingMode: RankingMode;
  onNewSearch: () => void;
  onSelectRecipe: (match: RecipeMatch) => void;
  spoonacularNotice: '401' | '402' | null;
  onDismissSpoonacularNotice: () => void;
}

export default function ResultsView({
  recipes,
  totalRecipeCount,
  ingredients,
  plateFilter,
  onPlateFilterChange,
  rankingMode,
  onNewSearch,
  onSelectRecipe,
  spoonacularNotice,
  onDismissSpoonacularNotice,
}: ResultsViewProps) {
  const dietFilteredEmpty =
    recipes.length === 0 && totalRecipeCount > 0 && plateFilter !== null;
  const noMatchesAtAll = totalRecipeCount === 0;

  const showGrouped =
    (rankingMode === 'vegan-first' || rankingMode === 'vegetarian-friendly') &&
    recipes.some((r) => r.recipe.vegan) &&
    recipes.some((r) => !r.recipe.vegan);

  const veganRecipes = recipes.filter((r) => r.recipe.vegan);
  const otherRecipes = recipes.filter((r) => !r.recipe.vegan);

  return (
    <div className="results-view">
      {spoonacularNotice ? (
        <div className="results-api-banner" role="status">
          <p className="results-api-banner-text">
            {spoonacularNotice === '401'
              ? 'Spoonacular API key missing or invalid — using TheMealDB only. Add your key to .env for more recipes.'
              : 'Spoonacular daily quota reached — using TheMealDB only. Resets in 24 hours.'}
          </p>
          <button
            type="button"
            className="results-api-banner-dismiss"
            aria-label="Dismiss"
            onClick={onDismissSpoonacularNotice}
          >
            ×
          </button>
        </div>
      ) : null}
      <ResultsHeader
        recipeCount={recipes.length}
        ingredients={ingredients}
        onNewSearch={onNewSearch}
      >
        <DietFilterBar
          compact
          value={plateFilter}
          onChange={onPlateFilterChange}
        />
      </ResultsHeader>
      <div className="results-scroll">
        {noMatchesAtAll ? (
          <ResultsEmptyState
            variant={
              rankingMode === 'show-all' ? 'default' : 'broaden'
            }
            onTryAgain={onNewSearch}
          />
        ) : dietFilteredEmpty ? (
          <ResultsEmptyState
            variant="diet-filter"
            onTryAgain={onNewSearch}
            onClearDietFilter={() => onPlateFilterChange(null)}
          />
        ) : showGrouped ? (
          <>
            <h2 className="results-section-title results-section-title--vegan">
              🌱 Vegan recipes ({veganRecipes.length})
            </h2>
            <ResultsGrid recipes={veganRecipes} onSelectRecipe={onSelectRecipe} />
            <h2 className="results-section-title results-section-title--other">
              Other recipes ({otherRecipes.length})
            </h2>
            <ResultsGrid recipes={otherRecipes} onSelectRecipe={onSelectRecipe} />
          </>
        ) : (
          <ResultsGrid recipes={recipes} onSelectRecipe={onSelectRecipe} />
        )}
      </div>
    </div>
  );
}
