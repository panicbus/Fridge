const STORAGE_KEY = 'fridge.ingredientLexicon';

function readSet(): Set<string> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return new Set();
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const out = new Set<string>();
    for (const row of parsed) {
      if (typeof row === 'string') {
        const n = row.toLowerCase().trim();
        if (n) out.add(n);
      }
    }
    return out;
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>): void {
  try {
    const arr = [...set].sort((a, b) => a.localeCompare(b));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* quota / private mode */
  }
}

/** Saved user-typed names for autocomplete merge (subset of “database” on device). */
export function getCustomIngredientNames(): string[] {
  return [...readSet()].sort((a, b) => a.localeCompare(b));
}

/** Remember a name the user added as an ingredient so it appears in future autocomplete. */
export function rememberIngredientName(name: string): void {
  const n = name.trim().toLowerCase();
  if (!n) return;
  const set = readSet();
  if (set.has(n)) return;
  set.add(n);
  writeSet(set);
}
