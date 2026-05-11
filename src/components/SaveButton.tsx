import React, { useCallback, useMemo, useState } from 'react';
import { useStore } from '../hooks/useStore';
import {
  saveRecipe,
  savedRecipesStore,
  unsaveRecipe,
} from '../services/savedRecipes';
import type { UnifiedRecipe } from '../types';
import './SaveButton.css';

export interface SaveButtonProps {
  recipe: UnifiedRecipe;
  size?: 'sm' | 'md';
  variant?: 'overlay' | 'inline';
}

export default function SaveButton({
  recipe,
  size = 'sm',
  variant = 'inline',
}: SaveButtonProps) {
  const savedRows = useStore(savedRecipesStore);
  const saved = useMemo(
    () => savedRows.some((r) => r.id === recipe.id),
    [savedRows, recipe.id],
  );

  const [bouncing, setBouncing] = useState(false);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (saved) {
        unsaveRecipe(recipe.id);
        return;
      }
      saveRecipe(recipe);
      setBouncing(true);
      window.setTimeout(() => setBouncing(false), 650);
    },
    [recipe, saved],
  );

  return (
    <button
      type="button"
      className={`save-button save-button--size-${size} save-button--variant-${variant}`}
      onClick={onClick}
      aria-label={saved ? 'Remove from saved' : 'Save recipe'}
      aria-pressed={saved}
    >
      <span className="save-button-hit">
        {bouncing ? (
          <span className="save-burst" aria-hidden>
            <span className="save-burst-arm save-burst-arm--c">
              <span className="save-burst-line" />
            </span>
            <span className="save-burst-arm save-burst-arm--l">
              <span className="save-burst-line" />
            </span>
            <span className="save-burst-arm save-burst-arm--r">
              <span className="save-burst-line" />
            </span>
          </span>
        ) : null}
        <span className={`save-button-bookmark ${bouncing ? 'bouncing' : ''}`}>
          <svg
            viewBox="0 0 24 24"
            width="100%"
            height="100%"
            fill={saved ? 'var(--accent)' : 'none'}
            stroke={saved ? 'none' : 'currentColor'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
