const STORAGE_KEY = 'fridge-app:frequent-ingredients';
const MAX_TRACKED = 100;

type Counts = Record<string, number>;

function load(): Counts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Counts;
  } catch {
    return {};
  }
}

function save(counts: Counts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    /* quota / private mode */
  }
}

/** Bump count for an ingredient whenever the user adds it as a tag (normalized lowercase). */
export function recordIngredientUsage(normalizedName: string): void {
  const k = normalizedName.trim().toLowerCase();
  if (!k) return;
  const counts = load();
  counts[k] = (counts[k] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, MAX_TRACKED);
  save(Object.fromEntries(top));
}

/**
 * Most-used ingredients first (from local history), then fallbacks, excluding already-tagged.
 */
export function getFrequentIngredientSuggestions(
  excludeLower: Set<string>,
  limit: number,
  fallbacks: readonly string[],
): string[] {
  const counts = load();
  const sorted = Object.entries(counts)
    .filter(([k]) => !excludeLower.has(k))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const out: string[] = [];
  const seen = new Set<string>();

  for (const name of sorted) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= limit) return out;
  }

  for (const name of fallbacks) {
    const k = name.toLowerCase();
    if (excludeLower.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(name);
    if (out.length >= limit) break;
  }

  return out;
}
