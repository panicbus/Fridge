import {
  getPantry,
  getRecentlyUsed,
  getStaples,
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
  pantryRevision: number,
): UsePantryResult {
  void pantryRevision;

  const activeLower = new Set(
    activeIngredients.map((x) => x.trim().toLowerCase()).filter(Boolean),
  );

  const filterActive = (items: PantryItem[]): PantryItem[] =>
    items.filter((i) => !activeLower.has(i.name));

  const total = getPantry().length;

  if (searchQuery.trim()) {
    const matches = filterActive(searchPantry(searchQuery));
    return {
      recent: [],
      staples: [],
      total,
      searchResults: matches,
    };
  }

  return {
    recent: filterActive(getRecentlyUsed(10)),
    staples: filterActive(getStaples(activeIngredients)),
    total,
    searchResults: [],
  };
}
