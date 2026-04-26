import React, { useCallback, useMemo, useState } from 'react';
import CachedMealImage from './CachedMealImage';
import type { RecipeMatch } from '../services/mealdb';
import {
  extractIngredients,
  mealImageSrc,
  parseSteps,
} from '../services/mealdb';
import './RecipeDetail.css';

export interface RecipeDetailProps {
  match: RecipeMatch;
  userIngredients: string[];
  onBack: () => void;
}

function ingredientsMatch(userIng: string, recipeIng: string): boolean {
  if (!userIng || !recipeIng) return false;
  return userIng.includes(recipeIng) || recipeIng.includes(userIng);
}

export default function RecipeDetail({
  match,
  userIngredients,
  onBack,
}: RecipeDetailProps) {
  const { meal } = match;
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set(),
  );
  const [cookMode, setCookMode] = useState(false);

  const normalizedUser = useMemo(
    () =>
      userIngredients.map((s) => s.toLowerCase().trim()).filter(Boolean),
    [userIngredients],
  );

  const steps = useMemo(
    () => parseSteps(meal.strInstructions ?? ''),
    [meal.strInstructions],
  );

  const ingredientRows = useMemo(
    () => extractIngredients(meal),
    [meal],
  );

  const tagList = useMemo(() => {
    if (!meal.strTags) return [];
    return meal.strTags.split(',').map((t) => t.trim()).filter(Boolean);
  }, [meal.strTags]);

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
  const heroSrc = mealImageSrc(meal.strMealThumb, 'large');

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
            {meal.strCategory && (
              <span className="hero-pill">{meal.strCategory}</span>
            )}
            {meal.strArea && (
              <span className="hero-area">{meal.strArea}</span>
            )}
          </div>
          <h1 className="hero-title">{meal.strMeal}</h1>
          {tagList.length > 0 && (
            <div className="hero-tags">
              {tagList.map((t) => (
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
          {meal.strYoutube && (
            <a
              className="youtube-link"
              href={meal.strYoutube}
              target="_blank"
              rel="noopener noreferrer"
            >
              ▶ Watch on YouTube
            </a>
          )}
          {meal.strSource && (
            <a
              className="source-link"
              href={meal.strSource}
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
