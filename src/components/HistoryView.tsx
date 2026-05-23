import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MouseEvent } from 'react';
import CachedMealImage from './CachedMealImage';
import SaveButton from './SaveButton';
import { useStore } from '../hooks/useStore';
import { recipeCardImageSrc } from '../services/mealdb';
import type { RankingMode } from '../services/recipeOrchestrator';
import { recipeViewHistoryStore, removeRecipeView } from '../services/recipeViewHistory';
import { searchHistoryStore } from '../services/searchHistory';
import type { RecipeViewEntry, SearchHistoryEntry } from '../types';
import { formatRelativeTime } from '../utils/relativeTime';
import DropdownMenu from './DropdownMenu';
import RecipeThumbFallback from './RecipeThumbFallback';
import { refreshDietFlagsAll } from '../services/refreshDietFlags';
import './HistoryView.css';

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

const PAGE_SIZE = 10;

interface HistoryPaginationProps {
  'aria-label': string;
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}

const HistoryPagination = forwardRef<HTMLElement, HistoryPaginationProps>(
  function HistoryPagination(props, ref) {
    const { 'aria-label': ariaLabel, page, totalPages, onPageChange } = props;
    if (totalPages <= 1) return null;
    /** Avoid focus-induced scroll jumps in the scrolling history pane. */
    const suppressFocusScroll = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    };
    return (
      <nav ref={ref} className="history-pagination" aria-label={ariaLabel}>
        <button
          type="button"
          className="history-pagination-btn"
          disabled={page <= 1}
          onMouseDown={suppressFocusScroll}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="history-pagination-status">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="history-pagination-btn"
          disabled={page >= totalPages}
          onMouseDown={suppressFocusScroll}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </nav>
    );
  },
);

