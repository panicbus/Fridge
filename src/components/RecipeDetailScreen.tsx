import React from 'react';
import RecipeDetail from './RecipeDetail';
import type { RecipeMatch } from '../services/mealdb';
import type { RankingMode } from '../services/recipeOrchestrator';
import './RecipeDetailScreen.css';

export interface RecipeDetailScreenProps {
  match: RecipeMatch;
  userIngredients: string[];
  onBack: () => void;
  rankingMode?: RankingMode;
}

export default function RecipeDetailScreen({
  match,
  userIngredients,
  onBack,
  rankingMode,
}: RecipeDetailScreenProps) {
  return (
    <div className="detail-view">
      <RecipeDetail
        match={match}
        userIngredients={userIngredients}
        onBack={onBack}
        rankingMode={rankingMode}
      />
    </div>
  );
}
