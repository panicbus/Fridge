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
