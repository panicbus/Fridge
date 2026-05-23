"""
Run the full Layer 2 pipeline end-to-end.

Each step runs in a subprocess with cwd set to this directory.
"""

from __future__ import annotations

import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

STEPS = [
    ("fetch_sitemaps.py", "Discover recipe URLs from sitemaps"),
    ("scrape.py", "Scrape each URL via recipe-scrapers"),
    ("filter.py", "Apply quality filters"),
    ("process_images.py", "Download and compress images"),
    ("insert_into_db.py", "Insert into recipes.db"),
]


def main() -> int:
    for script, description in STEPS:
        print(f"\n{'=' * 60}")
        print(f"  Running {script}: {description}")
        print(f"{'=' * 60}")
        result = subprocess.run(
            [sys.executable, script],
            cwd=SCRIPT_DIR,
        )
        if result.returncode != 0:
            print(f"\n[FAIL] {script} exited with {result.returncode}")
            print(
                f"Fix the issue and resume by running {script} directly, then continue with the remaining steps."
            )
            return 1
    print(f"\n{'=' * 60}")
    print("  Layer 2 prep complete.")
    print(f"{'=' * 60}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
