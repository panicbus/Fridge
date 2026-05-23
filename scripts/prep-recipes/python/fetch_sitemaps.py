"""
Step 1: Discover recipe URLs from each site's sitemap.

For each configured site:
  1. Check robots.txt — bail if scraping is disallowed
  2. Fetch the sitemap (or sitemap index)
  3. If it's an index, fetch the matching child sitemaps
  4. Extract all <loc> URLs
  5. Filter to recipe URLs using site's url_pattern
  6. Write to urls/<site_slug>.txt

Output: urls/<site_slug>.txt — one URL per line.
"""

from __future__ import annotations

import os
import re
import sys
import time
from urllib.parse import urlparse

import requests
from lxml import etree
from urllib.robotparser import RobotFileParser

from sites import HTTP_USER_AGENT, SITES, URLS_DIR, http_headers


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def robots_url_for_sitemap(sitemap_url: str) -> str:
    p = urlparse(sitemap_url)
    scheme = p.scheme or "https"
    netloc = p.netloc
    if not netloc:
        return ""
    return f"{scheme}://{netloc}/robots.txt"


def check_robots(sitemap_url: str) -> bool:
    """Returns True if we are allowed to fetch the sitemap URL (same UA as HTTP)."""
    ru = robots_url_for_sitemap(sitemap_url)
    if not ru:
        print(f"  [warn] could not derive robots URL from {sitemap_url}")
        return False
    try:
        r = requests.get(ru, headers=http_headers(), timeout=30)
        r.raise_for_status()
    except Exception as e:
        print(f"  [warn] could not read robots.txt ({ru}): {e}")
        return False
    rp = RobotFileParser()
    rp.set_url(ru)
    rp.parse(r.text.splitlines())
    return rp.can_fetch(HTTP_USER_AGENT, sitemap_url)


def fetch_xml(url: str) -> bytes | None:
    """Fetch XML with browser-like headers; retry on 403/5xx (some CDNs are flaky)."""
    max_attempts = 4
    for attempt in range(max_attempts):
        try:
            r = requests.get(url, headers=http_headers(), timeout=45)
            if r.status_code == 403 and attempt < max_attempts - 1:
                wait = 5 * (attempt + 1)
                print(f"  [403] backing off {wait}s then retry ({attempt + 1}/{max_attempts}): {url[:80]}...")
                time.sleep(wait)
                continue
            if r.status_code >= 500 and attempt < max_attempts - 1:
                wait = 3 * (attempt + 1)
                print(f"  [{r.status_code}] retry in {wait}s...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.content
        except Exception as e:
            if attempt == max_attempts - 1:
                print(f"  [err] failed to fetch {url}: {e}")
                return None
            time.sleep(2**attempt)
    return None


def extract_locs(xml_bytes: bytes) -> list[str]:
    """Extract all <loc> values from a sitemap or sitemap index."""
    try:
        root = etree.fromstring(xml_bytes)
    except etree.XMLSyntaxError as e:
        print(f"  [warn] sitemap is not valid XML: {e}")
        return []
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = root.xpath("//sm:loc/text()", namespaces=ns)
    return [str(loc).strip() for loc in locs]


def fetch_one_site(site: dict) -> list[str]:
    print(f"\n=== {site['name']} ({site['domain']}) ===")

    su = site["sitemap_url"]
    if not check_robots(su):
        print("  [skip] robots.txt disallows our fetch for the sitemap URL.")
        return []
    print("  robots.txt OK")

    print(f"  fetching {su}")
    top_xml = fetch_xml(su)
    if not top_xml:
        return []
    time.sleep(site["delay_seconds"])

    top_locs = extract_locs(top_xml)
    print(f"  top-level locs: {len(top_locs)}")

    sitemap_filter_re = re.compile(site["sitemap_filter"])
    child_sitemap_urls = [loc for loc in top_locs if sitemap_filter_re.search(loc)]

    all_urls: list[str] = []

    if child_sitemap_urls:
        print(
            f"  found sitemap index with {len(child_sitemap_urls)} matching children"
        )
        for child_url in child_sitemap_urls:
            print(f"    fetching {child_url}")
            child_xml = fetch_xml(child_url)
            if child_xml:
                all_urls.extend(extract_locs(child_xml))
            time.sleep(site["delay_seconds"])
    else:
        all_urls = top_locs

    url_pattern_re = re.compile(site["url_pattern"])
    recipe_urls = [u for u in all_urls if url_pattern_re.match(u)]
    print(f"  total URLs discovered: {len(all_urls)}")
    print(f"  matched recipe pattern: {len(recipe_urls)}")

    return recipe_urls


def main() -> int:
    os.makedirs(URLS_DIR, exist_ok=True)

    summary: list[tuple[str, int]] = []
    for site in SITES:
        urls = fetch_one_site(site)
        if urls:
            slug = slugify(site["name"])
            out_path = os.path.join(URLS_DIR, f"{slug}.txt")
            with open(out_path, "w", encoding="utf-8") as f:
                for u in urls:
                    f.write(u + "\n")
            summary.append((site["name"], len(urls)))
        else:
            summary.append((site["name"], 0))

    print("\n=== Summary ===")
    for name, count in summary:
        marker = "OK " if count > 0 else "—  "
        print(f"  {marker} {name}: {count} URLs")

    total = sum(c for _, c in summary)
    print(f"\nTotal candidate URLs: {total}")
    if total == 0:
        print("No URLs found. Check sitemap_url and url_pattern in sites.py.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
