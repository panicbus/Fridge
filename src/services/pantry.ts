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

function dedupeByName(items: PantryItem[]): PantryItem[] {
  const map = new Map<string, PantryItem>();
  for (const item of items) {
    const prev = map.get(item.name);
    if (!prev || item.lastUsed > prev.lastUsed) map.set(item.name, item);
  }
  return [...map.values()];
}

export function getPantry(): PantryItem[] {
  return dedupeByName(readRaw()).sort((a, b) => b.lastUsed - a.lastUsed);
}

export function addToPantry(name: string): void {
  const n = name.trim().toLowerCase();
  if (!n) return;
  const items = dedupeByName(readRaw());
  const now = Date.now();
  const i = items.findIndex((x) => x.name === n);
  if (i >= 0) {
    items[i] = { ...items[i], lastUsed: now };
  } else {
    items.push({ name: n, lastUsed: now, addedAt: now });
  }
  write(items);
}

export function removeFromPantry(name: string): void {
  const n = name.trim().toLowerCase();
  write(readRaw().filter((x) => x.name !== n));
}

/**
 * Rename a pantry item (case-insensitive keys). Preserves lastUsed and addedAt.
 * Returns false if `newName` collides with an existing item.
 */
export function renamePantryItem(oldName: string, newName: string): boolean {
  const o = oldName.trim().toLowerCase();
  const n = newName.trim().toLowerCase();
  if (!o || !n || o === n) return false;
  const items = dedupeByName(readRaw());
  if (items.some((x) => x.name === n)) return false;
  const idx = items.findIndex((x) => x.name === o);
  if (idx < 0) return false;
  items[idx] = { ...items[idx], name: n };
  write(dedupeByName(items));
  migrateIngredientUsageRename(o, n);
  return true;
}

/** Usage tally when user adds ingredient tags (`ingredientUsage`). */
export function getPantryUsageCount(name: string): number {
  return getIngredientUsageCount(name.trim().toLowerCase());
}

export function bumpUsage(names: string[]): void {
  const set = new Set(names.map((x) => x.trim().toLowerCase()).filter(Boolean));
  if (set.size === 0) return;
  const items = dedupeByName(readRaw());
  const now = Date.now();
  let changed = false;
  for (const item of items) {
    if (set.has(item.name)) {
      item.lastUsed = now;
      changed = true;
    }
  }
  if (changed) write(items);
}

/** Top N by lastUsed (consumer filters active search ingredients). Default 10. */
export function getRecentlyUsed(limit = 10): PantryItem[] {
  return getPantry().slice(0, limit);
}

/**
 * Items beyond the top 10 recently-used, excluding names in excludeNames (e.g. bag).
 */
export function getStaples(excludeNames: string[] = []): PantryItem[] {
  const ex = new Set(excludeNames.map((x) => x.trim().toLowerCase()));
  const sorted = getPantry();
  const recentNames = new Set(sorted.slice(0, 10).map((i) => i.name));
  return sorted.filter(
    (i) => !ex.has(i.name) && !recentNames.has(i.name),
  );
}

/** Case-insensitive substring match; returns matching items (no recent/staples split). */
export function searchPantry(query: string): PantryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return getPantry();
  return getPantry().filter((i) => i.name.includes(q));
}
