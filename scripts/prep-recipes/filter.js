import { spawn } from 'node:child_process';
import {
  createReadStream,
  createWriteStream,
  readdirSync,
  existsSync,
} from 'node:fs';
import readline from 'node:readline';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import csv from 'csv-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STREAM_PY = join(__dirname, 'stream_recipes.py');
const FULL_DATASET_NAME = 'full_dataset.csv';

const RAW_DIR = './raw';
const OUTPUT = './filtered.jsonl';
const TARGET_COUNT = 10000;

const MIN_INGREDIENTS = 4;
const MAX_INGREDIENTS = 12;
const MIN_STEPS = 3;
const MAX_STEPS = 12;
const MIN_INSTRUCTION_LENGTH = 200;
const MAX_INSTRUCTION_LENGTH = 2500;
const MAX_TITLE_LENGTH = 60;

const EXOTIC_BANLIST = [
  'sous vide',
  'sous-vide',
  'xanthan',
  'agar',
  'gelatin sheets',
  'edible flowers',
  'gold leaf',
  'foie gras',
  'sweetbreads',
  'tripe',
  'offal',
  'lobster tail',
  'caviar',
  'truffle oil',
  'liquid nitrogen',
  'spherification',
  'transglutaminase',
  'duck fat',
  'lard',
  "pig's feet",
  'pork belly',
  'oxtail',
  'rabbit',
  'pheasant',
  'venison',
  'quail',
  'goose',
  'squab',
  'octopus',
  'sea urchin',
  'frog legs',
  'snail',
  'mussels',
  'bone marrow',
  'liver',
  'kidney',
  'brain',
  'tongue',
  'gizzard',
  'tempering chocolate',
  'tempura batter',
  'beurre blanc',
  'beurre noisette',
  'roux',
  'velouté',
  'consommé',
  'demi-glace',
  'reduction sauce',
];

const TIME_REGEX =
  /\b\d+\s*(min|minute|minutes|mins|hour|hours|hr|hrs)\b/i;

const TITLE_BAD =
  /(fancy|gourmet|advanced|professional|restaurant-style|michelin)/i;

/** RecipeNLG / HF CSV headers vary in casing — normalize access. */
function field(row, ...aliases) {
  const keys = Object.keys(row);
  const lowerMap = new Map(keys.map((k) => [k.toLowerCase(), row[k]]));
  for (const a of aliases) {
    const v = lowerMap.get(a.toLowerCase());
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function parseJsonArray(raw) {
  if (!raw || !String(raw).trim()) return [];
  try {
    const v = JSON.parse(String(raw));
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function rowTitle(row) {
  if (typeof row.title === 'string') return row.title;
  return field(row, 'title', 'Title');
}

function rowIngredients(row) {
  if (Array.isArray(row.ingredients))
    return row.ingredients.map((x) => String(x));
  return parseJsonArray(field(row, 'ingredients', 'Ingredients'));
}

function rowDirections(row) {
  if (Array.isArray(row.directions))
    return row.directions.map((x) => String(x));
  return parseJsonArray(field(row, 'directions', 'Directions'));
}

function rowNer(row) {
  if (Array.isArray(row.ner)) return row.ner.map((x) => String(x));
  return parseJsonArray(field(row, 'ner', 'NER'));
}

function rowLink(row) {
  if (row.link != null && String(row.link).trim()) return String(row.link);
  return field(row, 'link', 'Link');
}

function rowSource(row) {
  if (row.source != null && String(row.source).trim()) return String(row.source);
  return field(row, 'source', 'Source', 'source_name', 'Source_Name');
}

function passesFilters(row) {
  const title = rowTitle(row);
  const ingredients = rowIngredients(row);
  const directions = rowDirections(row);
  let ner = rowNer(row);

  if (!title || title.length > MAX_TITLE_LENGTH) return false;
  if (TITLE_BAD.test(title)) return false;

  if (
    ingredients.length < MIN_INGREDIENTS ||
    ingredients.length > MAX_INGREDIENTS
  )
    return false;
  if (directions.length < MIN_STEPS || directions.length > MAX_STEPS)
    return false;

  const instructionsText = directions.join(' ');
  if (instructionsText.length < MIN_INSTRUCTION_LENGTH) return false;
  if (instructionsText.length > MAX_INSTRUCTION_LENGTH) return false;

  if (!TIME_REGEX.test(instructionsText)) return false;

  const fullText = `${title} ${ingredients.join(' ')} ${instructionsText}`.toLowerCase();
  for (const banned of EXOTIC_BANLIST) {
    if (fullText.includes(banned)) return false;
  }

  if (!ner.length) ner = ingredients;

  return {
    title,
    ingredients,
    directions,
    ner,
    link: rowLink(row),
    source: rowSource(row),
  };
}

function ingredientWeightedSample(recipes, targetCount) {
  const freq = new Map();
  for (const r of recipes) {
    for (const ing of r.ner) {
      const k = ing.toLowerCase();
      freq.set(k, (freq.get(k) || 0) + 1);
    }
  }

  const sortedIngredients = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 300)
    .map(([k]) => k);
  const targetCoveragePerIng = Math.floor(targetCount / 50);

  const ingCount = new Map(sortedIngredients.map((i) => [i, 0]));
  const sampled = [];
  const shuffled = [...recipes].sort(() => Math.random() - 0.5);

  for (const recipe of shuffled) {
    if (sampled.length >= targetCount) break;

    let helpful = false;
    for (const ing of recipe.ner) {
      const k = ing.toLowerCase();
      if (ingCount.has(k) && ingCount.get(k) < targetCoveragePerIng) {
        helpful = true;
        break;
      }
    }

    if (helpful) {
      sampled.push(recipe);
      for (const ing of recipe.ner) {
        const k = ing.toLowerCase();
        if (ingCount.has(k)) {
          ingCount.set(k, ingCount.get(k) + 1);
        }
      }
    }
  }

  if (sampled.length < targetCount) {
    const sampledIds = new Set(sampled.map((r) => r.id));
    for (const recipe of shuffled) {
      if (sampled.length >= targetCount) break;
      if (!sampledIds.has(recipe.id)) sampled.push(recipe);
    }
  }

  return sampled;
}

/** CSV exports may live in nested folders under ./raw. */
function findCsvPaths(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findCsvPaths(p));
    else if (entry.isFile() && entry.name.endsWith('.csv')) out.push(p);
  }
  return out.sort();
}

function findFullDatasetCsv(rawDir) {
  const cwd = process.cwd();
  const hits = findCsvPaths(rawDir).filter(
    (p) => basename(p) === FULL_DATASET_NAME,
  );
  const preferredAbs = resolve(cwd, rawDir, FULL_DATASET_NAME);
  const preferredHit = hits.find((p) => resolve(cwd, p) === preferredAbs);
  if (preferredHit) return preferredHit;
  return hits[0] ?? null;
}

async function* iterateRecipeNlgJsonLines(csvPath) {
  const absCsv = resolve(process.cwd(), csvPath);
  const py = spawn('python3', [STREAM_PY, absCsv], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const rl = readline.createInterface({
    input: py.stdout,
    crlfDelay: Infinity,
  });

  let code = 0;
  let settled = false;
  const done = new Promise((resolvePromise, rejectPromise) => {
    py.once('error', (err) => {
      if (settled) return;
      settled = true;
      rejectPromise(err);
    });
    py.once('close', (c) => {
      if (settled) return;
      settled = true;
      code = c ?? 0;
      resolvePromise();
    });
  });

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch {
        /* skip */
      }
    }
  } finally {
    await done;
  }

  if (code !== 0) {
    throw new Error(`stream_recipes.py exited with code ${code}`);
  }
}

