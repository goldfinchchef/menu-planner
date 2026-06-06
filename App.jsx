import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, ChevronLeft, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';
import Tabs from './components/Tabs';
import WorkflowStatus from './components/WorkflowStatus';
import SyncStatus from './components/SyncStatus';
import { useAppData } from './hooks/useAppData';
// Direct imports to avoid barrel export initialization issues
import RecipesTab from './tabs/RecipesTab';
import KDSTab from './tabs/KDSTab';
import PrepTab from './tabs/PrepTab';
import DeliveriesTab from './tabs/DeliveriesTab';
import MenuBuilderTab from './tabs/MenuBuilderTab';
import DashboardTab from './tabs/DashboardTab';
import BillingTab from './tabs/BillingTab';
import ClientsTab from './tabs/ClientsTab';
import IngredientsTab from './tabs/IngredientsTab';
import { getWeekId, getWeekIdFromDate, getAdjacentWeekId, formatWeekRange, getWeekStartDate, getWeekEndDate } from './utils/weekUtils';
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
import { fetchKdsDishStatuses, setKdsDishDone, saveRecipeToSupabase, deleteRecipeFromSupabase, getUnapprovedMenuCountForWeek, approveAllMenusForWeek, fetchMenusByWeek, updateClientDeliveryDates, saveIngredientToSupabase, deleteIngredientFromSupabase, saveClientToSupabase, deleteClientFromSupabase } from './lib/database';
import { isSupabaseMode, getDataMode } from './lib/dataMode';
import { checkConnection, isConfigured } from './lib/supabase';

