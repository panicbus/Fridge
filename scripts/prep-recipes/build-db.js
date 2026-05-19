import { createReadStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import readline from 'node:readline';
import Database from 'better-sqlite3';

const INPUT = './filtered.jsonl';
const OUTPUT = '../../assets/recipes.db';

mkdirSync('../../assets', { recursive: true });

const db = new Database(OUTPUT);

db.exec(`
  DROP TABLE IF EXISTS recipe_search;
  DROP TABLE IF EXISTS recipes;

  CREATE TABLE recipes (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    ingredients_json TEXT NOT NULL,
    directions_json TEXT NOT NULL,
    ner_json TEXT NOT NULL,
    source_url TEXT,
    source_name TEXT,
    image_path TEXT,
    total_time_minutes INTEGER
  );

  CREATE VIRTUAL TABLE recipe_search USING fts5(
    title,
    ner_text,
    tokenize='porter unicode61'
  );
`);

const insertRecipe = db.prepare(`
  INSERT INTO recipes (id, title, ingredients_json, directions_json, ner_json, source_url, source_name, total_time_minutes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertFts = db.prepare(`
  INSERT INTO recipe_search (rowid, title, ner_text)
  VALUES (?, ?, ?)
`);

function estimateTime(directions) {
  const text = directions.join(' ');
  let totalMin = 0;
  const matches = text.matchAll(/\b(\d+)\s*(min|minutes|mins)\b/gi);
  for (const m of matches) totalMin += parseInt(m[1], 10);
  const hourMatches = text.matchAll(/\b(\d+)\s*(hour|hours|hr|hrs)\b/gi);
  for (const m of hourMatches) totalMin += parseInt(m[1], 10) * 60;
  return Math.min(totalMin, 240) || null;
}

async function main() {
  const rl = readline.createInterface({
    input: createReadStream(INPUT),
    crlfDelay: Infinity,
  });

  const insertMany = db.transaction((recipes) => {
    for (const recipe of recipes) {
      insertRecipe.run(
        recipe.id,
        recipe.title,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.directions),
        JSON.stringify(recipe.ner),
        recipe.link || null,
        recipe.source || null,
        estimateTime(recipe.directions),
      );
      insertFts.run(
        recipe.id,
        recipe.title,
        (recipe.ner || []).join(' '),
      );
    }
  });

  const batch = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= 1000) {
      insertMany(batch);
      batch.length = 0;
    }
  }
  if (batch.length > 0) insertMany(batch);

  const count = db.prepare('SELECT COUNT(*) as n FROM recipes').get();
  console.log(`Inserted ${count.n} recipes.`);
  db.close();
  console.log(`Database written to ${OUTPUT}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
