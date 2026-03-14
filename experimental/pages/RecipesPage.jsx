/**
 * RecipesPage - /test/kitchen/recipes
 * Renders the production RecipesTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import RecipesTab from '../../tabs/RecipesTab';
import { exportRecipesCSV } from '../../utils';

export default function RecipesPage() {
  const {
    recipes,
    newRecipe, setNewRecipe,
    editingRecipe, setEditingRecipe,
    masterIngredients,
    recipesFileRef,
    findExactMatch,
    findSimilarIngredients,
    getRecipeCost,
    getRecipeCounts,
    saveRecipe,
    deleteRecipe,
    startEditingRecipe,
    saveEditingRecipe,
    updateEditingIngredient,
    addEditingIngredient,
    removeEditingIngredient,
    getUniqueVendors,
    updateMasterIngredientCost,
    syncRecipeIngredientsFromMaster,
    units, addUnit,
    duplicateRecipe
  } = useExperimentalContext();

  return (
    <RecipesTab
      recipes={recipes}
      newRecipe={newRecipe}
      setNewRecipe={setNewRecipe}
      editingRecipe={editingRecipe}
      setEditingRecipe={setEditingRecipe}
      masterIngredients={masterIngredients}
      recipesFileRef={recipesFileRef}
      findExactMatch={findExactMatch}
      findSimilarIngredients={findSimilarIngredients}
      getRecipeCost={getRecipeCost}
      getRecipeCounts={getRecipeCounts}
      saveRecipe={saveRecipe}
      deleteRecipe={deleteRecipe}
      startEditingRecipe={startEditingRecipe}
      saveEditingRecipe={saveEditingRecipe}
      updateEditingIngredient={updateEditingIngredient}
      addEditingIngredient={addEditingIngredient}
      removeEditingIngredient={removeEditingIngredient}
      exportRecipesCSV={() => exportRecipesCSV(recipes)}
      getUniqueVendors={getUniqueVendors}
      updateMasterIngredientCost={updateMasterIngredientCost}
      syncRecipeIngredientsFromMaster={syncRecipeIngredientsFromMaster}
      units={units}
      addUnit={addUnit}
      duplicateRecipe={duplicateRecipe}
    />
  );
}
