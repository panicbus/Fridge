import React, { useMemo } from 'react';
import CachedMealImage from './CachedMealImage';
import { useStore } from '../hooks/useStore';
import { recipeCardImageSrc } from '../services/mealdb';
import { savedRecipesStore } from '../services/savedRecipes';
import './SavedCard.css';

export interface SavedCardProps {
  onViewAll: () => void;
  onSelectRecipe: (recipeId: string) => void;
}

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #c97a4a 0%, #8a4a28 100%)',
  'linear-gradient(135deg, #6a8a4a 0%, #3a5a28 100%)',
  'linear-gradient(135deg, #d9a040 0%, #a06820 100%)',
  'linear-gradient(135deg, #b04a3a 0%, #6a2818 100%)',
  'linear-gradient(135deg, #8a6a4a 0%, #5a3a20 100%)',
] as const;

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
                      <div
                        className="saved-card-thumb saved-card-thumb--fallback"
                        style={{
                          background:
                            FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length],
                        }}
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
