import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'goldfinchChefData';

export function useDriverData() {
  const [drivers, setDrivers] = useState([]);
  const [clients, setClients] = useState([]);
  const [readyForDelivery, setReadyForDelivery] = useState([]);
  const [deliveryLog, setDeliveryLog] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
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
    isLoaded,
    updateDeliveryLog,
    updateReadyForDelivery,
    updateOrderHistory,
    authenticateDriver,
    getDriverByName
  };
}
