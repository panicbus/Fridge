import {
  recipeThumbFallbackGradient,
  recipeThumbInitials,
} from '../utils/recipeThumbFallback';
import './RecipeThumbFallback.css';

export type RecipeThumbFallbackDensity = 'card' | 'row' | 'compact' | 'hero';

export interface RecipeThumbFallbackProps {
  seed: string;
  title: string;
  className?: string;
  density?: RecipeThumbFallbackDensity;
}

export default function RecipeThumbFallback({
  seed,
  title,
  className = '',
  density = 'card',
}: RecipeThumbFallbackProps) {
  const gradient = recipeThumbFallbackGradient(seed);
  const initials = recipeThumbInitials(title);
  const rootClass = [
    'recipe-thumb-fallback',
    `recipe-thumb-fallback--${density}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      style={{ background: gradient }}
      aria-hidden
    >
      <span className="recipe-thumb-fallback__initials">{initials}</span>
    </div>
  );
}
