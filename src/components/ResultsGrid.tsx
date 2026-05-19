import RecipeCard from './RecipeCard';
import type { RecipeMatch } from '../types';
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
          key={m.recipe.id}
          match={m}
          index={i}
          onClick={() => onSelectRecipe(m)}
        />
      ))}
    </div>
  );
}
