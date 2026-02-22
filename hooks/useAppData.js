import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeName, similarity } from '../utils';
import {
  getWeekId,
  getWeekIdFromDate,
  createWeekRecord,
  lockWeek,
  unlockWeek,
  isDateInWeek
} from '../utils/weekUtils';
import {
  DEFAULT_RECIPES,
  DEFAULT_CLIENTS,
  DEFAULT_NEW_CLIENT,
  DEFAULT_NEW_RECIPE,
  DEFAULT_NEW_MENU_ITEM,
  DEFAULT_NEW_INGREDIENT,
  DEFAULT_NEW_DRIVER,
  DEFAULT_UNITS
} from '../constants';
import {
  loadData,
  syncToSupabase,
  getSyncStatus,
  checkOnlineStatus,
  migrateLocalStorageToSupabase,
  loadPendingSaves
} from '../lib/sync';
import { fetchMenusByWeek } from '../lib/database';
import { isSupabaseMode } from '../lib/dataMode';
import { isConfigured, checkConnection } from '../lib/supabase';

export function useAppData() {
  console.log('[useAppData] hook invoked');

  const [recipes, setRecipes] = useState(DEFAULT_RECIPES);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [menuDate, setMenuDate] = useState(new Date().toISOString().split('T')[0]);
  const [clients, setClients] = useState(DEFAULT_CLIENTS);
  const [newClient, setNewClient] = useState(DEFAULT_NEW_CLIENT);
  const [newRecipe, setNewRecipe] = useState(DEFAULT_NEW_RECIPE);
  const [newMenuItem, setNewMenuItem] = useState(DEFAULT_NEW_MENU_ITEM);
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState(DEFAULT_NEW_INGREDIENT);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [editingIngredientData, setEditingIngredientData] = useState(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [completedDishes, setCompletedDishes] = useState({});
  const [orderHistory, setOrderHistory] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [newDriver, setNewDriver] = useState(DEFAULT_NEW_DRIVER);
  const [deliveryLog, setDeliveryLog] = useState([]);
  const [bagReminders, setBagReminders] = useState({});
  const [readyForDelivery, setReadyForDelivery] = useState([]);
  const [clientPortalData, setClientPortalData] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [adminSettings, setAdminSettings] = useState({ routeStartAddress: '' });
  const [customTasks, setCustomTasks] = useState([]);
  const [groceryBills, setGroceryBills] = useState([]);
  const [weeks, setWeeks] = useState({});
  const [selectedWeekId, setSelectedWeekId] = useState(getWeekId());
  const [units, setUnits] = useState(DEFAULT_UNITS);

  // Supabase sync state
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [dataSource, setDataSource] = useState('loading');
  const [isReadOnly, setIsReadOnly] = useState(false); // True when Supabase unavailable

  // Refs for debounced save
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Load data on mount
  useEffect(() => {
    const initializeData = async () => {
      setIsSyncing(true);

      try {
        // Load pending saves queue
        loadPendingSaves();

        // Try to load from Supabase, fallback to localStorage
        const result = await loadData();

        console.log("[LOAD DATA RESULT]", {
          ok: result?.ok,
          hasData: !!result?.data,
          keys: Object.keys(result?.data || {}),
          driversType: typeof result?.data?.drivers,
          driversIsArray: Array.isArray(result?.data?.drivers),
          driversLen: Array.isArray(result?.data?.drivers) ? result.data.drivers.length : null,
          rawDrivers: result?.data?.drivers
        });

        if (result.data) {
          // Apply loaded data to state
          if (result.data.recipes) setRecipes(result.data.recipes);
          if (result.data.clients) setClients(result.data.clients);
          if (result.data.menuItems) setMenuItems(result.data.menuItems);
          if (result.data.masterIngredients) setMasterIngredients(result.data.masterIngredients);
          if (result.data.orderHistory) setOrderHistory(result.data.orderHistory);
          if (result.data.weeklyTasks) setWeeklyTasks(result.data.weeklyTasks);
          console.log("[LOAD DRIVERS FROM SUPABASE]", result?.data?.drivers);
          setDrivers(Array.isArray(result?.data?.drivers) ? result.data.drivers : []);
          if (result.data.deliveryLog) setDeliveryLog(result.data.deliveryLog);
          if (result.data.bagReminders) setBagReminders(result.data.bagReminders);
          if (result.data.readyForDelivery) setReadyForDelivery(result.data.readyForDelivery);
          if (result.data.clientPortalData) setClientPortalData(result.data.clientPortalData);
          if (result.data.blockedDates) setBlockedDates(result.data.blockedDates);
          if (result.data.adminSettings) setAdminSettings(result.data.adminSettings);
          if (result.data.customTasks) setCustomTasks(result.data.customTasks);
          if (result.data.groceryBills) setGroceryBills(result.data.groceryBills);
          if (result.data.weeks) setWeeks(result.data.weeks);
          if (result.data.units) setUnits(result.data.units);

          setDataSource(result.source);
          setIsReadOnly(result.readOnly || false);
          setIsOnline(!result.readOnly);
        }

        // Update sync status from stored state
        const syncStatus = getSyncStatus();
        setLastSyncedAt(syncStatus.lastSyncedAt);

        // Check online status
        const online = await checkOnlineStatus();
        setIsOnline(online);

        // If online and migration not complete, run migration
        if (online && !syncStatus.migrationComplete) {
          await migrateLocalStorageToSupabase();
        }
      } catch (error) {
        console.error('[initializeData] Error:', error);
        setSyncError(error.message);
      } finally {
        setIsSyncing(false);
        isInitialLoadRef.current = false;
      }
    };

    initializeData();

    // Check online status periodically (no localStorage sync)
    const onlineCheckInterval = setInterval(async () => {
      const online = await checkOnlineStatus();
      setIsOnline(online);
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(onlineCheckInterval);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Fetch menus when selectedWeekId changes (Supabase mode)
  useEffect(() => {
    console.log('DEBUG MENU FETCH:', {
      selectedWeekId,
      isSupabaseMode: isSupabaseMode(),
      isConfigured: isConfigured()
    });

    if (!selectedWeekId) {
      console.log('Skipping menu fetch: no selectedWeekId yet');
      return;
    }

    if (!isConfigured()) {
      console.log('Skipping menu fetch: Supabase not configured');
      return;
    }

    const loadMenus = async () => {
      console.log('Fetching menus for week:', selectedWeekId);

      const menus = await fetchMenusByWeek(selectedWeekId, false);

      console.log('Menus response:', menus);

      setMenuItems(menus || []);
    };

    loadMenus();
  }, [selectedWeekId]);

  // Save to Supabase only (no localStorage for business data)
  useEffect(() => {
    // Skip save during initial load
    if (isInitialLoadRef.current) return;

    const dataToSave = {
      recipes,
      clients,
      menuItems,
      masterIngredients,
      orderHistory,
      weeklyTasks,
      drivers,
      deliveryLog,
      bagReminders,
      readyForDelivery,
      clientPortalData,
      blockedDates,
      adminSettings,
      customTasks,
      groceryBills,
      weeks,
      units,
      lastSaved: new Date().toISOString()
    };

    // Debounce Supabase save to avoid too many requests
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const online = await checkOnlineStatus();
      setIsOnline(online);

      if (!online) {
        const errorMsg = 'Cannot save: You are offline. Please check your internet connection.';
        setSyncError(errorMsg);
        alert(errorMsg);
        return;
      }

      setIsSyncing(true);
      setSyncError(null);

      try {
        const result = await syncToSupabase(dataToSave);
        if (result.success) {
          setLastSyncedAt(new Date().toISOString());
        } else {
          const errorMsg = `Save failed: ${result.error}`;
          setSyncError(errorMsg);
          alert(errorMsg);
        }
      } catch (error) {
        const errorMsg = `Save failed: ${error.message}`;
        setSyncError(errorMsg);
        alert(errorMsg);
      }

      setIsSyncing(false);
    }, 2000); // Wait 2 seconds after last change before syncing

  }, [recipes, clients, menuItems, masterIngredients, orderHistory, weeklyTasks, drivers, deliveryLog, bagReminders, readyForDelivery, clientPortalData, blockedDates, adminSettings, customTasks, groceryBills, weeks, units]);

  // Manual sync function
  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    const dataToSave = {
      recipes,
      clients,
      menuItems,
      masterIngredients,
      orderHistory,
      weeklyTasks,
      drivers,
      deliveryLog,
      bagReminders,
      readyForDelivery,
      clientPortalData,
      blockedDates,
      adminSettings,
      customTasks,
      groceryBills,
      weeks,
      units,
      lastSaved: new Date().toISOString()
    };

    try {
      const result = await syncToSupabase(dataToSave);
      if (result.success) {
        setLastSyncedAt(new Date().toISOString());
        setIsOnline(true);
      } else {
        setSyncError(result.error);
      }
    } catch (error) {
      setSyncError(error.message);
    }

    setIsSyncing(false);
  }, [recipes, clients, menuItems, masterIngredients, orderHistory, weeklyTasks, drivers, deliveryLog, bagReminders, readyForDelivery, clientPortalData, blockedDates, adminSettings, customTasks, groceryBills, weeks, units]);

  const findSimilarIngredients = (name) => {
    if (!name || name.length < 2) return [];
    return masterIngredients.filter(mi => {
      const sim = similarity(name, mi.name);
      return sim > 0.7 && sim < 1;
    });
  };

  const findExactMatch = (name) => masterIngredients.find(mi => normalizeName(mi.name) === normalizeName(name));

  // Get unique vendors/sources from master ingredients
  const getUniqueVendors = () => {
    const vendors = new Set();
    masterIngredients.forEach(mi => {
      if (mi.source && mi.source.trim()) {
        vendors.add(mi.source.trim());
      }
    });
    return Array.from(vendors).sort();
  };

  // Add a new unit to the list
  const addUnit = (newUnit) => {
    if (!newUnit || newUnit.trim() === '') return;
    const trimmed = newUnit.trim().toLowerCase();
    if (!units.includes(trimmed)) {
      setUnits(prev => [...prev, trimmed].sort());
    }
  };

  const addToMasterIngredients = (ingredient) => {
    if (!ingredient.name) return;
    const exactMatch = findExactMatch(ingredient.name);
    if (exactMatch) {
      if (ingredient.cost || ingredient.source || ingredient.section !== 'Other') {
        setMasterIngredients(prev => prev.map(mi =>
          mi.id === exactMatch.id
            ? { ...mi, cost: ingredient.cost || mi.cost, source: ingredient.source || mi.source, section: ingredient.section !== 'Other' ? ingredient.section : mi.section }
            : mi
        ));
      }
      return;
    }
    setMasterIngredients(prev => [...prev, {
      id: Date.now() + Math.random(),
      name: ingredient.name,
      cost: ingredient.cost || '',
      unit: ingredient.unit || 'oz',
      source: ingredient.source || '',
      section: ingredient.section || 'Other'
    }]);
  };

  // Update master ingredient cost when changed in recipe
  const updateMasterIngredientCost = (ingredientName, newCost) => {
    const exactMatch = findExactMatch(ingredientName);
    if (exactMatch && newCost) {
      setMasterIngredients(prev => prev.map(mi =>
        mi.id === exactMatch.id ? { ...mi, cost: newCost } : mi
      ));
      return true;
    }
    return false;
  };

  // Sync all recipe ingredients from master ingredients data
  const syncRecipeIngredientsFromMaster = () => {
    let ingredientsAdded = 0;
    let costsUpdated = 0;

    const updatedRecipes = { ...recipes };

    Object.keys(updatedRecipes).forEach(category => {
      updatedRecipes[category] = updatedRecipes[category].map(recipe => {
        const updatedIngredients = recipe.ingredients.map(ing => {
          const masterIng = findExactMatch(ing.name);
          if (masterIng) {
            const updated = { ...ing };
            // Sync fields from master if master has values
            if (masterIng.cost && masterIng.cost !== ing.cost) {
              updated.cost = masterIng.cost;
              costsUpdated++;
            }
            if (masterIng.source && masterIng.source !== ing.source) {
              updated.source = masterIng.source;
            }
            if (masterIng.section && masterIng.section !== 'Other' && masterIng.section !== ing.section) {
              updated.section = masterIng.section;
            }
            if (masterIng.unit && masterIng.unit !== ing.unit) {
              updated.unit = masterIng.unit;
            }
            return updated;
          } else if (ing.name) {
            // Add to master ingredients if not exists
            ingredientsAdded++;
            return ing;
          }
          return ing;
        });
        return { ...recipe, ingredients: updatedIngredients };
      });
    });

    // Add any new ingredients to master
    Object.values(updatedRecipes).forEach(categoryRecipes => {
      categoryRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
          if (ing.name && !findExactMatch(ing.name)) {
            addToMasterIngredients(ing);
          }
        });
      });
    });

    setRecipes(updatedRecipes);

    return { ingredientsAdded, costsUpdated };
  };

  const mergeIngredients = (keepId, removeId) => {
    const keep = masterIngredients.find(i => i.id === keepId);
    const remove = masterIngredients.find(i => i.id === removeId);
    if (!keep || !remove) return;
    const updatedRecipes = { ...recipes };
    Object.keys(updatedRecipes).forEach(category => {
      updatedRecipes[category] = updatedRecipes[category].map(recipe => ({
        ...recipe,
        ingredients: recipe.ingredients.map(ing =>
          normalizeName(ing.name) === normalizeName(remove.name) ? { ...ing, name: keep.name } : ing
        )
      }));
    });
    setRecipes(updatedRecipes);
    setMasterIngredients(prev => prev.filter(i => i.id !== removeId));
    setDuplicateWarnings(prev => prev.filter(d => d.ing1.id !== removeId && d.ing2.id !== removeId));
    alert(`Merged "${remove.name}" into "${keep.name}"`);
  };

  const scanForDuplicates = () => {
    const found = [];
    const checked = new Set();
    masterIngredients.forEach((ing1, i) => {
      masterIngredients.forEach((ing2, j) => {
        if (i >= j) return;
        const key = [ing1.id, ing2.id].sort().join('-');
        if (checked.has(key)) return;
        checked.add(key);
        const sim = similarity(ing1.name, ing2.name);
        if (sim > 0.7 && sim < 1) found.push({ ing1, ing2, similarity: sim });
      });
    });
    setDuplicateWarnings(found);
    if (found.length === 0) alert('No duplicate ingredients found!');
  };

  const getRecipeCost = (recipe) => {
    if (!recipe?.ingredients) return 0;
    return recipe.ingredients.reduce((total, ing) => {
      const masterIng = findExactMatch(ing.name);
      const costPerUnit = parseFloat(masterIng?.cost || ing.cost || 0);
      const quantity = parseFloat(ing.quantity || 0);
      return total + (costPerUnit * quantity);
    }, 0);
  };

  const getRecipeCounts = () => {
    const counts = {};
    let total = 0;
    Object.entries(recipes).forEach(([category, items]) => {
      counts[category] = items.length;
      total += items.length;
    });
    counts.total = total;
    return counts;
  };

  // Week management functions

  // Get or create a week record
  const getOrCreateWeek = useCallback((weekId) => {
    if (weeks[weekId]) return weeks[weekId];
    const newWeek = createWeekRecord(weekId);
    setWeeks(prev => ({ ...prev, [weekId]: newWeek }));
    return newWeek;
  }, [weeks]);

  // Get the current week record
  const getCurrentWeek = useCallback(() => {
    return getOrCreateWeek(selectedWeekId);
  }, [selectedWeekId, getOrCreateWeek]);

  // Lock a week and create snapshot
  const lockWeekAndSnapshot = useCallback((weekId) => {
    const week = weeks[weekId] || createWeekRecord(weekId);
    if (week.status === 'locked') return week; // Already locked

    const lockedWeek = lockWeek(week, menuItems, clients);
    setWeeks(prev => ({ ...prev, [weekId]: lockedWeek }));
    return lockedWeek;
  }, [weeks, menuItems, clients]);

  // Unlock a week for editing
  const unlockWeekById = useCallback((weekId) => {
    const week = weeks[weekId];
    if (!week || week.status !== 'locked') return null;

    const unlockedWeek = unlockWeek(week);
    setWeeks(prev => ({ ...prev, [weekId]: unlockedWeek }));
    return unlockedWeek;
  }, [weeks]);

  // Update week's operational data
  const updateWeekData = useCallback((weekId, updates) => {
    setWeeks(prev => {
      const week = prev[weekId] || createWeekRecord(weekId);
      return {
        ...prev,
        [weekId]: { ...week, ...updates }
      };
    });
  }, []);

  // Update KDS status for a dish in a week
  const updateWeekKdsStatus = useCallback((weekId, dishName, status) => {
    setWeeks(prev => {
      const week = prev[weekId] || createWeekRecord(weekId);
      return {
        ...prev,
        [weekId]: {
          ...week,
          kdsStatus: {
            ...week.kdsStatus,
            [dishName]: {
              status,
              completedAt: status === 'complete' ? new Date().toISOString() : null
            }
          }
        }
      };
    });
  }, []);

  // Add ready for delivery order to week
  const addReadyForDeliveryToWeek = useCallback((weekId, orders) => {
    setWeeks(prev => {
      const week = prev[weekId] || createWeekRecord(weekId);
      return {
        ...prev,
        [weekId]: {
          ...week,
          readyForDelivery: [...week.readyForDelivery, ...orders]
        }
      };
    });
  }, []);

  // Add delivery log entry to week
  const addDeliveryLogToWeek = useCallback((weekId, entry) => {
    setWeeks(prev => {
      const week = prev[weekId] || createWeekRecord(weekId);
      return {
        ...prev,
        [weekId]: {
          ...week,
          deliveryLog: [...week.deliveryLog, entry]
        }
      };
    });
  }, []);

  // Remove from ready for delivery in week
  const removeReadyForDeliveryFromWeek = useCallback((weekId, orderId) => {
    setWeeks(prev => {
      const week = prev[weekId];
      if (!week) return prev;
      return {
        ...prev,
        [weekId]: {
          ...week,
          readyForDelivery: week.readyForDelivery.filter(o => o.id !== orderId)
        }
      };
    });
  }, []);

  // Add grocery bill to week
  const addGroceryBillToWeek = useCallback((weekId, bill) => {
    setWeeks(prev => {
      const week = prev[weekId] || createWeekRecord(weekId);
      return {
        ...prev,
        [weekId]: {
          ...week,
          groceryBills: [...week.groceryBills, bill]
        }
      };
    });
  }, []);

  // Check if week is read-only (locked and in the past)
  const isWeekReadOnly = useCallback((weekId) => {
    const week = weeks[weekId];
    if (!week) return false;
    if (week.status !== 'locked') return false;
    const currentWeekId = getWeekId();
    return weekId < currentWeekId;
  }, [weeks]);

  // Get all week IDs sorted
  const getWeekIds = useCallback(() => {
    return Object.keys(weeks).sort().reverse();
  }, [weeks]);

  console.log('[useAppData] returning', { selectedWeekId, menuItemsCount: menuItems?.length });

  return {
    // State
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
    adminSettings, setAdminSettings,
    customTasks, setCustomTasks,
    groceryBills, setGroceryBills,
    weeks, setWeeks,
    selectedWeekId, setSelectedWeekId,
    units, addUnit,
    // Sync state
    isOnline,
    isSyncing,
    lastSyncedAt,
    syncError,
    dataSource,
    isReadOnly,
    forceSync,
    // Functions
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
    // Week functions
    getOrCreateWeek,
    getCurrentWeek,
    lockWeekAndSnapshot,
    unlockWeekById,
    updateWeekData,
    updateWeekKdsStatus,
    addReadyForDeliveryToWeek,
    addDeliveryLogToWeek,
    removeReadyForDeliveryFromWeek,
    addGroceryBillToWeek,
    isWeekReadOnly,
    getWeekIds
  };
}
