import React from 'react';
import type { DietPreference } from '../services/dietFilter';
import DietFilterBar from './DietFilterBar';
import ResultsHeader from './ResultsHeader';
import ResultsEmptyState from './ResultsEmptyState';
import ResultsGrid from './ResultsGrid';
import type { RecipeMatch } from '../services/mealdb';
import './ResultsView.css';

export interface ResultsViewProps {
  recipes: RecipeMatch[];
  /** Unfiltered count from API (for empty state when diet hides all) */
  totalRecipeCount: number;
  ingredients: string[];
  dietPreference: DietPreference | null;
  onDietPreferenceChange: (v: DietPreference | null) => void;
  onNewSearch: () => void;
  onSelectRecipe: (match: RecipeMatch) => void;
}

export default function ResultsView({
  recipes,
  totalRecipeCount,
  ingredients,
  dietPreference,
  onDietPreferenceChange,
  onNewSearch,
  onSelectRecipe,
}: ResultsViewProps) {
  const dietFilteredEmpty =
    recipes.length === 0 && totalRecipeCount > 0 && dietPreference !== null;
  const noMatchesAtAll = totalRecipeCount === 0;

  return (
    <div className="results-view">
      <ResultsHeader
        recipeCount={recipes.length}
        ingredients={ingredients}
        onNewSearch={onNewSearch}
      >
        <DietFilterBar
          compact
          value={dietPreference}
          onChange={onDietPreferenceChange}
        />
      </ResultsHeader>
      <div className="results-scroll">
        {noMatchesAtAll ? (
          <ResultsEmptyState onTryAgain={onNewSearch} />
        ) : dietFilteredEmpty ? (
          <ResultsEmptyState
            variant="diet-filter"
            onTryAgain={onNewSearch}
            onClearDietFilter={() => onDietPreferenceChange(null)}
          />
        ) : (
          <ResultsGrid recipes={recipes} onSelectRecipe={onSelectRecipe} />
        )}
      </div>
    </div>
  );
}
