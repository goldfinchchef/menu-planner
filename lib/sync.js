import { checkConnection } from './supabase';
import {
  fetchClients,
  fetchRecipes,
  fetchIngredients,
  fetchMenus,
  fetchWeeks,
  fetchDrivers,
  fetchClientPortalData,
  fetchAppSettings,
  saveAllClients,
  saveAllRecipes,
  saveAllIngredients,
  saveAllMenus,
  saveAllWeeks,
  saveAllDrivers,
  saveAllClientPortalData,
  saveAppSetting
} from './database';

const STORAGE_KEY = 'goldfinchChefData';
const SYNC_STATUS_KEY = 'goldfinchSyncStatus';

// Get sync status from localStorage
export function getSyncStatus() {
  try {
    const status = localStorage.getItem(SYNC_STATUS_KEY);
    return status ? JSON.parse(status) : {
      lastSyncedAt: null,
      migrationComplete: false,
      isOnline: false
    };
  } catch (e) {
    return {
      lastSyncedAt: null,
      migrationComplete: false,
      isOnline: false
    };
  }
}

// Update sync status
export function updateSyncStatus(updates) {
  const current = getSyncStatus();
  const newStatus = { ...current, ...updates };
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(newStatus));
  return newStatus;
}

// Check if Supabase is available and update status
export async function checkOnlineStatus() {
  const isOnline = await checkConnection();
  updateSyncStatus({ isOnline });
  return isOnline;
}

// Fetch all data from Supabase
export async function syncFromSupabase() {
  const isOnline = await checkConnection();
  if (!isOnline) {
    return { success: false, error: 'Supabase not available' };
  }

  try {
    const [
      clients,
      recipes,
      masterIngredients,
      menuItems,
      weeks,
      drivers,
      clientPortalData,
      appSettings
    ] = await Promise.all([
      fetchClients(),
      fetchRecipes(),
      fetchIngredients(),
      fetchMenus(),
      fetchWeeks(),
      fetchDrivers(),
      fetchClientPortalData(),
      fetchAppSettings()
    ]);

    // Build the data object
    const data = {
      clients,
      recipes,
      masterIngredients,
      menuItems,
      weeks,
      drivers,
      clientPortalData,
      // Extract specific settings
      orderHistory: appSettings.orderHistory || [],
      weeklyTasks: appSettings.weeklyTasks || {},
      deliveryLog: appSettings.deliveryLog || [],
      bagReminders: appSettings.bagReminders || {},
      readyForDelivery: appSettings.readyForDelivery || [],
      blockedDates: appSettings.blockedDates || [],
      adminSettings: appSettings.adminSettings || { routeStartAddress: '' },
      customTasks: appSettings.customTasks || [],
      groceryBills: appSettings.groceryBills || [],
      units: appSettings.units || null,
      lastSaved: new Date().toISOString()
    };

    // Update localStorage cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    updateSyncStatus({
      lastSyncedAt: new Date().toISOString(),
      isOnline: true
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error syncing from Supabase:', error);
    return { success: false, error: error.message };
  }
}

