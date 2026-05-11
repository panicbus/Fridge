import React, { type ReactNode } from 'react';
import { useStore } from '../hooks/useStore';
import { savedRecipesStore } from '../services/savedRecipes';
import './Header.css';
import './ResultsView.css';

export interface ResultsHeaderProps {
  recipeCount: number;
  ingredients: string[];
  onNewSearch: () => void;
  onOpenSaved?: () => void;
  children?: ReactNode;
}

export default function ResultsHeader({
  recipeCount,
  ingredients,
  onNewSearch,
  onOpenSaved,
  children,
}: ResultsHeaderProps) {
  const savedRows = useStore(savedRecipesStore);
  const savedCount = savedRows.length;

  return (
    <header className="results-header">
      <div className="results-header-top">
        <button type="button" className="back-btn-top" onClick={onNewSearch}>
          ← New search
        </button>
        <div className="results-info">
          <span className="results-count">
            {recipeCount} recipe{recipeCount === 1 ? '' : 's'} for:
          </span>
          {ingredients.map((t) => (
            <span key={t} className="results-ing-tag">
              {t}
            </span>
          ))}
        </div>
        {onOpenSaved ? (
          <button
            type="button"
            className="app-header-btn"
            onClick={onOpenSaved}
          >
            {savedCount > 0 ? (
              <>
                Saved ·{' '}
                <span className="app-header-btn-count">{savedCount}</span>
              </>
            ) : (
              'Saved'
            )}
          </button>
        ) : null}
      </div>
      {children ? (
        <div className="results-header-diet">{children}</div>
      ) : null}
    </header>
  );
}
