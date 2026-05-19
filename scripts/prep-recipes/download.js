import { mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Hugging Face dataset `mbien/recipe_nlg` does NOT contain the CSV — only the
 * Hugging Face `datasets` loading script (~13KB). The actual corpus is
 * `full_dataset.csv` from PUT (manual download, license/terms).
 */
const TARGET = './raw';
const DATA_FILE = 'full_dataset.csv';
/** Real dump is usually hundreds of MB–GB; catches empty stubs. */
const MIN_BYTES = 80 * 1024 * 1024;

function walkCsvNamed(dir, basename, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkCsvNamed(p, basename, out);
    else if (entry.isFile() && entry.name === basename) out.push(p);
  }
  return out;
}

mkdirSync(TARGET, { recursive: true });

const cwd = process.cwd();
const candidates = walkCsvNamed(TARGET, DATA_FILE);
const preferredAbs = resolve(cwd, TARGET, DATA_FILE);
let chosen =
  candidates.find((c) => resolve(cwd, c) === preferredAbs) ??
  (candidates.length === 1 ? candidates[0] : null);

if (!chosen && candidates.length > 1) {
  console.warn(
    `Multiple ${DATA_FILE} files under ./raw; using first: ${relative(cwd, candidates[0])}. Prefer ${TARGET}/${DATA_FILE} only.`,
  );
  chosen = candidates[0];
}

if (chosen) {
  const { size } = statSync(chosen);
  if (size >= MIN_BYTES) {
    console.log(
      `OK: ${relative(cwd, chosen)} (${(size / (1024 * 1024)).toFixed(0)} MiB). Next: npm run filter`,
    );
    process.exit(0);
  }
  console.error(
    `Found ${relative(cwd, chosen)} but it is too small (${size} bytes). Re-download from PUT.`,
  );
  process.exit(1);
}

console.error(`
RecipeNLG CSV is not on Hugging Face — only the dataset *script* lives there (~13 KB).

1. Open https://recipenlg.cs.put.poznan.pl/dataset
2. Accept the terms and download the archive (e.g. dataset.zip).
3. Unzip and copy **full_dataset.csv** to:

     ${join(cwd, TARGET, DATA_FILE)}

4. Run again: npm run download   (verifies the file)
   Then:       npm run filter    (needs Python 3 on PATH)

You can delete leftover Hugging Face files in ./raw (README.md, recipe_nlg.py)
if they are still there — they are not the dataset.
`);
process.exit(1);
