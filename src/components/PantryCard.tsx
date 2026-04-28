import React, { useState } from 'react';
import { usePantry } from '../hooks/usePantry';
import './PantryCard.css';

export interface PantryCardProps {
  activeIngredients: string[];
  onAddIngredient: (name: string) => void;
  onManage: () => void;
}

export default function PantryCard({
  activeIngredients,
  onAddIngredient,
  onManage,
}: PantryCardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { recent, staples, total, searchResults } = usePantry(
    activeIngredients,
    searchQuery,
  );

  const searching = searchQuery.trim().length > 0;

  const chipClick = (name: string) => {
    onAddIngredient(name);
  };

  return (
    <section className="pantry-card">
      <div className="pantry-card-header">
        <p className="pantry-card-kicker">
          — pantry · {total} —
        </p>
        <button type="button" className="pantry-card-manage" onClick={onManage}>
          manage →
        </button>
      </div>

      <div className="pantry-card-inner">
        {total === 0 ? (
          <p className="pantry-card-empty">
            Your pantry is empty. Ingredients you search will be saved here.
          </p>
        ) : (
          <>
            <div className="pantry-card-search-row">
              <div className="pantry-card-search-shell">
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
                  className="pantry-card-search-icon"
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden
                >
                  <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <line
                    x1="11"
                    y1="11"
                    x2="14"
                    y2="14"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    stroke="currentColor"
                  />
                </svg>
              </div>
            </div>

            {searching ? (
              <div className="pantry-chip-list pantry-chip-list--flat">
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
            ) : (
              <>
                {recent.length > 0 && (
                  <>
                    <p className="pantry-card-section-label">recently used</p>
                    <div className="pantry-chip-list pantry-chip-list--recent">
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
                  </>
                )}
                {staples.length > 0 ? (
                  <>
                    <p className="pantry-card-section-label">staples</p>
                    <div className="pantry-chip-list pantry-chip-list--staples">
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
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
