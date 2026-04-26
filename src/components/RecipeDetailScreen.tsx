import React from 'react';
import RecipeDetail from './RecipeDetail';
import type { RecipeMatch } from '../services/mealdb';
import './RecipeDetailScreen.css';

export interface RecipeDetailScreenProps {
  match: RecipeMatch;
  userIngredients: string[];
  onBack: () => void;
}

export default function RecipeDetailScreen({
  match,
  userIngredients,
  onBack,
}: RecipeDetailScreenProps) {
  return (
    <div className="detail-view">
      <RecipeDetail
        match={match}
        userIngredients={userIngredients}
        onBack={onBack}
      />
    </div>
  );
}
