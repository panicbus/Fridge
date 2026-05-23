"""
Step 3: Apply quality filters.

Reads scraped/<site>.jsonl, writes filtered/<site>.jsonl with only
recipes that pass our quality bar.
"""

from __future__ import annotations

import json
import os
import re
import sys

from sites import FILTER_CONFIG, FILTERED_DIR, SCRAPED_DIR, SITES

TIME_REGEX = re.compile(
    r"\b\d+\s*(min|minute|minutes|mins|hour|hours|hr|hrs)\b",
    re.IGNORECASE,
)


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", "", title.lower())).strip()


def passes(rec: dict) -> tuple[bool, str]:
    cfg = FILTER_CONFIG

    title = (rec.get("title") or "").strip()
    if not title:
        return False, "empty title"
    if len(title) > cfg["max_title_length"]:
        return False, "title too long"
    for pat in cfg["title_bad_patterns"]:
        if re.search(pat, title, re.IGNORECASE):
            return False, "title matches bad pattern"

    image = rec.get("image")
    if not image or not isinstance(image, str):
        return False, "no image url"
    if not re.match(r"^https?://", image):
        return False, "invalid image url"

    ingredients = rec.get("ingredients") or []
    if not (cfg["min_ingredients"] <= len(ingredients) <= cfg["max_ingredients"]):
        return False, f"ingredients count {len(ingredients)}"

    instructions = rec.get("instructions_list") or []
    if not (cfg["min_steps"] <= len(instructions) <= cfg["max_steps"]):
        return False, f"step count {len(instructions)}"

    full_text = " ".join(instructions)
    if not (
        cfg["min_instruction_length"]
        <= len(full_text)
        <= cfg["max_instruction_length"]
    ):
        return False, f"instruction length {len(full_text)}"

    if not TIME_REGEX.search(full_text):
        return False, "no time mention"

    haystack = (title + " " + " ".join(ingredients) + " " + full_text).lower()
    for banned in cfg["exotic_banlist"]:
        if banned in haystack:
            return False, f"banned term: {banned}"

    return True, "ok"


def filter_site(site: dict) -> None:
    slug = slugify(site["name"])
    in_path = os.path.join(SCRAPED_DIR, f"{slug}.jsonl")
    out_path = os.path.join(FILTERED_DIR, f"{slug}.jsonl")
    if not os.path.exists(in_path):
        print(f"[skip] {site['name']}: no scraped file")
        return

    seen_titles: set[str] = set()
    kept = 0
    dropped_dupes = 0
    drop_reasons: dict[str, int] = {}

    with open(in_path, encoding="utf-8") as fin, open(
        out_path, "w", encoding="utf-8"
    ) as fout:
        for line in fin:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue

            ok, reason = passes(rec)
            if not ok:
                drop_reasons[reason] = drop_reasons.get(reason, 0) + 1
                continue

            norm = normalize_title(rec["title"])
            if norm in seen_titles:
                dropped_dupes += 1
                continue
            seen_titles.add(norm)

            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            kept += 1

    print(f"\n=== {site['name']} ===")
    print(f"  kept: {kept}, dropped as dupes: {dropped_dupes}")
    if drop_reasons:
        print("  drop reasons:")
        for reason, count in sorted(drop_reasons.items(), key=lambda x: -x[1])[:12]:
            print(f"    {count}: {reason}")


def main() -> int:
    os.makedirs(FILTERED_DIR, exist_ok=True)
    for site in SITES:
        filter_site(site)
    return 0


if __name__ == "__main__":
    sys.exit(main())