function pushFilteredRecipe(row, seenTitles, surviving, nextIdRef) {
  const ok = passesFilters(row);
  if (!ok) return;
  const normTitle = normalizeTitle(ok.title);
  if (seenTitles.has(normTitle)) return;
  seenTitles.add(normTitle);
  surviving.push({
    id: nextIdRef.v++,
    title: ok.title.trim(),
    ingredients: ok.ingredients,
    directions: ok.directions,
    ner: ok.ner.length ? ok.ner : ok.ingredients,
    link: ok.link || '',
    source: ok.source || '',
  });
}

async function main() {
  const fullDatasetPath = findFullDatasetCsv(RAW_DIR);
  const csvPaths = findCsvPaths(RAW_DIR).filter(
    (p) => basename(p) !== FULL_DATASET_NAME,
  );

  if (!fullDatasetPath && csvPaths.length === 0) {
    console.error(
      'No usable CSV under ./raw. Place RecipeNLG **full_dataset.csv** here (see npm run download), or add other JSON-in-CSV exports.',
    );
    process.exit(1);
  }

  const seenTitles = new Set();
  const surviving = [];
  const nextIdRef = { v: 0 };

  if (fullDatasetPath) {
    console.log(
      `Streaming ${relative(RAW_DIR, fullDatasetPath)} (Python parses list columns)...`,
    );
    try {
      for await (const row of iterateRecipeNlgJsonLines(fullDatasetPath)) {
        pushFilteredRecipe(row, seenTitles, surviving, nextIdRef);
      }
    } catch (e) {
      console.error(e);
      console.error(
        'Is Python 3 installed and on PATH? Try: python3 --version',
      );
      process.exit(1);
    }
  }

  for (const absPath of csvPaths) {
    const rel = relative(RAW_DIR, absPath);
    console.log(`Processing ${rel}...`);
    await new Promise((resolvePromise, rejectPromise) => {
      createReadStream(absPath)
        .pipe(csv())
        .on('data', (row) => {
          pushFilteredRecipe(row, seenTitles, surviving, nextIdRef);
        })
        .on('end', resolvePromise)
        .on('error', rejectPromise);
    });
  }

  console.log(`After filters and dedup: ${surviving.length} recipes.`);

  let sampled =
    surviving.length <= TARGET_COUNT
      ? surviving
      : ingredientWeightedSample(surviving, TARGET_COUNT);

  console.log(`Sampled down to: ${sampled.length} recipes.`);

  const out = createWriteStream(OUTPUT);
  for (const recipe of sampled) {
    out.write(`${JSON.stringify(recipe)}\n`);
  }
  out.end();
  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });
  console.log(`Written to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
