import { useCallback, useMemo, useState } from 'react';
import CachedMealImage from './CachedMealImage';
import RecipeThumbFallback from './RecipeThumbFallback';
import SaveButton from './SaveButton';
import type { RecipeMatch } from '../types';
import { recipeHeroImageSrc } from '../services/mealdb';
import type { RankingMode } from '../services/recipeOrchestrator';
import {
  convertMetricMeasureToImperial,
  convertRecipeStepTextToImperial,
} from '../utils/imperialMeasures';
import {
  flagEmojiForOrigin,
  formatOriginLabel,
} from '../utils/areaFlag';
import { stripIngredientRetailParen } from '../utils/ingredientRetailParen';
import { dedupeRecipeTags } from '../utils/recipeTags';
import './RecipeDetail.css';

export interface RecipeDetailProps {
  match: RecipeMatch;
  userIngredients: string[];
  onBack: () => void;
  onHome: () => void;
  backLabel: string;
  onStartCooking: () => void;
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
  onHome,
  backLabel,
  onStartCooking,
  rankingMode = 'show-all',
}: RecipeDetailProps) {
  const { recipe } = match;
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set(),
  );
  const [heroFailed, setHeroFailed] = useState(false);

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
  const showHeroImage = Boolean(heroSrc) && !heroFailed;

  const showVeganAdvisory =
    rankingMode !== 'show-all' && !recipe.vegan;

  const heroTags = useMemo(
    () => dedupeRecipeTags(recipe.tags, recipe.category, recipe.area),
    [recipe.tags, recipe.category, recipe.area],
  );

  const areaFlag = recipe.area ? flagEmojiForOrigin(recipe.area) : '';

  return (
    <div className="recipe-detail">
      <header className="detail-header">
        <div className="detail-header-nav">
          <button type="button" className="detail-home-cta" onClick={onHome}>
            Home
          </button>
          <button type="button" className="detail-back" onClick={onBack}>
            {backLabel}
          </button>
        </div>
        <div className="detail-header-spacer" aria-hidden />
        <SaveButton recipe={recipe} size="md" variant="inline" />
      </header>

      <section className="detail-hero">
        <div className="hero-backdrop" aria-hidden>
          {showHeroImage ? (
            <CachedMealImage
              src={heroSrc!}
              alt=""
              decoding="async"
              className="hero-image"
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <RecipeThumbFallback
              seed={recipe.id}
              title={recipe.title}
              density="hero"
              className="hero-fallback-fill"
            />
          )}
        </div>
        <div className="hero-overlay">
          <div className="hero-meta">
            {recipe.category && (
              <span className="hero-category">{recipe.category}</span>
            )}
            {recipe.area ? (
              <span className="hero-area-badge">
                {areaFlag ? (
                  <span className="hero-area-flag" aria-hidden="true">
                    {areaFlag}
                  </span>
                ) : null}
                <span>{formatOriginLabel(recipe.area)}</span>
              </span>
            ) : null}
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
          {heroTags.length > 0 && (
            <div className="hero-tags">
              {heroTags.slice(0, 12).map((t) => (
                <span key={t} className="hero-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {totalSteps > 0 && (
        <>
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
          <div className="start-cooking-wrap">
            <button
              type="button"
              className="start-cooking-btn"
              onClick={onStartCooking}
            >
              <span className="start-cooking-icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9" />
                  <path d="M3 12c0 4.97 4.03 9 9 9" />
                  <path d="M8 12l3 3 5-6" />
                </svg>
              </span>
              Enter cooking mode
            </button>
          </div>
        </>
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
              const rawName = row.name;
              const nameClean = stripIngredientRetailParen(rawName);
              const has = normalizedUser.some((u) =>
                ingredientsMatch(u, nameClean),
              );
              return (
                <li
                  key={`${nameClean}-${i}`}
                  className={`ingredient-row ${has ? 'have' : 'need'}`}
                >
                  <span className="ingredient-dot" aria-hidden />
                  <span className="ingredient-name">{nameClean}</span>
                  <span className="ingredient-measure">
                    {convertMetricMeasureToImperial(
                      stripIngredientRetailParen(row.measure),
                    )}
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
              {recipe.source === 'local'
                ? `Recipe from ${recipe.sourceName ?? 'the source'} →`
                : 'Original recipe'}
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
                    <span className="step-text">
                      {convertRecipeStepTextToImperial(text)}
                    </span>
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
