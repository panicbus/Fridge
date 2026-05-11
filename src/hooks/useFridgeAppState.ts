import { useCallback, useMemo, useState } from 'react';
import {
  recipeMatchMeetsDietPreference,
  type DietPreference,
} from '../services/dietFilter';
import { recordIngredientUsage } from '../services/ingredientUsage';
import type { RecipeMatch } from '../types';
import { rememberIngredientName } from '../services/customIngredients';
import { addToPantry, bumpUsage } from '../services/pantry';
import {
  findRecipes,
  rankingModeToPreferences,
  type RankingMode,
} from '../services/recipeOrchestrator';
import { getRecipeViewById, recordRecipeView } from '../services/recipeViewHistory';
import { recordSearch } from '../services/searchHistory';
import { getSavedRecipeById } from '../services/savedRecipes';
import { getSpoonacularErrorBanner } from '../services/spoonacular';

const RANKING_STORAGE_KEY = 'fridge.dietPreference';

type View = 'home' | 'results' | 'detail' | 'saved' | 'history' | 'pantry-manage';

export type DetailReturnView = 'results' | 'saved' | 'history';

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
  handleSelectSavedRecipe: (recipeId: string) => void;
  handleOpenSaved: () => void;
  handleOpenHistory: () => void;
  handleOpenPantryManage: () => void;
  handleReplaySearch: (ingredients: string[], pref: RankingMode) => void;
  handleSelectHistoryRecipe: (recipeId: string) => void;
  handleBack: () => void;
  /** Leave recipe/detail flows and return to main ingredient screen */
  handleGoHome: () => void;
  /** Where detail Back navigates (results / saved / history) */
  detailReturnView: DetailReturnView;
  pantryRefreshKey: number;
  bumpPantryRevision: () => void;
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
  const [pantryRefreshKey, setPantryRefreshKey] = useState(0);
  const [detailReturnView, setDetailReturnView] =
    useState<DetailReturnView>('results');

  const bumpPantryRevision = useCallback(() => {
    setPantryRefreshKey((k) => k + 1);
  }, []);

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

  const executeSearch = useCallback(
    async (ings: string[], mode: RankingMode) => {
      if (ings.length === 0) return;
      setError('');
      setLoading(true);
      setSpoonacularNotice(null);
      try {
        bumpUsage(ings.map((x) => x.trim().toLowerCase()));
        bumpPantryRevision();
        const prefs = rankingModeToPreferences(mode);
        const list = await findRecipes(ings, prefs);
        recordSearch({
          ingredients: ings,
          dietPreference: mode,
          resultCount: list.length,
        });
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
    },
    [bumpPantryRevision],
  );

  const handleAddIngredient = useCallback(
    (raw: string) => {
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
      bumpUsage([lower]);
      recordIngredientUsage(lower);
      bumpPantryRevision();
    },
    [bumpPantryRevision],
  );

  const handleRemoveIngredient = useCallback((raw: string) => {
    const lower = raw.trim().toLowerCase();
    setIngredients((prev) =>
      prev.filter((p) => p.toLowerCase() !== lower),
    );
  }, []);

  const handleSearch = useCallback(async () => {
    await executeSearch(ingredients, rankingMode);
  }, [executeSearch, ingredients, rankingMode]);

  const handleSelectRecipe = useCallback((match: RecipeMatch) => {
    recordRecipeView(match.recipe);
    setDetailReturnView('results');
    setSelected(match);
    setView('detail');
  }, []);

  const handleSelectSavedRecipe = useCallback((recipeId: string) => {
    const row = getSavedRecipeById(recipeId);
    if (!row) return;
    recordRecipeView(row.recipe);
    setDetailReturnView('saved');
    setSelected({
      recipe: row.recipe,
      matchedIngredients: [],
      missingIngredients: [],
      matchScore: 1,
    });
    setView('detail');
  }, []);

  const handleOpenSaved = useCallback(() => {
    setView('saved');
  }, []);

  const handleOpenHistory = useCallback(() => {
    setView('history');
  }, []);

  const handleOpenPantryManage = useCallback(() => {
    setView('pantry-manage');
  }, []);

  const handleReplaySearch = useCallback(
    (ings: string[], pref: RankingMode) => {
      setIngredients(ings);
      setRankingMode(pref);
      setRecipes([]);
      setView('results');
      queueMicrotask(() => {
        void executeSearch(ings, pref);
      });
    },
    [executeSearch, setRankingMode],
  );

  const handleSelectHistoryRecipe = useCallback((recipeId: string) => {
    const entry = getRecipeViewById(recipeId);
    if (!entry) return;
    recordRecipeView(entry.recipe);
    setSelected({
      recipe: entry.recipe,
      matchedIngredients: [],
      missingIngredients: [],
      matchScore: 1,
    });
    setDetailReturnView('history');
    setView('detail');
  }, []);

  const handleGoHome = useCallback(() => {
    setSelected(null);
    setRecipes([]);
    setPlateFilter(null);
    setView('home');
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'detail') {
      setSelected(null);
      setView(detailReturnView);
    } else if (
      view === 'results' ||
      view === 'saved' ||
      view === 'history' ||
      view === 'pantry-manage'
    ) {
      if (view === 'results') setRecipes([]);
      setView('home');
    }
  }, [view, detailReturnView]);

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
    handleSelectSavedRecipe,
    handleOpenSaved,
    handleOpenHistory,
    handleOpenPantryManage,
    handleReplaySearch,
    handleSelectHistoryRecipe,
    handleBack,
    handleGoHome,
    detailReturnView,
    pantryRefreshKey,
    bumpPantryRevision,
  };
}
