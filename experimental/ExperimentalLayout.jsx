/**
 * ExperimentalLayout.jsx
 *
 * Layout shell for experimental route-based navigation.
 * Single owner of useAppData state, provides context to child pages via Outlet.
 */

import React, { useState, useRef } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ChefHat, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

// Production data hook
import { useAppData } from '../hooks/useAppData';

// Experimental navigation components
import TopNav from './TopNav';
import SubNav from './SubNav';
import ExperimentalContext from './ExperimentalContext';

// Production utilities
import { getWeekId, getWeekIdFromDate, formatWeekRange, getAdjacentWeekId } from '../utils/weekUtils';
import { DEFAULT_NEW_RECIPE, DEFAULT_NEW_INGREDIENT } from '../constants';
import { exportRecipesCSV, categorizeIngredient } from '../utils';
import { isSupabaseMode } from '../lib/dataMode';
import { saveRecipeToSupabase, deleteRecipeFromSupabase, setKdsDishDone } from '../lib/database';
import { isConfigured, checkConnection } from '../lib/supabase';

export default function ExperimentalLayout() {
  // Production data hook - single source of truth
  const appData = useAppData();
  const {
    recipes, setRecipes,
    menuItems, setMenuItems,
    selectedClients, setSelectedClients,
    menuDate, setMenuDate,
    clients, setClients,
    newClient, setNewClient,
    newRecipe, setNewRecipe,
    newMenuItem, setNewMenuItem,
    masterIngredients, setMasterIngredients,
    newIngredient, setNewIngredient,
    editingRecipe, setEditingRecipe,
    editingIngredientId, setEditingIngredientId,
    editingIngredientData, setEditingIngredientData,
    completedDishes, setCompletedDishes,
    orderHistory,
    weeks,
    selectedWeekId, setSelectedWeekId,
    findSimilarIngredients,
    findExactMatch,
    addToMasterIngredients,
    updateMasterIngredientCost,
    syncRecipeIngredientsFromMaster,
    getUniqueVendors,
    getRecipeCost,
    getRecipeCounts,
    units, addUnit
  } = appData;

  // Local state for experimental TimelineView (delivery schedule)
  const [deliverySchedule, setDeliverySchedule] = useState({});

  // KDS state
  const [kdsLoading, setKdsLoading] = useState(false);
  const [kdsLastRefresh, setKdsLastRefresh] = useState(null);
  const [lastMenusApprovedAt, setLastMenusApprovedAt] = useState(null);
  const [unapprovedMenuCount, setUnapprovedMenuCount] = useState(0);
  const [unapprovedByClient, setUnapprovedByClient] = useState({});

  // File refs for CSV imports
  const clientsFileRef = useRef();
  const recipesFileRef = useRef();
  const ingredientsFileRef = useRef();

  // Current week reference
  const currentWeek = weeks[selectedWeekId] || null;

  // Week-filtered menu items
  const getWeekMenuItems = () => {
    if (currentWeek?.status === 'locked' && currentWeek.snapshot?.menu) {
      const items = [];
      Object.entries(currentWeek.snapshot.menu).forEach(([clientName, clientItems]) => {
        clientItems.forEach(item => {
          items.push({ ...item, clientName, approved: true });
        });
      });
      return items;
    }
    return menuItems.filter(item => getWeekIdFromDate(item.date) === selectedWeekId);
  };

  const getWeekApprovedMenuItems = () => {
    return getWeekMenuItems().filter(item => item.approved);
  };

  // Production day from delivery date
  const getProductionDay = (dateStr) => {
    if (!dateStr) return 'monTue';
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 4 ? 'thursday' : 'monTue';
  };

  // KDS view for Dish Totals
  const getKDSView = () => {
    const kds = {
      monTue: { protein: {}, veg: {}, starch: {}, extras: {} },
      thursday: { protein: {}, veg: {}, starch: {}, extras: {} }
    };

    const approvedItems = getWeekApprovedMenuItems();

    approvedItems.forEach(item => {
      const productionDay = getProductionDay(item.date);

      ['protein', 'veg', 'starch'].forEach(type => {
        if (item[type]) {
          if (!kds[productionDay][type][item[type]]) {
            kds[productionDay][type][item[type]] = { totalPortions: 0, category: type, clients: [] };
          }
          kds[productionDay][type][item[type]].totalPortions += item.portions;
          kds[productionDay][type][item[type]].clients.push({ name: item.clientName, portions: item.portions, date: item.date });
        }
      });

      if (item.extras) {
        item.extras.forEach(extra => {
          const category = recipes.sauces?.find(r => r.name === extra) ? 'sauces'
            : recipes.breakfast?.find(r => r.name === extra) ? 'breakfast' : 'soups';
          if (!kds[productionDay].extras[extra]) {
            kds[productionDay].extras[extra] = { totalPortions: 0, category, clients: [] };
          }
          kds[productionDay].extras[extra].totalPortions += item.portions;
          kds[productionDay].extras[extra].clients.push({ name: item.clientName, portions: item.portions, date: item.date });
        });
      }
    });

    return kds;
  };

  // Toggle dish completion
  const toggleDishComplete = async (dishName, recipeType = null) => {
    const newDoneState = !completedDishes[dishName];

    if (isSupabaseMode() && isConfigured()) {
      const isOnlineNow = await checkConnection();
      if (!isOnlineNow) {
        alert('Cannot mark complete: database offline');
        return;
      }

      const result = await setKdsDishDone({
        week_id: selectedWeekId,
        recipe_name: dishName,
        recipe_type: recipeType,
        done: newDoneState
      });

      if (!result.success) {
        alert(`Cannot mark complete: ${result.error}`);
        return;
      }
    }

    setCompletedDishes(prev => ({ ...prev, [dishName]: newDoneState }));
  };

  const allDishesComplete = () => {
    const kds = getKDSView();
    const allDishNames = [];
    ['monTue', 'thursday'].forEach(prodDay => {
      ['protein', 'veg', 'starch', 'extras'].forEach(category => {
        Object.keys(kds[prodDay][category]).forEach(dishName => {
          allDishNames.push(dishName);
        });
      });
    });
    return allDishNames.length > 0 && allDishNames.every(name => completedDishes[name]);
  };

  const completeAllOrders = () => {
    alert('Complete all orders - production behavior preserved');
  };

  // Shopping lists
  const getShoppingListsByDay = () => {
    const shoppingLists = { Sunday: {}, Tuesday: {}, Thursday: {} };
    const approvedItems = getWeekApprovedMenuItems();

    approvedItems.forEach(item => {
      const client = clients.find(c => c.name === item.clientName || c.displayName === item.clientName);
      const deliveryDay = client?.deliveryDay || '';
      let shopDay = 'Sunday';
      if (deliveryDay === 'Tuesday') shopDay = 'Tuesday';
      else if (deliveryDay === 'Thursday') shopDay = 'Thursday';

      const dishes = [item.protein, item.veg, item.starch, ...(item.extras || [])].filter(Boolean);

      dishes.forEach(dishName => {
        const category = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'].find(
          cat => recipes[cat]?.find(r => r.name === dishName)
        );
        const recipe = category ? recipes[category].find(r => r.name === dishName) : null;

        if (recipe?.ingredients) {
          recipe.ingredients.forEach(ing => {
            const masterIng = findExactMatch(ing.name);
            const unit = (ing.unit || 'oz').toLowerCase().trim();
            const key = `${ing.name.toLowerCase().trim()}|${unit}`;
            const portionMultiplier = item.portions || 1;
            const ingQuantity = parseFloat(ing.quantity || 0) * portionMultiplier;
            const unitCost = parseFloat(masterIng?.cost || ing.cost || 0);

            if (!shoppingLists[shopDay][key]) {
              shoppingLists[shopDay][key] = {
                name: ing.name.trim(),
                quantity: 0,
                unit: unit,
                section: ing.section || masterIng?.section || categorizeIngredient(ing.name),
                cost: 0,
                unitCost: unitCost,
                source: masterIng?.source || ing.source || '',
                recipes: []
              };
            }
            shoppingLists[shopDay][key].quantity += ingQuantity;
            shoppingLists[shopDay][key].cost += ingQuantity * unitCost;
            if (!shoppingLists[shopDay][key].recipes.includes(dishName)) {
              shoppingLists[shopDay][key].recipes.push(dishName);
            }
          });
        }
      });
    });

    const sortIngredients = (ingredients) => {
      return Object.values(ingredients).sort((a, b) => {
        const sourceCompare = (a.source || 'ZZZ').localeCompare(b.source || 'ZZZ');
        if (sourceCompare !== 0) return sourceCompare;
        return (a.section || 'ZZZ').localeCompare(b.section || 'ZZZ');
      });
    };

    return {
      Sunday: sortIngredients(shoppingLists.Sunday),
      Tuesday: sortIngredients(shoppingLists.Tuesday),
      Thursday: sortIngredients(shoppingLists.Thursday)
    };
  };

  const getPrepList = () => {
    const lists = getShoppingListsByDay();
    return [...lists.Sunday, ...lists.Tuesday, ...lists.Thursday];
  };

  const exportPrepList = () => {
    alert('Export prep list - production behavior preserved');
  };

  // Recipe functions
  const saveRecipe = async () => {
    if (!newRecipe.name) { alert('Please enter a recipe name'); return; }
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity);
    if (validIngredients.length === 0) { alert('Please add at least one ingredient'); return; }

    validIngredients.forEach(ing => addToMasterIngredients(ing));
    const recipeToSave = { name: newRecipe.name, instructions: newRecipe.instructions, ingredients: validIngredients };

    if (isSupabaseMode()) {
      const result = await saveRecipeToSupabase(recipeToSave, newRecipe.category);
      if (result.success) {
        setRecipes(result.recipes);
        setNewRecipe(DEFAULT_NEW_RECIPE);
        alert('Recipe saved!');
      } else {
        alert(`Failed to save recipe: ${result.error}`);
      }
    } else {
      setRecipes({ ...recipes, [newRecipe.category]: [...recipes[newRecipe.category], recipeToSave] });
      setNewRecipe(DEFAULT_NEW_RECIPE);
      alert('Recipe saved (local)!');
    }
  };

  const deleteRecipe = async (category, index) => {
    if (!window.confirm('Delete this recipe?')) return;
    const recipe = recipes[category][index];

    if (isSupabaseMode()) {
      const result = await deleteRecipeFromSupabase(recipe.name, category);
      if (result.success) {
        setRecipes(result.recipes);
      } else {
        alert(`Failed to delete recipe: ${result.error}`);
      }
    } else {
      setRecipes({ ...recipes, [category]: recipes[category].filter((_, i) => i !== index) });
    }
  };

  const duplicateRecipe = (category, index) => {
    const recipe = recipes[category][index];
    const duplicated = { ...recipe, name: `${recipe.name} (Copy)`, ingredients: recipe.ingredients.map(ing => ({ ...ing })) };
    setRecipes({ ...recipes, [category]: [...recipes[category], duplicated] });
  };

  const startEditingRecipe = (category, index) => {
    const recipe = recipes[category][index];
    setEditingRecipe({
      category,
      index,
      recipe: {
        ...recipe,
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.name || '',
          quantity: ing.quantity || '',
          unit: ing.unit || 'oz',
          cost: ing.cost || '',
          source: ing.source || '',
          section: ing.section || 'Other'
        }))
      }
    });
  };

  const updateEditingIngredient = (index, field, value) => {
    const updated = [...editingRecipe.recipe.ingredients];
    updated[index][field] = value;
    if (field === 'name' && value.length > 2) {
      const masterIng = findExactMatch(value);
      if (masterIng) {
        updated[index] = {
          ...updated[index],
          cost: masterIng.cost || updated[index].cost,
          source: masterIng.source || updated[index].source,
          section: masterIng.section || updated[index].section,
          unit: masterIng.unit || updated[index].unit
        };
      }
    }
    setEditingRecipe({ ...editingRecipe, recipe: { ...editingRecipe.recipe, ingredients: updated } });
  };

  const addEditingIngredient = () => {
    setEditingRecipe({
      ...editingRecipe,
      recipe: {
        ...editingRecipe.recipe,
        ingredients: [...editingRecipe.recipe.ingredients, { name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }]
      }
    });
  };

  const removeEditingIngredient = (index) => {
    setEditingRecipe({
      ...editingRecipe,
      recipe: {
        ...editingRecipe.recipe,
        ingredients: editingRecipe.recipe.ingredients.filter((_, i) => i !== index)
      }
    });
  };

  const saveEditingRecipe = async () => {
    const { category, index, recipe } = editingRecipe;
    const validIngredients = recipe.ingredients.filter(ing => ing.name && ing.quantity);
    validIngredients.forEach(ing => addToMasterIngredients(ing));
    const recipeToSave = { ...recipe, ingredients: validIngredients };

    if (isSupabaseMode()) {
      const result = await saveRecipeToSupabase(recipeToSave, category);
      if (result.success) {
        setRecipes(result.recipes);
        setEditingRecipe(null);
        alert('Recipe updated!');
      } else {
        alert(`Failed to update recipe: ${result.error}`);
      }
    } else {
      const updatedRecipes = { ...recipes };
      updatedRecipes[category][index] = recipeToSave;
      setRecipes(updatedRecipes);
      setEditingRecipe(null);
      alert('Recipe updated (local)!');
    }
  };

  // Context value with all shared state and functions
  const contextValue = {
    // Data
    recipes, setRecipes,
    menuItems, setMenuItems,
    selectedClients, setSelectedClients,
    menuDate, setMenuDate,
    clients, setClients,
    newClient, setNewClient,
    newRecipe, setNewRecipe,
    newMenuItem, setNewMenuItem,
    masterIngredients, setMasterIngredients,
    newIngredient, setNewIngredient,
    editingRecipe, setEditingRecipe,
    editingIngredientId, setEditingIngredientId,
    editingIngredientData, setEditingIngredientData,
    completedDishes, setCompletedDishes,
    orderHistory,
    weeks,
    selectedWeekId, setSelectedWeekId,
    currentWeek,

    // Experimental state
    deliverySchedule, setDeliverySchedule,

    // KDS state
    kdsLoading, kdsLastRefresh, lastMenusApprovedAt,
    unapprovedMenuCount, unapprovedByClient,

    // File refs
    clientsFileRef, recipesFileRef, ingredientsFileRef,

    // Utility functions
    findSimilarIngredients,
    findExactMatch,
    addToMasterIngredients,
    updateMasterIngredientCost,
    syncRecipeIngredientsFromMaster,
    getUniqueVendors,
    getRecipeCost,
    getRecipeCounts,
    units, addUnit,

    // Computed functions
    getWeekMenuItems,
    getWeekApprovedMenuItems,
    getKDSView,
    getShoppingListsByDay,
    getPrepList,

    // Actions
    toggleDishComplete,
    allDishesComplete,
    completeAllOrders,
    exportPrepList,
    saveRecipe,
    deleteRecipe,
    duplicateRecipe,
    startEditingRecipe,
    updateEditingIngredient,
    addEditingIngredient,
    removeEditingIngredient,
    saveEditingRecipe
  };

  return (
    <ExperimentalContext.Provider value={contextValue}>
      <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
        {/* Hidden file inputs */}
        <input type="file" ref={clientsFileRef} accept=".csv" className="hidden" />
        <input type="file" ref={recipesFileRef} accept=".csv" className="hidden" />
        <input type="file" ref={ingredientsFileRef} accept=".csv" className="hidden" />

        {/* Layer 1: Global Week Bar */}
        <div className="text-white px-4 py-1.5" style={{ backgroundColor: '#3d59ab' }}>
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            {/* Left: Logo */}
            <div className="flex items-center gap-2">
              <ChefHat size={18} style={{ color: '#ffd700' }} />
              <span className="font-bold text-sm">Goldfinch Chef</span>
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded ml-2">EXPERIMENTAL</span>
            </div>

            {/* Center: Week navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedWeekId(getAdjacentWeekId(selectedWeekId, -1))}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-medium text-sm min-w-[140px] text-center">
                {formatWeekRange(selectedWeekId)}
              </span>
              <button
                onClick={() => setSelectedWeekId(getAdjacentWeekId(selectedWeekId, 1))}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <span className="text-xs opacity-75 ml-1">
                {selectedWeekId.split('-')[1]}
              </span>
            </div>

            {/* Right: Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30"
              >
                Back to Production
              </Link>
              <Link
                to="/admin"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30"
              >
                <Settings size={14} />
                Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Layer 2: Primary Navigation */}
        <nav className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto">
            <TopNav />
          </div>
        </nav>

        {/* Secondary Navigation (subviews) */}
        <SubNav />

        {/* Content Area - renders matched route */}
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          <Outlet />
        </div>
      </div>
    </ExperimentalContext.Provider>
  );
}
