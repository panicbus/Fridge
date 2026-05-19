import React, { useMemo } from 'react';
import CachedMealImage from './CachedMealImage';
import RecipeThumbFallback from './RecipeThumbFallback';
import { useStore } from '../hooks/useStore';
import { recipeCardImageSrc } from '../services/mealdb';
import { savedRecipesStore } from '../services/savedRecipes';
import './SavedCard.css';

export interface SavedCardProps {
  onViewAll: () => void;
  onSelectRecipe: (recipeId: string) => void;
}

function metaParts(category?: string, readyInMinutes?: number): string[] {
  const parts: string[] = [];
  if (category?.trim()) parts.push(category.trim());
  if (typeof readyInMinutes === 'number' && Number.isFinite(readyInMinutes)) {
    parts.push(`${readyInMinutes} min`);
  }
  return parts;
}

export default function SavedCard({
  onViewAll,
  onSelectRecipe,
}: SavedCardProps) {
  const rows = useStore(savedRecipesStore);
  const savedRecipes = useMemo(
    () => [...rows].sort((a, b) => b.savedAt - a.savedAt),
    [rows],
  );

  const count = savedRecipes.length;
  const preview = savedRecipes.slice(0, 10);

  return (
    <section className="saved-card">
      <div className="saved-card-header">
        <span className="saved-card-header-el">— SAVED ·</span>
        {count === 0 ? (
          <span className="saved-card-count-link saved-card-count-link--inactive">
            {count}
          </span>
        ) : (
          <button
            type="button"
            className="saved-card-count-link"
            onClick={onViewAll}
          >
            {count}
          </button>
        )}
        <span className="saved-card-header-el">—</span>
      </div>

      {count === 0 ? (
        <p className="saved-card-empty">
          Recipes you save will appear here.
        </p>
      ) : (
        <>
          <ul className="saved-card-list">
            {preview.map((saved, index) => {
              const { recipe } = saved;
              const thumbSrc = recipeCardImageSrc(recipe);
              const metaLine = metaParts(
                recipe.category,
                recipe.readyInMinutes,
              ).join(' · ');
              return (
                <li key={saved.id}>
                  <button
                    type="button"
                    className={`saved-card-row ${index === 0 ? 'saved-card-row--first' : ''}`}
                    title={recipe.title}
                    onClick={() => onSelectRecipe(recipe.id)}
                  >
                    {thumbSrc ? (
                      <CachedMealImage
                        src={thumbSrc}
                        alt=""
                        className="saved-card-thumb"
                      />
                    ) : (
                      <RecipeThumbFallback
                        seed={recipe.id}
                        title={recipe.title}
                        density="compact"
                        className="saved-card-thumb"
                      />
                    )}
                    <div className="saved-card-text-col">
                      <span className="saved-card-title">{recipe.title}</span>
                      {metaLine ? (
                        <span className="saved-card-meta">{metaLine}</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {savedRecipes.length > 10 ? (
            <div className="saved-card-footer">
              <button
                type="button"
                className="saved-card-see-all"
                onClick={onViewAll}
              >
                See all {count} saved recipes →
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
