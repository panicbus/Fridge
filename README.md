# Fridge

Desktop recipe discovery (Electron + React + Vite). Enter ingredients you have; get recipes you can cook, with a kitchen-friendly cooking view.

## API Keys

This app uses three recipe sources:

- **Local trove** — bundled SQLite (Epicurious and optional Layer 2 sites), built offline; see [Local recipe trove](#local-recipe-trove).
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
npm run dev           # Vite + Electron (Dock shows Fridge icon via app.dock.setIcon)
npm run build         # Typecheck, bundle renderer, compile Electron main
npm run dist:mac      # Signed, notarized universal macOS Fridge.dmg + .zip (see Signing below)
npm run package:dir   # Same build, output .app bundle only (no .dmg wiring)
```

## Building a release

`npm run dist:mac` invokes **electron-builder** with a **universal** binary (Apple Silicon + Intel) and produces signed, notarized **`Fridge.dmg`** and **`Fridge.zip`** in **`release/`**.

Vite writes the renderer to **`dist/`**; **`release/`** is only for installers so packaging never wipes the renderer bundle.

To produce a shippable release:

```bash
# 1. Render the DMG installer background (after edits to docs/dmg-background/ or once before first dist)
cd docs && npm install && npm run render:dmg-bg && cd ..

# 2. Ensure local recipe trove assets exist under assets/ (see Local recipe trove below)

# 3. Create .env.build with notarization credentials (see Signing and notarization below)

# 4. Build and package
npm run dist:mac

# Output: release/Fridge.dmg and release/Fridge.zip
```

## Signing and notarization

Fridge is code-signed with a Developer ID Application certificate and notarized by Apple. Friends installing the app see no Gatekeeper warnings.

Create a gitignored **`.env.build`** file in the project root (copy from **`.env.build.example`**):

```bash
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=KB8N3Q3ZAF
```

**Important:** `APPLE_APP_SPECIFIC_PASSWORD` is **not** your normal Apple ID password. Generate one at [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords. Use no quotes in `.env.build`. The email must be the Apple ID tied to developer team **KB8N3Q3ZAF**.

`npm run dist:mac` validates credentials with Apple **before** packaging. If you see `HTTP status code: 401` or `Invalid credentials`, regenerate the app-specific password and update `.env.build`.

The Developer ID Application certificate must be installed in your login keychain. **`npm run dist:mac`** sources `.env.build`, validates credentials, clears extended attributes on the Electron distribution (and on the packed `.app` via an afterPack hook), builds to **`/var/tmp/fridge-app-release`** to avoid iCloud interfering with codesign, then copies artifacts to **`./release/`**.

**DMG note:** The app bundle is large (~650MB with recipe images). electron-builder's built-in DMG step under-allocates disk space, so **`scripts/create-dmg.sh`** builds `Fridge.dmg` after the signed `.zip` / `.app` are produced. Eject any mounted **Fridge** disk image before packaging.

For quick local smoke of the packaged app without creating a `.dmg`:

```bash
npm run package:dir
# Open release/mac/Fridge.app (path may vary slightly by electron-builder version)
```

To regenerate the install guide and welcome booklet PDFs (after copying screenshots into `docs/screenshots/`):

```bash
cd docs
npm install
npm run render:install
npm run render:booklet
# Output: docs-out/Fridge-Install-Guide.pdf and docs-out/Fridge-Welcome.pdf (project root)
```

Bundle **`release/Fridge.dmg`** with both PDFs in a ZIP or folder for distribution.

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

The local trove consists of recipes from two layers:

1. **Epicurious** (~6,000 recipes after filtering) — bundled from the Kaggle *Food Ingredients and Recipes Dataset with Images* (see `scripts/prep-recipes`). Rows use a synthetic Epicurious search URL for attribution when built with that pipeline.

2. **Curated cooking sites** (~10,000+ recipes after filters, when you run Layer 2) — scraped with Python and [`recipe-scrapers`](https://github.com/hhursev/recipe-scrapers/) from six sites: Budget Bytes, The Kitchn, Minimalist Baker, Love & Lemons, Smitten Kitchen, and Serious Eats. Each recipe stores the **canonical** source URL in the database; the in-app link opens the original article.

To rebuild **Layer 1** (Epicurious CSV + images + SQLite), see **`scripts/prep-recipes/README.md`**.

To add **Layer 2** (append scraped sites into the same `assets/recipes.db` and `assets/recipe-images/`), see **`scripts/prep-recipes/python/README.md`**.

You need **`assets/recipes.db`** for local search. **`assets/recipe-images/`** holds WebP thumbnails (`*.webp` for Layer 1, `l2-*.webp` for Layer 2); the Electron app serves them via the custom **`fridge://`** protocol so images load reliably in the renderer.

**Electron local DB:** The app opens `recipes.db` in the main process with **sql.js** (WASM). The packaged runtime searches with token substring matching on title and `ner_json`. Re-run **`npm run dev`** after `npm install`; if local search is empty, confirm **`assets/recipes.db`** exists.

## Icon assets

- `src/assets/logo-full.svg` — full-detail logo (same artwork as inlined in the homepage header)
- `public/favicon.svg` — simplified favicon for browser tabs (handles dropped, thicker strokes)
- `build/icon-source.svg` → `build/icon.png` → `build/icon.icns` — macOS app icon pipeline

To regenerate the macOS app icon after changing the source SVG:

```bash
./scripts/build-icon.sh
```

Requires macOS (`sips` and `iconutil` are system tools). The script uses `rsvg-convert` when available; otherwise it runs `npx sharp-cli` to rasterize the SVG to PNG.
