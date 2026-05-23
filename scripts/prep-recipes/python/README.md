# Layer 2 — Curated Recipe Scraping

Python pipeline that scrapes recipes from six curated cooking sites and adds them to `../../../assets/recipes.db` alongside the existing Epicurious (Layer 1) data.

## One-time setup

```bash
cd scripts/prep-recipes/python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
source venv/bin/activate
python run_all.py
```

This is a long run (~4–8 hours depending on rate limits and site response times). Designed to run overnight. Each step writes an intermediate file so you can resume after a crash.

## Step-by-step (if you want to inspect intermediates)

```bash
python fetch_sitemaps.py   # writes urls/*.txt — list of recipe URLs per site
python scrape.py           # writes scraped/*.jsonl — one JSON per recipe
python filter.py           # writes filtered/*.jsonl — survivors
python process_images.py   # writes ../../../assets/recipe-images/ (additions)
python insert_into_db.py   # appends rows to ../../../assets/recipes.db
```

## Politeness

- Default **1 request per 1.5s per site** (configurable in `sites.py`; Serious Eats uses 2.0s).
- **robots.txt** is checked once per site at the start of `fetch_sitemaps.py` (using **`requests`** + the same browser-like **User-Agent** as sitemap fetches).
- **HTTP headers** use a normal desktop Chrome **`User-Agent`** plus `Accept` / `Accept-Language`. Many hosts (notably **The Kitchn**) return **403** to non-browser clients even for public sitemaps; this is required for access, not to bypass rate limits — delays still apply.
- Failed HTTP requests retry with backoff; **429** waits longer; **403** on sitemaps retries a few times with backoff in `fetch_sitemaps.py`.
- Sites without a usable sitemap produce a warning / zero URLs — adjust `sites.py`, do not crawl the whole domain.

## Configuration

Edit `sites.py` to add/remove sites or change rate limits. Each site needs `name`, `domain`, `sitemap_url`, `sitemap_filter`, `url_pattern`, and `delay_seconds`.
