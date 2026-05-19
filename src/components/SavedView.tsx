import { useMemo } from 'react';
import RecipeCard from './RecipeCard';
import { useStore } from '../hooks/useStore';
import { refreshDietFlagsAll } from '../services/refreshDietFlags';
import { savedRecipesStore } from '../services/savedRecipes';
import type { RecipeMatch } from '../types';
import { formatRelativeTime } from '../utils/relativeTime';
import './ResultsView.css';
import './SavedView.css';

export interface SavedViewProps {
  onBack: () => void;
  onSelectRecipe: (recipeId: string) => void;
}

function toSavedCardMatch(recipe: RecipeMatch['recipe']): RecipeMatch {
  return {
    recipe,
    matchedIngredients: [],
    missingIngredients: [],
    matchScore: 0,
  };
}

export default function SavedView({ onBack, onSelectRecipe }: SavedViewProps) {
  const rows = useStore(savedRecipesStore);
  const sorted = useMemo(
    () =>
      refreshDietFlagsAll([...rows].sort((a, b) => b.savedAt - a.savedAt)),
    [rows],
  );

  const count = sorted.length;

  return (
    <div className="results-view">
      <header className="saved-view-header">
        <button type="button" className="saved-view-back" onClick={onBack}>
          ← Home
        </button>
        <div className="saved-view-hero">
          <p className="saved-view-hero-eyebrow">Cookbook</p>
          <h1 className="saved-view-hero-title">
            Saved recipes ·{' '}
            <span className="saved-view-hero-count">{count}</span>
          </h1>
          <p className="saved-view-hero-lede">
            Snapshots stored on your device — always readable offline.
          </p>
        </div>
      </header>

      <div
        className={
          count === 0
            ? 'results-scroll saved-view-scroll--empty'
            : 'results-scroll'
        }
      >
        {count === 0 ? (
          <div className="saved-view-empty">
            <svg
              className="saved-view-empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1z" />
            </svg>
            <p className="saved-view-empty-title">No saved recipes yet.</p>
            <p className="saved-view-empty-sub">
              Browse recipes and tap the bookmark to save them here.
            </p>
          </div>
        ) : (
          <div className="results-grid">
            {sorted.map((saved, i) => (
              <RecipeCard
                key={saved.id}
                match={toSavedCardMatch(saved.recipe)}
                index={i}
                savedNote={`Saved ${formatRelativeTime(saved.savedAt)}`}
                onClick={() => onSelectRecipe(saved.recipe.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
