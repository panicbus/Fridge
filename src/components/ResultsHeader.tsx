import React, { type ReactNode } from 'react';
import './ResultsView.css';

export interface ResultsHeaderProps {
  recipeCount: number;
  ingredients: string[];
  onNewSearch: () => void;
  children?: ReactNode;
}

export default function ResultsHeader({
  recipeCount,
  ingredients,
  onNewSearch,
  children,
}: ResultsHeaderProps) {
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
      </div>
      {children ? (
        <div className="results-header-diet">{children}</div>
      ) : null}
    </header>
  );
}
