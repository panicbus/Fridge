# Fridge

Desktop recipe discovery (Electron + React + Vite). Enter ingredients you have; get recipes you can cook, with a kitchen-friendly cooking view.

## API Keys

This app uses three recipe sources:

- **Local trove** — bundled SQLite (~10k curated weeknight-friendly recipes derived from [RecipeNLG](https://recipenlg.cs.put.poznan.pl/), built offline via `scripts/prep-recipes`; see [Local recipe trove](#local-recipe-trove).
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

Spoonacular provides authoritative diet flags. For TheMealDB and **local trove** recipes, vegan/vegetarian/GF/dairy-free status is inferred from the ingredient list — the inference is conservative (errs toward marking recipes as non-vegan) but not 100% accurate.

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
- `src/services/localRecipes.ts` — bundled SQLite recipes (Electron IPC from main process)
- `src/services/recipeOrchestrator.ts` — `findRecipes()` merges all sources, dedupes, and applies ranking

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

## Local recipe trove

The app can ship with a bundled SQLite database of ~10,000 curated weeknight-friendly recipes, sourced from [RecipeNLG](https://recipenlg.cs.put.poznan.pl/) (manual download of **`full_dataset.csv`**, subject to the dataset terms — the Hugging Face repo `mbien/recipe_nlg` only hosts the loader script, not the CSV). When present, it is queried alongside TheMealDB and Spoonacular for ingredient search.

To build the database (one-time). Optional WebP thumbnails from recipe **source pages** usually fail for RecipeNLG (`link` rows point at old sites); the prep script **probes first** and skips a long useless crawl when none succeed. **`npm run build-data`** builds only the SQLite DB (skip image step entirely).

```bash
cd scripts/prep-recipes
npm install
# Download full_dataset.csv from https://recipenlg.cs.put.poznan.pl/dataset → copy to ./raw/
npm run download   # verifies the CSV
npm run build-data # filter → build-db (recommended)
# optional: npm run fetch-images  # probes / may skip bulk fetch; or SKIP_IMAGE_FETCH=1 npm run all
```

Filtering requires **Python 3** (`python3`) to parse list-shaped columns in the official CSV; see `scripts/prep-recipes/README.md`.

You need **`assets/recipes.db`** for local search; **`assets/recipe-images/`** is optional and is often empty—cards use placeholders. Both paths are listed as Electron **extra resources** when present. Without running prep, local search returns no results; **run at least `build-data` before `npm run dist:mac`** so `recipes.db` exists.

The local source gets a small ranking boost in `recipeOrchestrator.ts` so curated matches tend to appear slightly higher while Spoonacular and MealDB still supply variety.

**Electron local DB:** The app opens `recipes.db` in the main process with **sql.js** (WASM), so there is **no native SQLite addon** to rebuild for Apple Silicon vs Intel. The prep pipeline still builds **FTS5** tables for tooling consistency, but the packaged runtime searches with **token substring matching** on title and NER fields (ranked by how many ingredient tokens match). Re-run **`npm run dev`** after `npm install`; if local search is empty, confirm **`assets/recipes.db`** exists (build it under `scripts/prep-recipes`).

## Icon assets

- `src/assets/logo-full.svg` — full-detail logo (same artwork as inlined in the homepage header)
- `public/favicon.svg` — simplified favicon for browser tabs (handles dropped, thicker strokes)
- `build/icon-source.svg` → `build/icon.png` → `build/icon.icns` — macOS app icon pipeline

To regenerate the macOS app icon after changing the source SVG:

```bash
./scripts/build-icon.sh
```

Requires macOS (`sips` and `iconutil` are system tools). The script uses `rsvg-convert` when available; otherwise it runs `npx sharp-cli` to rasterize the SVG to PNG.
