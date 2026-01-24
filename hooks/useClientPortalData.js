import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'goldfinchChefData';

export function useClientPortalData() {
  const [clients, setClients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [readyForDelivery, setReadyForDelivery] = useState([]);
  const [deliveryLog, setDeliveryLog] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [clientPortalData, setClientPortalData] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const loadData = () => {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.clients) setClients(parsed.clients);
          if (parsed.menuItems) setMenuItems(parsed.menuItems);
          if (parsed.readyForDelivery) setReadyForDelivery(parsed.readyForDelivery);
          if (parsed.deliveryLog) setDeliveryLog(parsed.deliveryLog);
          if (parsed.orderHistory) setOrderHistory(parsed.orderHistory);
          if (parsed.recipes) setRecipes(parsed.recipes);
          if (parsed.clientPortalData) setClientPortalData(parsed.clientPortalData);
          if (parsed.blockedDates) setBlockedDates(parsed.blockedDates);
        } catch (e) {
          console.error('Error loading saved data:', e);
        }
      }
      setIsLoaded(true);
    };
    loadData();

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  const updateClientPortalData = useCallback((clientId, data) => {
    const updated = {
      ...clientPortalData,
      [clientId]: {
        ...clientPortalData[clientId],
        ...data
      }
    };
    setClientPortalData(updated);
    saveData({ clientPortalData: updated });
  }, [clientPortalData, saveData]);

  const getClientById = useCallback((clientId) => {
    return clients.find(c =>
      c.id === clientId ||
      c.name.toLowerCase().replace(/\s+/g, '-') === clientId.toLowerCase()
    );
  }, [clients]);

  const getClientMenuItems = useCallback((clientName, date) => {
    return menuItems.filter(item =>
      item.clientName === clientName &&
      item.approved === true &&
      (!date || item.date === date)
    );
  }, [menuItems]);

  const getClientReadyOrders = useCallback((clientName, date) => {
    return readyForDelivery.filter(order =>
      order.clientName === clientName &&
      (!date || order.date === date)
    );
  }, [readyForDelivery]);

  const getClientDeliveryStatus = useCallback((clientName, date) => {
    return deliveryLog.find(entry =>
      entry.clientName === clientName &&
      entry.date === date
    );
  }, [deliveryLog]);

  const getClientHistory = useCallback((clientName) => {
    return orderHistory
      .filter(order => order.clientName === clientName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [orderHistory]);

  const getRecipeName = useCallback((dishName) => {
    for (const category of Object.keys(recipes)) {
      const recipe = recipes[category]?.find(r => r.name === dishName);
      if (recipe) return recipe;
    }
    return null;
  }, [recipes]);

  return {
    clients,
    menuItems,
    readyForDelivery,
    deliveryLog,
    orderHistory,
    recipes,
    clientPortalData,
    blockedDates,
    isLoaded,
    getClientById,
    getClientMenuItems,
    getClientReadyOrders,
    getClientDeliveryStatus,
    getClientHistory,
    getRecipeName,
    updateClientPortalData
  };
}
