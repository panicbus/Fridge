import CachedMealImage from './CachedMealImage';
import { recipeCardImageSrc, type RecipeMatch } from '../services/mealdb';
import './RecipeCard.css';

export interface RecipeCardProps {
  match: RecipeMatch;
  index: number;
  onClick: () => void;
}

export default function RecipeCard({ match, index, onClick }: RecipeCardProps) {
  const { recipe, matchedIngredients, missingIngredients, matchScore } = match;
  const pct = Math.round(matchScore * 100);

  const haveShow = matchedIngredients.slice(0, 4);
  const missShow = missingIngredients.slice(0, 3);
  const totalBadges =
    matchedIngredients.length + missingIngredients.length;
  const overflow = totalBadges > 7 ? totalBadges - 7 : 0;
  const thumbSrc = recipeCardImageSrc(recipe);

  const metaLine = [recipe.area, recipe.category].filter(Boolean).join(' · ');

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
        {recipe.category && (
          <span className="recipe-category">{recipe.category}</span>
        )}
        <div className="recipe-diet-badges">
          {recipe.vegan ? (
            <span className="diet-badge diet-badge--vegan">🌱 Vegan</span>
          ) : null}
          {!recipe.vegan && recipe.vegetarian ? (
            <span className="diet-badge diet-badge--vegetarian">
              🥬 Vegetarian
            </span>
          ) : null}
          {recipe.glutenFree ? (
            <span className="diet-badge diet-badge--gf">🌾 GF</span>
          ) : null}
        </div>
      </div>
      <div className="recipe-body">
        <h3 className="recipe-title">{recipe.title}</h3>
        {metaLine ? (
          <p className="recipe-meta-sub">{metaLine}</p>
        ) : null}
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
