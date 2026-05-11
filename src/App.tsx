import React from 'react';
import Header from './components/Header';
import IngredientBag from './components/IngredientBag';
import DietPicker from './components/DietPicker';
import SavedCard from './components/SavedCard';
import PantryCard from './components/PantryCard';
import SavedView from './components/SavedView';
import HistoryView from './components/HistoryView';
import PantryManageView from './components/PantryManageView';
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
  } = useFridgeAppState();

  return (
    <div className="app">
      {view === 'home' && (
        <div className="home-layout">
          <Header
            onSaved={handleOpenSaved}
            onHistory={handleOpenHistory}
            onSettings={() => {
              console.log('settings — coming soon');
            }}
          />

          <section className="home-top">
            <h1 className="headline">
              What&apos;s <em>in your kitchen?</em>
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
          </section>

          <section className="home-bottom">
            <SavedCard
              onViewAll={handleOpenSaved}
              onSelectRecipe={handleSelectSavedRecipe}
            />
            <PantryCard
              activeIngredients={ingredients}
              onAddIngredient={handleAddIngredient}
              onManage={handleOpenPantryManage}
              pantryRevision={pantryRefreshKey}
            />
          </section>
        </div>
      )}

      {view === 'saved' && (
        <SavedView onBack={handleBack} onSelectRecipe={handleSelectSavedRecipe} />
      )}

      {view === 'history' && (
        <HistoryView
          onBack={handleBack}
          onReplaySearch={handleReplaySearch}
          onSelectRecipe={handleSelectHistoryRecipe}
        />
      )}

      {view === 'pantry-manage' && (
        <PantryManageView
          onBack={handleBack}
          pantryRevision={pantryRefreshKey}
          onPantryChanged={bumpPantryRevision}
        />
      )}

      {view === 'results' && (
        <ResultsView
          recipes={filteredRecipes}
          totalRecipeCount={recipes.length}
          loading={loading}
          ingredients={ingredients}
          plateFilter={plateFilter}
          onPlateFilterChange={setPlateFilter}
          rankingMode={rankingMode}
          onNewSearch={handleBack}
          onOpenSaved={handleOpenSaved}
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
          onHome={handleGoHome}
          backLabel={
            detailReturnView === 'saved'
              ? '← Back to saved'
              : detailReturnView === 'history'
                ? '← Back to history'
                : '← Back to results'
          }
          rankingMode={rankingMode}
        />
      )}
    </div>
  );
}
