import { app, ipcMain } from 'electron';
import type { BindParams, Database, SqlJsStatic, SqlValue } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

let sqlFactory: SqlJsStatic | null = null;
let dbMem: Database | null = null;

function devAssetsDirectoryCandidates(): string[] {
  return [
    path.join(__dirname, '..', 'assets'),
    path.join(app.getAppPath(), 'assets'),
    path.join(process.cwd(), 'assets'),
  ];
}

function recipesDbPath(): string | null {
  if (app.isPackaged) {
    const p = path.join(process.resourcesPath, 'assets', 'recipes.db');
    return fs.existsSync(p) ? p : null;
  }
  for (const dir of devAssetsDirectoryCandidates()) {
    const p = path.join(dir, 'recipes.db');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function recipeImagesDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'recipe-images');
  }
  const dbp = recipesDbPath();
  if (dbp) return path.join(path.dirname(dbp), 'recipe-images');
  return path.join(devAssetsDirectoryCandidates()[0], 'recipe-images');
}

/** WASM must load from a real path (asar unpacked in production builds). */
function sqlJsWasmDirectory(): string {
  const appPath = app.getAppPath();
  if (appPath.endsWith('.asar')) {
    const unpacked = `${appPath}.unpacked`;
    const wasmUnpacked = path.join(unpacked, 'node_modules', 'sql.js', 'dist');
    if (fs.existsSync(path.join(wasmUnpacked, 'sql-wasm.wasm'))) {
      return wasmUnpacked;
    }
  }
  return path.join(appPath, 'node_modules', 'sql.js', 'dist');
}

async function loadSqlFactory(): Promise<SqlJsStatic | null> {
  if (sqlFactory) return sqlFactory;
  try {
    const wasmDir = sqlJsWasmDirectory();
    const wasmPath = path.join(wasmDir, 'sql-wasm.wasm');
    if (!fs.existsSync(wasmPath)) {
      console.error(
        '[local-recipes] Missing sql-wasm.wasm — expected at',
        wasmPath,
      );
      return null;
    }
    const mod = await import('sql.js');
    const initSqlJs = mod.default as (
      o?: { locateFile?: (f: string) => string },
    ) => Promise<SqlJsStatic>;
    sqlFactory = await initSqlJs({
      locateFile: (file: string) => path.join(wasmDir, file),
    });
    return sqlFactory;
  } catch (e) {
    console.error('[local-recipes] sql.js failed to initialize', e);
    return null;
  }
}

async function getDatabase(): Promise<Database | null> {
  if (dbMem) return dbMem;
  const dbPath = recipesDbPath();
  if (!dbPath) return null;
  const factory = await loadSqlFactory();
  if (!factory) return null;
  try {
    const bytes = fs.readFileSync(dbPath);
    dbMem = new factory.Database(new Uint8Array(bytes));
    if (!app.isPackaged) {
      console.info('[local-recipes] Opened', dbPath, 'via sql.js (wasm)');
    }
    return dbMem;
  } catch (e) {
    console.error('[local-recipes] Failed to read database file', dbPath, e);
    return null;
  }
}

