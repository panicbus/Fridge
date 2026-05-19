/** Warm gradients aligned with the app palette — deterministic pick from `seed`. */
export const RECIPE_THUMB_FALLBACK_GRADIENTS = [
  'linear-gradient(145deg, #b86d42 0%, #7a4224 48%, #5c3018 100%)',
  'linear-gradient(145deg, #5c7a48 0%, #3d5230 48%, #2a3a22 100%)',
  'linear-gradient(145deg, #c9953a 0%, #8f6824 48%, #624818 100%)',
  'linear-gradient(145deg, #a84e3e 0%, #6e3024 48%, #4a2018 100%)',
  'linear-gradient(145deg, #8b7355 0%, #5c4a36 48%, #3d3224 100%)',
] as const;

export function recipeThumbFallbackGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return RECIPE_THUMB_FALLBACK_GRADIENTS[h % RECIPE_THUMB_FALLBACK_GRADIENTS.length];
}

export function recipeThumbInitials(title: string): string {
  const cleaned = title.normalize('NFKD').replace(/\p{M}/gu, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const letters = cleaned.replace(/[^\p{L}\p{N}]/gu, '');
  if (words.length >= 2) {
    const a = words[0].match(/\p{L}/u)?.[0] ?? words[0][0];
    const b = words[1].match(/\p{L}/u)?.[0] ?? words[1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
  if (letters.length === 1) return letters.toUpperCase();
  return '?';
}
