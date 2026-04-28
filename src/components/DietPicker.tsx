import React from 'react';
import type { RankingMode } from '../services/recipeOrchestrator';
import './DietPicker.css';

export interface DietPickerProps {
  value: RankingMode;
  onChange: (v: RankingMode) => void;
}

export default function DietPicker({ value, onChange }: DietPickerProps) {
  return (
    <div className="diet-picker" role="radiogroup" aria-label="Recipe ranking">
      <span className="diet-picker-label">Diet</span>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'vegan-first'}
        className={`diet-picker-pill ${value === 'vegan-first' ? 'diet-picker-pill--active' : ''}`}
        onClick={() => onChange('vegan-first')}
      >
        ● vegan-first
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'vegetarian-friendly'}
        className={`diet-picker-pill ${value === 'vegetarian-friendly' ? 'diet-picker-pill--active' : ''}`}
        onClick={() => onChange('vegetarian-friendly')}
      >
        vegetarian
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'show-all'}
        className={`diet-picker-pill ${value === 'show-all' ? 'diet-picker-pill--active' : ''}`}
        onClick={() => onChange('show-all')}
      >
        show all
      </button>
    </div>
  );
}
