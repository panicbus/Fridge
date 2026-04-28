import React, { useCallback, useMemo, useState } from 'react';
import CachedMealImage from './CachedMealImage';
import type { RecipeMatch } from '../services/mealdb';
import { recipeHeroImageSrc } from '../services/mealdb';
import type { RankingMode } from '../services/recipeOrchestrator';
import './RecipeDetail.css';

export interface RecipeDetailProps {
  match: RecipeMatch;
  userIngredients: string[];
  onBack: () => void;
  rankingMode?: RankingMode;
}

function ingredientsMatch(userIng: string, recipeIng: string): boolean {
  if (!userIng || !recipeIng) return false;
  return userIng.includes(recipeIng) || recipeIng.includes(userIng);
}

export default function RecipeDetail({
  match,
  userIngredients,
  onBack,
  rankingMode = 'show-all',
}: RecipeDetailProps) {
  const { recipe } = match;
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set(),
  );
  const [cookMode, setCookMode] = useState(false);

  const normalizedUser = useMemo(
    () =>
      userIngredients.map((s) => s.toLowerCase().trim()).filter(Boolean),
    [userIngredients],
  );

  const steps = recipe.instructions;

  const ingredientRows = recipe.ingredients;

  const toggleStep = useCallback((index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const doneCount = completedSteps.size;
  const totalSteps = steps.length;
  const progressPct =
    totalSteps > 0 ? (doneCount / totalSteps) * 100 : 0;
  const heroSrc = recipeHeroImageSrc(recipe);

  const showVeganAdvisory =
    rankingMode !== 'show-all' && !recipe.vegan;

  return (
    <div className={`recipe-detail ${cookMode ? 'cook-mode' : ''}`}>
      <header className="detail-header">
        <button type="button" className="detail-back" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className={`cook-mode-btn ${cookMode ? 'active' : ''}`}
          onClick={() => setCookMode((v) => !v)}
        >
          {cookMode ? '✕ Exit cook mode' : '👨‍🍳 Cook mode'}
        </button>
      </header>

      <section className="detail-hero">
        {heroSrc && (
          <CachedMealImage
            src={heroSrc}
            alt=""
            decoding="async"
            className="hero-image"
          />
        )}
        <div className="hero-overlay">
          <div className="hero-meta">
            {recipe.category && (
              <span className="hero-pill">{recipe.category}</span>
            )}
            {recipe.area && (
              <span className="hero-area">{recipe.area}</span>
            )}
            {recipe.vegan ? (
              <span className="hero-diet-badge hero-diet-badge--vegan">
                🌱 Vegan
              </span>
            ) : null}
            {!recipe.vegan && recipe.vegetarian ? (
              <span className="hero-diet-badge hero-diet-badge--vegetarian">
                🥬 Vegetarian
              </span>
            ) : null}
            {recipe.glutenFree ? (
              <span className="hero-diet-badge hero-diet-badge--neutral">
                🌾 GF
              </span>
            ) : null}
            {recipe.dairyFree ? (
              <span className="hero-diet-badge hero-diet-badge--neutral">
                Dairy-free
              </span>
            ) : null}
            {recipe.readyInMinutes != null && recipe.readyInMinutes > 0 ? (
              <span className="hero-meta-stat">
                ⏱ {recipe.readyInMinutes} min
              </span>
            ) : null}
            {recipe.servings != null && recipe.servings > 0 ? (
              <span className="hero-meta-stat">
                🍽 Serves {recipe.servings}
              </span>
            ) : null}
          </div>
          <h1 className="hero-title">{recipe.title}</h1>
          {recipe.tags.length > 0 && (
            <div className="hero-tags">
              {recipe.tags.slice(0, 12).map((t) => (
                <span key={t} className="hero-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {totalSteps > 0 && (
        <div className="detail-progress-row">
          <div className="detail-progress-bar">
            <div
              className="detail-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="detail-progress-label">
            {doneCount} / {totalSteps} steps done
          </span>
        </div>
      )}

      <div className="detail-body">
        <aside className="ingredients-col">
          <h2 className="detail-section-title">Ingredients</h2>
          {showVeganAdvisory ? (
            <p className="diet-note">
              Contains animal products — vegan substitutions may be possible
            </p>
          ) : null}
          <ul className="ingredients-list">
            {ingredientRows.map((row, i) => {
              const has = normalizedUser.some((u) =>
                ingredientsMatch(u, row.name),
              );
              return (
                <li
                  key={`${row.name}-${i}`}
                  className={`ingredient-row ${has ? 'have' : 'need'}`}
                >
                  <span className="ingredient-dot" aria-hidden />
                  <span className="ingredient-name">{row.name}</span>
                  <span className="ingredient-measure">
                    {row.measure}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="ingredient-legend">
            <span>
              <span className="legend-dot have" /> you have it
            </span>
            <span>
              <span className="legend-dot need" /> need to buy
            </span>
          </div>
          {recipe.youtubeUrl && (
            <a
              className="youtube-link"
              href={recipe.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              ▶ Watch on YouTube
            </a>
          )}
          {recipe.sourceUrl && (
            <a
              className="source-link"
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Original recipe
            </a>
          )}
        </aside>
        <div className="steps-col">
          <h2 className="detail-section-title">Method</h2>
          <ol className="steps-list">
            {steps.map((text, i) => {
              const done = completedSteps.has(i);
              return (
                <li key={i} className="step-li">
                  <button
                    type="button"
                    className={`step-item ${done ? 'done' : ''}`}
                    onClick={() => toggleStep(i)}
                  >
                    <span className={`step-number ${done ? 'done' : ''}`}>
                      {i + 1}
                    </span>
                    <span className="step-text">{text}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
