import React, { useState, useRef } from 'react';
import { ChefHat, ChevronLeft, ChevronRight } from 'lucide-react';

import { useAppData } from './hooks/useAppData';
import { findExactMatch, normalizeName, categorizeIngredient, getRecipeCost } from './utils/ingredients';
import { importClientsCSV, importRecipesCSV, importIngredientsCSV } from './utils/csv';
import { getWeekId, getWeekIdFromDate, formatWeekRange, getAdjacentWeekId, getWeekStartDate } from '../utils/weekUtils';

// Navigation components
import TopNav from './components/TopNav';
import SubNav, { DEFAULT_SUBVIEWS } from './components/SubNav';
import WeekSelector from '../components/WeekSelector';

// View components
import MenuTab from './components/MenuTab';
import TimelineView from './components/TimelineView';
import RecipesTab from './components/RecipesTab';
import KDSTab from '../tabs/KDSTab';
import PrepListTab from './components/PrepListTab';
import HistoryTab from './components/HistoryTab';
import ClientsTab from './components/ClientsTab';
import IngredientsTab from './components/IngredientsTab';

export default function App() {
  const {
    recipes, setRecipes,
    menuItems, setMenuItems,
    clients, setClients,
    masterIngredients, setMasterIngredients,
    orderHistory, setOrderHistory,
    deliverySchedule, setDeliverySchedule
  } = useAppData();

  // Two-level navigation state
  const [activeSection, setActiveSection] = useState('schedule');
  const [activeSubview, setActiveSubview] = useState('weekly-schedule');

  // Week selection state
  const [selectedWeekId, setSelectedWeekId] = useState(getWeekId());
  const [weeks, setWeeks] = useState({});

  // KDS state
  const [kdsLoading, setKdsLoading] = useState(false);
  const [kdsLastRefresh, setKdsLastRefresh] = useState(null);
  const [lastMenusApprovedAt, setLastMenusApprovedAt] = useState(null);
  const [unapprovedMenuCount, setUnapprovedMenuCount] = useState(0);
  const [unapprovedByClient, setUnapprovedByClient] = useState({});

  // Menu building state
  const [selectedClients, setSelectedClients] = useState([]);
  const [menuDate, setMenuDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMenuItem, setNewMenuItem] = useState({ protein: '', veg: '', starch: '', extras: [], portions: 1 });
  const [completedDishes, setCompletedDishes] = useState({});

  const clientsFileRef = useRef();
  const recipesFileRef = useRef();
  const ingredientsFileRef = useRef();

  // Calculate week stats based on selectedWeekId (global source of truth)
  const getWeekStats = () => {
    const weekKey = getWeekStartDate(selectedWeekId);
    const activeClients = clients.filter(c => c.status === 'Active');

    return activeClients.reduce(
      (stats, client) => {
        const scheduleKey = `${client.name}::${weekKey}`;
        const data = deliverySchedule[scheduleKey] || { status: 'inactive' };

        if (data.status === 'scheduled') {
          stats.scheduled++;
          stats.unpaid++;
          stats.portions += client.persons || 0;
        } else if (data.status === 'paid') {
          stats.scheduled++;
          stats.paid++;
          stats.portions += client.persons || 0;
        }
        return stats;
      },
      { scheduled: 0, paid: 0, unpaid: 0, portions: 0 }
    );
  };

  const weekStats = getWeekStats();

  // Ingredient management
  const addToMasterIngredients = (ingredient) => {
    if (!ingredient.name) return;
    const exactMatch = findExactMatch(ingredient.name, masterIngredients);
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
      return { ...newMenuItem, clientName, date: menuDate, portions: client ? client.persons : 1, id: Date.now() + Math.random() };
    });
    setMenuItems(prev => [...prev, ...newItems]);
    setNewMenuItem({ protein: '', veg: '', starch: '', extras: [], portions: 1 });
  };

  const deleteMenuItem = (id) => setMenuItems(menuItems.filter(item => item.id !== id));

  const clearMenu = () => {
    if (window.confirm('Clear all menu items?')) {
      setMenuItems([]);
      setSelectedClients([]);
      setCompletedDishes({});
    }
  };

  // KDS functions (now Dish Totals)
  // Returns structure: { monTue: { protein: {}, veg: {}, starch: {}, extras: {} }, thursday: {...} }
  const getKDSView = () => {
    // Initialize production day structure
    const kds = {
      monTue: { protein: {}, veg: {}, starch: {}, extras: {} },
      thursday: { protein: {}, veg: {}, starch: {}, extras: {} }
    };

    // Helper to determine production day from item date
    const getProductionDay = (dateStr) => {
      if (!dateStr) return 'monTue';
      const date = new Date(dateStr + 'T12:00:00');
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      // Thursday deliveries → thursday production
      // Mon/Tue deliveries → monTue production
      return dayOfWeek === 4 ? 'thursday' : 'monTue';
    };

    // Helper to add dish to KDS structure
    const addDish = (prodDay, category, dishName, item) => {
      const target = kds[prodDay][category];
      if (!target[dishName]) {
        target[dishName] = { totalPortions: 0, category, clients: [] };
      }
      target[dishName].totalPortions += item.portions || 1;
      target[dishName].clients.push({ name: item.clientName, portions: item.portions || 1 });
    };

    // Filter and process menu items
    menuItems
      .filter(item => {
        // Week filter: item's date must match selectedWeekId
        if (!item.date) return false;
        const itemWeekId = getWeekIdFromDate(item.date);
        return itemWeekId === selectedWeekId;
      })
      .forEach(item => {
        const prodDay = getProductionDay(item.date);

        // Process protein, veg, starch
        ['protein', 'veg', 'starch'].forEach(type => {
          if (item[type]) {
            addDish(prodDay, type, item[type], item);
          }
        });

        // Process extras (sauces, breakfast, soups → all go to 'extras' category)
        if (item.extras && item.extras.length > 0) {
          item.extras.forEach(extra => {
            addDish(prodDay, 'extras', extra, item);
          });
        }
      });

    return kds;
  };

  const toggleDishComplete = (dishName) => {
    setCompletedDishes(prev => ({ ...prev, [dishName]: !prev[dishName] }));
  };

  // Check if all dishes in KDS view are complete
  const allDishesComplete = () => {
    const kds = getKDSView();
    // Collect all dish names from both production days and all categories
    const allDishNames = [];
    ['monTue', 'thursday'].forEach(prodDay => {
      ['protein', 'veg', 'starch', 'extras'].forEach(category => {
        Object.keys(kds[prodDay]?.[category] || {}).forEach(name => {
          allDishNames.push(name);
        });
      });
    });
    if (allDishNames.length === 0) return false;
    return allDishNames.every(name => completedDishes[name]);
  };

  // Current week is the selected week
  const currentWeek = selectedWeekId;

  const completeAllOrders = () => {
    if (!window.confirm('Mark all orders complete and move to history?')) return;
    const ordersByClient = {};
    menuItems.forEach(item => {
      if (!ordersByClient[item.clientName]) ordersByClient[item.clientName] = [];
      ordersByClient[item.clientName].push(item);
    });

    const newHistoryEntries = [];
    Object.entries(ordersByClient).forEach(([clientName, orders]) => {
      orders.forEach(order => {
        const dishes = [order.protein, order.veg, order.starch, ...(order.extras || [])].filter(Boolean);
        let totalCost = 0;
        dishes.forEach(dishName => {
          const category = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'].find(cat => recipes[cat]?.find(r => r.name === dishName));
          const recipe = category ? recipes[category].find(r => r.name === dishName) : null;
          if (recipe) totalCost += getRecipeCost(recipe, masterIngredients) * order.portions;
        });
        newHistoryEntries.push({
          id: Date.now() + Math.random(),
          clientName,
          date: order.date || menuDate,
          dishes,
          portions: order.portions,
          cost: totalCost
        });
      });
    });
    setOrderHistory(prev => [...prev, ...newHistoryEntries]);
    setMenuItems([]);
    setCompletedDishes({});
    setSelectedClients([]);
    alert('Orders moved to history!');
  };

  // Prep list
  const getPrepList = () => {
    const ingredients = {};
    const kds = getKDSView();
    Object.entries(kds).forEach(([dishName, data]) => {
      const recipe = recipes[data.category]?.find(r => r.name === dishName);
      if (recipe?.ingredients) {
        recipe.ingredients.forEach(ing => {
          const masterIng = findExactMatch(ing.name, masterIngredients);
          const key = `${ing.name}-${ing.unit}`;
          if (!ingredients[key]) {
            ingredients[key] = {
              name: ing.name,
              quantity: 0,
              unit: ing.unit || 'oz',
              section: ing.section || masterIng?.section || categorizeIngredient(ing.name),
              cost: masterIng?.cost || ing.cost || '',
              source: masterIng?.source || ing.source || ''
            };
          }
          ingredients[key].quantity += parseFloat(ing.quantity) * data.totalPortions;
        });
      }
    });
    return Object.values(ingredients).sort((a, b) => {
      const sourceCompare = (a.source || 'ZZZ').localeCompare(b.source || 'ZZZ');
      if (sourceCompare !== 0) return sourceCompare;
      return a.section.localeCompare(b.section);
    });
  };

  // CSV import handlers
  const handleImportClients = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importClientsCSV(file, (imported) => {
      setClients(imported);
      alert(`Imported ${imported.length} clients!`);
    });
    e.target.value = '';
  };

  const handleImportRecipes = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importRecipesCSV(file, (newRecipes, ingredientsToAdd) => {
      setRecipes(newRecipes);
      ingredientsToAdd.forEach(ing => addToMasterIngredients(ing));
      alert(`Imported ${Object.values(newRecipes).flat().length} recipes!`);
    });
    e.target.value = '';
  };

  const handleImportIngredients = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importIngredientsCSV(file, (imported) => {
      setMasterIngredients(imported);
      alert(`Imported ${imported.length} ingredients!`);
    });
    e.target.value = '';
  };

  // Render the appropriate view based on section and subview
  const renderContent = () => {
    // Schedule section
    if (activeSection === 'schedule') {
      return (
        <TimelineView
          clients={clients}
          deliverySchedule={deliverySchedule}
          setDeliverySchedule={setDeliverySchedule}
        />
      );
    }

    // Menu section
    if (activeSection === 'menu') {
      return (
        <MenuTab
          clients={clients}
          selectedClients={selectedClients}
          setSelectedClients={setSelectedClients}
          menuDate={menuDate}
          setMenuDate={setMenuDate}
          newMenuItem={newMenuItem}
          setNewMenuItem={setNewMenuItem}
          recipes={recipes}
          menuItems={menuItems}
          addMenuItem={addMenuItem}
          deleteMenuItem={deleteMenuItem}
          clearMenu={clearMenu}
        />
      );
    }

    // Kitchen section
    if (activeSection === 'kitchen') {
      switch (activeSubview) {
        case 'dish-totals':
          return (
            <>
              <div className="mb-4">
                <WeekSelector
                  selectedWeekId={selectedWeekId}
                  setSelectedWeekId={setSelectedWeekId}
                  weeks={weeks}
                  compact={true}
                />
              </div>
              <KDSTab
                menuItems={menuItems}
                recipes={recipes}
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
                unapprovedMenuCount={unapprovedMenuCount}
                unapprovedByClient={unapprovedByClient}
              />
            </>
          );
        case 'shopping-list':
          return <PrepListTab prepList={getPrepList()} />;
        case 'recipes':
          return (
            <RecipesTab
              recipes={recipes}
              setRecipes={setRecipes}
              masterIngredients={masterIngredients}
              addToMasterIngredients={addToMasterIngredients}
              recipesFileRef={recipesFileRef}
            />
          );
        case 'ingredients':
          return (
            <IngredientsTab
              masterIngredients={masterIngredients}
              setMasterIngredients={setMasterIngredients}
              recipes={recipes}
              setRecipes={setRecipes}
              ingredientsFileRef={ingredientsFileRef}
            />
          );
        default:
          return (
            <>
              <div className="mb-4">
                <WeekSelector
                  selectedWeekId={selectedWeekId}
                  setSelectedWeekId={setSelectedWeekId}
                  weeks={weeks}
                  compact={true}
                />
              </div>
              <KDSTab
                menuItems={menuItems}
                recipes={recipes}
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
                unapprovedMenuCount={unapprovedMenuCount}
                unapprovedByClient={unapprovedByClient}
              />
            </>
          );
      }
    }

    // Clients section
    if (activeSection === 'clients') {
      switch (activeSubview) {
        case 'directory':
          return (
            <ClientsTab
              clients={clients}
              setClients={setClients}
              clientsFileRef={clientsFileRef}
            />
          );
        case 'history':
          return <HistoryTab orderHistory={orderHistory} />;
        default:
          return (
            <ClientsTab
              clients={clients}
              setClients={setClients}
              clientsFileRef={clientsFileRef}
            />
          );
      }
    }

    // Fallback to Schedule
    return (
      <TimelineView
        clients={clients}
        deliverySchedule={deliverySchedule}
        setDeliverySchedule={setDeliverySchedule}
      />
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      <input type="file" ref={clientsFileRef} onChange={handleImportClients} accept=".csv" className="hidden" />
      <input type="file" ref={recipesFileRef} onChange={handleImportRecipes} accept=".csv" className="hidden" />
      <input type="file" ref={ingredientsFileRef} onChange={handleImportIngredients} accept=".csv" className="hidden" />

      {/* Layer 1: Global Week Bar */}
      <div className="text-white px-4 py-1.5" style={{ backgroundColor: '#3d59ab' }}>
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <ChefHat size={18} style={{ color: '#ffd700' }} />
            <span className="font-bold text-sm">Goldfinch Chef</span>
          </div>

          {/* Center: Week navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWeekId(getAdjacentWeekId(selectedWeekId, -1))}
              className="p-1 rounded hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-sm min-w-[140px] text-center">
              {formatWeekRange(selectedWeekId)}
            </span>
            <button
              onClick={() => setSelectedWeekId(getAdjacentWeekId(selectedWeekId, 1))}
              className="p-1 rounded hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-xs opacity-75 ml-1">
              {selectedWeekId.split('-')[1]}
            </span>
          </div>

          {/* Right: Week stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-center">
              <div className="font-bold">{weekStats.scheduled}</div>
              <div className="opacity-75">Scheduled</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-300">{weekStats.paid}</div>
              <div className="opacity-75">Paid</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-amber-300">{weekStats.unpaid}</div>
              <div className="opacity-75">Unpaid</div>
            </div>
            <div className="text-center border-l border-white/30 pl-3">
              <div className="font-bold">{weekStats.portions}</div>
              <div className="opacity-75">Portions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Layer 2: Primary Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <TopNav
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            setActiveSubview={setActiveSubview}
            defaultSubviews={DEFAULT_SUBVIEWS}
          />
        </div>
      </nav>

      {/* Secondary Navigation (subviews) */}
      <SubNav
        activeSection={activeSection}
        activeSubview={activeSubview}
        setActiveSubview={setActiveSubview}
      />

      {/* Content Area */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {renderContent()}
      </div>
    </div>
  );
}
