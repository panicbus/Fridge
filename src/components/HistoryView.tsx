import React, { useMemo, useState } from 'react';
import CachedMealImage from './CachedMealImage';
import SaveButton from './SaveButton';
import { useStore } from '../hooks/useStore';
import { recipeCardImageSrc } from '../services/mealdb';
import type { RankingMode } from '../services/recipeOrchestrator';
import { recipeViewHistoryStore } from '../services/recipeViewHistory';
import { searchHistoryStore } from '../services/searchHistory';
import type { RecipeViewEntry, SearchHistoryEntry } from '../types';
import { formatRelativeTime } from '../utils/relativeTime';
import './HistoryView.css';

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #c97a4a 0%, #8a4a28 100%)',
  'linear-gradient(135deg, #6a8a4a 0%, #3a5a28 100%)',
  'linear-gradient(135deg, #d9a040 0%, #a06820 100%)',
  'linear-gradient(135deg, #b04a3a 0%, #6a2818 100%)',
  'linear-gradient(135deg, #8a6a4a 0%, #5a3a20 100%)',
] as const;

export interface HistoryViewProps {
  onBack: () => void;
  onReplaySearch: (ingredients: string[], dietPreference: RankingMode) => void;
  onSelectRecipe: (recipeId: string) => void;
}

function dietChipClass(pref: SearchHistoryEntry['dietPreference']): string {
  if (pref === 'vegan-first') return 'history-diet-pill history-diet-pill--accent';
  return 'history-diet-pill history-diet-pill--muted';
}

function dietLabel(pref: SearchHistoryEntry['dietPreference']): string {
  if (pref === 'vegan-first') return 'VEGAN';
  if (pref === 'vegetarian-friendly') return 'VEGETARIAN';
  return 'ALL';
}

function IngredientSummary({ ingredients }: { ingredients: string[] }) {
  const shown = ingredients.slice(0, 6);
  const rest = Math.max(0, ingredients.length - shown.length);
  const base = shown.join(', ');
  return (
    <span className="history-search-ings-inner">
      {base}
      {rest > 0 ? (
        <span className="history-search-ings-more">
          {' '}
          + {rest} more
        </span>
      ) : null}
    </span>
  );
}

function recipeMetaLine(r: RecipeViewEntry['recipe']): string {
  const parts: string[] = [];
  if (r.category?.trim()) parts.push(r.category.trim());
  if (r.area?.trim()) parts.push(r.area.trim());
  if (
    typeof r.readyInMinutes === 'number' &&
    Number.isFinite(r.readyInMinutes)
  ) {
    parts.push(`${r.readyInMinutes} min`);
  }
  return parts.join(' · ');
}

