import React from 'react';
import type { DietPreference } from '../services/dietFilter';
import DietFilterBar from './DietFilterBar';
import IngredientInput from './IngredientInput';
import HomeFloatingArt from './HomeFloatingArt';
import './HomeView.css';

export interface HomeViewProps {
  onSearch: (ingredients: string[]) => void;
  loading: boolean;
  error: string;
  dietPreference: DietPreference | null;
  onDietPreferenceChange: (v: DietPreference | null) => void;
}

export default function HomeView({
  onSearch,
  loading,
  error,
  dietPreference,
  onDietPreferenceChange,
}: HomeViewProps) {
  return (
    <div className="home-view">
      <div className="home-content">
        <p className="wordmark">✦ fridge</p>
        <h1 className="home-headline">
          What&apos;s in your
          <br />
          <em>kitchen</em> today?
        </h1>
        <p className="home-sub">
          Add what you have on hand. We&apos;ll match recipes from TheMealDB
          so you can cook with what&apos;s already in your kitchen.
        </p>
        <DietFilterBar value={dietPreference} onChange={onDietPreferenceChange} />
        <div className="home-input-wrap">
          <IngredientInput onSearch={onSearch} loading={loading} />
        </div>
        {error ? <p className="home-error">{error}</p> : null}
      </div>
      <HomeFloatingArt />
    </div>
  );
}
