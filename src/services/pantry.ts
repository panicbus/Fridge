import { ingredientDedupeKey } from '../utils/ingredientDedupe';
import {
  getIngredientUsageCount,
  migrateIngredientUsageRename,
} from './ingredientUsage';

const STORAGE_KEY = 'fridge.pantry';

export interface PantryItem {
  name: string;
  lastUsed: number;
  addedAt: number;
}

function readRaw(): PantryItem[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PantryItem[] = [];
    for (const row of parsed) {
      if (
        row &&
        typeof row === 'object' &&
        typeof (row as PantryItem).name === 'string' &&
        typeof (row as PantryItem).lastUsed === 'number' &&
        typeof (row as PantryItem).addedAt === 'number'
      ) {
        const item = row as PantryItem;
        const name = item.name.trim().toLowerCase();
        if (name)
          out.push({
            name,
            lastUsed: item.lastUsed,
            addedAt: item.addedAt,
          });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function write(items: PantryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

/** Merge rows that are the same ingredient (singular/plural, etc.); stored `name` is always canonical. */
function mergePantryByIngredientKey(items: PantryItem[]): PantryItem[] {
  const map = new Map<string, PantryItem>();
  for (const item of items) {
    const key = ingredientDedupeKey(item.name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        name: key,
        lastUsed: item.lastUsed,
        addedAt: item.addedAt,
      });
      continue;
    }
    map.set(key, {
      name: key,
      lastUsed: Math.max(prev.lastUsed, item.lastUsed),
      addedAt: Math.min(prev.addedAt, item.addedAt),
    });
  }
  return [...map.values()];
}

export function getPantry(): PantryItem[] {
  return mergePantryByIngredientKey(readRaw()).sort(
    (a, b) => b.lastUsed - a.lastUsed,
  );
}

export function addToPantry(name: string): void {
  const n = name.trim().toLowerCase();
  if (!n) return;
  const key = ingredientDedupeKey(n);
  const items = mergePantryByIngredientKey(readRaw());
  const now = Date.now();
  const i = items.findIndex((x) => ingredientDedupeKey(x.name) === key);
  if (i >= 0) {
    items[i] = { ...items[i], name: key, lastUsed: now };
  } else {
    items.push({ name: key, lastUsed: now, addedAt: now });
  }
  write(mergePantryByIngredientKey(items));
}

export function removeFromPantry(name: string): void {
  const key = ingredientDedupeKey(name.trim().toLowerCase());
  write(
    mergePantryByIngredientKey(readRaw()).filter(
      (x) => ingredientDedupeKey(x.name) !== key,
    ),
  );
}

/**
 * Rename a pantry item (case-insensitive keys). Preserves lastUsed and addedAt.
 * Returns false if `newName` collides with an existing item.
 */
export function renamePantryItem(oldName: string, newName: string): boolean {
  const o = oldName.trim().toLowerCase();
  const n = newName.trim().toLowerCase();
  if (!o || !n || o === n) return false;
  const items = mergePantryByIngredientKey(readRaw());
  const oldKey = ingredientDedupeKey(o);
  const newKey = ingredientDedupeKey(n);
  const idx = items.findIndex((x) => ingredientDedupeKey(x.name) === oldKey);
  if (idx < 0) return false;
  if (
    items.some(
      (x, i) =>
        i !== idx && ingredientDedupeKey(x.name) === newKey,
    )
  ) {
    return false;
  }
  const prevRow = items[idx];
  migrateIngredientUsageRename(prevRow.name, newKey);
  items[idx] = { ...prevRow, name: newKey };
  write(mergePantryByIngredientKey(items));
  return true;
}

/** Usage tally when user adds ingredient tags (`ingredientUsage`). */
export function getPantryUsageCount(name: string): number {
  return getIngredientUsageCount(name.trim().toLowerCase());
}

export function bumpUsage(names: string[]): void {
  const keys = new Set(
    names
      .map((x) => ingredientDedupeKey(x.trim().toLowerCase()))
      .filter(Boolean),
  );
  if (keys.size === 0) return;
  const items = mergePantryByIngredientKey(readRaw());
  const now = Date.now();
  let changed = false;
  for (const item of items) {
    if (keys.has(ingredientDedupeKey(item.name))) {
      item.lastUsed = now;
      changed = true;
    }
  }
  if (changed) write(mergePantryByIngredientKey(items));
}

/** Top N by lastUsed (consumer filters active search ingredients). Default 10. */
export function getRecentlyUsed(limit = 10): PantryItem[] {
  return getPantry().slice(0, limit);
}

/**
 * Items beyond the top 10 recently-used, excluding names in excludeNames (e.g. bag).
 */
export function getStaples(excludeNames: string[] = []): PantryItem[] {
  const ex = new Set(
    excludeNames.map((x) => ingredientDedupeKey(x.trim().toLowerCase())),
  );
  const sorted = getPantry();
  const recentKeys = new Set(
    sorted.slice(0, 10).map((i) => ingredientDedupeKey(i.name)),
  );
  return sorted.filter((i) => {
    const k = ingredientDedupeKey(i.name);
    return !ex.has(k) && !recentKeys.has(k);
  });
}

/** Case-insensitive substring match; returns matching items (no recent/staples split). */
export function searchPantry(query: string): PantryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return getPantry();
  return getPantry().filter((i) => i.name.includes(q));
}
