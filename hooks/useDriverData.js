import { useState, useEffect, useCallback } from 'react';
import { isSupabaseMode } from '../lib/dataMode';
import { isConfigured, checkConnection } from '../lib/supabase';
import { fetchDeliveryStopsForZone, fetchClients } from '../lib/database';

const STORAGE_KEY = 'goldfinchChefData';

export function useDriverData() {
  const [drivers, setDrivers] = useState([]);
  const [clients, setClients] = useState([]);
  const [readyForDelivery, setReadyForDelivery] = useState([]);
  const [deliveryLog, setDeliveryLog] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState({});
  const [clientPortalData, setClientPortalData] = useState({});
  const [deliveryStops, setDeliveryStops] = useState([]); // From Supabase delivery_stops table
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const loadData = () => {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.drivers) setDrivers(parsed.drivers);
          if (parsed.clients) setClients(parsed.clients);
          if (parsed.readyForDelivery) setReadyForDelivery(parsed.readyForDelivery);
          if (parsed.deliveryLog) setDeliveryLog(parsed.deliveryLog);
          if (parsed.orderHistory) setOrderHistory(parsed.orderHistory);
          if (parsed.menuItems) setMenuItems(parsed.menuItems);
          if (parsed.savedRoutes) setSavedRoutes(parsed.savedRoutes);
          if (parsed.clientPortalData) setClientPortalData(parsed.clientPortalData);
        } catch (e) {
          console.error('Error loading saved data:', e);
        }
      }
      setIsLoaded(true);
    };
    loadData();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch delivery stops from Supabase (when in Supabase mode)
  const fetchStopsForDriver = useCallback(async (driverZone) => {
    console.log('[DriverData] fetchStopsForDriver zone:', driverZone);

    if (!isSupabaseMode() || !isConfigured()) {
      console.log('[DriverData] skipping - not in Supabase mode');
      return [];
    }

    const online = await checkConnection();
    if (!online) {
      console.log('[DriverData] skipping - offline');
      return [];
    }

    try {
      const stops = await fetchDeliveryStopsForZone(driverZone, 14);
      console.log('[DriverData] delivery stops fetched:', stops.length);
      console.log('[DriverData] sample 3:', stops.slice(0, 3).map(s => ({
        client_id: s.client_id,
        date: s.date,
        status: s.status
      })));
      setDeliveryStops(stops);
      return stops;
    } catch (err) {
      console.error('[DriverData] fetchStopsForDriver error:', err);
      return [];
    }
  }, []);

  // Fetch clients from Supabase (for driver portal to get addresses)
  const fetchClientsFromSupabase = useCallback(async () => {
    console.log('[DriverData] fetchClientsFromSupabase');

    if (!isSupabaseMode() || !isConfigured()) {
      console.log('[DriverData] skipping - not in Supabase mode');
      return;
    }

    const online = await checkConnection();
    if (!online) {
      console.log('[DriverData] skipping - offline');
      return;
    }

    try {
      const fetchedClients = await fetchClients();
      console.log('[DriverData] clients fetched count:', fetchedClients.length);
      setClients(fetchedClients);
    } catch (err) {
      console.error('[DriverData] fetchClientsFromSupabase error:', err);
    }
  }, []);

  // Save function that merges with existing data
  const saveData = useCallback((updates) => {
    const savedData = localStorage.getItem(STORAGE_KEY);
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
      ...updates,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, []);

  const updateDeliveryLog = useCallback((newLog) => {
    setDeliveryLog(newLog);
    saveData({ deliveryLog: newLog });
  }, [saveData]);

  const updateReadyForDelivery = useCallback((newReady) => {
    setReadyForDelivery(newReady);
    saveData({ readyForDelivery: newReady });
  }, [saveData]);

  const updateOrderHistory = useCallback((newHistory) => {
    setOrderHistory(newHistory);
    saveData({ orderHistory: newHistory });
  }, [saveData]);

  const authenticateDriver = useCallback((accessCode) => {
    return drivers.find(d => d.accessCode === accessCode);
  }, [drivers]);

  const getDriverByName = useCallback((name) => {
    return drivers.find(d => d.name === name);
  }, [drivers]);

  return {
    drivers,
    clients,
    readyForDelivery,
    deliveryLog,
    orderHistory,
    menuItems,
    savedRoutes,
    clientPortalData,
    deliveryStops,
    isLoaded,
    updateDeliveryLog,
    updateReadyForDelivery,
    updateOrderHistory,
    authenticateDriver,
    getDriverByName,
    fetchStopsForDriver,
    fetchClientsFromSupabase
  };
}
