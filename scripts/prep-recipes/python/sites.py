"""
Site configuration for Layer 2 recipe scraping.

Each site has a sitemap that we read once to discover recipe URLs.
We DO NOT crawl — we read the sitemap, filter URLs to recipe pages,
and scrape each URL exactly once.

If a site's sitemap structure changes or it adopts bot protection,
that site will start failing and should be removed or updated here.
"""

SITES = [
    {
        "name": "Budget Bytes",
        "domain": "budgetbytes.com",
        "sitemap_url": "https://www.budgetbytes.com/sitemap_index.xml",
        "sitemap_filter": r"post-sitemap\d*\.xml$",
        "url_pattern": r"^https://www\.budgetbytes\.com/[a-z0-9-]+/?$",
        "delay_seconds": 1.5,
    },
    {
        "name": "The Kitchn",
        "domain": "thekitchn.com",
        "sitemap_url": "https://www.thekitchn.com/sitemap.xml",
        "sitemap_filter": r"sitemap.*\.xml$",
        "url_pattern": r"^https://www\.thekitchn\.com/recipe-[a-z0-9-]+",
        "delay_seconds": 1.5,
    },
    {
        "name": "Minimalist Baker",
        "domain": "minimalistbaker.com",
        "sitemap_url": "https://minimalistbaker.com/sitemap_index.xml",
        "sitemap_filter": r"post-sitemap\d*\.xml$",
        "url_pattern": r"^https://minimalistbaker\.com/[a-z0-9-]+/?$",
        "delay_seconds": 1.5,
    },
    {
        "name": "Love & Lemons",
        "domain": "loveandlemons.com",
        "sitemap_url": "https://www.loveandlemons.com/sitemap.xml",
        "sitemap_filter": r"post-sitemap\d*\.xml$",
        "url_pattern": r"^https://www\.loveandlemons\.com/[a-z0-9-]+/?$",
        "delay_seconds": 1.5,
    },
    {
        "name": "Smitten Kitchen",
        "domain": "smittenkitchen.com",
        "sitemap_url": "https://smittenkitchen.com/sitemap_index.xml",
        "sitemap_filter": r"post-sitemap\d*\.xml$",
        "url_pattern": r"^https://smittenkitchen\.com/\d{4}/\d{2}/[a-z0-9-]+/?$",
        "delay_seconds": 1.5,
    },
    {
        "name": "Serious Eats",
        "domain": "seriouseats.com",
        "sitemap_url": "https://www.seriouseats.com/sitemap.xml",
        "sitemap_filter": r"sitemap.*\.xml$",
        "url_pattern": r"^https://www\.seriouseats\.com/.*-recipe(-\d+)?/?$",
        "delay_seconds": 2.0,
    },
]

USER_AGENT = "fridge-prep-script (hobby recipe app, contact: https://github.com/panicbus/Fridge)"

# Many publishers (The Kitchn, etc.) return 403 on sitemap/HTML URLs for
# bot-like or script-only User-Agents. Politeness is still enforced by
# robots.txt + delay_seconds; this identity is for HTTP compatibility only.
HTTP_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def http_headers() -> dict[str, str]:
    """Headers for recipe-sitemaps + HTML + images (matches HTTP_USER_AGENT)."""
    return {
        "User-Agent": HTTP_USER_AGENT,
        "Accept": "application/xml, text/xml, application/rss+xml, text/html, application/xhtml+xml, image/avif, image/webp, image/*, */*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "DNT": "1",
        # Optional transparency — not all stacks log it; UA is what WAFs gate on.
        "X-Fridge-Prep": "https://github.com/panicbus/Fridge",
    }

FILTER_CONFIG = {
    "min_ingredients": 4,
    "max_ingredients": 12,
    "min_steps": 3,
    "max_steps": 12,
    "min_instruction_length": 200,
    "max_instruction_length": 3000,
    "max_title_length": 80,
    "exotic_banlist": [
        "sous vide",
        "sous-vide",
        "xanthan",
        "agar",
        "gelatin sheets",
        "edible flowers",
        "gold leaf",
        "foie gras",
        "sweetbreads",
        "tripe",
        "offal",
        "caviar",
        "truffle oil",
        "liquid nitrogen",
        "spherification",
        "transglutaminase",
        "pig's feet",
        "oxtail",
        "rabbit",
        "pheasant",
        "venison",
        "quail",
        "goose",
        "squab",
        "octopus",
        "sea urchin",
        "frog legs",
        "snail",
        "bone marrow",
        "tongue",
        "tempering chocolate",
        "beurre blanc",
        "beurre noisette",
        "velouté",
        "consommé",
        "demi-glace",
        "reduction sauce",
    ],
    "title_bad_patterns": [
        r"\b(fancy|gourmet|advanced|professional|restaurant-style|michelin)\b",
    ],
}

OUTPUT_BASE = "."
URLS_DIR = "urls"
SCRAPED_DIR = "scraped"
FILTERED_DIR = "filtered"
