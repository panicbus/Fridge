import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getAllIngredients,
  mergeIngredientAutocompleteLists,
} from '../services/mealdb';
import {
  addToPantry,
  getPantry,
  getPantryUsageCount,
  removeFromPantry,
  renamePantryItem,
  type PantryItem,
} from '../services/pantry';
import { rememberIngredientName } from '../services/customIngredients';
import { ingredientDedupeKey } from '../utils/ingredientDedupe';
import { formatRelativeTime } from '../utils/relativeTime';
import DropdownMenu, { type DropdownMenuOption } from './DropdownMenu';
import './PantryManageView.css';

type PantryAddSuggestionRow =
  | { source: 'typed'; text: string }
  | { source: 'list'; text: string };

export type PantrySortOption =
  | 'recently-used'
  | 'a-z'
  | 'most-used'
  | 'oldest';

export interface PantryManageViewProps {
  onBack: () => void;
  pantryRevision: number;
  onPantryChanged: () => void;
}

const PANTRY_SORT_OPTIONS: DropdownMenuOption[] = [
  { value: 'recently-used', label: 'Recently used' },
  { value: 'a-z', label: 'A → Z' },
  { value: 'most-used', label: 'Most used' },
  { value: 'oldest', label: 'Oldest first' },
];

export default function PantryManageView({
  onBack,
  pantryRevision,
  onPantryChanged,
}: PantryManageViewProps) {
  const [sortBy, setSortBy] = useState<PantrySortOption>('recently-used');
  const [filterQuery, setFilterQuery] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [addFocused, setAddFocused] = useState(false);
  const [activeAddSuggestion, setActiveAddSuggestion] = useState(0);
  const [allIngredients, setAllIngredients] = useState<string[]>([]);
  const apiIngredientsRef = useRef<string[]>([]);
  const apiLoadedRef = useRef(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameCollision, setRenameCollision] = useState(false);
  const skipBlurCommitRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renamingOldRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAllIngredients().then((api) => {
      if (cancelled) return;
      apiIngredientsRef.current = api;
      apiLoadedRef.current = true;
      setAllIngredients(mergeIngredientAutocompleteLists(api));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiLoadedRef.current) return;
    setAllIngredients(
      mergeIngredientAutocompleteLists(apiIngredientsRef.current),
    );
  }, [pantryRevision]);

  const pantryDedupeKeys = useMemo(() => {
    void pantryRevision;
    return new Set(getPantry().map((i) => ingredientDedupeKey(i.name)));
  }, [pantryRevision]);

  const addSuggestionRows = useMemo((): PantryAddSuggestionRow[] => {
    const raw = addQuery.trim();
    const q = raw.toLowerCase();
    if (q.length < 2) return [];

    const exactInCatalog = allIngredients.some((n) => n.toLowerCase() === q);

    const apiMatches = allIngredients
      .filter(
        (name) =>
          name.includes(q) &&
          !pantryDedupeKeys.has(ingredientDedupeKey(name)),
      )
      .sort((a, b) => {
        const aExact = a.toLowerCase() === q ? 0 : 1;
        const bExact = b.toLowerCase() === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.localeCompare(b);
      })
      .slice(0, 8);

    const rows: PantryAddSuggestionRow[] = [];
    if (
      !pantryDedupeKeys.has(ingredientDedupeKey(raw)) &&
      !exactInCatalog
    ) {
      rows.push({ source: 'typed', text: raw });
    }
    for (const name of apiMatches) {
      rows.push({ source: 'list', text: name });
    }
    return rows.slice(0, 10);
  }, [addQuery, allIngredients, pantryDedupeKeys]);

  useEffect(() => {
    setActiveAddSuggestion(0);
  }, [addSuggestionRows]);

  const showAddDropdown = addFocused && addSuggestionRows.length > 0;

  const commitAdd = useCallback(() => {
    const trimmed = addQuery.trim();
    if (!trimmed) return;
    addToPantry(trimmed);
    rememberIngredientName(trimmed);
    setAddQuery('');
    setActiveAddSuggestion(0);
    onPantryChanged();
  }, [addQuery, onPantryChanged]);

  const addBlurLater = useCallback(() => {
    window.setTimeout(() => setAddFocused(false), 150);
  }, []);

  const onAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (showAddDropdown && addSuggestionRows[activeAddSuggestion]) {
          const raw = addSuggestionRows[activeAddSuggestion].text;
          addToPantry(raw);
          rememberIngredientName(raw);
          setAddQuery('');
          setActiveAddSuggestion(0);
          onPantryChanged();
          return;
        }
        if (addQuery.trim()) commitAdd();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAddFocused(false);
        return;
      }
      if (e.key === 'ArrowDown' && showAddDropdown) {
        e.preventDefault();
        setActiveAddSuggestion((i) =>
          Math.min(i + 1, addSuggestionRows.length - 1),
        );
        return;
      }
      if (e.key === 'ArrowUp' && showAddDropdown) {
        e.preventDefault();
        setActiveAddSuggestion((i) => Math.max(i - 1, 0));
      }
    },
    [
      activeAddSuggestion,
      addQuery,
      addSuggestionRows,
      commitAdd,
      onPantryChanged,
      showAddDropdown,
    ],
  );

  const filteredSorted = useMemo(() => {
    void pantryRevision;
    let rows = getPantry();
    const q = filterQuery.trim().toLowerCase();
    if (q) rows = rows.filter((i) => i.name.includes(q));

    const sorted = [...rows];
    switch (sortBy) {
      case 'recently-used':
        sorted.sort((a, b) => b.lastUsed - a.lastUsed);
        break;
      case 'a-z':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'most-used':
        sorted.sort((a, b) => {
          const ca = getPantryUsageCount(a.name);
          const cb = getPantryUsageCount(b.name);
          if (cb !== ca) return cb - ca;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'oldest':
        sorted.sort((a, b) => a.addedAt - b.addedAt);
        break;
      default:
        break;
    }
    return sorted;
  }, [pantryRevision, filterQuery, sortBy]);

  const totalCount = useMemo(() => {
    void pantryRevision;
    return getPantry().length;
  }, [pantryRevision]);

  useEffect(() => {
    if (!renamingId) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renamingId]);

  const cancelRename = useCallback(() => {
    skipBlurCommitRef.current = true;
    renamingOldRef.current = null;
    setRenamingId(null);
    setRenameValue('');
    setRenameCollision(false);
  }, []);

  const commitRename = useCallback(
    (oldName: string) => {
      if (renamingOldRef.current !== oldName) return;
      const trimmed = renameValue.trim().toLowerCase();
      if (!trimmed) {
        cancelRename();
        return;
      }
      if (trimmed === oldName) {
        renamingOldRef.current = null;
        setRenamingId(null);
        setRenameValue('');
        setRenameCollision(false);
        return;
      }
      const ok = renamePantryItem(oldName, trimmed);
      if (!ok) {
        setRenameCollision(true);
        requestAnimationFrame(() => renameInputRef.current?.focus());
        return;
      }
      renamingOldRef.current = null;
      setRenameCollision(false);
      setRenamingId(null);
      setRenameValue('');
      onPantryChanged();
    },
    [renameValue, cancelRename, onPantryChanged],
  );

  useEffect(() => {
    if (!renamingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelRename();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [renamingId, cancelRename]);

  const startRename = useCallback((item: PantryItem) => {
    setRenameCollision(false);
    renamingOldRef.current = item.name;
    setRenamingId(item.name);
    setRenameValue(item.name);
  }, []);

  const onDelete = useCallback(
    (name: string) => {
      removeFromPantry(name);
      if (renamingId === name) cancelRename();
      onPantryChanged();
    },
    [renamingId, cancelRename, onPantryChanged],
  );

  const emptyPantry = totalCount === 0;
  const emptyFilter =
    !emptyPantry && filteredSorted.length === 0 && filterQuery.trim().length > 0;

  return (
    <div className="pantry-manage-view">
      <header className="pantry-manage-header">
        <button
          type="button"
          className="pantry-manage-home-cta"
          onClick={onBack}
        >
          ← Home
        </button>
        <h1 className="pantry-manage-title">
          Pantry ·{' '}
          <span className="pantry-manage-title-count">{totalCount}</span>
        </h1>
        <div className="pantry-manage-header-spacer" aria-hidden />
      </header>

      <div className="pantry-manage-controls">
        <div className="pantry-manage-add-row">
          <div className="pantry-manage-add-wrap">
            <div className="pantry-manage-add-shell">
              <input
                type="search"
                className="pantry-manage-add-input"
                placeholder="Search ingredients to add…"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                onKeyDown={onAddKeyDown}
                onFocus={() => setAddFocused(true)}
                onBlur={addBlurLater}
                autoComplete="off"
                aria-label="Search ingredients to add to pantry"
                aria-autocomplete="list"
                aria-expanded={showAddDropdown}
                aria-controls={
                  showAddDropdown ? 'pantry-add-suggestions' : undefined
                }
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pantry-manage-add-svg"
                aria-hidden
              >
                <circle cx="7" cy="7" r="5" fill="none" />
                <line x1="11" y1="11" x2="14" y2="14" />
              </svg>
            </div>
            {showAddDropdown ? (
              <ul
                className="pantry-manage-add-suggestions"
                role="listbox"
                id="pantry-add-suggestions"
              >
                {addSuggestionRows.map((row, i) => (
                  <li
                    key={`${row.source}-${row.text}-${i}`}
                    role="option"
                    aria-selected={i === activeAddSuggestion}
                    aria-label={
                      row.source === 'typed'
                        ? `Add ${row.text} to pantry`
                        : row.text
                    }
                    className={`pantry-manage-add-suggestion ${
                      row.source === 'typed'
                        ? 'pantry-manage-add-suggestion--typed'
                        : ''
                    } ${
                      i === activeAddSuggestion
                        ? 'pantry-manage-add-suggestion--active'
                        : ''
                    }`}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      addToPantry(row.text);
                      rememberIngredientName(row.text);
                      setAddQuery('');
                      setActiveAddSuggestion(0);
                      onPantryChanged();
                    }}
                  >
                    {row.source === 'typed' ? (
                      <>
                        <span className="pantry-manage-add-suggestion-label">
                          Add
                        </span>
                        <span className="pantry-manage-add-suggestion-value">
                          {row.text}
                        </span>
                      </>
                    ) : (
                      row.text
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="pantry-manage-toolbar">
          <div className="pantry-manage-filter-shell">
            <input
              type="search"
              className="pantry-manage-filter-input"
              placeholder="Filter pantry..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              autoComplete="off"
              aria-label="Filter pantry"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pantry-manage-filter-svg"
              aria-hidden
            >
              <circle cx="7" cy="7" r="5" fill="none" />
              <line x1="11" y1="11" x2="14" y2="14" />
            </svg>
          </div>

          <DropdownMenu
            ariaLabel="Sort pantry"
            value={sortBy}
            options={PANTRY_SORT_OPTIONS}
            onChange={(v) => setSortBy(v as PantrySortOption)}
            variant="pantry-sort"
          />
        </div>
      </div>

      <div className="pantry-manage-body">
        {emptyPantry ? (
          <div className="pantry-manage-empty pantry-manage-empty--major">
            <p className="pantry-manage-empty-title">Your pantry is empty.</p>
            <p className="pantry-manage-empty-sub">
              Search above to add ingredients, or they&apos;ll be saved here when
              you cook or search from home.
            </p>
          </div>
        ) : emptyFilter ? (
          <div className="pantry-manage-empty">
            <p className="pantry-manage-empty-filter">
              No items match &quot;{filterQuery.trim()}&quot;.
            </p>
            <button
              type="button"
              className="pantry-manage-clear-filter"
              onClick={() => setFilterQuery('')}
            >
              Clear filter
            </button>
          </div>
        ) : (
          <ul className="pantry-manage-list">
            {filteredSorted.map((item) => (
              <li key={item.name} className="pantry-manage-row">
                <div className="pantry-manage-name-block">
                  {renamingId === item.name ? (
                    <>
                      <input
                        ref={renameInputRef}
                        type="text"
                        className="pantry-manage-rename-input"
                        value={renameValue}
                        onChange={(e) => {
                          setRenameValue(e.target.value);
                          setRenameCollision(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename(item.name);
                          }
                        }}
                        onBlur={() => {
                          if (skipBlurCommitRef.current) {
                            skipBlurCommitRef.current = false;
                            return;
                          }
                          const old = renamingOldRef.current;
                          if (!old || old !== item.name) return;
                          commitRename(old);
                        }}
                        aria-invalid={renameCollision}
                      />
                      {renameCollision ? (
                        <p className="pantry-manage-rename-error">
                          Name already in use.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="pantry-manage-name-hit"
                      onClick={() => startRename(item)}
                    >
                      {item.name}
                    </button>
                  )}
                </div>

                <div className="pantry-manage-meta">
                  <span className="pantry-manage-meta-cell">
                    Used {formatRelativeTime(item.lastUsed)}
                  </span>
                  <span
                    className="pantry-manage-meta-divider"
                    aria-hidden
                  />
                  <span className="pantry-manage-meta-cell">
                    {(() => {
                      const n = getPantryUsageCount(item.name);
                      if (n === 0) return '—';
                      return `${n} ${n === 1 ? 'time' : 'times'}`;
                    })()}
                  </span>
                  <span
                    className="pantry-manage-meta-divider"
                    aria-hidden
                  />
                  <span className="pantry-manage-meta-cell">
                    Added {formatRelativeTime(item.addedAt)}
                  </span>
                </div>

                <button
                  type="button"
                  className="pantry-manage-delete"
                  aria-label={`Remove ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.name);
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M2.5 4h11" />
                    <path d="M6 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4" />
                    <path d="M4 4l.5 9a1.5 1.5 0 0 0 1.5 1.5h4a1.5 1.5 0 0 0 1.5-1.5L12 4" />
                    <path d="M7 7v5" />
                    <path d="M9 7v5" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