// Push all local data to Supabase
export async function syncToSupabase(localData) {
  const isOnline = await checkConnection();
  if (!isOnline) {
    return { success: false, error: 'Supabase not available' };
  }

  try {
    // Save all entities
    await Promise.all([
      localData.clients?.length > 0 ? saveAllClients(localData.clients) : Promise.resolve(),
      localData.recipes ? saveAllRecipes(localData.recipes) : Promise.resolve(),
      localData.masterIngredients?.length > 0 ? saveAllIngredients(localData.masterIngredients) : Promise.resolve(),
      localData.menuItems?.length > 0 ? saveAllMenus(localData.menuItems) : Promise.resolve(),
      localData.weeks && Object.keys(localData.weeks).length > 0 ? saveAllWeeks(localData.weeks) : Promise.resolve(),
      localData.drivers?.length > 0 ? saveAllDrivers(localData.drivers) : Promise.resolve(),
      localData.clientPortalData && Object.keys(localData.clientPortalData).length > 0 ? saveAllClientPortalData(localData.clientPortalData) : Promise.resolve()
    ]);

    // Save app settings
    const settingsToSave = {
      orderHistory: localData.orderHistory || [],
      weeklyTasks: localData.weeklyTasks || {},
      deliveryLog: localData.deliveryLog || [],
      bagReminders: localData.bagReminders || {},
      readyForDelivery: localData.readyForDelivery || [],
      blockedDates: localData.blockedDates || [],
      adminSettings: localData.adminSettings || { routeStartAddress: '' },
      customTasks: localData.customTasks || [],
      groceryBills: localData.groceryBills || [],
      units: localData.units || null
    };

    for (const [key, value] of Object.entries(settingsToSave)) {
      if (value !== null && value !== undefined) {
        await saveAppSetting(key, value);
      }
    }

    updateSyncStatus({
      lastSyncedAt: new Date().toISOString(),
      isOnline: true
    });

    return { success: true };
  } catch (error) {
    console.error('Error syncing to Supabase:', error);
    return { success: false, error: error.message };
  }
}

// One-time migration from localStorage to Supabase
export async function migrateLocalStorageToSupabase() {
  const syncStatus = getSyncStatus();

  // Check if already migrated
  if (syncStatus.migrationComplete) {
    console.log('Migration already complete');
    return { success: true, alreadyMigrated: true };
  }

  // Check if online
  const isOnline = await checkConnection();
  if (!isOnline) {
    return { success: false, error: 'Supabase not available for migration' };
  }

  // Get local data
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) {
    updateSyncStatus({ migrationComplete: true });
    return { success: true, noDataToMigrate: true };
  }

  try {
    const localData = JSON.parse(savedData);

    // Perform the sync
    const result = await syncToSupabase(localData);

    if (result.success) {
      updateSyncStatus({
        migrationComplete: true,
        lastSyncedAt: new Date().toISOString()
      });
      console.log('Migration to Supabase complete!');
    }

    return result;
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
}

// Get data with Supabase-first, localStorage fallback
export async function loadData() {
  const isOnline = await checkConnection();

  if (isOnline) {
    const result = await syncFromSupabase();
    if (result.success && result.data) {
      return { data: result.data, source: 'supabase' };
    }
  }

  // Fall back to localStorage
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      return { data, source: 'localStorage' };
    } catch (e) {
      console.error('Error parsing localStorage data:', e);
    }
  }

  return { data: null, source: 'none' };
}

// Queue for pending saves when offline
let pendingSaves = [];
const PENDING_SAVES_KEY = 'goldfinchPendingSaves';

// Load pending saves from localStorage
export function loadPendingSaves() {
  try {
    const saved = localStorage.getItem(PENDING_SAVES_KEY);
    pendingSaves = saved ? JSON.parse(saved) : [];
  } catch (e) {
    pendingSaves = [];
  }
}

// Save pending saves to localStorage
function savePendingSaves() {
  localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(pendingSaves));
}

// Add to pending saves queue
export function queueSave(data) {
  pendingSaves.push({
    data,
    timestamp: new Date().toISOString()
  });
  // Keep only last 10 pending saves to avoid localStorage bloat
  if (pendingSaves.length > 10) {
    pendingSaves = pendingSaves.slice(-10);
  }
  savePendingSaves();
}

// Process pending saves when back online
export async function processPendingSaves() {
  if (pendingSaves.length === 0) return { success: true, processed: 0 };

  const isOnline = await checkConnection();
  if (!isOnline) {
    return { success: false, error: 'Still offline' };
  }

  let processed = 0;
  const errors = [];

  for (const pending of pendingSaves) {
    try {
      await syncToSupabase(pending.data);
      processed++;
    } catch (error) {
      errors.push(error.message);
    }
  }

  // Clear processed saves
  if (processed === pendingSaves.length) {
    pendingSaves = [];
    savePendingSaves();
  }

  return {
    success: errors.length === 0,
    processed,
    errors: errors.length > 0 ? errors : undefined
  };
}