export default function App() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kds');
  const [newGroceryBill, setNewGroceryBill] = useState({ date: '', amount: '', store: '' });
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
    blockedDates, setBlockedDates,
    groceryBills, setGroceryBills,
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

  // KDS dish status state (persisted per week in Supabase)
  const [kdsDishStatuses, setKdsDishStatuses] = useState({});
  const [kdsStatusLoading, setKdsStatusLoading] = useState(false);

  // KDS loading/syncing state for visual feedback
  const [kdsLoading, setKdsLoading] = useState(true); // Initial load
  const [kdsLastRefresh, setKdsLastRefresh] = useState(null); // Timestamp of last successful fetch
  const [lastMenusApprovedAt, setLastMenusApprovedAt] = useState(null);

  // Unapproved menu warning state
  const [unapprovedMenuCount, setUnapprovedMenuCount] = useState(0);
  const [unapprovedByClient, setUnapprovedByClient] = useState({});

  // Listen for menu approval events (from MenuTab on /admin page)
  useEffect(() => {
    const handleMenusApproved = (e) => {
      const timestamp = e.detail?.timestamp || Date.now();
      setLastMenusApprovedAt(timestamp);
      console.log('[KDS] Menus approved signal received, timestamp:', timestamp);
    };

    // Listen for custom event
    window.addEventListener('menusApproved', handleMenusApproved);

    return () => {
      window.removeEventListener('menusApproved', handleMenusApproved);
    };
  }, []);

  // Sync menuDate when selectedWeekId changes
  useEffect(() => {
    if (selectedWeekId) {
      // Set menuDate to the Monday of the selected week
      setMenuDate(selectedWeekId);
    }
  }, [selectedWeekId, setMenuDate]);

  // Fetch KDS dish statuses when week changes (Supabase mode)
  useEffect(() => {
    const loadKdsStatuses = async () => {
      if (!selectedWeekId) {
        setKdsLoading(false);
        return;
      }
      if (!isSupabaseMode()) {
        // In local mode, use completedDishes from useAppData
        setKdsLoading(false);
        setKdsLastRefresh(Date.now());
        return;
      }
      if (!isConfigured()) {
        setKdsLoading(false);
        return;
      }

      setKdsStatusLoading(true);
      setKdsLoading(true);
      try {
        const statuses = await fetchKdsDishStatuses(selectedWeekId);
        // Convert to completedDishes format: { dishName: true/false }
        const completed = {};
        Object.entries(statuses).forEach(([recipeName, status]) => {
          completed[recipeName] = status.done;
        });
        setKdsDishStatuses(statuses);
        setCompletedDishes(completed);
        setKdsLastRefresh(Date.now()); // Update last refresh timestamp
      } catch (err) {
        console.error('Failed to load KDS statuses:', err);
      }
      setKdsStatusLoading(false);
      setKdsLoading(false);
    };

    loadKdsStatuses();
  }, [selectedWeekId, setCompletedDishes]);

  // Fetch unapproved menu count for warning display
  useEffect(() => {
    const loadUnapprovedCount = async () => {
      if (!selectedWeekId || !isSupabaseMode() || !isConfigured()) {
        setUnapprovedMenuCount(0);
        setUnapprovedByClient({});
        return;
      }

      try {
        const result = await getUnapprovedMenuCountForWeek(selectedWeekId);
        setUnapprovedMenuCount(result.count);
        setUnapprovedByClient(result.byClient || {});
        if (result.count > 0) {
          console.log('[APPROVAL WARNING] weekId=', selectedWeekId, 'unapprovedCount=', result.count, 'byClient=', result.byClient);
        }
      } catch (err) {
        console.error('[APPROVAL WARNING] Failed to fetch unapproved count:', err);
      }
    };

    loadUnapprovedCount();
  }, [selectedWeekId, menuItems]); // Re-check when menuItems change (after approval)

  // Handle approve all menus from warning banner
  const handleApproveAllFromWarning = async () => {
    if (!selectedWeekId) return;

    try {
      await approveAllMenusForWeek(selectedWeekId);
      console.log('[APPROVAL WARNING] cleared');

      // Refetch menus to update UI
      const freshMenus = await fetchMenusByWeek(selectedWeekId, false);
      setMenuItems(freshMenus);

      // Clear the warning
      setUnapprovedMenuCount(0);
      setUnapprovedByClient({});

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('menusApproved', { detail: { timestamp: Date.now() } }));
    } catch (err) {
      console.error('[APPROVAL WARNING] Failed to approve all:', err);
      alert('Failed to approve menus: ' + err.message);
    }
  };

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

  // Helper to find duplicate ingredients (case-insensitive, trimmed)
  const findDuplicateIngredients = (ingredients) => {
    const seen = new Map();
    const duplicates = [];
    ingredients.forEach(ing => {
      const normalized = (ing.name || '').trim().toLowerCase();
      if (normalized && seen.has(normalized)) {
        if (!duplicates.includes(seen.get(normalized))) {
          duplicates.push(seen.get(normalized));
        }
      } else if (normalized) {
        seen.set(normalized, ing.name.trim());
      }
    });
    return duplicates;
  };

  // Recipe functions
  const saveRecipe = async (recipeData = null) => {
    // Use passed recipe data or fall back to newRecipe state
    const recipe = recipeData || newRecipe;

    console.log('[App.saveRecipe] START');
    console.log('[App.saveRecipe] dataMode:', getDataMode(), 'isSupabaseMode:', isSupabaseMode());
    console.log('[App.saveRecipe] recipeName:', recipe?.name, 'category:', recipe?.category);

    if (!recipe.name) { alert('Please enter a recipe name'); return; }
    const validIngredients = (recipe.ingredients || []).filter(ing => ing.name && ing.quantity);
    if (validIngredients.length === 0) { alert('Please add at least one ingredient with name and quantity'); return; }

    // Check for duplicate ingredients
    const duplicates = findDuplicateIngredients(validIngredients);
    if (duplicates.length > 0) {
      alert(`Error: ${duplicates.join(', ')} is entered twice. Please combine or remove duplicates.`);
      return;
    }

    // In Supabase mode, ensure all ingredients exist in master list with valid UUIDs
    let ingredientsWithIds = validIngredients;
    if (isSupabaseMode()) {
      // Find ingredients without valid UUIDs
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const missingIngredients = validIngredients.filter(ing => {
        // Check if it has a valid UUID
        if (ing.ingredient_id && UUID_REGEX.test(String(ing.ingredient_id))) return false;
        // Check if name matches a master ingredient
        const master = findExactMatch(ing.name);
        if (master?.id && UUID_REGEX.test(String(master.id))) return false;
        return true;
      });

      // Auto-add missing ingredients to Supabase
      if (missingIngredients.length > 0) {
        console.log('[App.saveRecipe] Auto-adding', missingIngredients.length, 'missing ingredients');
        for (const ing of missingIngredients) {
          const result = await saveIngredientToSupabase({
            name: ing.name,
            cost: ing.cost || '',
            unit: ing.unit || 'oz',
            source: ing.source || '',
            section: ing.section || 'Other'
          });
          if (!result.success) {
            alert(`Failed to add ingredient "${ing.name}": ${result.error}`);
            return;
          }
          // Update master ingredients with new list
          setMasterIngredients(result.ingredients);
        }
      }

      // Re-map ingredients with correct UUIDs from updated master list
      // Need to get fresh master ingredients after adding
      const currentMaster = await import('./lib/database').then(m => m.fetchIngredients());
      ingredientsWithIds = validIngredients.map(ing => {
        const master = currentMaster.find(m => m.name.toLowerCase().trim() === ing.name.toLowerCase().trim());
        return {
          ...ing,
          ingredient_id: master?.id || ing.ingredient_id
        };
      });
    } else {
      validIngredients.forEach(ing => addToMasterIngredients(ing));
    }

    const recipeToSave = {
      id: recipe.id,  // Include id for updates
      name: recipe.name,
      subcategory: recipe.subcategory || null,
      instructions: recipe.instructions,
      ingredients: ingredientsWithIds
    };

    if (isSupabaseMode()) {
      console.log('[App.saveRecipe] calling saveRecipeToSupabase...');
      const result = await saveRecipeToSupabase(recipeToSave, recipe.category);
      console.log('[App.saveRecipe] result:', result.success, result.error || '');
      if (result.success) {
        setRecipes(result.recipes);
        if (!recipeData) setNewRecipe(DEFAULT_NEW_RECIPE);
        alert('Recipe saved!');
      } else {
        alert(`Failed to save recipe: ${result.error}`);
      }
    } else {
      console.log('[App.saveRecipe] LOCAL MODE - not calling Supabase');
      setRecipes({ ...recipes, [recipe.category]: [...recipes[recipe.category], recipeToSave] });
      if (!recipeData) setNewRecipe(DEFAULT_NEW_RECIPE);
      alert('Recipe saved (local only)!');
    }
  };

  const deleteRecipe = async (category, index) => {
    console.log('[App.deleteRecipe] START', category, index);
    console.log('[App.deleteRecipe] dataMode:', getDataMode(), 'isSupabaseMode:', isSupabaseMode());

    if (!window.confirm('Delete this recipe?')) return;

    const recipe = recipes[category][index];
    console.log('[App.deleteRecipe] recipe:', recipe?.name);

    if (isSupabaseMode()) {
      console.log('[App.deleteRecipe] calling deleteRecipeFromSupabase...');
      const result = await deleteRecipeFromSupabase(recipe.name, category);
      console.log('[App.deleteRecipe] result:', result.success, result.error || '');
      if (result.success) {
        setRecipes(result.recipes);
      } else {
        alert(`Failed to delete recipe: ${result.error}`);
      }
    } else {
      console.log('[App.deleteRecipe] LOCAL MODE - not calling Supabase');
      setRecipes({ ...recipes, [category]: recipes[category].filter((_, i) => i !== index) });
    }
  };

  const duplicateRecipe = async (category, index) => {
    const recipe = recipes[category][index];
    // IMPORTANT: Do NOT include id so saving will INSERT a new record
    const duplicated = {
      name: `${recipe.name} (Copy)`,
      category: category,
      subcategory: recipe.subcategory || null,
      instructions: recipe.instructions || '',
      ingredients: (recipe.ingredients || []).map(ing => ({ ...ing }))
    };

    if (isSupabaseMode()) {
      const result = await saveRecipeToSupabase(duplicated, category);
      if (result.success) {
        setRecipes(result.recipes);
        alert('Recipe duplicated!');
      } else {
        alert(`Failed to duplicate recipe: ${result.error}`);
      }
    } else {
      setRecipes({ ...recipes, [category]: [...recipes[category], duplicated] });
      alert('Recipe duplicated (local only)!');
    }
  };

  const startEditingRecipe = (category, index) => {
    const recipe = recipes[category][index];

    // Backfill ingredient_id from master list if missing but name matches
    const ingredientsWithIds = recipe.ingredients.map(ing => {
      let ingredientId = ing.ingredient_id || ing.id || null;

      // If no valid ingredient_id but name exists, try to find in master list
      if (!ingredientId && ing.name) {
        const normalizedName = (ing.name || '').trim().toLowerCase();
        const masterMatch = masterIngredients.find(m =>
          (m.name || '').trim().toLowerCase() === normalizedName
        );
        if (masterMatch && masterMatch.id) {
          ingredientId = masterMatch.id;
          console.log('[startEditingRecipe] Backfilled ingredient_id for:', ing.name, '->', ingredientId);
        }
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

    setEditingRecipe({
      originalCategory: category,  // Where recipe currently exists (for edit form visibility)
      originalIndex: index,        // Index in original category (for edit form visibility)
      targetCategory: category,    // Where user wants to move it (dropdown controls this)
      recipe: {
        ...recipe,
        ingredients: ingredientsWithIds
      }
    });
  };

  const updateEditingIngredient = (index, field, value) => {
    const updated = [...editingRecipe.recipe.ingredients];
    updated[index][field] = value;

    // Auto-fill ingredient_id from master when name changes and matches
    if (field === 'name' && value.length > 2) {
      const masterIng = findExactMatch(value);
      if (masterIng && masterIng.id) {
        updated[index] = {
          ...updated[index],
          ingredient_id: masterIng.id, // Store master ingredient UUID
          cost: masterIng.cost || updated[index].cost,
          source: masterIng.source || updated[index].source,
          section: masterIng.section || updated[index].section,
          unit: masterIng.unit || updated[index].unit
        };
      } else {
        // Clear ingredient_id if name doesn't match master
        updated[index].ingredient_id = null;
      }
    }

    setEditingRecipe({ ...editingRecipe, recipe: { ...editingRecipe.recipe, ingredients: updated } });
  };

  const addEditingIngredient = () => {
    setEditingRecipe({
      ...editingRecipe,
      recipe: {
        ...editingRecipe.recipe,
        ingredients: [...editingRecipe.recipe.ingredients, { ingredient_id: null, name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }]
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
    console.log('[App.saveEditingRecipe] START');
    console.log('[App.saveEditingRecipe] dataMode:', getDataMode(), 'isSupabaseMode:', isSupabaseMode());

    const { originalCategory, originalIndex, targetCategory, recipe } = editingRecipe;
    const categoryChanged = originalCategory !== targetCategory;
    const isNewRecipe = !recipe.id;
    console.log('[App.saveEditingRecipe] recipe:', recipe?.name, 'category:', targetCategory, 'moved:', categoryChanged);

    const validIngredients = recipe.ingredients.filter(ing => ing.name && ing.quantity);

    // Check for duplicate ingredients
    const duplicates = findDuplicateIngredients(validIngredients);
    if (duplicates.length > 0) {
      alert(`Error: ${duplicates.join(', ')} is entered twice. Please combine or remove duplicates.`);
      return;
    }

    validIngredients.forEach(ing => addToMasterIngredients(ing));

    const recipeToSave = { ...recipe, ingredients: validIngredients };

    if (isSupabaseMode()) {
      console.log('[App.saveEditingRecipe] calling saveRecipeToSupabase...');
      const result = await saveRecipeToSupabase(recipeToSave, targetCategory);
      if (result.success) {
        // Use fetched DB data as source of truth
        let finalRecipes = result.recipes;

        // Only need to clean up if an EXISTING recipe (has id) moved categories
        if (categoryChanged && !isNewRecipe) {
          finalRecipes = { ...finalRecipes };
          finalRecipes[originalCategory] = finalRecipes[originalCategory].filter(r => r.id !== recipe.id);
        }

        setRecipes(finalRecipes);
        setEditingRecipe(null);
        alert('Recipe updated!');
      } else {
        alert(`Failed to update recipe: ${result.error}`);
      }
    } else {
      // Local mode - just update local state
      console.log('[App.saveEditingRecipe] LOCAL MODE - not calling Supabase');
      const updatedRecipes = { ...recipes };
      if (categoryChanged) {
        updatedRecipes[originalCategory] = updatedRecipes[originalCategory].filter((_, i) => i !== originalIndex);
        updatedRecipes[targetCategory] = [...updatedRecipes[targetCategory], recipeToSave];
      } else {
        updatedRecipes[originalCategory][originalIndex] = recipeToSave;
      }
      setRecipes(updatedRecipes);
      setEditingRecipe(null);
      alert('Recipe updated (local only)!');
    }
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
      if (!client?.id) {
        console.error('[addMenuItem] Client missing id:', { clientName, client });
        alert(`Cannot add menu for ${clientName}: client data is missing`);
        return null;
      }
      const clientPortions = client.portions || client.persons || 1;
      return {
        ...newMenuItem,
        clientId: client.id,      // REQUIRED: client UUID for database
        clientName: client.name,  // Use canonical name from client object
        date: menuDate,
        portions: clientPortions,
        id: Date.now() + Math.random(),
        approved: false
      };
    }).filter(Boolean); // Remove any null entries from failed lookups
    if (newItems.length > 0) {
      setMenuItems(prev => [...prev, ...newItems]);
    }
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
    return menuItems.filter(item => {
      if (!item.approved) return false;
      // Filter by selected week
      if (!item.date || !selectedWeekId) return false;
      const itemWeekId = getWeekIdFromDate(item.date);
      return itemWeekId === selectedWeekId;
    });
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

  const toggleDishComplete = async (dishName, recipeType = null) => {
    const newDoneState = !completedDishes[dishName];

    // In Supabase mode, persist to database
    if (isSupabaseMode()) {
      // Check if online first
      if (!isConfigured()) {
        alert('Cannot mark complete: database not configured');
        return;
      }

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

      // Update local status map
      setKdsDishStatuses(prev => ({
        ...prev,
        [dishName]: {
          done: newDoneState,
          done_at: newDoneState ? new Date().toISOString() : null,
          recipe_type: recipeType
        }
      }));
    }

    // Update completedDishes state (both modes)
    setCompletedDishes(prev => ({ ...prev, [dishName]: newDoneState }));
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
            // Normalize unit for proper consolidation
            const unit = (ing.unit || 'oz').toLowerCase().trim();

            // FIXED: Use master ingredient ID as fallback when recipe ingredient_id is missing
            // Priority: ing.ingredient_id > masterIng.id > normalized name
            const ingredientKey = ing.ingredient_id
              ? String(ing.ingredient_id)
              : (masterIng?.id ? String(masterIng.id) : normalizeIngredientName(ing.name));
            const key = `${ingredientKey}|${unit}`;

            const portionMultiplier = item.portions || 1;
            const ingQuantity = parseFloat(ing.quantity || 0) * portionMultiplier;
            const unitCost = parseFloat(masterIng?.cost || ing.cost || 0);
            const ingCost = ingQuantity * unitCost;

            // Resolve the best ingredient_id to store
            const resolvedIngredientId = ing.ingredient_id || masterIng?.id || null;

            if (!shoppingLists[shopDay][key]) {
              shoppingLists[shopDay][key] = {
                name: ing.name.trim(), // Keep original display name (first occurrence)
                ingredient_id: resolvedIngredientId,
                quantity: 0,
                unit: unit,
                section: ing.section || masterIng?.section || categorizeIngredient(ing.name),
                cost: 0, // Will sum costs
                unitCost: unitCost, // Store for reference
                source: masterIng?.source || ing.source || '',
                recipes: [] // Track which recipes use this ingredient
              };
            }
            // Sum quantities and costs
            shoppingLists[shopDay][key].quantity += ingQuantity;
            shoppingLists[shopDay][key].cost += ingCost;
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

  // Week-view shopping list - aggregates ALL ingredients into one list (no day split)
  // Used for export and week-level shopping view
  const getShoppingListForWeek = () => {
    console.log('[WEEKLY SHOPPING] Building aggregated list...');
    const shoppingList = {};
    const approvedItems = getWeekApprovedMenuItems();

    // Helper to normalize ingredient names for consolidation
    const normalizeIngredientName = (name) => {
      return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
    };

    approvedItems.forEach(item => {
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
            // Normalize unit for proper consolidation
            const unit = (ing.unit || 'oz').toLowerCase().trim();

            // FIXED: Use master ingredient ID as fallback when recipe ingredient_id is missing
            // Priority: ing.ingredient_id > masterIng.id > normalized name
            const ingredientKey = ing.ingredient_id
              ? String(ing.ingredient_id)
              : (masterIng?.id ? String(masterIng.id) : normalizeIngredientName(ing.name));
            const key = `${ingredientKey}|${unit}`;

            const portionMultiplier = item.portions || 1;
            const ingQuantity = parseFloat(ing.quantity || 0) * portionMultiplier;
            const unitCost = parseFloat(masterIng?.cost || ing.cost || 0);
            const ingCost = ingQuantity * unitCost;

            // Resolve the best ingredient_id to store
            const resolvedIngredientId = ing.ingredient_id || masterIng?.id || null;

            if (!shoppingList[key]) {
              shoppingList[key] = {
                name: ing.name.trim(),
                ingredient_id: resolvedIngredientId,
                quantity: 0,
                unit: unit,
                section: ing.section || masterIng?.section || categorizeIngredient(ing.name),
                cost: 0,
                unitCost: unitCost,
                source: masterIng?.source || ing.source || '',
                recipes: []
              };
            }
            // Sum quantities and costs
            shoppingList[key].quantity += ingQuantity;
            shoppingList[key].cost += ingCost;
            // Track which recipes use this ingredient
            if (!shoppingList[key].recipes.includes(dishName)) {
              shoppingList[key].recipes.push(dishName);
            }
          });
        }
      });
    });

    const result = Object.values(shoppingList).sort((a, b) => {
      const sourceCompare = (a.source || 'ZZZ').localeCompare(b.source || 'ZZZ');
      if (sourceCompare !== 0) return sourceCompare;
      const sectionCompare = (a.section || 'ZZZ').localeCompare(b.section || 'ZZZ');
      if (sectionCompare !== 0) return sectionCompare;
      return a.name.localeCompare(b.name);
    });

    console.log('[WEEKLY SHOPPING] Aggregated', result.length, 'unique ingredient rows from', approvedItems.length, 'approved menu items');
    return result;
  };

  // Legacy prep list (all items combined) - kept for backwards compatibility
  const getPrepList = () => {
    const lists = getShoppingListsByDay();
    return [...lists.Sunday, ...lists.Tuesday, ...lists.Thursday];
  };

  // Export uses WEEK aggregation (no duplicates across days)
  const exportPrepList = () => {
    console.log('[EXPORT] Starting weekly shopping list export...');
    const prepList = getShoppingListForWeek();
    console.log('[EXPORT] weekly shopping list rows:', prepList.length);
    downloadCSV(Papa.unparse(prepList.map(item => ({
      Source: item.source,
      Section: item.section,
      Ingredient: item.name,
      Quantity: item.quantity.toFixed(2),
      Unit: item.unit
    })), { columns: ['Source', 'Section', 'Ingredient', 'Quantity', 'Unit'] }), 'shopping-list.csv');
    console.log('[EXPORT] CSV download triggered');
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
  const addClient = async () => {
    // Check both name and displayName (form uses displayName)
    if (!newClient.name && !newClient.displayName) {
      alert('Please enter a client name');
      return;
    }

    const clientToSave = {
      ...newClient,
      name: newClient.name || newClient.displayName
    };

    if (isSupabaseMode()) {
      const result = await saveClientToSupabase(clientToSave);
      if (result.success) {
        setClients(result.clients);
        setNewClient(DEFAULT_NEW_CLIENT);
        alert('Client added!');
      } else {
        alert(`Failed to add client: ${result.error}`);
      }
    } else {
      setClients([...clients, { ...clientToSave, id: Date.now() }]);
      setNewClient(DEFAULT_NEW_CLIENT);
      alert('Client added (local only)!');
    }
  };

  const deleteClient = async (index) => {
    if (!window.confirm('Delete this client?')) return;

    const client = clients[index];
    if (isSupabaseMode()) {
      const result = await deleteClientFromSupabase(client.name);
      if (result.success) {
        setClients(result.clients);
      } else {
        alert(`Failed to delete client: ${result.error}`);
      }
    } else {
      setClients(clients.filter((_, i) => i !== index));
    }
  };

  // Ingredient functions
  const addMasterIngredient = async () => {
    if (!newIngredient.name) { alert('Please enter an ingredient name'); return; }
    const similar = findSimilarIngredients(newIngredient.name);
    const exact = findExactMatch(newIngredient.name);
    if (exact) { alert(`"${newIngredient.name}" already exists as "${exact.name}"`); return; }
    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${newIngredient.name}" anyway?`)) return;

    if (isSupabaseMode()) {
      const result = await saveIngredientToSupabase(newIngredient);
      if (result.success) {
        setMasterIngredients(result.ingredients);
        setNewIngredient(DEFAULT_NEW_INGREDIENT);
        alert('Ingredient added!');
      } else {
        alert(`Failed to add ingredient: ${result.error}`);
      }
    } else {
      setMasterIngredients([...masterIngredients, { ...newIngredient, id: Date.now() }]);
      setNewIngredient(DEFAULT_NEW_INGREDIENT);
      alert('Ingredient added (local only)!');
    }
  };

  const deleteMasterIngredient = async (id) => {
    if (!window.confirm('Delete this ingredient?')) return;

    if (isSupabaseMode()) {
      const result = await deleteIngredientFromSupabase(id);
      if (result.success) {
        setMasterIngredients(result.ingredients);
      } else {
        alert(`Failed to delete ingredient: ${result.error}`);
      }
    } else {
      setMasterIngredients(masterIngredients.filter(ing => ing.id !== id));
    }
  };

  const startEditingMasterIngredient = (ing) => {
    setEditingIngredientId(ing.id);
    setEditingIngredientData({ ...ing });
  };

  const saveEditingMasterIngredient = async () => {
    if (!editingIngredientData) return;

    // Persist to Supabase
    if (isSupabaseMode()) {
      const result = await saveIngredientToSupabase(editingIngredientData);
      if (result.success) {
        setMasterIngredients(result.ingredients);
      } else {
        alert(`Failed to save ingredient: ${result.error}`);
        return;
      }
    } else {
      // Local mode - just update state
      setMasterIngredients(prev => prev.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData } : ing));
    }

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

  // Driver routes are now saved directly to Supabase by DeliveriesTab
  // This function is kept for backward compatibility but is a no-op
  const saveDriverRoutes = (routes) => {
    // Routes are saved to Supabase directly, no localStorage needed
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

      <header className="text-white px-4 py-2" style={{ backgroundColor: '#3d59ab' }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <ChefHat size={28} style={{ color: '#ffd700' }} />
            <h1 className="text-xl font-bold">Goldfinch Chef</h1>
          </div>

          {/* Global Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWeekId(getAdjacentWeekId(selectedWeekId, -1))}
              className="p-1.5 rounded hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium min-w-[150px] text-center">
              {formatWeekRange(selectedWeekId)}
            </span>
            <button
              onClick={() => setSelectedWeekId(getAdjacentWeekId(selectedWeekId, 1))}
              className="p-1.5 rounded hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <SyncStatus
              isOnline={isOnline}
              isSyncing={isSyncing}
              lastSyncedAt={lastSyncedAt}
              syncError={syncError}
              dataSource={dataSource}
              isReadOnly={isReadOnly}
              onForceSync={forceSync}
            />
        </div>
      </header>

      <nav className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 space-y-6 min-h-[calc(100vh-120px)]">

        {activeTab === 'deliveries' && (
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

        {activeTab === 'menuBuilder' && (
          <MenuBuilderTab
            clients={clients}
            recipes={recipes}
            selectedWeekId={selectedWeekId}
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
            clients={clients}
            completedDishes={completedDishes}
            toggleDishComplete={toggleDishComplete}
            allDishesComplete={allDishesComplete}
            completeAllOrders={completeAllOrders}
            getKDSView={getKDSView}
            selectedWeekId={selectedWeekId}
            currentWeek={currentWeek}
            kdsLoading={kdsLoading}
            kdsLastRefresh={kdsLastRefresh}
            lastMenusApprovedAt={lastMenusApprovedAt}
            isSyncing={isSyncing}
            unapprovedMenuCount={unapprovedMenuCount}
            unapprovedByClient={unapprovedByClient}
            onApproveAll={handleApproveAllFromWarning}
            exportShoppingList={exportPrepList}
          />
        )}

        {activeTab === 'prep' && (
          <PrepTab
            prepList={prepList}
            shoppingListsByDay={getShoppingListsByDay()}
            exportPrepList={exportPrepList}
            selectedWeekId={selectedWeekId}
            unapprovedMenuCount={unapprovedMenuCount}
            unapprovedByClient={unapprovedByClient}
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
            unapprovedMenuCount={unapprovedMenuCount}
            unapprovedByClient={unapprovedByClient}
            onApproveAll={handleApproveAllFromWarning}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            weekStart={getWeekStartDate(selectedWeekId)}
            weekEnd={getWeekEndDate(selectedWeekId)}
            menuItems={getWeekMenuItems()}
            allMenuItems={menuItems}
            recipes={recipes}
            clients={clients}
            groceryBills={groceryBills}
            newGroceryBill={newGroceryBill}
            setNewGroceryBill={setNewGroceryBill}
            addGroceryBill={() => {
              if (!newGroceryBill.date || !newGroceryBill.amount) {
                alert('Please enter date and amount');
                return;
              }
              setGroceryBills(prev => [...prev, {
                ...newGroceryBill,
                amount: parseFloat(newGroceryBill.amount) || 0,
                id: Date.now()
              }]);
              setNewGroceryBill({ date: '', amount: '', store: '' });
            }}
            deleteGroceryBill={(id) => setGroceryBills(prev => prev.filter(b => b.id !== id))}
            importGroceryBills={(bills) => setGroceryBills(prev => [...prev, ...bills])}
            getRecipeCost={getRecipeCost}
          />
        )}

        {activeTab === 'scheduling' && (
          <BillingTab
            clients={clients}
            updateClients={setClients}
            blockedDates={blockedDates}
            updateBlockedDates={setBlockedDates}
            saveDeliveryDatesToSupabase={updateClientDeliveryDates}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsTab
            clients={clients}
            newClient={newClient}
            setNewClient={setNewClient}
            addClient={addClient}
            deleteClient={deleteClient}
            clientsFileRef={clientsFileRef}
            exportClientsCSV={() => downloadCSV(exportClientsCSV(clients), 'clients.csv')}
            setClients={setClients}
            deliveryLog={deliveryLog}
            orderHistory={orderHistory}
          />
        )}

        {activeTab === 'ingredients' && (
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
            exportIngredientsCSV={() => downloadCSV(exportIngredientsCSV(masterIngredients), 'ingredients.csv')}
          />
        )}

      </main>
    </div>
  );
}
