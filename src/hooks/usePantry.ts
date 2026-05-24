import {
  getPantry,
  getRecentlyUsed,
  getStaples,
  RECENT_LIMIT,
  searchPantry,
  type PantryItem,
} from '../services/pantry';
import { ingredientDedupeKey } from '../utils/ingredientDedupe';

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

  const activeKeys = new Set(
    activeIngredients
      .map((x) => ingredientDedupeKey(x.trim().toLowerCase()))
      .filter(Boolean),
  );

  const filterActive = (items: PantryItem[]): PantryItem[] =>
    items.filter((i) => !activeKeys.has(ingredientDedupeKey(i.name)));

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
    recent: filterActive(getRecentlyUsed(RECENT_LIMIT)),
    staples: filterActive(getStaples(activeIngredients)),
    total,
    searchResults: [],
  };
}