function runAll(db: Database, sql: string, params?: BindParams): Record<string, unknown>[] {
  const blocks = db.exec(sql, params ?? []);
  if (!blocks.length) return [];
  const { columns, values } = blocks[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function expandIngredientTokens(raw: string): string[] {
  const norm = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/'/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const words = norm
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && w.length <= 40);
  return words;
}

const MAX_SEARCH_TOKENS = 32;

/** Ingredient words used for local matching (sql.js WASM has no FTS5). */
function collectSearchTokens(ingredients: string[]): string[] {
  const tokens = new Set<string>();
  for (const ing of ingredients) {
    if (!ing || typeof ing !== 'string') continue;
    for (const w of expandIngredientTokens(ing)) {
      if (/^(and|or|not)$/i.test(w)) continue;
      tokens.add(w);
    }
  }
  return [...tokens].slice(0, MAX_SEARCH_TOKENS);
}

/**
 * Token AND-style coverage via LIKE on title + NER JSON, ranked by how many
 * tokens appear (FTS5 / bm25 is unavailable in stock sql.js).
 */
function searchRecipesByTokens(
  db: Database,
  ingredients: string[],
  limit: number,
): Record<string, unknown>[] {
  const tokens = collectSearchTokens(ingredients);
  if (tokens.length === 0) return [];

  const scoreCases = tokens.map(
    () =>
      '(CASE WHEN lower(r.title) LIKE ? OR lower(r.ner_json) LIKE ? THEN 1 ELSE 0 END)',
  );
  const whereClauses = tokens.map(
    () => '(lower(r.title) LIKE ? OR lower(r.ner_json) LIKE ?)',
  );

  const patterns: SqlValue[] = [];
  for (const t of tokens) {
    const pat = `%${t}%`;
    patterns.push(pat, pat);
  }

  const params: SqlValue[] = [...patterns, ...patterns, limit];

  const sql = `
    SELECT r.*, (${scoreCases.join(' +\n      ')}) AS rank
    FROM recipes r
    WHERE ${whereClauses.join('\n      OR ')}
    ORDER BY rank DESC, length(r.title)
    LIMIT ?
  `;

  try {
    return runAll(db, sql, params);
  } catch (e) {
    console.error('[local-recipes] token LIKE search failed:', e);
    return [];
  }
}

export function registerLocalRecipesHandlers(): void {
  ipcMain.removeHandler('local-recipes:search');
  ipcMain.removeHandler('local-recipes:get-by-id');
  ipcMain.removeHandler('local-recipes:resolve-image');

  if (!recipesDbPath()) {
    console.warn(
      '[local-recipes] recipes.db not found. Checked:',
      (app.isPackaged
        ? [path.join(process.resourcesPath, 'assets', 'recipes.db')]
        : devAssetsDirectoryCandidates().map((d) => path.join(d, 'recipes.db'))
      ).join(', '),
    );
  }

  ipcMain.handle(
    'local-recipes:search',
    async (_event, args: { ingredients?: string[]; limit?: number }) => {
      const ingredients = Array.isArray(args?.ingredients)
        ? args.ingredients
        : [];
      const limit =
        typeof args?.limit === 'number' && args.limit > 0 ? args.limit : 120;

      if (ingredients.length === 0) return [];

      const database = await getDatabase();
      if (!database) return [];

      const tokens = collectSearchTokens(ingredients);
      if (tokens.length === 0) return [];

      if (!app.isPackaged) {
        console.info('[local-recipes] token search:', tokens.join(', '));
      }

      const rows = searchRecipesByTokens(database, ingredients, limit);
      if (!app.isPackaged && rows.length === 0) {
        console.warn('[local-recipes] zero hits for tokens:', tokens.join(', '));
      }
      return rows;
    },
  );

  ipcMain.handle('local-recipes:get-by-id', async (_event, id: unknown) => {
    if (typeof id !== 'number' && typeof id !== 'string') return null;
    const database = await getDatabase();
    if (!database) return null;
    try {
      const rows = runAll(database, 'SELECT * FROM recipes WHERE id = ?', [id]);
      return rows[0] ?? null;
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    'local-recipes:resolve-image',
    (_event, filename: unknown) => {
      if (typeof filename !== 'string' || !filename.trim()) return '';
      const safe = path.basename(filename.trim());
      if (!safe.endsWith('.webp')) return '';
      const full = path.join(recipeImagesDir(), safe);
      if (!fs.existsSync(full)) return '';
      return pathToFileURL(full).href;
    },
  );
}

export function closeLocalRecipesDb(): void {
  try {
    dbMem?.close();
  } catch {
    /* */
  }
  dbMem = null;
}
