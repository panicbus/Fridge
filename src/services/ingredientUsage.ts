import { ingredientDedupeKey } from '../utils/ingredientDedupe';

const STORAGE_KEY = 'fridge-app:frequent-ingredients';
const MAX_TRACKED = 100;

type Counts = Record<string, number>;

function consolidateCounts(counts: Counts): Counts {
  const next: Counts = {};
  for (const [k, v] of Object.entries(counts)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    const canon = ingredientDedupeKey(k);
    if (!canon) continue;
    next[canon] = (next[canon] ?? 0) + v;
  }
  return next;
}

function load(): Counts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return consolidateCounts(parsed as Counts);
  } catch {
    return {};
  }
}

function save(counts: Counts): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(consolidateCounts(counts)),
    );
  } catch {
    /* quota / private mode */
  }
}

/** Bump count for an ingredient whenever the user adds it as a tag (normalized lowercase). */
export function recordIngredientUsage(normalizedName: string): void {
  const k = ingredientDedupeKey(normalizedName.trim().toLowerCase());
  if (!k) return;
  const counts = load();
  counts[k] = (counts[k] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, MAX_TRACKED);
  save(Object.fromEntries(top));
}

export function getIngredientUsageCount(normalizedName: string): number {
  const k = ingredientDedupeKey(normalizedName.trim().toLowerCase());
  if (!k) return 0;
  return load()[k] ?? 0;
}

/** Merge usage counts when renaming an ingredient key (both lowercase). */
export function migrateIngredientUsageRename(
  oldName: string,
  newName: string,
): void {
  const o = ingredientDedupeKey(oldName.trim().toLowerCase());
  const n = ingredientDedupeKey(newName.trim().toLowerCase());
  if (!o || !n || o === n) return;
  const counts = load();
  const prev = counts[o];
  if (prev === undefined) return;
  delete counts[o];
  counts[n] = (counts[n] ?? 0) + prev;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  save(Object.fromEntries(sorted.slice(0, MAX_TRACKED)));
}

/**
 * Most-used ingredients first (from local history), then fallbacks, excluding already-tagged.
 */
export function getFrequentIngredientSuggestions(
  excludeLower: Set<string>,
  limit: number,
  fallbacks: readonly string[],
): string[] {
  const excludeKeys = new Set(
    [...excludeLower].map((k) => ingredientDedupeKey(k)).filter(Boolean),
  );
  const counts = load();
  const sorted = Object.entries(counts)
    .filter(([k]) => !excludeKeys.has(ingredientDedupeKey(k)))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const out: string[] = [];
  const seen = new Set<string>();

  for (const name of sorted) {
    const dk = ingredientDedupeKey(name);
    if (seen.has(dk)) continue;
    seen.add(dk);
    out.push(name);
    if (out.length >= limit) return out;
  }

  for (const name of fallbacks) {
    const k = ingredientDedupeKey(name.toLowerCase());
    if (!k || excludeKeys.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(name);
    if (out.length >= limit) break;
  }

  return out;
}
