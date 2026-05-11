# Fridge

Desktop recipe discovery (Electron + React + Vite). Enter ingredients you have; get recipes you can cook, with a kitchen-friendly cooking view.

## API Keys

This app uses two recipe sources:

- **TheMealDB** — free, no key needed, ~600 recipes
- **Spoonacular** — free tier (150 requests/day), 300,000+ recipes — recommended

To enable Spoonacular:

1. Sign up at [https://spoonacular.com/food-api](https://spoonacular.com/food-api)
2. Copy your API key
3. Create `.env` at the project root:

   ```
   VITE_SPOONACULAR_API_KEY=your_key_here
   ```

4. Restart the dev server (`npm run dev`)

The app works without Spoonacular but with a much smaller recipe pool.

## Diet Preferences

The app defaults to **Vegan-first**: vegan recipes appear at the top, with non-vegan results below. Toggle to **Vegetarian-friendly** to also boost vegetarian recipes, or **Show all** for pure match-quality ranking. This choice is saved in `localStorage` under `fridge.dietPreference`.

Spoonacular provides authoritative diet flags. For TheMealDB recipes, vegan/vegetarian/GF/dairy-free status is inferred from the ingredient list — the inference is conservative (errs toward marking recipes as non-vegan) but not 100% accurate.

## Scripts

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # Typecheck, bundle renderer, compile Electron main
```

## Project layout

- `src/services/mealdb.ts` — TheMealDB client; `findRecipesMealDB()` for MealDB-only use
- `src/services/spoonacular.ts` — Spoonacular client
- `src/services/recipeOrchestrator.ts` — `findRecipes()` merges both sources, dedupes, and applies ranking

## Saved Recipes

Tap the bookmark on any recipe card or detail view to save it. Saved recipes appear in the home view's Saved card and in the full Saved view (accessed via the top bar or the "view all" link).

Saved recipes are snapshotted at save time and work fully offline — they survive API outages, quota limits, and recipe changes at the source.

Storage: `localStorage` under `fridge.savedRecipes`. Future versions will sync to a cloud backend without requiring data migration on your end — the storage adapter is designed for it.

## Icon assets

- `src/assets/logo-full.svg` — full-detail logo (same artwork as inlined in the homepage header)
- `public/favicon.svg` — simplified favicon for browser tabs (handles dropped, thicker strokes)
- `build/icon-source.svg` → `build/icon.png` → `build/icon.icns` — macOS app icon pipeline

To regenerate the macOS app icon after changing the source SVG:

```bash
./scripts/build-icon.sh
```

Requires macOS (`sips` and `iconutil` are system tools). The script uses `rsvg-convert` when available; otherwise it runs `npx sharp-cli` to rasterize the SVG to PNG.
