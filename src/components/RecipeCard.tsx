import CachedMealImage from './CachedMealImage';
import { mealImageSrc, type RecipeMatch } from '../services/mealdb';
import './RecipeCard.css';

export interface RecipeCardProps {
  match: RecipeMatch;
  index: number;
  onClick: () => void;
}

export default function RecipeCard({ match, index, onClick }: RecipeCardProps) {
  const { meal, matchedIngredients, missingIngredients, matchScore } = match;
  const pct = Math.round(matchScore * 100);

  const haveShow = matchedIngredients.slice(0, 4);
  const missShow = missingIngredients.slice(0, 3);
  const totalBadges =
    matchedIngredients.length + missingIngredients.length;
  const overflow = totalBadges > 7 ? totalBadges - 7 : 0;
  const thumbSrc = mealImageSrc(meal.strMealThumb, 'medium');

  return (
    <article
      className="recipe-card"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="recipe-thumb">
        {thumbSrc ? (
          <CachedMealImage
            src={thumbSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className="recipe-thumb-img"
          />
        ) : (
          <div className="recipe-thumb-placeholder" />
        )}
        {meal.strCategory && (
          <span className="recipe-category">{meal.strCategory}</span>
        )}
        {meal.strArea && (
          <span className="recipe-area">{meal.strArea}</span>
        )}
      </div>
      <div className="recipe-body">
        <h3 className="recipe-title">{meal.strMeal}</h3>
        <div className="match-bar-wrap">
          <div className="match-bar">
            <div
              className="match-fill"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <span className="match-label">{pct}% match</span>
        </div>
        <div className="ingredient-badges">
          {haveShow.map((t) => (
            <span key={`h-${t}`} className="badge-have">
              {t}
            </span>
          ))}
          {missShow.map((t) => (
            <span key={`m-${t}`} className="badge-missing">
              {t}
            </span>
          ))}
          {overflow > 0 && (
            <span className="badge-missing badge-overflow">+{overflow}</span>
          )}
        </div>
        <span className="recipe-arrow" aria-hidden>
          →
        </span>
      </div>
    </article>
  );
}
