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

export function getRecentlyUsed(limit = 4): PantryItem[] {
  return getPantry().slice(0, limit);
}

/** Pantry items excluding active search names, omitting the top four (shown as “recent”). */
export function getStaples(excludeNames: string[] = []): PantryItem[] {
  const ex = new Set(excludeNames.map((x) => x.trim().toLowerCase()));
  return getPantry()
    .filter((i) => !ex.has(i.name))
    .slice(4);
}

export function searchPantry(query: string): PantryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return getPantry();
  return getPantry().filter((i) => i.name.includes(q));
}
