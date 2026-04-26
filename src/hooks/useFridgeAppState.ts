import { useCallback, useMemo, useState } from 'react';
import {
  recipeMatchMeetsDietPreference,
  type DietPreference,
} from '../services/dietFilter';
import { findRecipes, type RecipeMatch } from '../services/mealdb';

type View = 'home' | 'results' | 'detail';

export interface FridgeAppState {
  view: View;
  ingredients: string[];
  recipes: RecipeMatch[];
  filteredRecipes: RecipeMatch[];
  dietPreference: DietPreference | null;
  setDietPreference: (v: DietPreference | null) => void;
  selected: RecipeMatch | null;
  loading: boolean;
  error: string;
  handleSearch: (ings: string[]) => Promise<void>;
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
  const [dietPreference, setDietPreference] = useState<DietPreference | null>(
    null,
  );

  const filteredRecipes = useMemo(
    () => recipes.filter((r) => recipeMatchMeetsDietPreference(r, dietPreference)),
    [recipes, dietPreference],
  );

  const handleSearch = useCallback(async (ings: string[]) => {
    setIngredients(ings);
    setError('');
    setLoading(true);
    try {
      const list = await findRecipes(ings);
      setRecipes(list);
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
  }, []);

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
    dietPreference,
    setDietPreference,
    selected,
    loading,
    error,
    handleSearch,
    handleSelectRecipe,
    handleBack,
  };
}
