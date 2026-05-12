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
npm run dev      # Vite + Electron (Dock shows Fridge icon via app.dock.setIcon)
npm run build    # Typecheck, bundle renderer, compile Electron main
npm run dist:mac # Packaged macOS app + dmg/zip (uses build/icon.icns)
```

## Project layout

- `src/services/mealdb.ts` — TheMealDB client; `findRecipesMealDB()` for MealDB-only use
- `src/services/spoonacular.ts` — Spoonacular client
- `src/services/recipeOrchestrator.ts` — `findRecipes()` merges both sources, dedupes, and applies ranking

## Saved Recipes

Tap the bookmark on any recipe card or detail view to save it. Saved recipes appear in the home view's Saved card and in the full Saved view (accessed via the top bar or the "view all" link).

Saved recipes are snapshotted at save time and work fully offline — they survive API outages, quota limits, and recipe changes at the source.

Storage: `localStorage` under `fridge.savedRecipes`. Future versions will sync to a cloud backend without requiring data migration on your end — the storage adapter is designed for it.

## History

Tap **History** in the top bar to see:

- **Recent searches** — your last 100 searches. Tap any entry to replay it with the same ingredients and diet preference.
- **Recently viewed recipes** — the last 200 recipes you opened. Tap any to revisit. Save them with the bookmark icon directly from the history list.
- **Vegan first** — header control **On** (default) limits lists to searches run in vegan-first mode and to viewed recipes flagged vegan; **Off** shows full history for both sections.

History is stored locally and capped to avoid unbounded growth. Older entries are evicted automatically.

## Pantry Manage

Tap **Manage →** on the pantry card (or open the pantry from anywhere this view becomes available) to:

- Filter by ingredient name
- Sort by recently used, A → Z, most used, or oldest first
- Click any ingredient name to rename it (e.g. fix typos)
- Delete ingredients you don't want tracked

Renamed ingredients preserve their usage history. Deleted ingredients are removed immediately — no confirmation, but they can be added back any time by typing them into a search.

## Cook Mode

Press **Enter cooking mode** on any recipe to enter a focused, hands-friendly cook mode:

- One step at a time, in large readable type
- Ingredients used in the current step shown inline with their measures
- Smart timers — if a step says "simmer for 20 minutes", a tappable timer appears with that duration pre-set
- The screen stays awake while cook mode is active
- Tap anywhere or press space/arrow keys to advance through steps
- A **Bon Appétit** celebration screen with a burst of utensils when you finish

Timers can be toggled off via the clock icon in the top bar if you prefer to ignore them.

## Icon assets

- `src/assets/logo-full.svg` — full-detail logo (same artwork as inlined in the homepage header)
- `public/favicon.svg` — simplified favicon for browser tabs (handles dropped, thicker strokes)
- `build/icon-source.svg` → `build/icon.png` → `build/icon.icns` — macOS app icon pipeline

To regenerate the macOS app icon after changing the source SVG:

```bash
./scripts/build-icon.sh
```

Requires macOS (`sips` and `iconutil` are system tools). The script uses `rsvg-convert` when available; otherwise it runs `npx sharp-cli` to rasterize the SVG to PNG.
