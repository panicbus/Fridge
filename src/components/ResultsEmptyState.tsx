import React from 'react';
import './ResultsEmptyState.css';

export interface ResultsEmptyStateProps {
  onTryAgain: () => void;
  variant?: 'default' | 'diet-filter';
  onClearDietFilter?: () => void;
}

export default function ResultsEmptyState({
  onTryAgain,
  variant = 'default',
  onClearDietFilter,
}: ResultsEmptyStateProps) {
  const isDiet = variant === 'diet-filter';

  return (
    <div className="results-empty">
      <p>
        {isDiet
          ? 'No recipes match the diet filter you chose.'
          : 'No recipes found for those ingredients.'}
      </p>
      <p className="results-empty-hint">
        {isDiet
          ? 'Clear the diet filter or try a different one.'
          : 'Try different items or fewer filters.'}
      </p>
      {isDiet && onClearDietFilter ? (
        <button
          type="button"
          className="results-empty-btn results-empty-btn--ghost"
          onClick={onClearDietFilter}
        >
          Clear diet filter
        </button>
      ) : null}
      <button type="button" className="results-empty-btn" onClick={onTryAgain}>
        {isDiet ? 'New search' : 'Try again'}
      </button>
    </div>
  );
}
