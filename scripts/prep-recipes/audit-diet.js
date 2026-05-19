/**
 * One-time diet inference audit.
 *
 * Runs inferDietFlags over every recipe in recipes.db and writes a
 * skimmable report. Use this to catch SYSTEMATIC errors before shipping:
 * if "chicken broth" slips through as vegan, you'll see it many times
 * and can fix the lexicon once.
 *
 * Usage:  npm run audit-diet   (from this folder)
 * Output: ./diet-audit-report.txt
 *
 * This is NOT shipped with the app. Dev tooling only.
 */

import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';

import { inferDietFlags } from '../../src/services/diet/matcher.ts';

const DB_PATH = '../../assets/recipes.db';
const REPORT_PATH = './diet-audit-report.txt';

// Terms that, if present in a VEGAN-flagged recipe, are almost certainly
// a real inference miss. This is the "loud signal" list — a vegan recipe
// containing any of these is printed in the HIGH-PRIORITY section.
const RED_FLAG_IN_VEGAN = [
  'chicken',
  'beef',
  'pork',
  'bacon',
  'turkey',
  'lamb',
  'fish',
  'salmon',
  'tuna',
  'shrimp',
  'egg',
  'milk',
  'butter',
  'cheese',
  'cream',
  'honey',
  'gelatin',
  'anchovy',
  'sausage',
  'ham',
  'broth',
  'stock',
  'lard',
  'yogurt',
  'mayonnaise',
];

/** Same shape the matcher accepts: strings or { name, measure }. */
function ingredientStrings(row) {
  let raw;
  try {
    raw = JSON.parse(row.ingredients_json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) =>
      typeof item === 'string'
        ? item
        : [item?.measure, item?.name].filter(Boolean).join(' ') || '',
    )
    .filter(Boolean);
}

/** Word-boundary match — avoids "egg" firing on "eggplant", "fish" on "fish pepper", etc. */
function redFlagHitsInText(text) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const w of RED_FLAG_IN_VEGAN) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(lower)) hits.push(w);
  }
  return hits;
}

function displayIngredients(ingredients) {
  return ingredients.join(' | ');
}

function main() {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare('SELECT id, title, ingredients_json FROM recipes').all();
  db.close();

  console.log(`Auditing ${rows.length} recipes...`);

  const veganRecipes = [];
  const suspiciousVegan = [];
  let veganCount = 0;
  let vegetarianCount = 0;
  let glutenFreeCount = 0;

  for (const row of rows) {
    const ingredients = ingredientStrings(row);
    const result = inferDietFlags(ingredients, row.title);

    if (result.vegan) {
      veganCount++;
      veganRecipes.push({ row, ingredients, result });

      const haystack = `${row.title} ${ingredients.join(' ')}`;
      const hits = redFlagHitsInText(haystack);
      if (hits.length > 0) {
        suspiciousVegan.push({ row, ingredients, hits });
      }
    }
    if (result.vegetarian) vegetarianCount++;
    if (result.glutenFree) glutenFreeCount++;
  }

  const redFlagTally = {};
  for (const s of suspiciousVegan) {
    for (const hit of s.hits) {
      redFlagTally[hit] = (redFlagTally[hit] || 0) + 1;
    }
  }
  const sortedTally = Object.entries(redFlagTally).sort((a, b) => b[1] - a[1]);

  const lines = [];
  const hr = '='.repeat(72);

  lines.push(hr);
  lines.push('DIET INFERENCE AUDIT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(hr);
  lines.push('');
  lines.push(`Total recipes:        ${rows.length}`);
  lines.push(`Flagged vegan:        ${veganCount} (${pct(veganCount, rows.length)})`);
  lines.push(`Flagged vegetarian:   ${vegetarianCount} (${pct(vegetarianCount, rows.length)})`);
  lines.push(`Flagged gluten-free:  ${glutenFreeCount} (${pct(glutenFreeCount, rows.length)})`);
  lines.push('');

  lines.push(hr);
  lines.push('SECTION 1 — SYSTEMATIC ERROR SIGNAL');
  lines.push('Red-flag words found inside VEGAN-flagged recipes, by frequency.');
  lines.push('A high count = one lexicon fix clears many bad badges.');
  lines.push(hr);
  if (sortedTally.length === 0) {
    lines.push('');
    lines.push('  None. No vegan-flagged recipe contains an obvious animal word.');
    lines.push('  (This is the result you want.)');
  } else {
    lines.push('');
    for (const [word, count] of sortedTally) {
      lines.push(`  "${word}"  —  ${count} vegan recipe(s) contain this`);
    }
    lines.push('');
    lines.push('  ^ Investigate the top entries first. For each, open one of the');
    lines.push('    listed recipes in Section 2 and decide: is it a genuine miss');
    lines.push('    (add to ANIMAL_* lexicon) or a false alarm like "coconut milk"');
    lines.push('    / "chicken of the woods" (add to PLANT_OVERRIDES)?');
  }
  lines.push('');

  lines.push(hr);
  lines.push(`SECTION 2 — SUSPICIOUS VEGAN RECIPES (${suspiciousVegan.length})`);
  lines.push('Vegan-flagged recipes containing a red-flag word. Skim these.');
  lines.push('Many will be false alarms (coconut MILK, BUTTERnut squash) — that');
  lines.push('is fine, it means the override lexicon is working. Look for the');
  lines.push('genuine misses.');
  lines.push(hr);
  lines.push('');
  for (const s of suspiciousVegan) {
    lines.push(`  [${s.row.id}] ${s.row.title}`);
    lines.push(`     red-flag word(s): ${s.hits.join(', ')}`);
    lines.push(`     ingredients: ${displayIngredients(s.ingredients)}`);
    lines.push('');
  }
  if (suspiciousVegan.length === 0) {
    lines.push('  None. Clean.');
    lines.push('');
  }

  lines.push(hr);
  lines.push('SECTION 3 — VEGAN SAMPLE (first 60)');
  lines.push('A plain sample of vegan-flagged recipes for a sanity skim.');
  lines.push('You are checking: do these actually look vegan?');
  lines.push(hr);
  lines.push('');
  for (const v of veganRecipes.slice(0, 60)) {
    lines.push(`  [${v.row.id}] ${v.row.title}`);
    lines.push(`     ${displayIngredients(v.ingredients)}`);
    lines.push('');
  }

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`\nReport written to ${REPORT_PATH}`);
  console.log(`\nQuick read:`);
  console.log(`  - ${suspiciousVegan.length} vegan recipes contain a red-flag word`);
  if (sortedTally.length > 0) {
    console.log(
      `  - Most common: ${sortedTally
        .slice(0, 3)
        .map(([w, c]) => `"${w}" (${c})`)
        .join(', ')}`,
    );
  }
  console.log(`\nOpen ${REPORT_PATH} and start with Section 1.`);
}

function pct(n, total) {
  return total === 0 ? '0%' : `${Math.round((n / total) * 100)}%`;
}

main();

/*
 * FALLBACK — if `node --import tsx` fails or you cannot add tsx:
 *
 * The audit MUST call the same inferDietFlags shipped in the app (no copied
 * lexicons). Alternatives:
 *
 * 1. Run from repo root: `npx tsx scripts/prep-recipes/audit-diet.js`
 * 2. Point TS_NODE_PROJECT at the root tsconfig and use ts-node with ESM.
 * 3. Add a tiny npm script at the repo root that imports the matcher and
 *    shells out to sqlite — still one source of truth for inference.
 */
