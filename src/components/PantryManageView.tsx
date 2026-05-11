import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getPantry,
  getPantryUsageCount,
  removeFromPantry,
  renamePantryItem,
  type PantryItem,
} from '../services/pantry';
import { formatRelativeTime } from '../utils/relativeTime';
import './PantryManageView.css';

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

export default function PantryManageView({
  onBack,
  pantryRevision,
  onPantryChanged,
}: PantryManageViewProps) {
  const [sortBy, setSortBy] = useState<PantrySortOption>('recently-used');
  const [filterQuery, setFilterQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameCollision, setRenameCollision] = useState(false);
  const skipBlurCommitRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renamingOldRef = useRef<string | null>(null);

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
        <button type="button" className="pantry-manage-back" onClick={onBack}>
          ← Home
        </button>
        <h1 className="pantry-manage-title">
          Pantry ·{' '}
          <span className="pantry-manage-title-count">{totalCount}</span>
        </h1>
        <div className="pantry-manage-header-spacer" aria-hidden />
      </header>

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

        <select
          className="pantry-manage-sort"
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as PantrySortOption)
          }
          aria-label="Sort pantry"
        >
          <option value="recently-used">Recently used</option>
          <option value="a-z">A → Z</option>
          <option value="most-used">Most used</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="pantry-manage-body">
        {emptyPantry ? (
          <div className="pantry-manage-empty pantry-manage-empty--major">
            <p className="pantry-manage-empty-title">Your pantry is empty.</p>
            <p className="pantry-manage-empty-sub">
              Ingredients you search for will be saved here automatically.
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
