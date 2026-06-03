import React, { useState, useMemo } from 'react';
import { Upload, Download, X, Edit2, Copy, AlertTriangle, ChevronRight } from 'lucide-react';
import { STORE_SECTIONS, RECIPE_CATEGORIES } from '../constants';

// Subcategories by category
const SUBCATEGORIES = {
  protein: ['Chicken', 'Beef', 'Pork', 'Fish & Seafood', 'Vegetarian'],
  veg: ['Roasted', 'Sautéed', 'Steamed', 'Raw/Salad', 'Grilled'],
  starch: ['Potato', 'Rice', 'Pasta', 'Bread', 'Grains']
};

export default function RecipesTab(props) {
  const {
    recipes,
    newRecipe,
    setNewRecipe,
    editingRecipe,
    setEditingRecipe,
    masterIngredients,
    recipesFileRef,
    findExactMatch,
    getRecipeCost,
    getRecipeCounts,
    saveRecipe,
    deleteRecipe,
    startEditingRecipe,
    saveEditingRecipe,
    updateEditingIngredient,
    addEditingIngredient,
    removeEditingIngredient,
    exportRecipesCSV,
    updateMasterIngredientCost,
    units = ['oz', 'fl oz', 'lb', 'g', 'kg', 'cup', 'tbsp', 'tsp', 'each', 'bunch', 'clove', 'head', 'can', 'jar'],
    addUnit,
    duplicateRecipe
  } = props;

  // UI State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null); // { category, index, recipe }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRecipe, setModalRecipe] = useState(null); // recipe being edited in modal
  const [modalMode, setModalMode] = useState('new'); // 'new' or 'edit'
  const [searchQuery, setSearchQuery] = useState('');

  const recipeCounts = getRecipeCounts();

  // Quick update subcategory without opening modal
  const updateSubcategory = async (category, index, recipe, newSubcategory) => {
    const recipeToSave = {
      id: recipe.id,
      name: recipe.name,
      category: category,
      subcategory: newSubcategory || null,
      instructions: recipe.instructions || '',
      ingredients: recipe.ingredients || []
    };
    await saveRecipe(recipeToSave);
  };

  // Flatten recipes for table display, filtered by category/subcategory/search
  const filteredRecipes = useMemo(() => {
    const result = [];
    Object.entries(recipes).forEach(([category, items]) => {
      items.forEach((recipe, index) => {
        // Category filter
        if (selectedCategory !== 'all' && category !== selectedCategory) return;
        // Subcategory filter
        if (selectedSubcategory && SUBCATEGORIES[category]) {
          if ((recipe.subcategory || '').toLowerCase() !== selectedSubcategory.toLowerCase()) return;
        }
        // Search filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!recipe.name.toLowerCase().includes(q)) return;
        }
        result.push({ category, index, recipe });
      });
    });
    return result.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
  }, [recipes, selectedCategory, selectedSubcategory, searchQuery]);

  // Count recipes missing costs (any ingredient without master price)
  const missingCostsCount = useMemo(() => {
    let count = 0;
    Object.values(recipes).forEach(items => {
      items.forEach(recipe => {
        const hasMissingCost = recipe.ingredients?.some(ing => {
          if (!ing.name || ing.name.length < 3) return false;
          const master = findExactMatch(ing.name);
          return !master || !master.cost;
        });
        if (hasMissingCost) count++;
      });
    });
    return count;
  }, [recipes, findExactMatch]);

  // Open modal for new recipe
  const openNewRecipeModal = () => {
    setModalRecipe({
      name: '',
      category: 'protein',
      subcategory: '',
      instructions: '',
      ingredients: [{ ingredient_id: null, name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }]
    });
    setModalMode('new');
    setIsModalOpen(true);
  };

  // Open modal for editing existing recipe
  const openEditRecipeModal = (category, index, recipe) => {
    // Backfill ingredient_id from master list if missing
    const ingredientsWithIds = (recipe.ingredients || []).map(ing => {
      let ingredientId = ing.ingredient_id || null;
      if (!ingredientId && ing.name) {
        const master = findExactMatch(ing.name);
        if (master?.id) ingredientId = master.id;
      }
      return {
        ingredient_id: ingredientId,
        name: ing.name || '',
        quantity: ing.quantity || '',
        unit: ing.unit || 'oz',
        cost: ing.cost || '',
        source: ing.source || '',
        section: ing.section || 'Other'
      };
    });

    setModalRecipe({
      id: recipe.id,
      name: recipe.name,
      category: category,
      subcategory: recipe.subcategory || '',
      instructions: recipe.instructions || '',
      ingredients: ingredientsWithIds.length > 0 ? ingredientsWithIds : [{ ingredient_id: null, name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }]
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Update modal recipe field
  const updateModalRecipe = (field, value) => {
    setModalRecipe(prev => ({ ...prev, [field]: value }));
  };

  // Update modal ingredient
  const updateModalIngredient = (index, field, value) => {
    const updated = [...modalRecipe.ingredients];
    updated[index][field] = value;

    // Auto-fill from master when name changes
    if (field === 'name' && value.length > 2) {
      const master = findExactMatch(value);
      if (master) {
        updated[index] = {
          ...updated[index],
          ingredient_id: master.id,
          cost: master.cost || updated[index].cost,
          source: master.source || updated[index].source,
          section: master.section || updated[index].section,
          unit: master.unit || updated[index].unit
        };
      } else {
        updated[index].ingredient_id = null;
      }
    }

    setModalRecipe(prev => ({ ...prev, ingredients: updated }));
  };

  // Add ingredient to modal
  const addModalIngredient = () => {
    setModalRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: null, name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }]
    }));
  };

  // Remove ingredient from modal
  const removeModalIngredient = (index) => {
    setModalRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  // Save modal recipe
  const saveModalRecipe = async () => {
    if (!modalRecipe.name.trim()) {
      alert('Recipe name is required');
      return;
    }

    // Build recipe data with category included
    const recipeToSave = {
      id: modalRecipe.id,
      name: modalRecipe.name.trim(),
      category: modalRecipe.category,
      subcategory: modalRecipe.subcategory || null,
      instructions: modalRecipe.instructions || '',
      ingredients: modalRecipe.ingredients.filter(ing => ing.name.trim())
    };

    // Pass recipe data directly to saveRecipe (avoids state timing issues)
    await saveRecipe(recipeToSave);
    setIsModalOpen(false);
    setModalRecipe(null);
    // Refresh selected recipe if we were editing it
    if (selectedRecipe && selectedRecipe.recipe.id === recipeToSave.id) {
      setSelectedRecipe(null);
    }
  };

  // Handle row click to select recipe
  const handleRowClick = (item) => {
    if (selectedRecipe?.recipe.id === item.recipe.id) {
      setSelectedRecipe(null); // Deselect if clicking same row
    } else {
      setSelectedRecipe(item);
    }
  };

  // Handle copy recipe
  const handleCopyRecipe = (e, category, index) => {
    e.stopPropagation();
    if (duplicateRecipe) {
      duplicateRecipe(category, index);
    }
  };

  // Handle delete recipe
  const handleDeleteRecipe = (category, index) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      deleteRecipe(category, index);
      if (selectedRecipe?.category === category && selectedRecipe?.index === index) {
        setSelectedRecipe(null);
      }
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: 0 };
    RECIPE_CATEGORIES.forEach(cat => { counts[cat] = 0; });
    Object.entries(recipes).forEach(([category, items]) => {
      counts[category] = items.length;
      counts.all += items.length;
    });
    return counts;
  }, [recipes]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Recipes</h2>
            {missingCostsCount > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                <AlertTriangle size={14} />
                {missingCostsCount} missing costs
              </span>
            )}
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
              style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
            >
              <Download size={18} />Export
            </button>
            <button
              onClick={openNewRecipeModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#3d59ab' }}
            >
              + New Recipe
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedSubcategory(null); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'text-white'
                : 'border-2 bg-white'
            }`}
            style={selectedCategory === 'all'
              ? { backgroundColor: '#3d59ab' }
              : { borderColor: '#3d59ab', color: '#3d59ab' }}
          >
            All ({categoryCounts.all})
          </button>
          {RECIPE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setSelectedSubcategory(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                selectedCategory === cat
                  ? 'text-white'
                  : 'border-2 bg-white'
              }`}
              style={selectedCategory === cat
                ? { backgroundColor: '#3d59ab' }
                : { borderColor: '#3d59ab', color: '#3d59ab' }}
            >
              {cat} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>

        {/* Subcategory Pills */}
        {SUBCATEGORIES[selectedCategory] && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubcategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !selectedSubcategory
                  ? 'bg-gray-700 text-white'
                  : 'border border-dashed border-gray-400 text-gray-600 bg-white'
              }`}
            >
              All {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </button>
            {SUBCATEGORIES[selectedCategory].map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedSubcategory === sub
                    ? 'bg-gray-700 text-white'
                    : 'border border-dashed border-gray-400 text-gray-600 bg-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area: Table + Detail Panel */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Recipe Table */}
        <div className={`bg-white rounded-lg shadow-lg flex flex-col min-h-0 transition-all ${selectedRecipe ? 'flex-1' : 'w-full'}`}>
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-32">Subcategory</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-28">Cost/portion</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((item, i) => {
                  const cost = getRecipeCost(item.recipe);
                  const isSelected = selectedRecipe?.recipe.id === item.recipe.id;
                  return (
                    <tr
                      key={item.recipe.id || `${item.category}-${item.index}`}
                      onClick={() => handleRowClick(item)}
                      className={`border-b cursor-pointer group transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      style={{ height: '40px' }}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <ChevronRight size={14} className={`text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                          <span className="font-medium text-gray-900">{item.recipe.name}</span>
                          {selectedCategory === 'all' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600" onClick={(e) => e.stopPropagation()}>
                        {SUBCATEGORIES[item.category] ? (
                          <select
                            value={item.recipe.subcategory || ''}
                            onChange={(e) => updateSubcategory(item.category, item.index, item.recipe, e.target.value)}
                            className="w-full bg-transparent border-0 text-sm text-gray-600 cursor-pointer hover:text-gray-900 focus:ring-1 focus:ring-blue-300 rounded py-0.5 -my-0.5"
                          >
                            <option value="">—</option>
                            {SUBCATEGORIES[item.category].map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {cost > 0 ? (
                          <span className="text-sm font-medium text-green-700">${cost.toFixed(2)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditRecipeModal(item.category, item.index, item.recipe); }}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleCopyRecipe(e, item.category, item.index)}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                            title="Copy"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecipes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No recipes found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedRecipe && (
          <div className="w-[290px] bg-white rounded-lg shadow-lg flex flex-col min-h-0">
            <div className="p-4 border-b flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-900 truncate">{selectedRecipe.recipe.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: '#ebb582', color: '#423d3c' }}>
                    {selectedRecipe.category}
                  </span>
                  {selectedRecipe.recipe.subcategory && (
                    <span className="text-xs text-gray-500">{selectedRecipe.recipe.subcategory}</span>
                  )}
                </div>
                {getRecipeCost(selectedRecipe.recipe) > 0 && (
                  <p className="text-lg font-semibold text-green-700 mt-2">
                    ${getRecipeCost(selectedRecipe.recipe).toFixed(2)}/portion
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {/* Ingredients */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Ingredients</h4>
                {selectedRecipe.recipe.ingredients?.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedRecipe.recipe.ingredients.map((ing, i) => {
                      const master = findExactMatch(ing.name);
                      const hasMasterPrice = master?.cost;
                      return (
                        <li key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-100">
                          <span className={`${!hasMasterPrice && ing.name.length > 2 ? 'text-red-600' : 'text-gray-700'}`}>
                            {ing.name}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {ing.quantity} {ing.unit}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No ingredients</p>
                )}
              </div>

              {/* Instructions */}
              {selectedRecipe.recipe.instructions && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedRecipe.recipe.instructions}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => openEditRecipeModal(selectedRecipe.category, selectedRecipe.index, selectedRecipe.recipe)}
                className="w-full py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#3d59ab' }}
              >
                Edit Recipe
              </button>
              <button
                onClick={() => handleDeleteRecipe(selectedRecipe.category, selectedRecipe.index)}
                className="w-full py-2 mt-2 rounded-lg border-2 border-red-300 text-red-600 font-medium hover:bg-red-50"
              >
                Delete Recipe
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recipe Editor Modal */}
      {isModalOpen && modalRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
                {modalMode === 'new' ? 'New Recipe' : 'Edit Recipe'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setModalRecipe(null); }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {/* Recipe Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
                <input
                  type="text"
                  value={modalRecipe.name}
                  onChange={(e) => updateModalRecipe('name', e.target.value)}
                  placeholder="Enter recipe name"
                  className="w-full p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={modalRecipe.category}
                    onChange={(e) => updateModalRecipe('category', e.target.value)}
                    className="w-full p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  >
                    {RECIPE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <select
                    value={modalRecipe.subcategory || ''}
                    onChange={(e) => updateModalRecipe('subcategory', e.target.value)}
                    className="w-full p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                    disabled={!SUBCATEGORIES[modalRecipe.category]}
                  >
                    <option value="">None</option>
                    {SUBCATEGORIES[modalRecipe.category]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  value={modalRecipe.instructions}
                  onChange={(e) => updateModalRecipe('instructions', e.target.value)}
                  placeholder="Cooking instructions..."
                  className="w-full p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                  rows={3}
                />
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
                <div className="space-y-2">
                  {modalRecipe.ingredients.map((ing, index) => {
                    const master = ing.name.length > 2 ? findExactMatch(ing.name) : null;
                    const hasValidId = ing.ingredient_id && typeof ing.ingredient_id === 'string' && ing.ingredient_id.includes('-');
                    const isInMaster = hasValidId || master;
                    const showWarning = ing.name.length > 2 && !isInMaster;

                    return (
                      <div key={index}>
                        <div className={`flex flex-wrap gap-2 p-2 rounded ${showWarning ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <input
                            type="text"
                            value={ing.name}
                            onChange={(e) => updateModalIngredient(index, 'name', e.target.value)}
                            placeholder="Ingredient"
                            className="flex-1 min-w-[150px] p-2 border rounded"
                            list={`modal-ing-${index}`}
                          />
                          <datalist id={`modal-ing-${index}`}>
                            {masterIngredients.map((mi, i) => <option key={i} value={mi.name} />)}
                          </datalist>
                          <input
                            type="text"
                            value={ing.quantity}
                            onChange={(e) => updateModalIngredient(index, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className="w-16 p-2 border rounded"
                          />
                          <select
                            value={ing.unit || 'oz'}
                            onChange={(e) => updateModalIngredient(index, 'unit', e.target.value)}
                            className="w-20 p-2 border rounded"
                          >
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          {modalRecipe.ingredients.length > 1 && (
                            <button
                              onClick={() => removeModalIngredient(index)}
                              className="p-2 text-red-500 hover:bg-red-100 rounded"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                        {/* Master price info */}
                        {master && (
                          <p className="text-xs text-gray-500 mt-1 ml-2">
                            Master price: ${master.cost || '?'}/{master.unit}
                          </p>
                        )}
                        {showWarning && (
                          <p className="text-xs text-red-600 mt-1 ml-2 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            No master price found
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={addModalIngredient}
                  className="mt-2 px-3 py-1 text-sm rounded"
                  style={{ backgroundColor: '#ebb582' }}
                >
                  + Add Ingredient
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setIsModalOpen(false); setModalRecipe(null); }}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveModalRecipe}
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#3d59ab' }}
              >
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
