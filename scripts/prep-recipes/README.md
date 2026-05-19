# Recipe Data Prep

One-time scripts to build the bundled **local recipe trove** SQLite DB and hero images. Run from `scripts/prep-recipes/`.

## Prerequisites

- Node 18+
- **Python 3** on `PATH` as `python3` — required for **`npm run filter`** when using the official RecipeNLG `full_dataset.csv` (ingredient/direction columns are **Python list literals**, not JSON).

## Getting the raw CSV (manual)

The Hugging Face repo **`mbien/recipe_nlg`** only contains the Hugging Face **dataset loader script** (~13 KB), **not** the 2M+ recipes. The corpus file is **`full_dataset.csv`**, distributed by Poznań University of Technology under their terms:

1. Open **[RecipeNLG dataset](https://recipenlg.cs.put.poznan.pl/dataset)** and accept the download terms.
2. Download and unzip the archive (e.g. `dataset.zip`).
3. Copy **`full_dataset.csv`** into **`scripts/prep-recipes/raw/full_dataset.csv`** (create `raw` if needed).

Verify placement:

```bash
npm run download
```

This checks the file exists and is large enough (real dump is hundreds of MB or more — not the tiny HF repo checkout).

## Steps

1. **Verify raw file** — see above; `npm run download`
2. **Filter** — ~10k weeknight-friendly recipes → `filtered.jsonl` (streams via Python for `full_dataset.csv`):  
   `npm run filter`
3. **Build SQLite** — `assets/recipes.db` with FTS5 index:  
   `npm run build-db`
4. **Fetch images** (optional) — Scrape `og:image`, resize to WebP. **Most RecipeNLG `link` URLs are old sites that are down, block bots, or have no `og:image`, so this step often saves zero files.** The script **probes ~20 pages first**; if none succeed, it **skips the bulk crawl** and exits (the app uses placeholders). To crawl all rows anyway: `FORCE_FETCH_IMAGES=1 npm run fetch-images`. To skip entirely: `SKIP_IMAGE_FETCH=1 npm run fetch-images` or use **`npm run build-data`** instead of **`npm run all`**.

Run everything (after **`full_dataset.csv`** is in `./raw/`):

```bash
npm install
npm run all          # includes optional image probe/fetch
# or DB only (no image step):
npm run build-data
```

## Outputs (repo root)

Written under **`../../assets/`** from this directory:

- `recipes.db` (~15–30 MB typical)
- `recipe-images/*.webp` (optional — often empty for RecipeNLG; ~0 MB)

These paths are bundled as Electron `extraResources` for production builds when present.

## Rough disk / time

| Step          | Time           | Disk           |
| ------------- | -------------- | -------------- |
| Obtain CSV    | (manual)       | ~1–2 GB raw    |
| Filter        | ~2–5 min       | ~25 MB jl      |
| Build DB      | ~30–60 sec     | ~20 MB db      |
| Fetch images  | seconds–many min | usually ~0 B for RecipeNLG |

Expect **no thumbnails** for most RecipeNLG-backed rows; **that is OK** — search and cook mode still work, with card placeholders.

## Troubleshooting

- **`npm run download` fails** — You don’t have **`raw/full_dataset.csv`** yet, or it’s too small. Use the PUT link above, not `hf download mbien/recipe_nlg` (that only downloads the loader script).
- **`npm run filter` / Python errors** — Install Python 3 and ensure **`python3 --version`** works in the same shell.
