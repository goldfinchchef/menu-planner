import React, { useState, useRef } from 'react';
import { ChefHat } from 'lucide-react';

import { useAppData } from './hooks/useAppData';
import { findExactMatch, normalizeName, categorizeIngredient, getRecipeCost } from './utils/ingredients';
import { importClientsCSV, importRecipesCSV, importIngredientsCSV } from './utils/csv';

// Navigation components
import TopNav from './components/TopNav';
import SubNav, { DEFAULT_SUBVIEWS } from './components/SubNav';

// View components
import DashboardView from './components/DashboardView';
import MenuTab from './components/MenuTab';
import TimelineView from './components/TimelineView';
import RecipesTab from './components/RecipesTab';
import KDSTab from './components/KDSTab';
import PrepListTab from './components/PrepListTab';
import HistoryTab from './components/HistoryTab';
import ClientsTab from './components/ClientsTab';
import IngredientsTab from './components/IngredientsTab';
import BillingView from './components/BillingView';
import PackagesView from './components/PackagesView';
import CostingView from './components/CostingView';

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
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeSubview, setActiveSubview] = useState(null);

  // Menu building state
  const [selectedClients, setSelectedClients] = useState([]);
  const [menuDate, setMenuDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMenuItem, setNewMenuItem] = useState({ protein: '', veg: '', starch: '', extras: [], portions: 1 });
  const [completedDishes, setCompletedDishes] = useState({});

  const clientsFileRef = useRef();
  const recipesFileRef = useRef();
  const ingredientsFileRef = useRef();

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
  const getKDSView = () => {
    const kds = {};
    menuItems.forEach(item => {
      ['protein', 'veg', 'starch'].forEach(type => {
        if (item[type]) {
          if (!kds[item[type]]) kds[item[type]] = { totalPortions: 0, category: type, clients: [] };
          kds[item[type]].totalPortions += item.portions;
          kds[item[type]].clients.push({ name: item.clientName, portions: item.portions });
        }
      });
      if (item.extras) {
        item.extras.forEach(extra => {
          const category = recipes.sauces.find(r => r.name === extra) ? 'sauces'
            : recipes.breakfast.find(r => r.name === extra) ? 'breakfast' : 'soups';
          if (!kds[extra]) kds[extra] = { totalPortions: 0, category, clients: [] };
          kds[extra].totalPortions += item.portions;
          kds[extra].clients.push({ name: item.clientName, portions: item.portions });
        });
      }
    });
    return kds;
  };

  const toggleDishComplete = (dishName) => {
    setCompletedDishes(prev => ({ ...prev, [dishName]: !prev[dishName] }));
  };

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
    // Dashboard - no subviews
    if (activeSection === 'dashboard') {
      return <DashboardView />;
    }

    // Top-level Menus - direct view, same as Clients > Menus
    if (activeSection === 'menus') {
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

    // Clients section
    if (activeSection === 'clients') {
      switch (activeSubview) {
        case 'schedule':
          return (
            <TimelineView
              clients={clients}
              deliverySchedule={deliverySchedule}
              setDeliverySchedule={setDeliverySchedule}
            />
          );
        case 'directory':
          return (
            <ClientsTab
              clients={clients}
              setClients={setClients}
              clientsFileRef={clientsFileRef}
            />
          );
        case 'billing':
          return <BillingView />;
        case 'packages':
          return <PackagesView />;
        case 'menus':
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
        default:
          return (
            <TimelineView
              clients={clients}
              deliverySchedule={deliverySchedule}
              setDeliverySchedule={setDeliverySchedule}
            />
          );
      }
    }

    // Kitchen section
    if (activeSection === 'kitchen') {
      switch (activeSubview) {
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
        case 'costing':
          return <CostingView />;
        case 'dish-totals':
          return (
            <KDSTab
              menuItems={menuItems}
              recipes={recipes}
              completedDishes={completedDishes}
              toggleDishComplete={toggleDishComplete}
              completeAllOrders={completeAllOrders}
              getKDSView={getKDSView}
            />
          );
        case 'shop':
          return <PrepListTab prepList={getPrepList()} />;
        case 'history':
          return <HistoryTab orderHistory={orderHistory} />;
        default:
          return (
            <RecipesTab
              recipes={recipes}
              setRecipes={setRecipes}
              masterIngredients={masterIngredients}
              addToMasterIngredients={addToMasterIngredients}
              recipesFileRef={recipesFileRef}
            />
          );
      }
    }

    // Fallback
    return <DashboardView />;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      <input type="file" ref={clientsFileRef} onChange={handleImportClients} accept=".csv" className="hidden" />
      <input type="file" ref={recipesFileRef} onChange={handleImportRecipes} accept=".csv" className="hidden" />
      <input type="file" ref={ingredientsFileRef} onChange={handleImportIngredients} accept=".csv" className="hidden" />

      {/* Header */}
      <header className="text-white p-4" style={{ backgroundColor: '#3d59ab' }}>
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <ChefHat size={32} style={{ color: '#ffd700' }} />
            <h1 className="text-2xl font-bold">Goldfinch Chef</h1>
          </div>
        </div>
      </header>

      {/* Primary Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-10">
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
