#!/usr/bin/env python3
"""
Stream RecipeNLG full_dataset.csv as JSON lines for Node filter.js.

The official CSV stores ingredients/directions/ner as Python literals (safe to
parse with ast.literal_eval), not JSON — csv-parser + JSON.parse cannot read it.
"""
from __future__ import annotations

import ast
import csv
import json
import sys


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: stream_recipes.py path/to/full_dataset.csv", file=sys.stderr)
        sys.exit(2)
    path = sys.argv[1]
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            for row in reader:
                if len(row) < 7:
                    continue
                try:
                    obj = {
                        "title": row[1],
                        "ingredients": ast.literal_eval(row[2]),
                        "directions": ast.literal_eval(row[3]),
                        "link": row[4],
                        "source": row[5],
                        "ner": ast.literal_eval(row[6]),
                    }
                except (SyntaxError, ValueError):
                    continue
                sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    except OSError as e:
        print(e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
