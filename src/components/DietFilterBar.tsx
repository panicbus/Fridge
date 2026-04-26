import React from 'react';
import {
  DIET_OPTIONS,
  type DietPreference,
} from '../services/dietFilter';
import './DietFilterBar.css';

export interface DietFilterBarProps {
  value: DietPreference | null;
  onChange: (next: DietPreference | null) => void;
  /** Tighter padding / label size for results header */
  compact?: boolean;
}

export default function DietFilterBar({
  value,
  onChange,
  compact = false,
}: DietFilterBarProps) {
  return (
    <div className={`diet-filter-bar ${compact ? 'diet-filter-bar--compact' : ''}`}>
      <span className="diet-filter-bar-label">Diet</span>
      <div className="diet-filter-bar-toggles" role="group" aria-label="Diet filter">
        {DIET_OPTIONS.map(({ id, label }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              className={`diet-toggle ${active ? 'diet-toggle--active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange(active ? null : id)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
