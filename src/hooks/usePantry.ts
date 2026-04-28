import {
  getPantry,
  searchPantry,
  type PantryItem,
} from '../services/pantry';

export interface UsePantryResult {
  recent: PantryItem[];
  staples: PantryItem[];
  total: number;
  searchResults: PantryItem[];
}

export function usePantry(
  activeIngredients: string[],
  searchQuery: string,
): UsePantryResult {
  const activeLower = new Set(
    activeIngredients.map((x) => x.trim().toLowerCase()).filter(Boolean),
  );

  const filterActive = (items: PantryItem[]): PantryItem[] =>
    items.filter((i) => !activeLower.has(i.name));

  const pantrySorted = getPantry();
  const total = pantrySorted.length;

  if (searchQuery.trim()) {
    const matches = filterActive(searchPantry(searchQuery));
    return {
      recent: [],
      staples: [],
      total,
      searchResults: matches,
    };
  }

  const pool = filterActive(pantrySorted);
  return {
    recent: pool.slice(0, 4),
    staples: pool.slice(4),
    total,
    searchResults: [],
  };
}
