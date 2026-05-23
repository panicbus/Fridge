"""
Step 5: Insert filtered Layer 2 recipes into ../../../assets/recipes.db.

Appends rows; does not DROP existing Epicurious data. Uses recipe_search.ner_text
to match the FTS5 schema created by the Node build-db step.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import sys

from sites import FILTERED_DIR, SITES

DB_PATH = os.path.join("..", "..", "..", "assets", "recipes.db")
LAYER2_ID_START = 1_000_000


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", "", title.lower())).strip()


def estimate_time(rec: dict) -> int | None:
    tt = rec.get("total_time")
    if isinstance(tt, int) and tt > 0:
        return min(tt, 240)
    if hasattr(tt, "total_seconds"):
        try:
            m = int(tt.total_seconds() // 60)
            return min(m, 240) if m > 0 else None
        except Exception:
            pass
    text = " ".join(rec.get("instructions_list") or [])
    total = 0
    for m in re.finditer(
        r"\b(\d+)\s*(min|minute|minutes|mins)\b", text, re.IGNORECASE
    ):
        total += int(m.group(1))
    for m in re.finditer(
        r"\b(\d+)\s*(hour|hours|hr|hrs)\b", text, re.IGNORECASE
    ):
        total += int(m.group(1)) * 60
    return min(total, 240) if total > 0 else None


def extract_ner(ingredients: list[str]) -> list[str]:
    names = []
    for raw in ingredients:
        cleaned = re.sub(r"^[\d¼½¾⅓⅔⅛\s\-/]+", "", raw.lower())
        cleaned = re.sub(
            r"^(cup|cups|tsp|tbsp|teaspoon|teaspoons|tablespoon|tablespoons|"
            r"ounce|ounces|oz|lb|lbs|pound|pounds|g|gram|grams|kg|ml|liter|"
            r"liters|l|pinch|dash|clove|cloves|stick|sticks)s?\.?\s+",
            "",
            cleaned,
        )
        cleaned = re.split(r",", cleaned, 1)[0]
        cleaned = re.sub(r"\(.*?\)", "", cleaned).strip()
        if 1 < len(cleaned) < 60:
            names.append(cleaned)
    return names


def main() -> int:
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}. Run Epicurious prep first.")
        return 1

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Verify schema
    cur.execute("PRAGMA table_info(recipes)")
    cols = {row[1] for row in cur.fetchall()}
    if "image_path" not in cols:
        print(
            "DB schema missing image_path. Rebuild recipes.db with scripts/prep-recipes/build-db.js."
        )
        conn.close()
        return 1

    cur.execute("SELECT title FROM recipes")
    existing = {normalize_title(row[0]) for row in cur.fetchall()}
    print(f"Existing recipes in DB: {len(existing)}")

    cur.execute("SELECT MAX(id) FROM recipes")
    max_id = cur.fetchone()[0] or 0
    next_id = max(max_id + 1, LAYER2_ID_START)

    insert_recipe = """
        INSERT INTO recipes
          (id, title, ingredients_json, directions_json, ner_json,
           source_url, source_name, image_path, total_time_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    insert_search = """
        INSERT INTO recipe_search (rowid, title, ner_text)
        VALUES (?, ?, ?)
    """

    total_added = 0
    summary: list[tuple[str, int]] = []

    for site in SITES:
        slug = slugify(site["name"])
        in_path = os.path.join(FILTERED_DIR, f"{slug}.jsonl")
        if not os.path.exists(in_path):
            summary.append((site["name"], 0))
            continue

        site_count = 0
        with open(in_path, encoding="utf-8") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if not rec.get("image_filename"):
                    continue
                norm = normalize_title(rec["title"])
                if norm in existing:
                    continue
                existing.add(norm)

                ner = extract_ner(rec.get("ingredients") or [])
                cur.execute(
                    insert_recipe,
                    (
                        next_id,
                        rec["title"],
                        json.dumps(rec["ingredients"]),
                        json.dumps(rec["instructions_list"]),
                        json.dumps(ner),
                        rec["source_url"],
                        rec["source_name"],
                        rec["image_filename"],
                        estimate_time(rec),
                    ),
                )
                cur.execute(
                    insert_search,
                    (next_id, rec["title"], " ".join(ner)),
                )
                next_id += 1
                site_count += 1

        summary.append((site["name"], site_count))
        total_added += site_count

    conn.commit()
    conn.close()

    print("\n=== Summary ===")
    for name, count in summary:
        print(f"  {name}: +{count}")
    print(f"\nTotal added: {total_added}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
