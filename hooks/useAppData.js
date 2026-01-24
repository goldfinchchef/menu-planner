import { useState, useEffect, useCallback } from 'react';
import { normalizeName, similarity } from '../utils';
import {
  getWeekId,
  getWeekIdFromDate,
  createWeekRecord,
  lockWeek,
  isDateInWeek
} from '../utils/weekUtils';
import {
  DEFAULT_RECIPES,
  DEFAULT_CLIENTS,
  DEFAULT_NEW_CLIENT,
  DEFAULT_NEW_RECIPE,
  DEFAULT_NEW_MENU_ITEM,
  DEFAULT_NEW_INGREDIENT,
  DEFAULT_NEW_DRIVER
} from '../constants';

export function useAppData() {
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

  // Load from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('goldfinchChefData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.recipes) setRecipes(parsed.recipes);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.menuItems) setMenuItems(parsed.menuItems);
        if (parsed.masterIngredients) setMasterIngredients(parsed.masterIngredients);
        if (parsed.orderHistory) setOrderHistory(parsed.orderHistory);
        if (parsed.weeklyTasks) setWeeklyTasks(parsed.weeklyTasks);
        if (parsed.drivers) setDrivers(parsed.drivers);
        if (parsed.deliveryLog) setDeliveryLog(parsed.deliveryLog);
        if (parsed.bagReminders) setBagReminders(parsed.bagReminders);
        if (parsed.readyForDelivery) setReadyForDelivery(parsed.readyForDelivery);
        if (parsed.clientPortalData) setClientPortalData(parsed.clientPortalData);
        if (parsed.blockedDates) setBlockedDates(parsed.blockedDates);
        if (parsed.adminSettings) setAdminSettings(parsed.adminSettings);
        if (parsed.customTasks) setCustomTasks(parsed.customTasks);
        if (parsed.groceryBills) setGroceryBills(parsed.groceryBills);
        if (parsed.weeks) setWeeks(parsed.weeks);
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
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
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('goldfinchChefData', JSON.stringify(dataToSave));
  }, [recipes, clients, menuItems, masterIngredients, orderHistory, weeklyTasks, drivers, deliveryLog, bagReminders, readyForDelivery, clientPortalData, blockedDates, adminSettings, customTasks, groceryBills, weeks]);

  const findSimilarIngredients = (name) => {
    if (!name || name.length < 2) return [];
    return masterIngredients.filter(mi => {
      const sim = similarity(name, mi.name);
      return sim > 0.7 && sim < 1;
    });
  };

  const findExactMatch = (name) => masterIngredients.find(mi => normalizeName(mi.name) === normalizeName(name));

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
    // Functions
    findSimilarIngredients,
    findExactMatch,
    addToMasterIngredients,
    mergeIngredients,
    scanForDuplicates,
    getRecipeCost,
    getRecipeCounts,
    // Week functions
    getOrCreateWeek,
    getCurrentWeek,
    lockWeekAndSnapshot,
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
