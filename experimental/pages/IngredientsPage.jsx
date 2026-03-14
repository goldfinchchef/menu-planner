/**
 * IngredientsPage - /test/kitchen/ingredients
 * Renders the production IngredientsTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import IngredientsTab from '../../tabs/IngredientsTab';

export default function IngredientsPage() {
  const {
    masterIngredients, setMasterIngredients,
    newIngredient, setNewIngredient,
    editingIngredientId, setEditingIngredientId,
    editingIngredientData, setEditingIngredientData,
    ingredientsFileRef,
    findSimilarIngredients,
    findExactMatch,
    recipes, setRecipes,
    units, addUnit
  } = useExperimentalContext();

  return (
    <IngredientsTab
      masterIngredients={masterIngredients}
      setMasterIngredients={setMasterIngredients}
      newIngredient={newIngredient}
      setNewIngredient={setNewIngredient}
      editingIngredientId={editingIngredientId}
      setEditingIngredientId={setEditingIngredientId}
      editingIngredientData={editingIngredientData}
      setEditingIngredientData={setEditingIngredientData}
      ingredientsFileRef={ingredientsFileRef}
      findSimilarIngredients={findSimilarIngredients}
      findExactMatch={findExactMatch}
      recipes={recipes}
      setRecipes={setRecipes}
      units={units}
      addUnit={addUnit}
    />
  );
}
