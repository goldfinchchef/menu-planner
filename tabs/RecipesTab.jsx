import React from 'react';
import { Upload, Download, Save, X, Edit2, Check, Trash2, AlertCircle } from 'lucide-react';
import { STORE_SECTIONS, RECIPE_CATEGORIES } from '../constants';

export default function RecipesTab({
  recipes,
  newRecipe,
  setNewRecipe,
  editingRecipe,
  setEditingRecipe,
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
  exportRecipesCSV
}) {
  const recipeCounts = getRecipeCounts();

  const addIngredient = () => setNewRecipe({
    ...newRecipe,
    ingredients: [...newRecipe.ingredients, { name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }]
  });

  const updateIngredient = (index, field, value) => {
    const updated = [...newRecipe.ingredients];
    updated[index][field] = value;
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  const removeIngredient = (index) => setNewRecipe({
    ...newRecipe,
    ingredients: newRecipe.ingredients.filter((_, i) => i !== index)
  });

  const autoFillIngredient = (index, masterIng) => {
    const updated = [...newRecipe.ingredients];
    updated[index] = {
      ...updated[index],
      name: masterIng.name,
      cost: masterIng.cost,
      source: masterIng.source,
      section: masterIng.section,
      unit: masterIng.unit
    };
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Recipes</h2>
            <p className="text-sm text-gray-600">
              Total: {recipeCounts.total} |
              Protein: {recipeCounts.protein || 0} |
              Veg: {recipeCounts.veg || 0} |
              Starch: {recipeCounts.starch || 0} |
              Sauces: {recipeCounts.sauces || 0} |
              Breakfast: {recipeCounts.breakfast || 0} |
              Soups: {recipeCounts.soups || 0}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => recipesFileRef.current.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
              style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
            >
              <Upload size={18} />Import
            </button>
            <button
              onClick={exportRecipesCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <Download size={18} />Export
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <select
              value={newRecipe.category}
              onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })}
              className="p-2 border-2 rounded-lg"
              style={{ borderColor: '#ebb582' }}
            >
              {RECIPE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <input
              type="text"
              value={newRecipe.name}
              onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
              placeholder="Recipe name"
              className="p-2 border-2 rounded-lg"
              style={{ borderColor: '#ebb582' }}
            />
          </div>
          <textarea
            value={newRecipe.instructions}
            onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
            placeholder="Cooking instructions..."
            className="w-full p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
            rows="2"
          />
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Ingredients</label>
            {newRecipe.ingredients.map((ing, index) => {
              const exactMatch = ing.name.length > 2 ? findExactMatch(ing.name) : null;
              const similarIngs = ing.name.length > 2 && !exactMatch ? findSimilarIngredients(ing.name) : [];
              return (
                <div key={index} className="mb-2">
                  <div className="flex flex-wrap gap-2 p-2 rounded" style={{ backgroundColor: '#f9f9ed' }}>
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      placeholder="Ingredient"
                      className="flex-1 min-w-[120px] p-2 border-2 rounded-lg"
                      style={{ borderColor: '#ebb582' }}
                      list={`ing-${index}`}
                    />
                    <datalist id={`ing-${index}`}>
                      {masterIngredients.map((mi, i) => <option key={i} value={mi.name} />)}
                    </datalist>
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      placeholder="Oz"
                      className="w-16 p-2 border-2 rounded-lg"
                      style={{ borderColor: '#ebb582' }}
                    />
                    <input
                      type="text"
                      value={ing.cost}
                      onChange={(e) => updateIngredient(index, 'cost', e.target.value)}
                      placeholder="$"
                      className="w-16 p-2 border-2 rounded-lg"
                      style={{ borderColor: '#ebb582' }}
                    />
                    <input
                      type="text"
                      value={ing.source}
                      onChange={(e) => updateIngredient(index, 'source', e.target.value)}
                      placeholder="Source"
                      className="w-20 p-2 border-2 rounded-lg"
                      style={{ borderColor: '#ebb582' }}
                    />
                    <select
                      value={ing.section}
                      onChange={(e) => updateIngredient(index, 'section', e.target.value)}
                      className="w-28 p-2 border-2 rounded-lg"
                      style={{ borderColor: '#ebb582' }}
                    >
                      {STORE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {newRecipe.ingredients.length > 1 && (
                      <button onClick={() => removeIngredient(index)} className="text-red-600 p-2">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  {exactMatch && (
                    <button
                      onClick={() => autoFillIngredient(index, exactMatch)}
                      className="mt-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700"
                    >
                      Auto-fill "{exactMatch.name}"
                    </button>
                  )}
                  {similarIngs.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-xs text-orange-600">
                        <AlertCircle size={12} className="inline" /> Similar:
                      </span>
                      {similarIngs.slice(0, 3).map((si, i) => (
                        <button
                          key={i}
                          onClick={() => autoFillIngredient(index, si)}
                          className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700"
                        >
                          "{si.name}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={addIngredient}
              className="text-sm px-3 py-1 rounded"
              style={{ backgroundColor: '#ebb582' }}
            >
              + Add Ingredient
            </button>
          </div>
          <button
            onClick={saveRecipe}
            className="px-6 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#3d59ab' }}
          >
            <Save size={20} className="inline mr-2" />Save Recipe
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Recipe Library</h2>
        {Object.entries(recipes).map(([category, items]) => items.length > 0 && (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-bold capitalize mb-2" style={{ color: '#ebb582' }}>
              {category} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((recipe, index) => {
                const cost = getRecipeCost(recipe);
                return (
                  <div key={index}>
                    {editingRecipe?.category === category && editingRecipe?.index === index ? (
                      <div className="p-4 rounded-lg border-2" style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}>
                        <input
                          type="text"
                          value={editingRecipe.recipe.name}
                          onChange={(e) => setEditingRecipe({
                            ...editingRecipe,
                            recipe: { ...editingRecipe.recipe, name: e.target.value }
                          })}
                          className="w-full p-2 border-2 rounded-lg mb-2 font-bold"
                          style={{ borderColor: '#ebb582' }}
                        />
                        <textarea
                          value={editingRecipe.recipe.instructions}
                          onChange={(e) => setEditingRecipe({
                            ...editingRecipe,
                            recipe: { ...editingRecipe.recipe, instructions: e.target.value }
                          })}
                          placeholder="Instructions..."
                          className="w-full p-2 border-2 rounded-lg mb-2"
                          style={{ borderColor: '#ebb582' }}
                          rows="2"
                        />
                        <p className="text-sm font-medium mb-2">Ingredients:</p>
                        {editingRecipe.recipe.ingredients.map((ing, ingIndex) => (
                          <div key={ingIndex} className="flex flex-wrap gap-2 mb-2">
                            <input
                              type="text"
                              value={ing.name}
                              onChange={(e) => updateEditingIngredient(ingIndex, 'name', e.target.value)}
                              placeholder="Name"
                              className="flex-1 min-w-[100px] p-1 border rounded text-sm"
                            />
                            <input
                              type="text"
                              value={ing.quantity}
                              onChange={(e) => updateEditingIngredient(ingIndex, 'quantity', e.target.value)}
                              placeholder="Oz"
                              className="w-12 p-1 border rounded text-sm"
                            />
                            <input
                              type="text"
                              value={ing.cost}
                              onChange={(e) => updateEditingIngredient(ingIndex, 'cost', e.target.value)}
                              placeholder="$"
                              className="w-12 p-1 border rounded text-sm"
                            />
                            <input
                              type="text"
                              value={ing.source}
                              onChange={(e) => updateEditingIngredient(ingIndex, 'source', e.target.value)}
                              placeholder="Source"
                              className="w-16 p-1 border rounded text-sm"
                            />
                            <select
                              value={ing.section}
                              onChange={(e) => updateEditingIngredient(ingIndex, 'section', e.target.value)}
                              className="w-24 p-1 border rounded text-sm"
                            >
                              {STORE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => removeEditingIngredient(ingIndex)} className="text-red-600">
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addEditingIngredient}
                          className="text-sm px-2 py-1 rounded mb-2"
                          style={{ backgroundColor: '#ebb582' }}
                        >
                          + Add
                        </button>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={saveEditingRecipe}
                            className="flex items-center gap-1 px-3 py-1 rounded text-white text-sm"
                            style={{ backgroundColor: '#3d59ab' }}
                          >
                            <Check size={16} />Save
                          </button>
                          <button
                            onClick={() => setEditingRecipe(null)}
                            className="px-3 py-1 rounded bg-gray-200 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{recipe.name}</p>
                            {cost > 0 && (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                ${cost.toFixed(2)}/portion
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {recipe.ingredients?.map(i => `${i.name} (${i.quantity}oz)`).join(', ')}
                          </p>
                          {recipe.instructions && (
                            <p className="text-xs text-gray-500 mt-1">{recipe.instructions}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startEditingRecipe(category, index)} className="text-blue-600">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteRecipe(category, index)} className="text-red-600">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {Object.values(recipes).flat().length === 0 && (
          <p className="text-gray-500">No recipes yet.</p>
        )}
      </div>
    </div>
  );
}
