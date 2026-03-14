import { useState, useEffect } from 'react';

const STORAGE_KEY = 'goldfinchChefData';

const DEFAULT_CLIENTS = [
  { name: "Tim Brown", persons: 7, address: "10590 Canterberry Rd, Fairfax Station, VA 22039", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" },
  { name: "Scott Inman", persons: 4, address: "3418 Putnam Rd, Falls Church, VA 22042", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" }
];

const DEFAULT_RECIPES = { protein: [], veg: [], starch: [], sauces: [], breakfast: [], soups: [] };

export function useAppData() {
  const [recipes, setRecipes] = useState(DEFAULT_RECIPES);
  const [menuItems, setMenuItems] = useState([]);
  const [clients, setClients] = useState(DEFAULT_CLIENTS);
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [deliverySchedule, setDeliverySchedule] = useState({});

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.recipes) setRecipes(parsed.recipes);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.menuItems) setMenuItems(parsed.menuItems);
        if (parsed.masterIngredients) setMasterIngredients(parsed.masterIngredients);
        if (parsed.orderHistory) setOrderHistory(parsed.orderHistory);
        if (parsed.deliverySchedule) setDeliverySchedule(parsed.deliverySchedule);
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    const dataToSave = {
      recipes,
      clients,
      menuItems,
      masterIngredients,
      orderHistory,
      deliverySchedule,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [recipes, clients, menuItems, masterIngredients, orderHistory, deliverySchedule]);

  return {
    recipes,
    setRecipes,
    menuItems,
    setMenuItems,
    clients,
    setClients,
    masterIngredients,
    setMasterIngredients,
    orderHistory,
    setOrderHistory,
    deliverySchedule,
    setDeliverySchedule
  };
}
