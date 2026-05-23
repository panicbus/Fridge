"""
Step 2: Scrape each URL via recipe-scrapers.

Reads urls/<site>.txt files.
For each URL, fetches the HTML, hands to recipe-scrapers, extracts a
structured recipe object, writes JSONL to scraped/<site>.jsonl.

Resumable: skips URLs already present in the output file.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time

import requests
from recipe_scrapers import scrape_html

from sites import SCRAPED_DIR, SITES, URLS_DIR, http_headers


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def already_scraped(out_path: str) -> set[str]:
    if not os.path.exists(out_path):
        return set()
    seen: set[str] = set()
    with open(out_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                if "source_url" in rec:
                    seen.add(rec["source_url"])
            except json.JSONDecodeError:
                continue
    return seen


def fetch_with_retries(url: str, max_attempts: int = 3) -> str | None:
    for attempt in range(max_attempts):
        try:
            r = requests.get(
                url,
                headers=http_headers(),
                timeout=45,
            )
            if r.status_code == 429:
                wait = 60 * (attempt + 1)
                print(f"    [429] rate limited — wait {wait}s")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.text
        except Exception as e:
            if attempt == max_attempts - 1:
                return None
            wait = 2**attempt
            print(f"    [retry {attempt + 1}/{max_attempts}] {e} — wait {wait}s")
            time.sleep(wait)
    return None


def instructions_as_list(scraper) -> list[str]:
    if hasattr(scraper, "instructions_list"):
        try:
            lst = scraper.instructions_list()
            if lst:
                return [str(x).strip() for x in lst if str(x).strip()]
        except Exception:
            pass
    try:
        text = scraper.instructions()
    except Exception:
        return []
    if not text:
        return []
    if isinstance(text, list):
        return [str(x).strip() for x in text if str(x).strip()]
    parts = [p.strip() for p in str(text).split("\n") if p.strip()]
    return parts if parts else [str(text).strip()]


def normalize_total_time(scraper) -> int | None:
    if not hasattr(scraper, "total_time"):
        return None
    try:
        tt = scraper.total_time()
    except Exception:
        return None
    if tt is None:
        return None
    if hasattr(tt, "total_seconds"):
        try:
            return max(1, int(tt.total_seconds() // 60))
        except Exception:
            return None
    try:
        return int(tt)
    except (TypeError, ValueError):
        return None


def image_url(scraper) -> str | None:
    if not hasattr(scraper, "image"):
        return None
    try:
        u = scraper.image()
    except Exception:
        return None
    if not u or not isinstance(u, str):
        return None
    return u.strip() or None


def scrape_one(url: str, html: str) -> dict | None:
    try:
        scraper = scrape_html(html, org_url=url)
    except Exception:
        return None

    try:
        title = scraper.title()
    except Exception:
        return None
    if not title or not str(title).strip():
        return None

    ingredients: list[str] = []
    try:
        ingredients = list(scraper.ingredients())
    except Exception:
        return None

    inst_list = instructions_as_list(scraper)

    try:
        return {
            "source_url": url,
            "title": str(title).strip(),
            "ingredients": ingredients,
            "instructions_list": inst_list,
            "image": image_url(scraper),
            "total_time": normalize_total_time(scraper),
            "yields": scraper.yields() if hasattr(scraper, "yields") else None,
            "category": scraper.category() if hasattr(scraper, "category") else None,
            "cuisine": scraper.cuisine() if hasattr(scraper, "cuisine") else None,
        }
    except Exception:
        return None


def scrape_site(site: dict) -> None:
    slug = slugify(site["name"])
    url_file = os.path.join(URLS_DIR, f"{slug}.txt")
    if not os.path.exists(url_file):
        print(f"\n[skip] {site['name']}: no URLs file at {url_file}")
        return

    with open(url_file, encoding="utf-8") as f:
        urls = [line.strip() for line in f if line.strip()]

    out_path = os.path.join(SCRAPED_DIR, f"{slug}.jsonl")
    seen = already_scraped(out_path)
    todo = [u for u in urls if u not in seen]

    print(f"\n=== {site['name']} ===")
    print(f"  total URLs: {len(urls)}")
    print(f"  already scraped: {len(seen)}")
    print(f"  todo: {len(todo)}")

    if not todo:
        print("  nothing to do")
        return

    succeeded = 0
    failed = 0
    skipped_unsupported = 0
    delay = site["delay_seconds"]

    with open(out_path, "a", encoding="utf-8") as out:
        for i, url in enumerate(todo, 1):
            if i % 50 == 0:
                print(
                    f"  [{i}/{len(todo)}] succeeded={succeeded} failed={failed} unsupported={skipped_unsupported}"
                )
            html = fetch_with_retries(url)
            if not html:
                failed += 1
                time.sleep(delay)
                continue
            rec = scrape_one(url, html)
            if rec is None:
                skipped_unsupported += 1
                time.sleep(delay)
                continue
            rec["source_name"] = site["name"]
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            out.flush()
            succeeded += 1
            time.sleep(delay)

    print(f"  done: succeeded={succeeded} failed={failed} unsupported={skipped_unsupported}")


def main() -> int:
    os.makedirs(SCRAPED_DIR, exist_ok=True)
    for site in SITES:
        scrape_site(site)
    return 0


if __name__ == "__main__":
    sys.exit(main())
