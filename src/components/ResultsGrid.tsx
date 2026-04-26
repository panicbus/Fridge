import React from 'react';
import RecipeCard from './RecipeCard';
import type { RecipeMatch } from '../services/mealdb';
import './ResultsView.css';

export interface ResultsGridProps {
  recipes: RecipeMatch[];
  onSelectRecipe: (match: RecipeMatch) => void;
}

export default function ResultsGrid({
  recipes,
  onSelectRecipe,
}: ResultsGridProps) {
  return (
    <div className="results-grid">
      {recipes.map((m, i) => (
        <RecipeCard
          key={m.meal.idMeal}
          match={m}
          index={i}
          onClick={() => onSelectRecipe(m)}
        />
      ))}
    </div>
  );
}