export default function HistoryView({
  onBack,
  onReplaySearch,
  onSelectRecipe,
}: HistoryViewProps) {
  /** On = show only vegan-first searches and vegan viewed recipes; Off = show all. */
  const [veganFirstFilterOn, setVeganFirstFilterOn] = useState(true);
  const [searchPage, setSearchPage] = useState(1);
  const [viewsPage, setViewsPage] = useState(1);

  const searchRowsRaw = useStore(searchHistoryStore);
  const viewRowsRaw = useStore(recipeViewHistoryStore);

  const viewRowsRefreshed = useMemo(
    () => refreshDietFlagsAll([...viewRowsRaw]),
    [viewRowsRaw],
  );

  const searchSorted = useMemo(() => {
    const base = [...searchRowsRaw].sort((a, b) => b.timestamp - a.timestamp);
    if (!veganFirstFilterOn) return base;
    return base.filter((e) => e.dietPreference === 'vegan-first');
  }, [searchRowsRaw, veganFirstFilterOn]);

  const viewsSorted = useMemo(() => {
    const base = [...viewRowsRefreshed].sort(
      (a, b) => b.viewedAt - a.viewedAt,
    );
    if (!veganFirstFilterOn) return base;
    return base.filter((e) => e.recipe.vegan);
  }, [viewRowsRefreshed, veganFirstFilterOn]);

  const searchCount = searchSorted.length;
  const viewCount = viewsSorted.length;

  const searchTotalPages = Math.max(1, Math.ceil(searchCount / PAGE_SIZE));
  const viewsTotalPages = Math.max(1, Math.ceil(viewCount / PAGE_SIZE));

  useEffect(() => {
    setSearchPage((p) => Math.min(p, searchTotalPages));
  }, [searchTotalPages]);

  useEffect(() => {
    setViewsPage((p) => Math.min(p, viewsTotalPages));
  }, [viewsTotalPages]);

  const searchPageSlice = useMemo(() => {
    const start = (searchPage - 1) * PAGE_SIZE;
    return searchSorted.slice(start, start + PAGE_SIZE);
  }, [searchSorted, searchPage]);

  const viewsPageSlice = useMemo(() => {
    const start = (viewsPage - 1) * PAGE_SIZE;
    return viewsSorted.slice(start, start + PAGE_SIZE);
  }, [viewsSorted, viewsPage]);

  const anySearches = searchRowsRaw.length > 0;
  const anyViews = viewRowsRaw.length > 0;
  const searchesFilteredEmpty =
    veganFirstFilterOn && searchCount === 0 && anySearches;
  const viewsFilteredEmpty =
    veganFirstFilterOn && viewCount === 0 && anyViews;

  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const searchPaginationNavRef = useRef<HTMLElement | null>(null);
  const viewsPaginationNavRef = useRef<HTMLElement | null>(null);
  /** After a page flip, restore this pagination bar's viewport Y (list height varies per page). */
  const paginationAnchorPendingRef = useRef<{
    key: 'search' | 'views';
    viewportTop: number;
  } | null>(null);

  const goSearchPage = useCallback((next: number) => {
    const nav = searchPaginationNavRef.current;
    if (nav) {
      paginationAnchorPendingRef.current = {
        key: 'search',
        viewportTop: nav.getBoundingClientRect().top,
      };
    }
    setSearchPage(next);
  }, []);

  const goViewsPage = useCallback((next: number) => {
    const nav = viewsPaginationNavRef.current;
    if (nav) {
      paginationAnchorPendingRef.current = {
        key: 'views',
        viewportTop: nav.getBoundingClientRect().top,
      };
    }
    setViewsPage(next);
  }, []);

  useLayoutEffect(() => {
    const pending = paginationAnchorPendingRef.current;
    if (!pending) return;
    paginationAnchorPendingRef.current = null;

    const scrollEl = bodyScrollRef.current;
    const nav =
      pending.key === 'search'
        ? searchPaginationNavRef.current
        : viewsPaginationNavRef.current;
    if (!scrollEl || !nav) return;

    const drift = nav.getBoundingClientRect().top - pending.viewportTop;
    if (drift !== 0) {
      scrollEl.scrollTop += drift;
    }
  }, [searchPage, viewsPage]);

  return (
    <div className="history-view">
      <header className="history-view-header">
        <button type="button" className="history-view-back" onClick={onBack}>
          ← Home
        </button>
        <h1 className="history-view-title">History</h1>
        <div className="history-view-header-actions">
          <div className="history-vegan-filter">
            <span className="history-vegan-filter-label">
              Vegan first
            </span>
            <DropdownMenu
              ariaLabel="Vegan first filter for history lists"
              value={veganFirstFilterOn ? 'on' : 'off'}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
              onChange={(v) => setVeganFirstFilterOn(v === 'on')}
              variant="compact"
            />
          </div>
        </div>
      </header>

      <div className="history-view-body" ref={bodyScrollRef}>
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
            <>
              <ul className="history-search-list">
                {searchPageSlice.map((entry, i) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`history-search-row ${i === searchPageSlice.length - 1 ? 'history-search-row--last' : ''}`}
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
              <HistoryPagination
                ref={searchPaginationNavRef}
                aria-label="Recent searches pages"
                page={searchPage}
                totalPages={searchTotalPages}
                onPageChange={goSearchPage}
              />
            </>
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
            <>
              <ul className="history-recipe-list">
                {viewsPageSlice.map((entry, i) => {
                  const thumbSrc = recipeCardImageSrc(entry.recipe);
                  const meta = recipeMetaLine(entry.recipe);
                  const title = entry.recipe.title;
                  const last = i === viewsPageSlice.length - 1;
                  return (
                    <li
                      key={entry.id}
                      className={`history-recipe-item ${last ? 'history-recipe-item--last' : ''}`}
                    >
                      <div className="history-recipe-item-row">
                        <button
                          type="button"
                          className="history-recipe-row"
                          onClick={() => onSelectRecipe(entry.id)}
                          aria-label={`Open ${title}`}
                        >
                          {thumbSrc ? (
                            <CachedMealImage
                              src={thumbSrc}
                              alt=""
                              className="history-recipe-thumb"
                            />
                          ) : (
                            <RecipeThumbFallback
                              seed={entry.recipe.id}
                              title={entry.recipe.title}
                              density="row"
                              className="history-recipe-thumb"
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
                        </button>
                        <div className="history-recipe-trailing">
                          <SaveButton
                            recipe={entry.recipe}
                            size="sm"
                            variant="inline"
                          />
                          <span className="history-recipe-time">
                            {formatRelativeTime(entry.viewedAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="history-recipe-remove"
                          aria-label={`Remove "${title}" from recently viewed`}
                          onClick={() => removeRecipeView(entry.id)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <HistoryPagination
                ref={viewsPaginationNavRef}
                aria-label="Recently viewed pages"
                page={viewsPage}
                totalPages={viewsTotalPages}
                onPageChange={goViewsPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
