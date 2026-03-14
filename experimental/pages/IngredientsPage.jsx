/**
 * IngredientsPage - /test/kitchen/ingredients
 * Renders the production IngredientsTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import IngredientsTab from '../../tabs/IngredientsTab';

export default function IngredientsPage() {
  const {
    masterIngredients,
    newIngredient, setNewIngredient,
    editingIngredientId,
    editingIngredientData, setEditingIngredientData,
    ingredientsFileRef,
    duplicateWarnings, setDuplicateWarnings,
    scanForDuplicates,
    mergeIngredients,
    addMasterIngredient,
    deleteMasterIngredient,
    startEditingMasterIngredient,
    saveEditingMasterIngredient,
    cancelEditingMasterIngredient,
    exportIngredientsCSV
  } = useExperimentalContext();

  return (
    <IngredientsTab
      masterIngredients={masterIngredients}
      newIngredient={newIngredient}
      setNewIngredient={setNewIngredient}
      editingIngredientId={editingIngredientId}
      editingIngredientData={editingIngredientData}
      setEditingIngredientData={setEditingIngredientData}
      duplicateWarnings={duplicateWarnings}
      setDuplicateWarnings={setDuplicateWarnings}
      scanForDuplicates={scanForDuplicates}
      mergeIngredients={mergeIngredients}
      addMasterIngredient={addMasterIngredient}
      deleteMasterIngredient={deleteMasterIngredient}
      startEditingMasterIngredient={startEditingMasterIngredient}
      saveEditingMasterIngredient={saveEditingMasterIngredient}
      cancelEditingMasterIngredient={cancelEditingMasterIngredient}
      ingredientsFileRef={ingredientsFileRef}
      exportIngredientsCSV={exportIngredientsCSV}
    />
  );
}
