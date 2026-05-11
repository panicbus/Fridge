import { createCappedStore } from './storage';
import type { SearchHistoryEntry } from '../types';

export const searchHistoryStore = createCappedStore<SearchHistoryEntry>(
  'fridge.searchHistory',
  {
    maxSize: 100,
    sortField: 'timestamp',
  },
);

function newSearchHistoryId(): string {
  try {
    return `${Date.now()}-${crypto.randomUUID()}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/** Order-independent ingredient identity so reruns don’t duplicate history rows. */
function searchFingerprint(
  ingredients: readonly string[],
  dietPreference: SearchHistoryEntry['dietPreference'],
): string {
  const normalized = [...ingredients]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return `${dietPreference}\u001f${normalized.join('\u001f')}`;
}

export function getSearchHistory(): SearchHistoryEntry[] {
  return [...searchHistoryStore.getAll()].sort((a, b) => b.timestamp - a.timestamp);
}

export function recordSearch(
  entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'>,
): SearchHistoryEntry {
  const fp = searchFingerprint(entry.ingredients, entry.dietPreference);
  for (const row of searchHistoryStore.getAll()) {
    if (searchFingerprint(row.ingredients, row.dietPreference) === fp) {
      searchHistoryStore.remove(row.id);
    }
  }
  const row: SearchHistoryEntry = {
    ...entry,
    id: newSearchHistoryId(),
    timestamp: Date.now(),
  };
  return searchHistoryStore.put(row);
}

export function clearSearchHistory(): void {
  searchHistoryStore.clear();
}
