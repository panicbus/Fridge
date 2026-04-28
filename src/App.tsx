import React from 'react';
import Header from './components/Header';
import IngredientBag from './components/IngredientBag';
import DietPicker from './components/DietPicker';
import SavedCard from './components/SavedCard';
import PantryCard from './components/PantryCard';
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
  } = useFridgeAppState();

  return (
    <div className="app">
      {view === 'home' && (
        <div className="home-layout">
          <Header />
          <div className="home-grid">
            <div className="home-main">
              <h1 className="headline">
                What can I cook <em>with what I have?</em>
              </h1>

              <IngredientBag
                ingredients={ingredients}
                onAdd={handleAddIngredient}
                onRemove={handleRemoveIngredient}
                onSearch={() => void handleSearch()}
                loading={loading}
              />

              <DietPicker value={rankingMode} onChange={setRankingMode} />

              {error ? <p className="error-msg">{error}</p> : null}
            </div>

            <aside className="home-sidebar">
              <SavedCard count={0} onViewAll={() => {}} />
              <PantryCard
                activeIngredients={ingredients}
                onAddIngredient={handleAddIngredient}
                onManage={() => {}}
              />
            </aside>
          </div>
        </div>
      )}

      {view === 'results' && (
        <ResultsView
          recipes={filteredRecipes}
          totalRecipeCount={recipes.length}
          ingredients={ingredients}
          plateFilter={plateFilter}
          onPlateFilterChange={setPlateFilter}
          rankingMode={rankingMode}
          onNewSearch={handleBack}
          onSelectRecipe={handleSelectRecipe}
          spoonacularNotice={spoonacularNotice}
          onDismissSpoonacularNotice={dismissSpoonacularNotice}
        />
      )}

      {view === 'detail' && selected && (
        <RecipeDetailScreen
          match={selected}
          userIngredients={ingredients}
          onBack={handleBack}
          rankingMode={rankingMode}
        />
      )}
    </div>
  );
}
