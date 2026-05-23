"""
Step 4: Download images, resize to 400x400 WebP, save under
../../../assets/recipe-images/. Update filtered records with image_filename.

Resumable: existing files on disk are skipped.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
from io import BytesIO

import requests
from PIL import Image

from sites import FILTERED_DIR, SITES, http_headers

IMAGE_DIR = os.path.join("..", "..", "..", "assets", "recipe-images")
TARGET_WIDTH = 400
WEBP_QUALITY = 75


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def image_filename_for(source_url: str) -> str:
    h = hashlib.sha1(source_url.encode("utf-8")).hexdigest()[:12]
    return f"l2-{h}.webp"


def fetch_and_resize(url: str, out_path: str) -> bool:
    try:
        r = requests.get(
            url, headers=http_headers(), timeout=45, stream=True
        )
        if r.status_code == 429:
            time.sleep(90)
            r = requests.get(
                url, headers=http_headers(), timeout=45, stream=True
            )
        r.raise_for_status()
        data = r.content
        img = Image.open(BytesIO(data))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        w, h = img.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))
        img = img.resize((TARGET_WIDTH, TARGET_WIDTH), Image.LANCZOS)
        if img.mode == "RGBA":
            img = img.convert("RGB")
        img.save(out_path, "WEBP", quality=WEBP_QUALITY)
        return True
    except Exception as e:
        print(f"  [err] {url}: {e}")
        return False


def process_site(site: dict) -> None:
    slug = slugify(site["name"])
    in_path = os.path.join(FILTERED_DIR, f"{slug}.jsonl")
    if not os.path.exists(in_path):
        return

    print(f"\n=== {site['name']} — images ===")

    records: list[dict] = []
    with open(in_path, encoding="utf-8") as f:
        for line in f:
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    succeeded = 0
    skipped = 0
    failed = 0
    delay = site["delay_seconds"]

    for i, rec in enumerate(records, 1):
        if i % 50 == 0:
            print(
                f"  [{i}/{len(records)}] ok={succeeded} skipped={skipped} failed={failed}"
            )

        filename = image_filename_for(rec["source_url"])
        out_path = os.path.join(IMAGE_DIR, filename)

        if os.path.exists(out_path):
            rec["image_filename"] = filename
            skipped += 1
            continue

        ok = fetch_and_resize(rec["image"], out_path)
        if ok:
            rec["image_filename"] = filename
            succeeded += 1
        else:
            rec["image_filename"] = None
            failed += 1
        time.sleep(delay)

    with open(in_path, "w", encoding="utf-8") as out:
        for rec in records:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"  done: ok={succeeded} skipped={skipped} failed={failed}")


def main() -> int:
    os.makedirs(IMAGE_DIR, exist_ok=True)
    for site in SITES:
        process_site(site)
    return 0


if __name__ == "__main__":
    sys.exit(main())
