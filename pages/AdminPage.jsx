import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat, Home, Calendar, Truck, AlertTriangle, RefreshCw,
  Plus, Trash2, Edit2, Check, X, Settings, ClipboardList,
  LayoutDashboard, Users, MapPin, ChevronLeft, ChevronRight,
  Package, CreditCard, FileText, ShoppingBag, Eye, Utensils,
  ExternalLink, Copy, DollarSign, TrendingUp, Receipt
} from 'lucide-react';
import { ZONES, DEFAULT_NEW_DRIVER, DEFAULT_NEW_MENU_ITEM, DEFAULT_NEW_INGREDIENT, DEFAULT_NEW_RECIPE, STORE_SECTIONS } from '../constants';
import SubscriptionsTab from '../tabs/SubscriptionsTab';
import MenuTab from '../tabs/MenuTab';
import RecipesTab from '../tabs/RecipesTab';
import IngredientsTab from '../tabs/IngredientsTab';
import ClientsTab from '../tabs/ClientsTab';
import { normalizeName, similarity, exportIngredientsCSV, exportRecipesCSV, parseIngredientsCSV, parseRecipesCSV, categorizeIngredient } from '../utils';
import { getWeekIdFromDate, createWeekRecord, lockWeek } from '../utils/weekUtils';

const STORAGE_KEY = 'goldfinchChefData';

// Custom hook for admin data
function useAdminData() {
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [deliveryLog, setDeliveryLog] = useState([]);
  const [readyForDelivery, setReadyForDelivery] = useState([]);
  const [clientPortalData, setClientPortalData] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [adminSettings, setAdminSettings] = useState({ routeStartAddress: '' });
  const [customTasks, setCustomTasks] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState({});
  const [recipes, setRecipes] = useState({ protein: [], veg: [], starch: [], sauces: [], breakfast: [], soups: [] });
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [groceryBills, setGroceryBills] = useState([]);
  const [weeks, setWeeks] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.clients) setClients(parsed.clients);
          if (parsed.drivers) setDrivers(parsed.drivers);
          if (parsed.menuItems) setMenuItems(parsed.menuItems);
          if (parsed.deliveryLog) setDeliveryLog(parsed.deliveryLog);
          if (parsed.readyForDelivery) setReadyForDelivery(parsed.readyForDelivery);
          if (parsed.clientPortalData) setClientPortalData(parsed.clientPortalData);
          if (parsed.blockedDates) setBlockedDates(parsed.blockedDates);
          if (parsed.adminSettings) setAdminSettings(parsed.adminSettings);
          if (parsed.customTasks) setCustomTasks(parsed.customTasks);
          if (parsed.weeklyTasks) setWeeklyTasks(parsed.weeklyTasks);
          if (parsed.recipes) setRecipes(parsed.recipes);
          if (parsed.masterIngredients) setMasterIngredients(parsed.masterIngredients);
          if (parsed.groceryBills) setGroceryBills(parsed.groceryBills);
          if (parsed.weeks) setWeeks(parsed.weeks);
        } catch (e) {
          console.error('Error loading saved data:', e);
        }
      }
      setIsLoaded(true);
    };
    loadData();

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) loadData();
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
    const merged = { ...existing, ...updates, lastSaved: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, []);

  const updateDrivers = useCallback((newDrivers) => {
    setDrivers(newDrivers);
    saveData({ drivers: newDrivers });
  }, [saveData]);

  const updateBlockedDates = useCallback((newBlockedDates) => {
    setBlockedDates(newBlockedDates);
    saveData({ blockedDates: newBlockedDates });
  }, [saveData]);

  const updateAdminSettings = useCallback((newSettings) => {
    setAdminSettings(newSettings);
    saveData({ adminSettings: newSettings });
  }, [saveData]);

  const updateCustomTasks = useCallback((newTasks) => {
    setCustomTasks(newTasks);
    saveData({ customTasks: newTasks });
  }, [saveData]);

  const updateMenuItems = useCallback((newMenuItems) => {
    setMenuItems(newMenuItems);
    saveData({ menuItems: newMenuItems });
  }, [saveData]);

  const updateWeeklyTasks = useCallback((newWeeklyTasks) => {
    setWeeklyTasks(newWeeklyTasks);
    saveData({ weeklyTasks: newWeeklyTasks });
  }, [saveData]);

  const updateRecipes = useCallback((newRecipes) => {
    setRecipes(newRecipes);
    saveData({ recipes: newRecipes });
  }, [saveData]);

  const updateMasterIngredients = useCallback((newMasterIngredients) => {
    setMasterIngredients(newMasterIngredients);
    saveData({ masterIngredients: newMasterIngredients });
  }, [saveData]);

  const updateClients = useCallback((newClients) => {
    setClients(newClients);
    saveData({ clients: newClients });
  }, [saveData]);

  const updateGroceryBills = useCallback((newGroceryBills) => {
    setGroceryBills(newGroceryBills);
    saveData({ groceryBills: newGroceryBills });
  }, [saveData]);

  const updateWeeks = useCallback((newWeeks) => {
    setWeeks(newWeeks);
    saveData({ weeks: newWeeks });
  }, [saveData]);

  // Lock a week and create snapshot
  const lockWeekWithSnapshot = useCallback((weekId) => {
    const week = weeks[weekId] || createWeekRecord(weekId);
    if (week.status === 'locked') return week;

    const lockedWeek = lockWeek(week, menuItems, clients);
    const newWeeks = { ...weeks, [weekId]: lockedWeek };
    setWeeks(newWeeks);
    saveData({ weeks: newWeeks });
    return lockedWeek;
  }, [weeks, menuItems, clients, saveData]);

  return {
    clients,
    drivers,
    menuItems,
    deliveryLog,
    readyForDelivery,
    clientPortalData,
    blockedDates,
    adminSettings,
    customTasks,
    weeklyTasks,
    recipes,
    masterIngredients,
    groceryBills,
    isLoaded,
    updateDrivers,
    updateBlockedDates,
    updateAdminSettings,
    updateMenuItems,
    updateWeeklyTasks,
    updateRecipes,
    updateMasterIngredients,
    updateCustomTasks,
    updateClients,
    updateGroceryBills,
    weeks,
    updateWeeks,
    lockWeekWithSnapshot
  };
}

// Helper components
const FormField = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1" style={{ color: '#423d3c' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = "p-2 border-2 rounded-lg";
const borderStyle = { borderColor: '#ebb582' };

