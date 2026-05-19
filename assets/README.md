# Bundled assets (local recipe trove)

This folder holds outputs from **`scripts/prep-recipes`**:

- `recipes.db` — SQLite + FTS5 index
- `recipe-images/` — optional WebP thumbnails (400px); often **empty** for RecipeNLG because source URLs rarely yield images — the UI uses placeholders instead.

These files are **gitignored** because they are large. Generate them locally before packaging (`npm run dist:mac`). See the root **README** section **Local recipe trove**.

Without `recipes.db`, the app still runs; the local source returns no matches until the database exists.
