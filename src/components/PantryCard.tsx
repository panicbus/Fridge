import React, { useState } from 'react';
import { usePantry } from '../hooks/usePantry';
import './PantryCard.css';

export interface PantryCardProps {
  activeIngredients: string[];
  onAddIngredient: (name: string) => void;
  onManage: () => void;
  pantryRevision: number;
}

export default function PantryCard({
  activeIngredients,
  onAddIngredient,
  onManage,
  pantryRevision,
}: PantryCardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { recent, staples, total, searchResults } = usePantry(
    activeIngredients,
    searchQuery,
    pantryRevision,
  );

  const searching = searchQuery.trim().length > 0;

  const chipClick = (name: string) => {
    onAddIngredient(name);
  };

  const showRecentColumn = !searching && recent.length > 0;
  const showDivider = !searching && total > 0 && showRecentColumn;

  return (
    <section className="pantry-card">
      <div className="pantry-card-header-row">
        <p className="pantry-card-kicker">— pantry · {total} —</p>
        {total > 0 ? (
          <div className="pantry-card-search-inline">
            <input
              type="search"
              className="pantry-search-input"
              placeholder="search pantry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              aria-label="Search pantry"
            />
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pantry-card-search-svg"
              aria-hidden
            >
              <circle cx="7" cy="7" r="5" fill="none" />
              <line x1="11" y1="11" x2="14" y2="14" />
            </svg>
          </div>
        ) : null}
        <button type="button" className="pantry-card-manage" onClick={onManage}>
          manage →
        </button>
      </div>

      <div className="pantry-card-body">
        {total === 0 ? (
          <p className="pantry-card-empty">
            Your pantry is empty. Ingredients you search will be saved here.
          </p>
        ) : searching ? (
          <div className="pantry-chip-scroll pantry-chip-scroll--flat">
            <div className="pantry-chip-wrap">
              {searchResults.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="pantry-chip"
                  onClick={() => chipClick(item.name)}
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`pantry-card-split ${!showRecentColumn ? 'pantry-card-split--staples-only' : ''}`}
          >
            {showRecentColumn ? (
              <div className="pantry-col pantry-col--recent">
                <p className="pantry-card-section-label">recently used</p>
                <div className="pantry-chip-wrap">
                  {recent.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="pantry-chip"
                      onClick={() => chipClick(item.name)}
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {showDivider ? <div className="pantry-divider" aria-hidden /> : null}
            <div className="pantry-col pantry-col--staples">
              <p className="pantry-card-section-label">staples</p>
              <div className="pantry-chip-scroll pantry-chip-scroll--staples">
                <div className="pantry-chip-wrap">
                  {staples.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="pantry-chip"
                      onClick={() => chipClick(item.name)}
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
