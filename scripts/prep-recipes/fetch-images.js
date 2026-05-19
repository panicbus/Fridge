import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import pLimit from 'p-limit';

const DB_PATH = '../../assets/recipes.db';
const IMAGE_DIR = '../../assets/recipe-images';
const TARGET_WIDTH = 400;
const CONCURRENCY = 5;
const REQUEST_TIMEOUT = 8000;

const FORCE_FETCH =
  process.env.FORCE_FETCH_IMAGES === '1' ||
  process.env.FORCE_FETCH_IMAGES === 'true';
const SKIP_FETCH =
  process.env.SKIP_IMAGE_FETCH === '1' ||
  process.env.SKIP_IMAGE_FETCH === 'true';
const PROBE_COUNT = Math.min(
  Math.max(
    1,
    parseInt(String(process.env.IMAGE_FETCH_PROBE || '20'), 10) || 20,
  ),
  500,
);

mkdirSync(IMAGE_DIR, { recursive: true });

const db = new Database(DB_PATH);
const update = db.prepare('UPDATE recipes SET image_path = ? WHERE id = ?');

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** RecipeNLG links are often host-only (`www.foo.com/...`) — fetch requires a scheme. */
function normalizeHttpUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u = raw.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `https://${u}`;
}

function resolveAgainstPage(pageUrl, maybeRelative) {
  if (!maybeRelative || typeof maybeRelative !== 'string') return null;
  const base = normalizeHttpUrl(pageUrl);
  if (!base) return null;
  try {
    return new URL(maybeRelative.trim(), base).href;
  } catch {
    return null;
  }
}

async function fetchOgImage(pageUrl) {
  const url = normalizeHttpUrl(pageUrl);
  if (!url) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const rawOg =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:url"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content');
    if (!rawOg?.trim()) return null;
    const t = rawOg.trim();
    const resolved = resolveAgainstPage(url, t);
    if (resolved) return resolved;
    /** og:image sometimes omits the scheme but includes a host */
    if (!t.startsWith('/') && !t.startsWith('?') && !t.startsWith('#')) {
      return normalizeHttpUrl(t);
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAndCompress(imageUrl, outPath) {
  const resolved =
    typeof imageUrl === 'string' && imageUrl.trim().startsWith('//')
      ? `https:${imageUrl.trim()}`
      : normalizeHttpUrl(imageUrl) || imageUrl;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(resolved, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    await sharp(buffer)
      .resize(TARGET_WIDTH, TARGET_WIDTH, { fit: 'cover' })
      .webp({ quality: 75 })
      .toFile(outPath);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function processRecipe(recipe) {
  const filename = `${recipe.id}.webp`;
  const fullPath = `${IMAGE_DIR}/${filename}`;

  if (existsSync(fullPath)) return;

  const sourceUrl = recipe.source_url;
  if (!sourceUrl || typeof sourceUrl !== 'string') return;

  const ogUrl = await fetchOgImage(sourceUrl);
  if (!ogUrl) return;

  const ok = await fetchAndCompress(ogUrl, fullPath);
  if (ok) update.run(filename, recipe.id);
}

async function main() {
  const recipes = db
    .prepare(
      'SELECT id, source_url, image_path FROM recipes',
    )
    .all();
  const todo = recipes.filter((r) => !r.image_path);

  const alreadyDone = recipes.length - todo.length;

  if (SKIP_FETCH) {
    console.log(
      'SKIP_IMAGE_FETCH is set — skipping og:image scrape. The app uses placeholders for recipes without image_path.',
    );
    db.close();
    return;
  }

  console.log(
    `Fetching images for ${todo.length} recipes (${alreadyDone} already done)...`,
  );

  if (todo.length === 0) {
    console.log('Nothing to fetch.');
    db.close();
    return;
  }

  if (!FORCE_FETCH) {
    const nProbe = Math.min(PROBE_COUNT, todo.length);
    console.log(
      `Probing ${nProbe} pages (RecipeNLG URLs are often offline or block scrapers). Set FORCE_FETCH_IMAGES=1 to skip this probe.`,
    );
    let probeHits = 0;
    const getImg = db.prepare('SELECT image_path FROM recipes WHERE id = ?');
    for (let i = 0; i < nProbe; i++) {
      await processRecipe(todo[i]);
      if (getImg.get(todo[i].id)?.image_path) probeHits++;
    }

    if (probeHits === 0) {
      console.log(`
Probe: 0/${nProbe} images saved — treating source URLs as unusable for bulk scraping.

Skipping the rest (saves a long run). Local recipes in the app already fall back to gradient placeholders when image_path is empty.

Options:
  • Continue without images — you’re done (DB + assets/recipes.db are fine).
  • Force a full crawl anyway (often still ~0 hits): FORCE_FETCH_IMAGES=1 npm run fetch-images
  • Skip this step in automation: SKIP_IMAGE_FETCH=1 npm run all
`);
      db.close();
      return;
    }

    console.log(
      `Probe: ${probeHits}/${nProbe} succeeded — continuing with parallel fetch for remaining recipes.\n`,
    );
  }

  const todoRemaining = db
    .prepare('SELECT id, source_url, image_path FROM recipes')
    .all()
    .filter((r) => !r.image_path);

  const limit = pLimit(CONCURRENCY);
  let completed = 0;
  let succeeded = 0;

  const tasks = todoRemaining.map((recipe) =>
    limit(async () => {
      try {
        await processRecipe(recipe);
        const row = db
          .prepare('SELECT image_path FROM recipes WHERE id = ?')
          .get(recipe.id);
        if (row?.image_path) succeeded++;
      } catch {
        /* continue */
      }
      completed++;
      if (completed % 100 === 0) {
        console.log(
          `${completed}/${todoRemaining.length} processed, ${succeeded} succeeded`,
        );
      }
    }),
  );

  await Promise.all(tasks);
  console.log(`Done. ${succeeded}/${todoRemaining.length} succeeded this batch.`);
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
