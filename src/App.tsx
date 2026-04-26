import React from 'react';
import TitleBarDrag from './components/TitleBarDrag';
import HomeView from './components/HomeView';
import ResultsView from './components/ResultsView';
import RecipeDetailScreen from './components/RecipeDetailScreen';
import { useFridgeAppState } from './hooks/useFridgeAppState';
import './App.css';

export default function App() {
  const {
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
  } = useFridgeAppState();

  return (
    <div className="app">
      <TitleBarDrag />

      {view === 'home' && (
        <HomeView
          onSearch={handleSearch}
          loading={loading}
          error={error}
          dietPreference={dietPreference}
          onDietPreferenceChange={setDietPreference}
        />
      )}

      {view === 'results' && (
        <ResultsView
          recipes={filteredRecipes}
          totalRecipeCount={recipes.length}
          ingredients={ingredients}
          dietPreference={dietPreference}
          onDietPreferenceChange={setDietPreference}
          onNewSearch={handleBack}
          onSelectRecipe={handleSelectRecipe}
        />
      )}

      {view === 'detail' && selected && (
        <RecipeDetailScreen
          match={selected}
          userIngredients={ingredients}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
