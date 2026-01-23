import React, { useRef, useState } from 'react';
import { ChefHat } from 'lucide-react';
import Tabs from './components/Tabs';
import WorkflowStatus from './components/WorkflowStatus';
import { useAppData } from './hooks/useAppData';
import {
  MenuTab,
  RecipesTab,
  KDSTab,
  PrepTab,
  HistoryTab,
  ClientsTab,
  IngredientsTab,
  SubscriptionsTab,
  DriversTab,
  DeliveriesTab
} from './tabs';
import {
  categorizeIngredient,
  exportClientsCSV,
  exportIngredientsCSV,
  exportRecipesCSV,
  parseClientsCSV,
  parseIngredientsCSV,
  parseRecipesCSV,
  downloadCSV
} from './utils';
import { DEFAULT_NEW_CLIENT, DEFAULT_NEW_RECIPE, DEFAULT_NEW_MENU_ITEM, DEFAULT_NEW_INGREDIENT } from './constants';
import Papa from 'papaparse';

export default function App() {
  const [activeTab, setActiveTab] = useState('menu');
  const {
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
    findSimilarIngredients,
    findExactMatch,
    addToMasterIngredients,
    mergeIngredients,
    scanForDuplicates,
    getRecipeCost,
    getRecipeCounts
  } = useAppData();

  const clientsFileRef = useRef();
  const recipesFileRef = useRef();
  const ingredientsFileRef = useRef();

  // CSV Import handlers
  const importClientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parseClientsCSV(
      file,
      (imported) => { setClients(imported); alert(`Imported ${imported.length} clients!`); },
      (err) => alert('Error parsing CSV: ' + err.message)
    );
    e.target.value = '';
  };

  const importIngredientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parseIngredientsCSV(
      file,
      (imported) => { setMasterIngredients(imported); alert(`Imported ${imported.length} ingredients!`); },
      (err) => alert('Error parsing CSV: ' + err.message)
    );
    e.target.value = '';
  };

  const importRecipesCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parseRecipesCSV(
      file,
      (newRecipes, ingredientsToAdd) => {
        setRecipes(newRecipes);
        ingredientsToAdd.forEach(ing => addToMasterIngredients(ing));
        alert(`Imported ${Object.values(newRecipes).flat().length} recipes!`);
      },
      (err) => alert('Error parsing CSV: ' + err.message)
    );
    e.target.value = '';
  };

  // Recipe functions
  const saveRecipe = () => {
    if (!newRecipe.name) { alert('Please enter a recipe name'); return; }
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity);
    if (validIngredients.length === 0) { alert('Please add at least one ingredient with name and quantity'); return; }
    validIngredients.forEach(ing => addToMasterIngredients(ing));
    setRecipes({ ...recipes, [newRecipe.category]: [...recipes[newRecipe.category], { name: newRecipe.name, instructions: newRecipe.instructions, ingredients: validIngredients }] });
    setNewRecipe(DEFAULT_NEW_RECIPE);
    alert('Recipe saved!');
  };

  const deleteRecipe = (category, index) => {
    if (window.confirm('Delete this recipe?')) {
      setRecipes({ ...recipes, [category]: recipes[category].filter((_, i) => i !== index) });
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
    setRecipes(updatedRecipes);
    setEditingRecipe(null);
    alert('Recipe updated!');
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
    setNewMenuItem(DEFAULT_NEW_MENU_ITEM);
  };

  const deleteMenuItem = (id) => setMenuItems(menuItems.filter(item => item.id !== id));

  const clearMenu = () => {
    if (window.confirm('Clear all menu items?')) {
      setMenuItems([]);
      setSelectedClients([]);
      setCompletedDishes({});
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

  // KDS functions
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
          const category = recipes.sauces.find(r => r.name === extra) ? 'sauces' : recipes.breakfast.find(r => r.name === extra) ? 'breakfast' : 'soups';
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

  const allDishesComplete = () => {
    const kds = getKDSView();
    const dishNames = Object.keys(kds);
    return dishNames.length > 0 && dishNames.every(name => completedDishes[name]);
  };

  const completeAllOrders = () => {
    if (!window.confirm('Mark all orders complete and move to Ready for Delivery?')) return;
    const ordersByClient = getOrdersByClient();
    const newReadyEntries = [];
    Object.entries(ordersByClient).forEach(([clientName, orders]) => {
      orders.forEach(order => {
        const dishes = [order.protein, order.veg, order.starch, ...(order.extras || [])].filter(Boolean);
        let totalCost = 0;
        dishes.forEach(dishName => {
          const category = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'].find(cat => recipes[cat]?.find(r => r.name === dishName));
          const recipe = category ? recipes[category].find(r => r.name === dishName) : null;
          if (recipe) totalCost += getRecipeCost(recipe) * order.portions;
        });
        newReadyEntries.push({
          id: Date.now() + Math.random(),
          clientName,
          date: order.date || menuDate,
          dishes,
          portions: order.portions,
          cost: totalCost
        });
      });
    });
    setReadyForDelivery(prev => [...prev, ...newReadyEntries]);
    setMenuItems([]);
    setCompletedDishes({});
    setSelectedClients([]);
    alert('Orders ready for delivery!');
  };

  // Prep list
  const getPrepList = () => {
    const ingredients = {};
    const kds = getKDSView();
    Object.entries(kds).forEach(([dishName, data]) => {
      const recipe = recipes[data.category]?.find(r => r.name === dishName);
      if (recipe?.ingredients) {
        recipe.ingredients.forEach(ing => {
          const masterIng = findExactMatch(ing.name);
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

  const exportPrepList = () => {
    const prepList = getPrepList();
    downloadCSV(Papa.unparse(prepList.map(item => ({
      Source: item.source,
      Section: item.section,
      Ingredient: item.name,
      Quantity: item.quantity.toFixed(2),
      Unit: item.unit
    })), { columns: ['Source', 'Section', 'Ingredient', 'Quantity', 'Unit'] }), 'shopping-list.csv');
  };

  // History
  const getHistoryByClient = () => {
    const grouped = {};
    orderHistory.forEach(order => {
      if (!grouped[order.clientName]) grouped[order.clientName] = [];
      grouped[order.clientName].push(order);
    });
    Object.keys(grouped).forEach(client => {
      grouped[client].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return grouped;
  };

  // Client functions
  const addClient = () => {
    if (!newClient.name) { alert('Please enter a client name'); return; }
    setClients([...clients, { ...newClient }]);
    setNewClient(DEFAULT_NEW_CLIENT);
    alert('Client added!');
  };

  const deleteClient = (index) => {
    if (window.confirm('Delete this client?')) {
      setClients(clients.filter((_, i) => i !== index));
    }
  };

  // Ingredient functions
  const addMasterIngredient = () => {
    if (!newIngredient.name) { alert('Please enter an ingredient name'); return; }
    const similar = findSimilarIngredients(newIngredient.name);
    const exact = findExactMatch(newIngredient.name);
    if (exact) { alert(`"${newIngredient.name}" already exists as "${exact.name}"`); return; }
    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${newIngredient.name}" anyway?`)) return;
    setMasterIngredients([...masterIngredients, { ...newIngredient, id: Date.now() }]);
    setNewIngredient(DEFAULT_NEW_INGREDIENT);
    alert('Ingredient added!');
  };

  const deleteMasterIngredient = (id) => {
    if (window.confirm('Delete this ingredient?')) {
      setMasterIngredients(masterIngredients.filter(ing => ing.id !== id));
    }
  };

  const startEditingMasterIngredient = (ing) => {
    setEditingIngredientId(ing.id);
    setEditingIngredientData({ ...ing });
  };

  const saveEditingMasterIngredient = () => {
    setMasterIngredients(prev => prev.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData } : ing));
    setEditingIngredientId(null);
    setEditingIngredientData(null);
  };

  const cancelEditingMasterIngredient = () => {
    setEditingIngredientId(null);
    setEditingIngredientData(null);
  };

  const prepList = getPrepList();
  const historyByClient = getHistoryByClient();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      <input type="file" ref={clientsFileRef} onChange={importClientsCSV} accept=".csv" className="hidden" />
      <input type="file" ref={recipesFileRef} onChange={importRecipesCSV} accept=".csv" className="hidden" />
      <input type="file" ref={ingredientsFileRef} onChange={importIngredientsCSV} accept=".csv" className="hidden" />

      <header className="text-white p-4" style={{ backgroundColor: '#3d59ab' }}>
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <ChefHat size={32} style={{ color: '#ffd700' }} />
            <h1 className="text-2xl font-bold">Goldfinch Chef</h1>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {['menu', 'kds', 'deliveries', 'history'].includes(activeTab) && (
          <WorkflowStatus
            menuItems={menuItems}
            completedDishes={completedDishes}
            readyForDelivery={readyForDelivery}
            deliveryLog={deliveryLog}
            orderHistory={orderHistory}
            selectedDate={menuDate}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'menu' && (
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

        {activeTab === 'recipes' && (
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

        {activeTab === 'kds' && (
          <KDSTab
            menuItems={menuItems}
            recipes={recipes}
            completedDishes={completedDishes}
            toggleDishComplete={toggleDishComplete}
            allDishesComplete={allDishesComplete}
            completeAllOrders={completeAllOrders}
            getKDSView={getKDSView}
          />
        )}

        {activeTab === 'prep' && (
          <PrepTab prepList={prepList} exportPrepList={exportPrepList} />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            historyByClient={historyByClient}
            orderHistory={orderHistory}
            setOrderHistory={setOrderHistory}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsTab
            clients={clients}
            setClients={setClients}
            newClient={newClient}
            setNewClient={setNewClient}
            addClient={addClient}
            deleteClient={deleteClient}
            clientsFileRef={clientsFileRef}
            exportClientsCSV={() => exportClientsCSV(clients)}
          />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionsTab
            clients={clients}
            weeklyTasks={weeklyTasks}
            setWeeklyTasks={setWeeklyTasks}
          />
        )}

        {activeTab === 'drivers' && (
          <DriversTab
            drivers={drivers}
            setDrivers={setDrivers}
            newDriver={newDriver}
            setNewDriver={setNewDriver}
          />
        )}

        {activeTab === 'deliveries' && (
          <DeliveriesTab
            clients={clients}
            drivers={drivers}
            deliveryLog={deliveryLog}
            setDeliveryLog={setDeliveryLog}
            bagReminders={bagReminders}
            setBagReminders={setBagReminders}
            readyForDelivery={readyForDelivery}
            setReadyForDelivery={setReadyForDelivery}
            orderHistory={orderHistory}
            setOrderHistory={setOrderHistory}
          />
        )}

        {activeTab === 'ingredients' && (
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
      </div>
    </div>
  );
}