export default function HistoryView({
  onBack,
  onReplaySearch,
  onSelectRecipe,
}: HistoryViewProps) {
  /** On = show only vegan-first searches and vegan viewed recipes; Off = show all. */
  const [veganFirstFilterOn, setVeganFirstFilterOn] = useState(true);

  const searchRowsRaw = useStore(searchHistoryStore);
  const viewRowsRaw = useStore(recipeViewHistoryStore);

  const searchSorted = useMemo(() => {
    const base = [...searchRowsRaw].sort((a, b) => b.timestamp - a.timestamp);
    if (!veganFirstFilterOn) return base;
    return base.filter((e) => e.dietPreference === 'vegan-first');
  }, [searchRowsRaw, veganFirstFilterOn]);

  const viewsSorted = useMemo(() => {
    const base = [...viewRowsRaw].sort((a, b) => b.viewedAt - a.viewedAt);
    if (!veganFirstFilterOn) return base;
    return base.filter((e) => e.recipe.vegan);
  }, [viewRowsRaw, veganFirstFilterOn]);

  const searchCount = searchSorted.length;
  const viewCount = viewsSorted.length;

  const anySearches = searchRowsRaw.length > 0;
  const anyViews = viewRowsRaw.length > 0;
  const searchesFilteredEmpty =
    veganFirstFilterOn && searchCount === 0 && anySearches;
  const viewsFilteredEmpty =
    veganFirstFilterOn && viewCount === 0 && anyViews;

  return (
    <div className="history-view">
      <header className="history-view-header">
        <button type="button" className="history-view-back" onClick={onBack}>
          ← Home
        </button>
        <h1 className="history-view-title">History</h1>
        <div className="history-view-header-actions">
          <label className="history-vegan-filter" htmlFor="history-vegan-first">
            <span className="history-vegan-filter-label">Vegan first</span>
            <select
              id="history-vegan-first"
              className="history-vegan-filter-select"
              value={veganFirstFilterOn ? 'on' : 'off'}
              onChange={(e) =>
                setVeganFirstFilterOn(e.target.value === 'on')
              }
              aria-label="Vegan first filter for history lists"
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
        </div>
      </header>

      <div className="history-view-body">
        <section className="history-section">
          <div className="history-section-head">
            <h2 className="history-section-label">
              Recent searches
              {searchCount > 0 ? (
                <>
                  {' '}
                  · <span className="history-section-count">{searchCount}</span>
                </>
              ) : null}
            </h2>
          </div>

          {!anySearches ? (
            <p className="history-empty">Your searches will appear here.</p>
          ) : searchesFilteredEmpty ? (
            <p className="history-empty">
              No searches used vegan-first ranking. Turn Vegan first off to see
              every search.
            </p>
          ) : (
            <ul className="history-search-list">
              {searchSorted.map((entry, i) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`history-search-row ${i === searchSorted.length - 1 ? 'history-search-row--last' : ''}`}
                    aria-label="Replay this search"
                    onClick={() =>
                      onReplaySearch(entry.ingredients, entry.dietPreference)
                    }
                  >
                    <span className="history-search-time">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                    <span
                      className="history-search-ings"
                      title={entry.ingredients.join(', ')}
                    >
                      <IngredientSummary ingredients={entry.ingredients} />
                    </span>
                    <span className="history-search-meta">
                      <span className={dietChipClass(entry.dietPreference)}>
                        {dietLabel(entry.dietPreference)}
                      </span>
                      <span className="history-search-count">
                        {entry.resultCount}{' '}
                        {entry.resultCount === 1 ? 'match' : 'matches'}
                      </span>
                    </span>
                    <span className="history-search-replay" aria-hidden>
                      <svg
                        className="history-search-replay-icon"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-3-7.5L21 8" />
                        <path d="M21 3v5h-5" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="history-section history-section--views">
          <div className="history-section-head">
            <h2 className="history-section-label">
              Recently viewed
              {viewCount > 0 ? (
                <>
                  {' '}
                  · <span className="history-section-count">{viewCount}</span>
                </>
              ) : null}
            </h2>
          </div>

          {!anyViews ? (
            <p className="history-empty">
              Recipes you open will appear here.
            </p>
          ) : viewsFilteredEmpty ? (
            <p className="history-empty">
              No vegan recipes in viewed history. Turn Vegan first off to see
              every recipe you opened.
            </p>
          ) : (
            <ul className="history-recipe-list">
              {viewsSorted.map((entry, i) => {
                const thumbSrc = recipeCardImageSrc(entry.recipe);
                const meta = recipeMetaLine(entry.recipe);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`history-recipe-row ${i === viewsSorted.length - 1 ? 'history-recipe-row--last' : ''}`}
                      onClick={() => onSelectRecipe(entry.id)}
                    >
                      {thumbSrc ? (
                        <CachedMealImage
                          src={thumbSrc}
                          alt=""
                          className="history-recipe-thumb"
                        />
                      ) : (
                        <div
                          className="history-recipe-thumb history-recipe-thumb--fallback"
                          style={{
                            background:
                              FALLBACK_GRADIENTS[
                                i % FALLBACK_GRADIENTS.length
                              ],
                          }}
                          aria-hidden
                        />
                      )}
                      <span className="history-recipe-main">
                        <span className="history-recipe-title">
                          {entry.recipe.title}
                        </span>
                        {meta ? (
                          <span className="history-recipe-meta">{meta}</span>
                        ) : null}
                      </span>
                      <span className="history-recipe-right">
                        <SaveButton
                          recipe={entry.recipe}
                          size="sm"
                          variant="inline"
                        />
                        <span className="history-recipe-time">
                          {formatRelativeTime(entry.viewedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