// Get week boundaries
function getWeekBounds(date = new Date()) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Styled Menu Card Component - matches client portal
function StyledMenuCard({ client, date, menuItems }) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  // Extract meals from menu items
  const meals = [];
  menuItems.forEach(item => {
    const meal = {
      protein: item.protein,
      sides: [item.veg, item.starch].filter(Boolean)
    };
    if (meal.protein || meal.sides.length > 0) {
      meals.push(meal);
    }
    if (item.extras) {
      item.extras.forEach(extra => {
        meals.push({ protein: extra, sides: [], isExtra: true });
      });
    }
  });

  const displayName = client.displayName || client.name;

  // Calculate renewal date (4 weeks from delivery date)
  const deliveryDate = new Date(date + 'T12:00:00');
  const renewalDate = new Date(deliveryDate);
  renewalDate.setDate(renewalDate.getDate() + 28);
  const renewalFormatted = renewalDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  }).toUpperCase();

  return (
    <div className="overflow-hidden shadow-lg" style={{ backgroundColor: '#fff' }}>
      {/* Header with pattern background */}
      <div
        className="relative px-4 pt-6 pb-8"
        style={{
          backgroundColor: '#f9f9ed',
          backgroundImage: 'url(/pattern4.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <p
          className="text-center mb-2"
          style={{
            fontFamily: '"Glacial Indifference", sans-serif',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: '#5a5a5a'
          }}
        >
          GOLDFINCH CHEF SERVICES
        </p>

        <h2
          className="text-center mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '1.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textDecoration: 'underline',
            textDecorationColor: '#3d59ab',
            textUnderlineOffset: '4px'
          }}
        >
          {displayName}'s Menu
        </h2>

        <p
          className="text-center mb-4"
          style={{
            color: '#5a5a5a',
            fontFamily: '"Beth Ellen", cursive',
            fontSize: '1.4rem'
          }}
        >
          here's what to expect on your plate!
        </p>

        <div className="flex items-center justify-center gap-3">
          <img
            src="/goldfinch5.png"
            alt="Goldfinch"
            className="w-12 h-12 object-contain"
          />
          <p
            style={{
              fontFamily: '"Glacial Indifference", sans-serif',
              fontSize: '14px',
              letterSpacing: '0.2em',
              color: '#5a5a5a'
            }}
          >
            {displayDate}
          </p>
        </div>
      </div>

      {/* Meals section */}
      <div
        className="px-6 py-8"
        style={{ backgroundColor: '#d9a87a' }}
      >
        <div className="space-y-8">
          {meals.map((meal, idx) => (
            <div key={idx} className="text-center">
              {meal.protein && (
                <h3
                  style={{
                    color: '#ffffff',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: meal.sides.length > 0 ? '0.5rem' : 0
                  }}
                >
                  {meal.protein}
                </h3>
              )}
              {meal.sides.length > 0 && (
                <p
                  style={{
                    color: '#f5e6d3',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  {meal.sides.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="relative px-6 py-6"
        style={{
          backgroundColor: '#f9f9ed',
          fontFamily: '"Glacial Indifference", sans-serif'
        }}
      >
        <h4
          className="mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Get Ready!
        </h4>
        <p
          className="mb-4 pr-20"
          style={{
            color: '#5a5a5a',
            fontSize: '0.9rem',
            lineHeight: '1.5'
          }}
        >
          Remember to put out bags, containers, and ice packs. And get excited – great food is on the way!
        </p>
        <img
          src="/stemflower.png"
          alt=""
          className="absolute right-4 bottom-4 h-20 object-contain"
        />
        <p
          style={{
            color: '#3d59ab',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}
        >
          Your subscription renews: {renewalFormatted}
        </p>
      </div>
    </div>
  );
}

// Menu Approval Section Component
function MenuApprovalSection({ clients, menuItems, updateMenuItems, lockWeekWithSnapshot }) {
  const today = new Date().toISOString().split('T')[0];

  // Get unapproved menu items grouped by client and date
  const getUnapprovedMenus = () => {
    const unapproved = menuItems.filter(item => !item.approved && item.date >= today);
    const grouped = {};

    unapproved.forEach(item => {
      const key = `${item.clientName}-${item.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          clientName: item.clientName,
          date: item.date,
          items: []
        };
      }
      grouped[key].items.push(item);
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.clientName.localeCompare(b.clientName);
    });
  };

  const approveMenu = (clientName, date) => {
    // Mark menu items as approved
    const updated = menuItems.map(item =>
      item.clientName === clientName && item.date === date
        ? { ...item, approved: true }
        : item
    );
    updateMenuItems(updated);

    // Lock the week for this date
    const weekId = getWeekIdFromDate(date);
    lockWeekWithSnapshot(weekId);
  };

  const unapprovedMenus = getUnapprovedMenus();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#3d59ab' }}>
          Menu Approval
        </h2>
        <p className="text-gray-600 mb-6">
          Review and approve menus before they appear on client portals.
        </p>

        {unapprovedMenus.length === 0 ? (
          <div className="text-center py-12">
            <Check size={48} className="mx-auto mb-4 text-green-500" />
            <p className="text-gray-600">All menus have been approved!</p>
            <p className="text-sm text-gray-400 mt-2">
              Create new menus in the Menu tab, then come back here to approve them.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            {unapprovedMenus.length} menu{unapprovedMenus.length > 1 ? 's' : ''} pending approval
          </p>
        )}
      </div>

      {unapprovedMenus.map(({ clientName, date, items }) => {
        const client = clients.find(c => c.name === clientName) || { name: clientName };
        const displayName = client.displayName || client.name;

        return (
          <div key={`${clientName}-${date}`} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: '#f9f9ed' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#3d59ab' }}>
                  {displayName}
                </h3>
                <p className="text-sm text-gray-600">
                  Delivery: {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/?tab=menu"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 hover:bg-gray-50"
                  style={{ borderColor: '#ebb582' }}
                >
                  <Edit2 size={18} />
                  Edit
                </Link>
                <button
                  onClick={() => approveMenu(clientName, date)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#10b981' }}
                >
                  <Check size={18} />
                  Approve
                </button>
              </div>
            </div>

            {/* Menu Preview */}
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Preview (as client will see it)</p>
              <div className="max-w-md mx-auto">
                <StyledMenuCard
                  client={client}
                  date={date}
                  menuItems={items}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const {
    clients,
    drivers,
    menuItems,
    deliveryLog,
    readyForDelivery,
    clientPortalData,
    blockedDates,
    adminSettings,
    customTasks,
    weeklyTasks,
    recipes,
    masterIngredients,
    groceryBills,
    isLoaded,
    updateDrivers,
    updateBlockedDates,
    updateAdminSettings,
    updateCustomTasks,
    updateMenuItems,
    updateWeeklyTasks,
    updateRecipes,
    updateMasterIngredients,
    updateClients,
    updateGroceryBills,
    weeks,
    updateWeeks,
    lockWeekWithSnapshot
  } = useAdminData();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [newDriver, setNewDriver] = useState(DEFAULT_NEW_DRIVER);
  const [editingDriverIndex, setEditingDriverIndex] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [newTask, setNewTask] = useState({ title: '', notes: '', dueDate: '' });

  // Menu planning state
  const [menuDate, setMenuDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [newMenuItem, setNewMenuItem] = useState(DEFAULT_NEW_MENU_ITEM);

  // Recipe editing state
  const [newRecipe, setNewRecipe] = useState(DEFAULT_NEW_RECIPE);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const recipesFileRef = React.useRef();

  // Ingredient editing state
  const [newIngredient, setNewIngredient] = useState(DEFAULT_NEW_INGREDIENT);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [editingIngredientData, setEditingIngredientData] = useState(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const ingredientsFileRef = React.useRef();

  // Client management state
  const clientsFileRef = React.useRef();
  const [newClient, setNewClient] = useState({
    name: '', displayName: '', persons: 1,
    contacts: [{ name: '', email: '', phone: '', address: '' }],
    notes: '', mealsPerWeek: 0, frequency: 'weekly', status: 'active',
    pausedDate: '', honeyBookLink: '', billingNotes: '', deliveryDay: '', zone: '',
    pickup: false, planPrice: 0, serviceFee: 0, prepayDiscount: false,
    newClientFeePaid: false, paysOwnGroceries: false
  });

  // Grocery tracking state
  const [newGroceryBill, setNewGroceryBill] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    store: '',
    notes: ''
  });

  const today = new Date();
  const { start: weekStart, end: weekEnd } = getWeekBounds(today);

  // Dashboard calculations
  const getThisWeekDeliveries = () => {
    return readyForDelivery.filter(order => {
      const orderDate = new Date(order.date + 'T12:00:00');
      return orderDate >= weekStart && orderDate <= weekEnd;
    });
  };

  const getThisWeekCompleted = () => {
    return deliveryLog.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
  };

  const getProblemsThisWeek = () => {
    return deliveryLog.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      return entryDate >= weekStart && entryDate <= weekEnd && entry.problem;
    });
  };

  const getRenewalsThisWeek = () => {
    return clients.filter(client => {
      if (client.status !== 'active') return false;
      // Week 4 clients need billing attention
      const lastDelivery = deliveryLog
        .filter(d => d.clientName === client.name)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!lastDelivery) return false;
      const deliveryDate = new Date(lastDelivery.date + 'T12:00:00');
      const renewalDate = new Date(deliveryDate);
      renewalDate.setDate(renewalDate.getDate() + 28);
      return renewalDate >= weekStart && renewalDate <= weekEnd;
    });
  };

  const getSubstitutionRequests = () => {
    return Object.entries(clientPortalData)
      .filter(([_, data]) => data.substitutionRequest)
      .map(([clientName, data]) => ({ clientName, ...data.substitutionRequest }));
  };

  const getClientsNeedingMenus = () => {
    const todayStr = today.toISOString().split('T')[0];
    return clients.filter(client => {
      if (client.status !== 'active') return false;
      // Check if client has delivery this week
      if (!client.deliveryDay) return false;
      const dayNum = { 'Monday': 1, 'Tuesday': 2, 'Thursday': 4 }[client.deliveryDay];
      if (!dayNum) return false;
      // Check each day this week
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === dayNum && d >= today) {
          const dateStr = d.toISOString().split('T')[0];
          const hasMenu = readyForDelivery.some(o => o.clientName === client.name && o.date === dateStr);
          if (!hasMenu) return true;
        }
      }
      return false;
    });
  };

  const getPendingApprovals = () => {
    const todayStr = today.toISOString().split('T')[0];
    const unapproved = menuItems.filter(item => !item.approved && item.date >= todayStr);
    const uniqueMenus = new Set(unapproved.map(item => `${item.clientName}-${item.date}`));
    return uniqueMenus.size;
  };

  const getBagFollowups = () => {
    // Clients who had delivery but haven't returned bags (flagged in deliveryLog)
    return deliveryLog.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      const daysSince = (today - entryDate) / (1000 * 60 * 60 * 24);
      return daysSince >= 3 && daysSince <= 10 && !entry.bagsReturned;
    });
  };

  // Auto-generated tasks
  const getAutoTasks = () => {
    const tasks = [];
    const renewals = getRenewalsThisWeek();
    const needMenus = getClientsNeedingMenus();
    const subs = getSubstitutionRequests();
    const bagFollowups = getBagFollowups();
    const pendingDeliveries = getThisWeekDeliveries();

    if (renewals.length > 0) {
      tasks.push({
        id: 'renewals',
        category: 'Billing & Renewals',
        title: `${renewals.length} client${renewals.length > 1 ? 's' : ''} due for renewal`,
        details: renewals.map(c => c.displayName || c.name),
        icon: CreditCard,
        color: '#f59e0b'
      });
    }

    if (needMenus.length > 0) {
      tasks.push({
        id: 'menus',
        category: 'Menu Planning',
        title: `Plan menus for ${needMenus.length} client${needMenus.length > 1 ? 's' : ''}`,
        details: needMenus.map(c => c.displayName || c.name),
        icon: FileText,
        color: '#3d59ab'
      });
    }

    if (subs.length > 0) {
      tasks.push({
        id: 'substitutions',
        category: 'Substitution Requests',
        title: `${subs.length} substitution request${subs.length > 1 ? 's' : ''} to review`,
        details: subs.map(s => `${s.clientName}: ${s.originalDish} → ${s.requestedSubstitution}`),
        icon: RefreshCw,
        color: '#8b5cf6'
      });
    }

    if (pendingDeliveries.length > 0) {
      tasks.push({
        id: 'delivery-prep',
        category: 'Delivery Prep',
        title: `${pendingDeliveries.length} order${pendingDeliveries.length > 1 ? 's' : ''} ready for delivery`,
        details: pendingDeliveries.map(o => `${o.clientName} - ${formatDate(o.date)}`),
        icon: Package,
        color: '#10b981'
      });
    }

    if (bagFollowups.length > 0) {
      tasks.push({
        id: 'bags',
        category: 'Bags Follow-up',
        title: `Follow up on ${bagFollowups.length} bag return${bagFollowups.length > 1 ? 's' : ''}`,
        details: bagFollowups.map(b => b.clientName),
        icon: ShoppingBag,
        color: '#ec4899'
      });
    }

    // Clients who pay their own groceries and have deliveries this week
    const ownGroceryClients = clients.filter(c => c.paysOwnGroceries && c.status === 'active');
    const ownGroceryDeliveries = ownGroceryClients.filter(client => {
      return pendingDeliveries.some(d => d.clientName === client.name);
    });
    if (ownGroceryDeliveries.length > 0) {
      tasks.push({
        id: 'own-groceries',
        category: 'Grocery Costs',
        title: `Add grocery costs for ${ownGroceryDeliveries.length} client${ownGroceryDeliveries.length > 1 ? 's' : ''}`,
        details: ownGroceryDeliveries.map(c => c.displayName || c.name),
        icon: DollarSign,
        color: '#059669',
        action: 'groceries'
      });
    }

    return tasks;
  };

  // Driver management
  const addDriver = () => {
    if (!newDriver.name) {
      alert('Please enter a driver name');
      return;
    }
    updateDrivers([...drivers, { ...newDriver, id: Date.now() }]);
    setNewDriver(DEFAULT_NEW_DRIVER);
  };

  const deleteDriver = (index) => {
    if (window.confirm('Delete this driver?')) {
      updateDrivers(drivers.filter((_, i) => i !== index));
    }
  };

  const startEditingDriver = (index) => {
    setEditingDriverIndex(index);
    setEditingDriver({ ...drivers[index] });
  };

  const saveEditingDriver = () => {
    const updated = [...drivers];
    updated[editingDriverIndex] = editingDriver;
    updateDrivers(updated);
    setEditingDriverIndex(null);
    setEditingDriver(null);
  };

  // Ingredient helper functions
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
        updateMasterIngredients(masterIngredients.map(mi =>
          mi.id === exactMatch.id
            ? { ...mi, cost: ingredient.cost || mi.cost, source: ingredient.source || mi.source, section: ingredient.section !== 'Other' ? ingredient.section : mi.section }
            : mi
        ));
      }
      return;
    }
    updateMasterIngredients([...masterIngredients, {
      id: Date.now() + Math.random(),
      name: ingredient.name,
      cost: ingredient.cost || '',
      unit: ingredient.unit || 'oz',
      source: ingredient.source || '',
      section: ingredient.section || 'Other'
    }]);
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
      return { ...newMenuItem, clientName, date: menuDate, portions: client ? client.persons : 1, id: Date.now() + Math.random(), approved: false };
    });
    updateMenuItems([...menuItems, ...newItems]);
    setNewMenuItem(DEFAULT_NEW_MENU_ITEM);
  };

  const deleteMenuItem = (id) => updateMenuItems(menuItems.filter(item => item.id !== id));

  const clearMenu = () => {
    if (window.confirm('Clear all menu items?')) {
      updateMenuItems([]);
      setSelectedClients([]);
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

  // Recipe functions
  const saveRecipe = () => {
    if (!newRecipe.name) { alert('Please enter a recipe name'); return; }
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity);
    if (validIngredients.length === 0) { alert('Please add at least one ingredient with name and quantity'); return; }
    validIngredients.forEach(ing => addToMasterIngredients(ing));
    updateRecipes({ ...recipes, [newRecipe.category]: [...recipes[newRecipe.category], { name: newRecipe.name, instructions: newRecipe.instructions, ingredients: validIngredients }] });
    setNewRecipe(DEFAULT_NEW_RECIPE);
    alert('Recipe saved!');
  };

  const deleteRecipe = (category, index) => {
    if (window.confirm('Delete this recipe?')) {
      updateRecipes({ ...recipes, [category]: recipes[category].filter((_, i) => i !== index) });
    }
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
    updateRecipes(updatedRecipes);
    setEditingRecipe(null);
    alert('Recipe updated!');
  };

  // Ingredient management functions
  const addMasterIngredient = () => {
    if (!newIngredient.name) { alert('Please enter an ingredient name'); return; }
    const similar = findSimilarIngredients(newIngredient.name);
    const exact = findExactMatch(newIngredient.name);
    if (exact) { alert(`"${newIngredient.name}" already exists as "${exact.name}"`); return; }
    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${newIngredient.name}" anyway?`)) return;
    updateMasterIngredients([...masterIngredients, { ...newIngredient, id: Date.now() }]);
    setNewIngredient(DEFAULT_NEW_INGREDIENT);
    alert('Ingredient added!');
  };

  const deleteMasterIngredient = (id) => {
    if (window.confirm('Delete this ingredient?')) {
      updateMasterIngredients(masterIngredients.filter(ing => ing.id !== id));
    }
  };

  const startEditingMasterIngredient = (ing) => {
    setEditingIngredientId(ing.id);
    setEditingIngredientData({ ...ing });
  };

  const saveEditingMasterIngredient = () => {
    updateMasterIngredients(masterIngredients.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData } : ing));
    setEditingIngredientId(null);
    setEditingIngredientData(null);
  };

  const cancelEditingMasterIngredient = () => {
    setEditingIngredientId(null);
    setEditingIngredientData(null);
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
    updateRecipes(updatedRecipes);
    updateMasterIngredients(masterIngredients.filter(i => i.id !== removeId));
    setDuplicateWarnings(duplicateWarnings.filter(d => d.ing1.id !== removeId && d.ing2.id !== removeId));
    alert(`Merged "${remove.name}" into "${keep.name}"`);
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty slots for days before first of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days in month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const toggleBlockedDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    if (blockedDates.includes(dateStr)) {
      updateBlockedDates(blockedDates.filter(d => d !== dateStr));
    } else {
      updateBlockedDates([...blockedDates, dateStr]);
    }
  };

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  // Custom tasks
  const addCustomTask = () => {
    if (!newTask.title) {
      alert('Please enter a task title');
      return;
    }
    updateCustomTasks([...customTasks, { ...newTask, id: Date.now(), completed: false }]);
    setNewTask({ title: '', notes: '', dueDate: '' });
  };

  const toggleTaskComplete = (taskId) => {
    updateCustomTasks(customTasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteCustomTask = (taskId) => {
    updateCustomTasks(customTasks.filter(t => t.id !== taskId));
  };

  // Client management functions
  const addClient = () => {
    if (!newClient.name) {
      alert('Please enter a client name');
      return;
    }
    updateClients([...clients, { ...newClient, id: Date.now() }]);
    setNewClient({
      name: '', displayName: '', persons: 1,
      contacts: [{ name: '', email: '', phone: '', address: '' }],
      notes: '', mealsPerWeek: 0, frequency: 'weekly', status: 'active',
      pausedDate: '', honeyBookLink: '', billingNotes: '', deliveryDay: '', zone: '',
      pickup: false, planPrice: 0, serviceFee: 0, prepayDiscount: false,
      newClientFeePaid: false, paysOwnGroceries: false
    });
  };

  const deleteClient = (index) => {
    if (window.confirm('Delete this client?')) {
      updateClients(clients.filter((_, i) => i !== index));
    }
  };

  const exportClientsCSV = () => {
    const headers = ['name', 'displayName', 'persons', 'address', 'email', 'phone', 'mealsPerWeek', 'frequency', 'status', 'zone', 'deliveryDay', 'pickup', 'planPrice', 'serviceFee', 'prepayDiscount', 'newClientFeePaid', 'paysOwnGroceries', 'billingNotes'];
    const csvContent = [
      headers.join(','),
      ...clients.map(c => headers.map(h => `"${(c[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients.csv';
    a.click();
  };

  // Grocery tracking functions
  const addGroceryBill = () => {
    if (!newGroceryBill.amount) {
      alert('Please enter an amount');
      return;
    }
    updateGroceryBills([...groceryBills, { ...newGroceryBill, id: Date.now(), amount: parseFloat(newGroceryBill.amount) }]);
    setNewGroceryBill({ date: new Date().toISOString().split('T')[0], amount: '', store: '', notes: '' });
  };

  const deleteGroceryBill = (id) => {
    if (window.confirm('Delete this bill?')) {
      updateGroceryBills(groceryBills.filter(b => b.id !== id));
    }
  };

  // Analytics calculation functions
  const TAX_RATE = 0.11;

  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const getMonthKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const calculateClientRevenue = (client) => {
    const basePlan = parseFloat(client.planPrice) || 0;
    const serviceFee = client.pickup ? 0 : (parseFloat(client.serviceFee) || 0);
    const subtotal = basePlan + serviceFee;
    const discount = client.prepayDiscount ? subtotal * 0.1 : 0;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * TAX_RATE;
    return {
      basePlan,
      serviceFee,
      discount,
      tax,
      total: afterDiscount + tax
    };
  };

  const getGroceryTotals = (startDate, endDate) => {
    return groceryBills
      .filter(b => b.date >= startDate && b.date <= endDate)
      .reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
  };

  const getClientPortions = (clientName, startDate, endDate) => {
    return deliveryLog
      .filter(d => d.clientName === clientName && d.date >= startDate && d.date <= endDate)
      .reduce((sum, d) => {
        const client = clients.find(c => c.name === clientName);
        return sum + (client?.persons || 1);
      }, 0);
  };

  const getTotalPortionsForGrocerySplit = (startDate, endDate) => {
    // Only count clients who don't pay their own groceries
    const eligibleClients = clients.filter(c => !c.paysOwnGroceries && c.status === 'active');
    return eligibleClients.reduce((sum, client) => {
      const deliveries = deliveryLog.filter(d => d.clientName === client.name && d.date >= startDate && d.date <= endDate);
      return sum + (deliveries.length * (client.persons || 1));
    }, 0);
  };

  const getClientFoodCost = (clientName, startDate, endDate) => {
    const client = clients.find(c => c.name === clientName);
    if (!client || client.paysOwnGroceries) return 0;

    const totalGroceries = getGroceryTotals(startDate, endDate);
    const totalPortions = getTotalPortionsForGrocerySplit(startDate, endDate);
    if (totalPortions === 0) return 0;

    const clientPortions = getClientPortions(clientName, startDate, endDate);
    return (totalGroceries / totalPortions) * clientPortions;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="text-center">
          <ChefHat size={48} className="mx-auto mb-4 animate-pulse" style={{ color: '#ffd700' }} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const autoTasks = getAutoTasks();
  const thisWeekDeliveries = getThisWeekDeliveries();
  const thisWeekCompleted = getThisWeekCompleted();
  const problemsThisWeek = getProblemsThisWeek();
  const renewalsThisWeek = getRenewalsThisWeek();
  const pendingApprovals = getPendingApprovals();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      {/* Header */}
      <header className="text-white p-4" style={{ backgroundColor: '#3d59ab' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat size={32} style={{ color: '#ffd700' }} />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm opacity-80">Goldfinch Chef</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Home size={20} />
            Back to App
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'menu', label: 'Menu Planner', icon: ChefHat },
            { id: 'approvals', label: 'Menu Approval', icon: Eye },
            { id: 'recipes', label: 'Recipes', icon: FileText },
            { id: 'ingredients', label: 'Ingredients', icon: Package },
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
            { id: 'groceries', label: 'Grocery Tracking', icon: Receipt },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'tasks', label: 'Weekly Tasks', icon: ClipboardList },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeSection === section.id
                  ? 'text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={activeSection === section.id ? { backgroundColor: '#3d59ab' } : {}}
            >
              <section.icon size={20} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                This Week at a Glance
              </h2>
              <p className="text-gray-500 mb-6">
                {formatDate(weekStart)} - {formatDate(weekEnd)}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Pending Deliveries */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#dbeafe' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={24} style={{ color: '#3d59ab' }} />
                    <span className="text-sm font-medium text-gray-600">Pending</span>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: '#3d59ab' }}>
                    {thisWeekDeliveries.length}
                  </p>
                  <p className="text-sm text-gray-500">deliveries</p>
                </div>

                {/* Completed */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={24} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Completed</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    {thisWeekCompleted.length}
                  </p>
                  <p className="text-sm text-gray-500">deliveries</p>
                </div>

                {/* Renewals */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw size={24} className="text-amber-600" />
                    <span className="text-sm font-medium text-gray-600">Renewals</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">
                    {renewalsThisWeek.length}
                  </p>
                  <p className="text-sm text-gray-500">due</p>
                </div>

                {/* Pending Approvals */}
                <div
                  className="p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: pendingApprovals > 0 ? '#ede9fe' : '#f3f4f6' }}
                  onClick={() => pendingApprovals > 0 && setActiveSection('approvals')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={24} className={pendingApprovals > 0 ? 'text-purple-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium text-gray-600">Approvals</span>
                  </div>
                  <p className={`text-3xl font-bold ${pendingApprovals > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                    {pendingApprovals}
                  </p>
                  <p className="text-sm text-gray-500">pending</p>
                </div>

                {/* Problems */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: problemsThisWeek.length > 0 ? '#fee2e2' : '#f3f4f6' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={24} className={problemsThisWeek.length > 0 ? 'text-red-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium text-gray-600">Problems</span>
                  </div>
                  <p className={`text-3xl font-bold ${problemsThisWeek.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {problemsThisWeek.length}
                  </p>
                  <p className="text-sm text-gray-500">flagged</p>
                </div>
              </div>
            </div>

            {/* Problems list if any */}
            {problemsThisWeek.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4 text-red-600 flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Flagged Problems
                </h3>
                <div className="space-y-2">
                  {problemsThisWeek.map((entry, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="font-medium">{entry.clientName}</p>
                      <p className="text-sm text-gray-600">{formatDate(entry.date)} - {entry.problem}</p>
                      {entry.problemNotes && <p className="text-sm text-gray-500 mt-1">{entry.problemNotes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to="/"
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <ChefHat size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Menu Planning</p>
              </Link>
              <Link
                to="/driver"
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <Truck size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Driver View</p>
              </Link>
              <button
                onClick={() => setActiveSection('tasks')}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <ClipboardList size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Weekly Tasks</p>
              </button>
              <button
                onClick={() => setActiveSection('settings')}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <Settings size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Settings</p>
              </button>
            </div>
          </div>
        )}

        {/* Menu Planner Section */}
        {activeSection === 'menu' && (
          <MenuTab
            menuDate={menuDate}
            setMenuDate={setMenuDate}
            clients={clients}
            selectedClients={selectedClients}
            setSelectedClients={setSelectedClients}
            recipes={recipes}
            newMenuItem={newMenuItem}
            setNewMenuItem={setNewMenuItem}
            menuItems={menuItems}
            addMenuItem={addMenuItem}
            clearMenu={clearMenu}
            deleteMenuItem={deleteMenuItem}
            getOrdersByClient={getOrdersByClient}
          />
        )}

        {/* Menu Approval Section */}
        {activeSection === 'approvals' && (
          <MenuApprovalSection
            clients={clients}
            menuItems={menuItems}
            updateMenuItems={updateMenuItems}
            lockWeekWithSnapshot={lockWeekWithSnapshot}
          />
        )}

        {/* Recipes Section */}
        {activeSection === 'recipes' && (
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
          />
        )}

        {/* Ingredients Section */}
        {activeSection === 'ingredients' && (
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
            exportIngredientsCSV={() => exportIngredientsCSV(masterIngredients)}
          />
        )}

        {/* Clients Section */}
        {activeSection === 'clients' && (
          <ClientsTab
            clients={clients}
            newClient={newClient}
            setNewClient={setNewClient}
            addClient={addClient}
            deleteClient={deleteClient}
            clientsFileRef={clientsFileRef}
            exportClientsCSV={exportClientsCSV}
            setClients={updateClients}
          />
        )}

        {/* Subscriptions Section */}
        {activeSection === 'subscriptions' && (
          <SubscriptionsTab
            clients={clients}
            weeklyTasks={weeklyTasks}
            setWeeklyTasks={updateWeeklyTasks}
            clientPortalData={clientPortalData}
          />
        )}

        {/* Grocery Tracking Section */}
        {activeSection === 'groceries' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#3d59ab' }}>
                <Receipt size={24} className="inline mr-2" />
                Grocery Tracking
              </h2>
              <p className="text-gray-600 mb-6">
                Track weekly grocery expenses for cost analysis.
              </p>

              {/* Add grocery bill form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <FormField label="Date">
                  <input
                    type="date"
                    value={newGroceryBill.date}
                    onChange={(e) => setNewGroceryBill({ ...newGroceryBill, date: e.target.value })}
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Amount ($)">
                  <input
                    type="number"
                    step="0.01"
                    value={newGroceryBill.amount}
                    onChange={(e) => setNewGroceryBill({ ...newGroceryBill, amount: e.target.value })}
                    placeholder="0.00"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Store">
                  <input
                    type="text"
                    value={newGroceryBill.store}
                    onChange={(e) => setNewGroceryBill({ ...newGroceryBill, store: e.target.value })}
                    placeholder="Store name"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Notes">
                  <input
                    type="text"
                    value={newGroceryBill.notes}
                    onChange={(e) => setNewGroceryBill({ ...newGroceryBill, notes: e.target.value })}
                    placeholder="Optional notes"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
              </div>
              <button
                onClick={addGroceryBill}
                className="px-6 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} className="inline mr-2" />Add Bill
              </button>
            </div>

            {/* Grocery bills list */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Recent Bills ({groceryBills.length})
              </h3>
              {groceryBills.length > 0 ? (
                <div className="space-y-2">
                  {groceryBills
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(bill => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-3 rounded-lg border-2"
                        style={{ borderColor: '#ebb582' }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-lg" style={{ color: '#3d59ab' }}>
                              ${parseFloat(bill.amount).toFixed(2)}
                            </span>
                            <span className="text-gray-600">
                              {new Date(bill.date + 'T12:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            {bill.store && (
                              <span className="text-sm px-2 py-1 rounded bg-gray-100">
                                {bill.store}
                              </span>
                            )}
                          </div>
                          {bill.notes && (
                            <p className="text-sm text-gray-500 mt-1">{bill.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteGroceryBill(bill.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No grocery bills recorded. Add your first bill above.
                </p>
              )}

              {/* Monthly totals */}
              {groceryBills.length > 0 && (
                <div className="mt-6 pt-6 border-t-2" style={{ borderColor: '#ebb582' }}>
                  <h4 className="font-bold mb-3">Monthly Totals</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const monthlyTotals = {};
                      groceryBills.forEach(bill => {
                        const key = getMonthKey(bill.date);
                        monthlyTotals[key] = (monthlyTotals[key] || 0) + parseFloat(bill.amount);
                      });
                      return Object.entries(monthlyTotals)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .slice(0, 4)
                        .map(([month, total]) => (
                          <div key={month} className="p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                            <p className="text-sm text-gray-500">
                              {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                            <p className="font-bold text-lg" style={{ color: '#3d59ab' }}>
                              ${total.toFixed(2)}
                            </p>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {activeSection === 'analytics' && (
          <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#3d59ab' }}>
                <TrendingUp size={24} className="inline mr-2" />
                Analytics Dashboard
              </h2>
              <p className="text-gray-600 mb-6">
                Revenue, costs, and margins at a glance. Tax rate: {(TAX_RATE * 100).toFixed(0)}%
              </p>

              {/* Weekly Summary */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>This Week</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const weekStartStr = weekStart.toISOString().split('T')[0];
                    const weekEndStr = weekEnd.toISOString().split('T')[0];
                    const weekGroceries = getGroceryTotals(weekStartStr, weekEndStr);
                    const activeClients = clients.filter(c => c.status === 'active');
                    const weekRevenue = activeClients.reduce((sum, c) => sum + calculateClientRevenue(c).total, 0);
                    const weekProfit = weekRevenue - weekGroceries;

                    return (
                      <>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#dbeafe' }}>
                          <p className="text-sm text-gray-600 mb-1">Active Clients</p>
                          <p className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
                            {activeClients.length}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                          <p className="text-sm text-gray-600 mb-1">Weekly Revenue</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${weekRevenue.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
                          <p className="text-sm text-gray-600 mb-1">Weekly Groceries</p>
                          <p className="text-2xl font-bold text-amber-600">
                            ${weekGroceries.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: weekProfit >= 0 ? '#dcfce7' : '#fee2e2' }}>
                          <p className="text-sm text-gray-600 mb-1">Weekly Margin</p>
                          <p className={`text-2xl font-bold ${weekProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${weekProfit.toFixed(2)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Monthly Summary */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>This Month</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    const monthStartStr = monthStart.toISOString().split('T')[0];
                    const monthEndStr = monthEnd.toISOString().split('T')[0];
                    const monthGroceries = getGroceryTotals(monthStartStr, monthEndStr);
                    const activeClients = clients.filter(c => c.status === 'active');

                    // Estimate monthly revenue (4 weeks for weekly, 2 for biweekly)
                    const monthRevenue = activeClients.reduce((sum, c) => {
                      const weeklyRev = calculateClientRevenue(c).total;
                      const multiplier = c.frequency === 'biweekly' ? 2 : 4;
                      return sum + (weeklyRev * multiplier);
                    }, 0);
                    const monthProfit = monthRevenue - monthGroceries;
                    const marginPercent = monthRevenue > 0 ? ((monthProfit / monthRevenue) * 100) : 0;

                    return (
                      <>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                          <p className="text-sm text-gray-600 mb-1">Monthly Revenue (Est.)</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${monthRevenue.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
                          <p className="text-sm text-gray-600 mb-1">Monthly Groceries</p>
                          <p className="text-2xl font-bold text-amber-600">
                            ${monthGroceries.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: monthProfit >= 0 ? '#dcfce7' : '#fee2e2' }}>
                          <p className="text-sm text-gray-600 mb-1">Monthly Profit</p>
                          <p className={`text-2xl font-bold ${monthProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${monthProfit.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#ede9fe' }}>
                          <p className="text-sm text-gray-600 mb-1">Profit Margin</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {marginPercent.toFixed(1)}%
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Per-Client Analysis */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                <Users size={20} className="inline mr-2" />
                Per-Client Analysis
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Revenue breakdown and food cost allocation per client.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: '#ebb582' }}>
                      <th className="text-left py-2 px-3">Client</th>
                      <th className="text-right py-2 px-3">Plan</th>
                      <th className="text-right py-2 px-3">Service</th>
                      <th className="text-right py-2 px-3">Discount</th>
                      <th className="text-right py-2 px-3">Tax</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-right py-2 px-3">Food Cost</th>
                      <th className="text-right py-2 px-3">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients
                      .filter(c => c.status === 'active')
                      .sort((a, b) => (b.planPrice || 0) - (a.planPrice || 0))
                      .map((client, idx) => {
                        const rev = calculateClientRevenue(client);
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                        const foodCost = getClientFoodCost(client.name, monthStart, monthEnd);
                        const margin = rev.total - foodCost;
                        const marginPercent = rev.total > 0 ? ((margin / rev.total) * 100) : 0;

                        return (
                          <tr
                            key={client.id || idx}
                            className="border-b hover:bg-gray-50"
                            style={{ borderColor: '#f0f0f0' }}
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{client.displayName || client.name}</span>
                                {client.paysOwnGroceries && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                    Own Groceries
                                  </span>
                                )}
                                {client.prepayDiscount && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                    Prepay
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {client.persons} persons • {client.frequency}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">${rev.basePlan.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right">${rev.serviceFee.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-green-600">
                              {rev.discount > 0 ? `-$${rev.discount.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500">${rev.tax.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold">${rev.total.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-amber-600">
                              {client.paysOwnGroceries ? '-' : `$${foodCost.toFixed(2)}`}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${margin.toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-400 ml-1">
                                ({marginPercent.toFixed(0)}%)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold" style={{ borderColor: '#ebb582' }}>
                      <td className="py-2 px-3">Total ({clients.filter(c => c.status === 'active').length} active)</td>
                      <td className="py-2 px-3 text-right">
                        ${clients.filter(c => c.status === 'active').reduce((s, c) => s + calculateClientRevenue(c).basePlan, 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        ${clients.filter(c => c.status === 'active').reduce((s, c) => s + calculateClientRevenue(c).serviceFee, 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-green-600">
                        -${clients.filter(c => c.status === 'active').reduce((s, c) => s + calculateClientRevenue(c).discount, 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        ${clients.filter(c => c.status === 'active').reduce((s, c) => s + calculateClientRevenue(c).tax, 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right" style={{ color: '#3d59ab' }}>
                        ${clients.filter(c => c.status === 'active').reduce((s, c) => s + calculateClientRevenue(c).total, 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-600">
                        {(() => {
                          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                          return `$${getGroceryTotals(monthStart, monthEnd).toFixed(2)}`;
                        })()}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {(() => {
                          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                          const totalRev = clients.filter(c => c.status === 'active').reduce((s, c) => s + calculateClientRevenue(c).total, 0);
                          const totalCost = getGroceryTotals(monthStart, monthEnd);
                          const totalMargin = totalRev - totalCost;
                          return (
                            <span className={totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ${totalMargin.toFixed(2)}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {activeSection === 'tasks' && (
          <div className="space-y-6">
            {/* Auto-generated tasks */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Weekly Tasks
              </h2>

              {autoTasks.length > 0 ? (
                <div className="space-y-4">
                  {autoTasks.map(task => (
                    <div
                      key={task.id}
                      className={`border-l-4 p-4 rounded-r-lg ${task.action ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                      style={{ borderColor: task.color, backgroundColor: '#f9f9ed' }}
                      onClick={() => task.action && setActiveSection(task.action)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <task.icon size={20} style={{ color: task.color }} />
                          <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: task.color + '20', color: task.color }}>
                            {task.category}
                          </span>
                        </div>
                        {task.action && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                            Click to add →
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold mb-2">{task.title}</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {task.details.slice(0, 5).map((detail, idx) => (
                          <li key={idx}>• {detail}</li>
                        ))}
                        {task.details.length > 5 && (
                          <li className="text-gray-400">...and {task.details.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Check size={48} className="mx-auto mb-4 text-green-500" />
                  <p>All caught up! No pending tasks this week.</p>
                </div>
              )}
            </div>

            {/* Custom tasks */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Custom Tasks
              </h3>

              {/* Add task form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <FormField label="Task Title">
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Notes (optional)">
                  <input
                    type="text"
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder="Additional notes"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Due Date (optional)">
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
              </div>
              <button
                onClick={addCustomTask}
                className="px-6 py-2 rounded-lg text-white mb-6"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} className="inline mr-2" />Add Task
              </button>

              {/* Custom tasks list */}
              {customTasks.length > 0 ? (
                <div className="space-y-2">
                  {customTasks.map(task => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                        task.completed ? 'bg-gray-50 border-gray-200' : 'border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}
                      >
                        {task.completed && <Check size={14} className="text-white" />}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${task.completed ? 'line-through text-gray-400' : ''}`}>
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className="text-sm text-gray-500">{task.notes}</p>
                        )}
                        {task.dueDate && (
                          <p className="text-xs text-gray-400 mt-1">
                            Due: {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteCustomTask(task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No custom tasks. Add one above.</p>
              )}
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            {/* Availability Calendar */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                <Calendar size={24} className="inline mr-2" />
                Availability Calendar
              </h2>
              <p className="text-gray-600 mb-4">
                Click dates to block them from client date selection.
              </p>

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">
                  <ChevronLeft size={24} />
                </button>
                <h3 className="text-lg font-bold">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {getDaysInMonth(calendarMonth).map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} />;
                  const dateStr = date.toISOString().split('T')[0];
                  const isBlocked = blockedDates.includes(dateStr);
                  const isPast = date < new Date(today.toISOString().split('T')[0]);
                  const isToday = dateStr === today.toISOString().split('T')[0];

                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isPast && toggleBlockedDate(date)}
                      disabled={isPast}
                      className={`p-2 rounded-lg text-center transition-colors ${
                        isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : isBlocked
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : isToday
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {blockedDates.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-2">
                    {blockedDates.length} date{blockedDates.length > 1 ? 's' : ''} blocked:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {blockedDates.sort().map(date => (
                      <span
                        key={date}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 flex items-center gap-1"
                      >
                        {formatDate(date)}
                        <button onClick={() => updateBlockedDates(blockedDates.filter(d => d !== date))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Route Starting Address */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                <MapPin size={24} className="inline mr-2" />
                Route Starting Address
              </h2>
              <p className="text-gray-600 mb-4">
                Set the starting address for delivery route optimization.
              </p>
              <FormField label="Starting Address">
                <input
                  type="text"
                  value={adminSettings.routeStartAddress}
                  onChange={(e) => updateAdminSettings({ ...adminSettings, routeStartAddress: e.target.value })}
                  placeholder="Enter your starting address"
                  className={`${inputStyle} w-full`}
                  style={borderStyle}
                />
              </FormField>
            </div>

            {/* Drivers Management */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                <Users size={24} className="inline mr-2" />
                Drivers
              </h2>

              {/* Add driver form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <FormField label="Driver Name">
                  <input
                    type="text"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    placeholder="Enter driver name"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Phone">
                  <input
                    type="tel"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    placeholder="Phone number"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Zone">
                  <select
                    value={newDriver.zone}
                    onChange={(e) => setNewDriver({ ...newDriver, zone: e.target.value })}
                    className={inputStyle}
                    style={borderStyle}
                  >
                    <option value="">Unassigned</option>
                    {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                  </select>
                </FormField>
                <FormField label="Access Code">
                  <input
                    type="text"
                    value={newDriver.accessCode}
                    onChange={(e) => setNewDriver({ ...newDriver, accessCode: e.target.value })}
                    placeholder="Access code"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
              </div>
              <button
                onClick={addDriver}
                className="px-6 py-2 rounded-lg text-white mb-6"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} className="inline mr-2" />Add Driver
              </button>

              {/* Drivers list */}
              {drivers.length > 0 ? (
                <div className="space-y-3">
                  {drivers.map((driver, i) => (
                    <div key={driver.id || i}>
                      {editingDriverIndex === i ? (
                        <div className="border-2 rounded-lg p-4" style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField label="Driver Name">
                              <input
                                type="text"
                                value={editingDriver.name}
                                onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              />
                            </FormField>
                            <FormField label="Phone">
                              <input
                                type="tel"
                                value={editingDriver.phone || ''}
                                onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              />
                            </FormField>
                            <FormField label="Zone">
                              <select
                                value={editingDriver.zone || ''}
                                onChange={(e) => setEditingDriver({ ...editingDriver, zone: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              >
                                <option value="">Unassigned</option>
                                {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                              </select>
                            </FormField>
                            <FormField label="Access Code">
                              <input
                                type="text"
                                value={editingDriver.accessCode || ''}
                                onChange={(e) => setEditingDriver({ ...editingDriver, accessCode: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              />
                            </FormField>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={saveEditingDriver}
                              className="flex items-center gap-1 px-4 py-2 rounded-lg text-white"
                              style={{ backgroundColor: '#3d59ab' }}
                            >
                              <Check size={18} />Save
                            </button>
                            <button
                              onClick={() => { setEditingDriverIndex(null); setEditingDriver(null); }}
                              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-200"
                            >
                              <X size={18} />Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 rounded-lg p-4" style={{ borderColor: '#ebb582' }}>
                          <div className="flex justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-lg">{driver.name}</h3>
                                {driver.zone && (
                                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                                    Zone {driver.zone}
                                  </span>
                                )}
                              </div>
                              {driver.phone && (
                                <p className="text-sm text-gray-600">Phone: {driver.phone}</p>
                              )}
                            </div>
                            <div className="flex gap-2 self-start ml-4">
                              <button onClick={() => startEditingDriver(i)} className="text-blue-600">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteDriver(i)} className="text-red-600">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Access Code */}
                          {driver.accessCode && (
                            <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                              <p className="text-xs text-gray-500 mb-1">Access Code</p>
                              <p className="font-mono font-bold text-lg" style={{ color: '#3d59ab' }}>
                                {driver.accessCode}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => window.open(`/driver?admin_driver=${encodeURIComponent(driver.name)}`, '_blank')}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm"
                              style={{ backgroundColor: '#3d59ab' }}
                            >
                              <ExternalLink size={16} />
                              Preview Driver View
                            </button>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/driver`;
                                navigator.clipboard.writeText(url);
                                alert('Driver login link copied to clipboard!');
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm"
                              style={{ borderColor: '#ebb582' }}
                            >
                              <Copy size={16} />
                              Copy Login Link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No drivers yet. Add your first driver above.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={clientsFileRef}
        accept=".csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          // Handle CSV import for clients
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const text = event.target?.result;
              const lines = text.split('\n').filter(line => line.trim());
              if (lines.length < 2) return;
              const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
              const imported = [];
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
                const client = {};
                headers.forEach((h, idx) => {
                  const val = values[idx] || '';
                  if (['persons', 'mealsPerWeek', 'planPrice', 'serviceFee'].includes(h)) {
                    client[h] = parseFloat(val) || 0;
                  } else if (['pickup', 'prepayDiscount', 'newClientFeePaid', 'paysOwnGroceries'].includes(h)) {
                    client[h] = val.toLowerCase() === 'true';
                  } else {
                    client[h] = val;
                  }
                });
                if (client.name) imported.push({ ...client, id: Date.now() + i });
              }
              if (imported.length > 0) {
                updateClients([...clients, ...imported]);
                alert(`Imported ${imported.length} clients!`);
              }
            } catch (err) {
              alert('Error importing CSV: ' + err.message);
            }
          };
          reader.readAsText(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
