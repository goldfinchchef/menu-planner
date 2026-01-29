import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Settings } from 'lucide-react';
import Papa from 'papaparse';
import Tabs from './components/Tabs';
import WorkflowStatus from './components/WorkflowStatus';
import WeekSelector from './components/WeekSelector';
import SyncStatus from './components/SyncStatus';
import { useAppData } from './hooks/useAppData';
// Direct imports to avoid barrel export initialization issues
import RecipesTab from './tabs/RecipesTab';
import KDSTab from './tabs/KDSTab';
import PrepTab from './tabs/PrepTab';
import DeliveriesTab from './tabs/DeliveriesTab';
import { getWeekId, getWeekIdFromDate } from './utils/weekUtils';
import {
  categorizeIngredient,
  exportClientsCSV,
  exportIngredientsCSV,
  exportRecipesCSV,
  parseClientsCSV,
  parseIngredientsCSV,
  parseRecipesCSV,
  downloadCSV
} from './utils';
import { DEFAULT_NEW_CLIENT, DEFAULT_NEW_RECIPE, DEFAULT_NEW_MENU_ITEM, DEFAULT_NEW_INGREDIENT } from './constants';

export default function App() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kds');
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
    duplicateWarnings, setDuplicateWarnings,
    completedDishes, setCompletedDishes,
    orderHistory, setOrderHistory,
    weeklyTasks, setWeeklyTasks,
    drivers, setDrivers,
    newDriver, setNewDriver,
    deliveryLog, setDeliveryLog,
    bagReminders, setBagReminders,
    readyForDelivery, setReadyForDelivery,
    clientPortalData, setClientPortalData,
    weeks, setWeeks,
    selectedWeekId, setSelectedWeekId,
    findSimilarIngredients,
    findExactMatch,
    addToMasterIngredients,
    updateMasterIngredientCost,
    syncRecipeIngredientsFromMaster,
    getUniqueVendors,
    mergeIngredients,
    scanForDuplicates,
    getRecipeCost,
    getRecipeCounts,
    getOrCreateWeek,
    getCurrentWeek,
    lockWeekAndSnapshot,
    unlockWeekById,
    updateWeekData,
    updateWeekKdsStatus,
    addReadyForDeliveryToWeek,
    addDeliveryLogToWeek,
    removeReadyForDeliveryFromWeek,
    isWeekReadOnly,
    getWeekIds,
    units, addUnit,
    // Sync state
    isOnline,
    isSyncing,
    lastSyncedAt,
    syncError,
    dataSource,
    isReadOnly,
    forceSync
  } = useAppData();

  const clientsFileRef = useRef();
  const recipesFileRef = useRef();
  const ingredientsFileRef = useRef();

  // Sync menuDate when selectedWeekId changes
  useEffect(() => {
    if (selectedWeekId) {
      // Set menuDate to the Monday of the selected week
      setMenuDate(selectedWeekId);
    }
  }, [selectedWeekId, setMenuDate]);

  // CSV Import handlers
  const importClientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      parseClientsCSV(
        file,
        (imported) => {
          console.log('Parsed clients:', imported);
          if (imported.length === 0) {
            alert('No subscriptions found in CSV. Please check the file format.\n\nExpected columns: Name, Display Name, Address, Email, Phone, Portions, Meals, etc.');
            return;
          }
          const totalContacts = imported.reduce((sum, sub) => sum + (sub.contacts?.length || 0), 0);
          setClients(imported);
          alert(`Import successful!\n\n${imported.length} subscription(s) imported\n${totalContacts} contact(s) total`);
        },
        (err) => {
          console.error('CSV parse error:', err);
          alert('Error parsing CSV: ' + (err.message || err));
        }
      );
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing CSV: ' + err.message);
    }
    e.target.value = '';
  };

  const importIngredientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parseIngredientsCSV(
      file,
      (imported) => {
        if (imported.length === 0) {
          alert('No ingredients found in CSV. Please check the file format.');
          return;
        }
        setMasterIngredients(imported);
        alert(`Import successful!\n\n${imported.length} ingredient(s) imported`);
      },
      (err) => alert('Error parsing CSV: ' + err.message)
    );
    e.target.value = '';
  };

  const importRecipesCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parseRecipesCSV(
      file,
      (newRecipes, ingredientsToAdd) => {
        const recipeCount = Object.values(newRecipes).flat().length;
        if (recipeCount === 0) {
          alert('No recipes found in CSV. Please check the file format.');
          return;
        }
        setRecipes(newRecipes);
        ingredientsToAdd.forEach(ing => addToMasterIngredients(ing));
        alert(`Import successful!\n\n${recipeCount} recipe(s) imported\n${ingredientsToAdd.length} ingredient(s) added to master list`);
      },
      (err) => alert('Error parsing CSV: ' + err.message)
    );
    e.target.value = '';
  };

  // Recipe functions
  const saveRecipe = () => {
    if (!newRecipe.name) { alert('Please enter a recipe name'); return; }
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity);
    if (validIngredients.length === 0) { alert('Please add at least one ingredient with name and quantity'); return; }
    validIngredients.forEach(ing => addToMasterIngredients(ing));
    setRecipes({ ...recipes, [newRecipe.category]: [...recipes[newRecipe.category], { name: newRecipe.name, instructions: newRecipe.instructions, ingredients: validIngredients }] });
    setNewRecipe(DEFAULT_NEW_RECIPE);
    alert('Recipe saved!');
  };

  const deleteRecipe = (category, index) => {
    if (window.confirm('Delete this recipe?')) {
      setRecipes({ ...recipes, [category]: recipes[category].filter((_, i) => i !== index) });
    }
  };

  const duplicateRecipe = (category, index) => {
    const recipe = recipes[category][index];
    const duplicated = {
      ...recipe,
      name: `${recipe.name} (Copy)`,
      ingredients: recipe.ingredients.map(ing => ({ ...ing })) // Deep copy ingredients
    };
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

  const saveEditingRecipe = () => {
    const { category, index, recipe } = editingRecipe;
    const validIngredients = recipe.ingredients.filter(ing => ing.name && ing.quantity);
    validIngredients.forEach(ing => addToMasterIngredients(ing));
    const updatedRecipes = { ...recipes };
    updatedRecipes[category][index] = { ...recipe, ingredients: validIngredients };
    setRecipes(updatedRecipes);
    setEditingRecipe(null);
    alert('Recipe updated!');
  };

  // Menu functions
  const addMenuItem = () => {
    if (!newMenuItem.protein && !newMenuItem.veg && !newMenuItem.starch && newMenuItem.extras.length === 0) {
      alert('Please select at least one dish');
      return;
    }
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }
    const newItems = selectedClients.map(clientName => {
      const client = clients.find(c => c.name === clientName);
      const clientPortions = client ? (client.portions || client.persons || 1) : 1;
      return { ...newMenuItem, clientName, date: menuDate, portions: clientPortions, id: Date.now() + Math.random(), approved: false };
    });
    setMenuItems(prev => [...prev, ...newItems]);
    setNewMenuItem(DEFAULT_NEW_MENU_ITEM);
  };

  const deleteMenuItem = (id) => setMenuItems(menuItems.filter(item => item.id !== id));

  const clearMenu = () => {
    if (window.confirm('Clear all menu items?')) {
      setMenuItems([]);
      setSelectedClients([]);
      setCompletedDishes({});
    }
  };

  const getOrdersByClient = () => {
    const grouped = {};
    menuItems.forEach(item => {
      if (!grouped[item.clientName]) grouped[item.clientName] = [];
      grouped[item.clientName].push(item);
    });
    return grouped;
  };

  // KDS functions - only show approved menus for selected week
  const getApprovedMenuItems = () => {
    return menuItems.filter(item => item.approved);
  };

  // Week-related helpers (moved here to be available for KDS functions)
  const currentWeek = weeks[selectedWeekId] || null;

  // Get data for selected week (from week record if locked, otherwise from global state)
  const getWeekMenuItems = () => {
    if (currentWeek?.status === 'locked' && currentWeek.snapshot?.menu) {
      // Reconstruct menu items from snapshot
      const items = [];
      Object.entries(currentWeek.snapshot.menu).forEach(([clientName, clientItems]) => {
        clientItems.forEach(item => {
          items.push({ ...item, clientName, approved: true });
        });
      });
      return items;
    }
    // Filter global menuItems to selected week
    return menuItems.filter(item => getWeekIdFromDate(item.date) === selectedWeekId);
  };

  // Get approved menu items filtered to selected week
  const getWeekApprovedMenuItems = () => {
    const weekItems = getWeekMenuItems();
    const approved = weekItems.filter(item => item.approved);
    console.log('[KDS Debug] selectedWeekId:', selectedWeekId);
    console.log('[KDS Debug] Total menuItems:', menuItems.length);
    console.log('[KDS Debug] Week menuItems:', weekItems.length);
    console.log('[KDS Debug] Approved items:', approved.length, approved);
    return approved;
  };

  // Get production day from delivery date (Thursday = Thursday production, else Mon/Tue production)
  const getProductionDay = (dateStr) => {
    if (!dateStr) return 'monTue';
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = date.getDay();
    // Thursday = 4
    return dayOfWeek === 4 ? 'thursday' : 'monTue';
  };

  const getKDSView = () => {
    // Returns { monTue: { protein: {...}, veg: {...}, ... }, thursday: { protein: {...}, ... } }
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

  const toggleDishComplete = (dishName) => {
    setCompletedDishes(prev => ({ ...prev, [dishName]: !prev[dishName] }));
  };

  const allDishesComplete = () => {
    const kds = getKDSView();
    const allDishNames = [];

    // Collect all dish names from both production days
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
    if (!window.confirm('Mark all orders complete and move to Ready for Delivery?')) return;
    const ordersByClient = getOrdersByClient();
    const newReadyEntries = [];

    Object.entries(ordersByClient).forEach(([clientName, orders]) => {
      orders.forEach(order => {
        const dishes = [order.protein, order.veg, order.starch, ...(order.extras || [])].filter(Boolean);
        let totalCost = 0;
        dishes.forEach(dishName => {
          const category = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'].find(cat => recipes[cat]?.find(r => r.name === dishName));
          const recipe = category ? recipes[category].find(r => r.name === dishName) : null;
          if (recipe) totalCost += getRecipeCost(recipe) * order.portions;
        });
        newReadyEntries.push({
          id: Date.now() + Math.random(),
          clientName,
          date: order.date || menuDate,
          dishes,
          portions: order.portions,
          cost: totalCost
        });
      });
    });

    // Group entries by week and add to respective weeks
    const entriesByWeek = {};
    newReadyEntries.forEach(entry => {
      const weekId = getWeekIdFromDate(entry.date);
      if (!entriesByWeek[weekId]) entriesByWeek[weekId] = [];
      entriesByWeek[weekId].push(entry);
    });

    // Add to week records
    Object.entries(entriesByWeek).forEach(([weekId, entries]) => {
      addReadyForDeliveryToWeek(weekId, entries);
    });

    // Also keep in global state for backwards compatibility
    setReadyForDelivery(prev => [...prev, ...newReadyEntries]);
    setMenuItems([]);
    setCompletedDishes({});
    setSelectedClients([]);
    alert('Orders ready for delivery!');
  };

  // Shopping list - grouped by shopping day based on client delivery days
  // Monday deliveries → Sunday shopping list
  // Tuesday deliveries → Tuesday shopping list
  // Thursday deliveries → Thursday shopping list
  const getShoppingListsByDay = () => {
    const shoppingLists = {
      Sunday: {},    // For Monday deliveries
      Tuesday: {},   // For Tuesday deliveries
      Thursday: {}   // For Thursday deliveries
    };

    const approvedItems = getWeekApprovedMenuItems();

    // Helper to normalize ingredient names for consolidation
    const normalizeIngredientName = (name) => {
      return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
    };

    approvedItems.forEach(item => {
      // Find the client to get their delivery day
      const client = clients.find(c => c.name === item.clientName || c.displayName === item.clientName);
      const deliveryDay = client?.deliveryDay || '';

      // Determine shopping day based on delivery day
      let shopDay = 'Sunday'; // Default for Monday
      if (deliveryDay === 'Tuesday') {
        shopDay = 'Tuesday';
      } else if (deliveryDay === 'Thursday') {
        shopDay = 'Thursday';
      }

      // Get all dishes from this menu item
      const dishes = [item.protein, item.veg, item.starch, ...(item.extras || [])].filter(Boolean);

      dishes.forEach(dishName => {
        // Find the recipe
        const category = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'].find(
          cat => recipes[cat]?.find(r => r.name === dishName)
        );
        const recipe = category ? recipes[category].find(r => r.name === dishName) : null;

        if (recipe?.ingredients) {
          recipe.ingredients.forEach(ing => {
            const masterIng = findExactMatch(ing.name);
            // Normalize name and unit for proper consolidation
            const normalizedName = normalizeIngredientName(ing.name);
            const unit = (ing.unit || 'oz').toLowerCase().trim();
            const key = `${normalizedName}|${unit}`;

            if (!shoppingLists[shopDay][key]) {
              shoppingLists[shopDay][key] = {
                name: ing.name.trim(), // Keep original display name (first occurrence)
                quantity: 0,
                unit: unit,
                section: ing.section || masterIng?.section || categorizeIngredient(ing.name),
                cost: masterIng?.cost || ing.cost || '',
                source: masterIng?.source || ing.source || '',
                recipes: [] // Track which recipes use this ingredient
              };
            }
            // Sum quantities (multiplied by portions)
            shoppingLists[shopDay][key].quantity += parseFloat(ing.quantity || 0) * (item.portions || 1);
            // Track which recipes use this ingredient
            if (!shoppingLists[shopDay][key].recipes.includes(dishName)) {
              shoppingLists[shopDay][key].recipes.push(dishName);
            }
          });
        }
      });
    });

    // Convert to sorted arrays
    const sortIngredients = (ingredients) => {
      return Object.values(ingredients).sort((a, b) => {
        const sourceCompare = (a.source || 'ZZZ').localeCompare(b.source || 'ZZZ');
        if (sourceCompare !== 0) return sourceCompare;
        const sectionCompare = (a.section || 'ZZZ').localeCompare(b.section || 'ZZZ');
        if (sectionCompare !== 0) return sectionCompare;
        return a.name.localeCompare(b.name);
      });
    };

    return {
      Sunday: sortIngredients(shoppingLists.Sunday),
      Tuesday: sortIngredients(shoppingLists.Tuesday),
      Thursday: sortIngredients(shoppingLists.Thursday)
    };
  };

  // Legacy prep list (all items combined) - kept for backwards compatibility
  const getPrepList = () => {
    const lists = getShoppingListsByDay();
    return [...lists.Sunday, ...lists.Tuesday, ...lists.Thursday];
  };

  const exportPrepList = () => {
    const prepList = getPrepList();
    downloadCSV(Papa.unparse(prepList.map(item => ({
      Source: item.source,
      Section: item.section,
      Ingredient: item.name,
      Quantity: item.quantity.toFixed(2),
      Unit: item.unit
    })), { columns: ['Source', 'Section', 'Ingredient', 'Quantity', 'Unit'] }), 'shopping-list.csv');
  };

  // History
  const getHistoryByClient = () => {
    const grouped = {};
    orderHistory.forEach(order => {
      if (!grouped[order.clientName]) grouped[order.clientName] = [];
      grouped[order.clientName].push(order);
    });
    Object.keys(grouped).forEach(client => {
      grouped[client].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return grouped;
  };

  // Client functions
  const addClient = () => {
    if (!newClient.name) { alert('Please enter a client name'); return; }
    setClients([...clients, { ...newClient }]);
    setNewClient(DEFAULT_NEW_CLIENT);
    alert('Client added!');
  };

  const deleteClient = (index) => {
    if (window.confirm('Delete this client?')) {
      setClients(clients.filter((_, i) => i !== index));
    }
  };

  // Ingredient functions
  const addMasterIngredient = () => {
    if (!newIngredient.name) { alert('Please enter an ingredient name'); return; }
    const similar = findSimilarIngredients(newIngredient.name);
    const exact = findExactMatch(newIngredient.name);
    if (exact) { alert(`"${newIngredient.name}" already exists as "${exact.name}"`); return; }
    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${newIngredient.name}" anyway?`)) return;
    setMasterIngredients([...masterIngredients, { ...newIngredient, id: Date.now() }]);
    setNewIngredient(DEFAULT_NEW_INGREDIENT);
    alert('Ingredient added!');
  };

  const deleteMasterIngredient = (id) => {
    if (window.confirm('Delete this ingredient?')) {
      setMasterIngredients(masterIngredients.filter(ing => ing.id !== id));
    }
  };

  const startEditingMasterIngredient = (ing) => {
    setEditingIngredientId(ing.id);
    setEditingIngredientData({ ...ing });
  };

  const saveEditingMasterIngredient = () => {
    setMasterIngredients(prev => prev.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData } : ing));
    setEditingIngredientId(null);
    setEditingIngredientData(null);
  };

  const cancelEditingMasterIngredient = () => {
    setEditingIngredientId(null);
    setEditingIngredientData(null);
  };

  const prepList = getPrepList();

  // Additional week-related helpers
  const isCurrentWeekReadOnly = isWeekReadOnly(selectedWeekId);

  // Save driver routes to main storage (so driver portal can access them)
  const saveDriverRoutes = (routes) => {
    const savedData = localStorage.getItem('goldfinchChefData');
    let existing = {};
    if (savedData) {
      try {
        existing = JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing saved data:', e);
      }
    }
    const merged = {
      ...existing,
      savedRoutes: routes,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('goldfinchChefData', JSON.stringify(merged));
  };

  const getWeekReadyForDelivery = () => {
    if (currentWeek?.readyForDelivery?.length > 0) {
      return currentWeek.readyForDelivery;
    }
    // Filter global readyForDelivery to selected week
    return readyForDelivery.filter(order => getWeekIdFromDate(order.date) === selectedWeekId);
  };

  const getWeekDeliveryLog = () => {
    if (currentWeek?.deliveryLog?.length > 0) {
      return currentWeek.deliveryLog;
    }
    // Filter global deliveryLog to selected week
    return deliveryLog.filter(entry => getWeekIdFromDate(entry.date) === selectedWeekId);
  };

  const getWeekKdsStatus = () => {
    return currentWeek?.kdsStatus || {};
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      <input type="file" ref={clientsFileRef} onChange={importClientsCSV} accept=".csv" className="hidden" />
      <input type="file" ref={recipesFileRef} onChange={importRecipesCSV} accept=".csv" className="hidden" />
      <input type="file" ref={ingredientsFileRef} onChange={importIngredientsCSV} accept=".csv" className="hidden" />

      <header className="text-white p-4" style={{ backgroundColor: '#3d59ab' }}>
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <ChefHat size={32} style={{ color: '#ffd700' }} />
            <h1 className="text-2xl font-bold">Goldfinch Chef</h1>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus
              isOnline={isOnline}
              isSyncing={isSyncing}
              lastSyncedAt={lastSyncedAt}
              syncError={syncError}
              dataSource={dataSource}
              isReadOnly={isReadOnly}
              onForceSync={forceSync}
            />
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Settings size={20} />
              Admin
            </Link>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {['kds', 'deliveries'].includes(activeTab) && (
          <WeekSelector
            selectedWeekId={selectedWeekId}
            setSelectedWeekId={setSelectedWeekId}
            weeks={weeks}
            onLockWeek={lockWeekAndSnapshot}
            onUnlockWeek={unlockWeekById}
          />
        )}

        {['kds', 'deliveries'].includes(activeTab) && (
          <WorkflowStatus
            menuItems={getWeekMenuItems()}
            completedDishes={getWeekKdsStatus()}
            readyForDelivery={getWeekReadyForDelivery()}
            deliveryLog={getWeekDeliveryLog()}
            orderHistory={orderHistory}
            selectedDate={menuDate}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'recipes' && (
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
        )}

        {activeTab === 'kds' && (
          <KDSTab
            menuItems={getApprovedMenuItems()}
            recipes={recipes}
            completedDishes={completedDishes}
            toggleDishComplete={toggleDishComplete}
            allDishesComplete={allDishesComplete}
            completeAllOrders={completeAllOrders}
            getKDSView={getKDSView}
            selectedWeekId={selectedWeekId}
            currentWeek={currentWeek}
          />
        )}

        {activeTab === 'prep' && (
          <PrepTab
            prepList={prepList}
            shoppingListsByDay={getShoppingListsByDay()}
            exportPrepList={exportPrepList}
          />
        )}

        {activeTab === 'deliveries' && (
          <DeliveriesTab
            clients={clients}
            drivers={drivers}
            setDrivers={setDrivers}
            newDriver={newDriver}
            setNewDriver={setNewDriver}
            deliveryLog={getWeekDeliveryLog()}
            setDeliveryLog={setDeliveryLog}
            bagReminders={bagReminders}
            setBagReminders={setBagReminders}
            readyForDelivery={getWeekReadyForDelivery()}
            setReadyForDelivery={setReadyForDelivery}
            orderHistory={orderHistory}
            setOrderHistory={setOrderHistory}
            selectedWeekId={selectedWeekId}
            weeks={weeks}
            addDeliveryLogToWeek={addDeliveryLogToWeek}
            removeReadyForDeliveryFromWeek={removeReadyForDeliveryFromWeek}
            isReadOnly={isCurrentWeekReadOnly}
            menuItems={getWeekMenuItems()}
            clientPortalData={clientPortalData}
            saveDriverRoutes={saveDriverRoutes}
          />
        )}

      </div>
    </div>
  );
}
