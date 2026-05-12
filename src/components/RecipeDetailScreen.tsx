import React from 'react';
import RecipeDetail from './RecipeDetail';
import type { RecipeMatch } from '../types';
import type { RankingMode } from '../services/recipeOrchestrator';
import './RecipeDetailScreen.css';

export interface RecipeDetailScreenProps {
  match: RecipeMatch;
  userIngredients: string[];
  onBack: () => void;
  onHome: () => void;
  backLabel: string;
  onStartCooking: () => void;
  rankingMode?: RankingMode;
}

export default function RecipeDetailScreen({
  match,
  userIngredients,
  onBack,
  onHome,
  backLabel,
  onStartCooking,
  rankingMode,
}: RecipeDetailScreenProps) {
  return (
    <div className="detail-view">
      <RecipeDetail
        match={match}
        userIngredients={userIngredients}
        onBack={onBack}
        onHome={onHome}
        backLabel={backLabel}
        onStartCooking={onStartCooking}
        rankingMode={rankingMode}
      />
    </div>
  );
}
