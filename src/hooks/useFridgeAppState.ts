import { useCallback, useMemo, useState } from 'react';
import {
  recipeMatchMeetsDietPreference,
  type DietPreference,
} from '../services/dietFilter';
import { recordIngredientUsage } from '../services/ingredientUsage';
import type { RecipeMatch } from '../services/mealdb';
import { rememberIngredientName } from '../services/customIngredients';
import { addToPantry, bumpUsage } from '../services/pantry';
import {
  findRecipes,
  rankingModeToPreferences,
  type RankingMode,
} from '../services/recipeOrchestrator';
import { getSpoonacularErrorBanner } from '../services/spoonacular';

const RANKING_STORAGE_KEY = 'fridge.dietPreference';

type View = 'home' | 'results' | 'detail';

function readRankingMode(): RankingMode {
  try {
    const v = localStorage.getItem(RANKING_STORAGE_KEY);
    if (
      v === 'vegan-first' ||
      v === 'vegetarian-friendly' ||
      v === 'show-all'
    ) {
      return v;
    }
  } catch {
    /* private mode */
  }
  return 'vegan-first';
}

function persistRankingMode(mode: RankingMode): void {
  try {
    localStorage.setItem(RANKING_STORAGE_KEY, mode);
  } catch {
    /* */
  }
}

export interface FridgeAppState {
  view: View;
  ingredients: string[];
  recipes: RecipeMatch[];
  filteredRecipes: RecipeMatch[];
  rankingMode: RankingMode;
  setRankingMode: (m: RankingMode) => void;
  plateFilter: DietPreference | null;
  setPlateFilter: (v: DietPreference | null) => void;
  selected: RecipeMatch | null;
  loading: boolean;
  error: string;
  spoonacularNotice: '401' | '402' | null;
  dismissSpoonacularNotice: () => void;
  handleAddIngredient: (name: string) => void;
  handleRemoveIngredient: (name: string) => void;
  handleSearch: () => Promise<void>;
  handleSelectRecipe: (match: RecipeMatch) => void;
  handleBack: () => void;
}

export function useFridgeAppState(): FridgeAppState {
  const [view, setView] = useState<View>('home');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<RecipeMatch[]>([]);
  const [selected, setSelected] = useState<RecipeMatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rankingMode, setRankingModeState] = useState<RankingMode>(
    readRankingMode,
  );
  const [plateFilter, setPlateFilter] = useState<DietPreference | null>(null);
  const [spoonacularNotice, setSpoonacularNotice] = useState<
    '401' | '402' | null
  >(null);

  const setRankingMode = useCallback((m: RankingMode) => {
    setRankingModeState(m);
    persistRankingMode(m);
  }, []);

  const dismissSpoonacularNotice = useCallback(() => {
    setSpoonacularNotice(null);
  }, []);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((r) =>
        recipeMatchMeetsDietPreference(r, plateFilter),
      ),
    [recipes, plateFilter],
  );

  const handleAddIngredient = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    let didAppend = false;
    setIngredients((prev) => {
      if (prev.some((p) => p.toLowerCase() === lower)) return prev;
      didAppend = true;
      return [...prev, trimmed];
    });

    if (!didAppend) return;

    rememberIngredientName(trimmed);
    addToPantry(lower);
    recordIngredientUsage(lower);
  }, []);

  const handleRemoveIngredient = useCallback((raw: string) => {
    const lower = raw.trim().toLowerCase();
    setIngredients((prev) =>
      prev.filter((p) => p.toLowerCase() !== lower),
    );
  }, []);

  const handleSearch = useCallback(async () => {
    const ings = ingredients;
    if (ings.length === 0) return;
    setError('');
    setLoading(true);
    setSpoonacularNotice(null);
    try {
      bumpUsage(ings.map((x) => x.trim().toLowerCase()));
      const prefs = rankingModeToPreferences(rankingMode);
      const list = await findRecipes(ings, prefs);
      setRecipes(list);
      setSpoonacularNotice(getSpoonacularErrorBanner());
      setView('results');
    } catch {
      setError(
        'Something went wrong while fetching recipes. Check your connection and try again.',
      );
      setRecipes([]);
      setView('home');
    } finally {
      setLoading(false);
    }
  }, [ingredients, rankingMode]);

  const handleSelectRecipe = useCallback((match: RecipeMatch) => {
    setSelected(match);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'detail') {
      setSelected(null);
      setView('results');
    } else if (view === 'results') {
      setRecipes([]);
      setView('home');
    }
  }, [view]);

  return {
    view,
    ingredients,
    recipes,
    filteredRecipes,
    rankingMode,
    setRankingMode,
    plateFilter,
    setPlateFilter,
    selected,
    loading,
    error,
    spoonacularNotice,
    dismissSpoonacularNotice,
    handleAddIngredient,
    handleRemoveIngredient,
    handleSearch,
    handleSelectRecipe,
    handleBack,
  };
}
