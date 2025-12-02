import KDSView from './components/KDSView';
import RecipesView from './components/RecipesView';
import MenuView from './components/MenuView';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, List, Book, ChefHat, Users, X, Monitor, Save, Download, Upload, Edit2, Check, AlertCircle, Clock, DollarSign } from 'lucide-react';
import Papa from 'papaparse';

export default function App() {
  const [activeTab, setActiveTab] = useState('menu');
  const [recipes, setRecipes] = useState({ protein: [], veg: [], starch: [], sauces: [], breakfast: [], soups: [] });
  const [menuItems, setMenuItems] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [menuDate, setMenuDate] = useState(new Date().toISOString().split('T')[0]);
  const [clients, setClients] = useState([
    { name: "Tim Brown", persons: 7, address: "10590 Canterberry Rd, Fairfax Station, VA 22039", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" },
    { name: "Scott Inman", persons: 4, address: "3418 Putnam Rd, Falls Church, VA 22042", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" }
  ]);
  const [newClient, setNewClient] = useState({ name: '', persons: 1, address: '', email: '', phone: '', notes: '', mealsPerWeek: 0, status: 'Active' });
  const [newRecipe, setNewRecipe] = useState({ category: 'protein', name: '', instructions: '', ingredients: [{ name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }] });
  const [newMenuItem, setNewMenuItem] = useState({ protein: '', veg: '', starch: '', extras: [], portions: 1 });
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ name: '', cost: '', unit: 'oz', source: '', section: 'Produce' });
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [editingIngredientData, setEditingIngredientData] = useState(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [completedDishes, setCompletedDishes] = useState({});
  const [orderHistory, setOrderHistory] = useState([]);

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
      } catch (e) { console.error('Error loading saved data:', e); }
    }
  }, []);

  useEffect(() => {
    const dataToSave = { recipes, clients, menuItems, masterIngredients, orderHistory, lastSaved: new Date().toISOString() };
    localStorage.setItem('goldfinchChefData', JSON.stringify(dataToSave));
  }, [recipes, clients, menuItems, masterIngredients, orderHistory]);

  const normalizeName = (name) => name.toLowerCase().trim().replace(/s$/, '').replace(/es$/, '').replace(/ies$/, 'y').replace(/[^a-z0-9]/g, '');
  
  const similarity = (str1, str2) => {
    const s1 = normalizeName(str1), s2 = normalizeName(str2);
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    const longer = s1.length > s2.length ? s1 : s2, shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1;
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return (longer.length - costs[s2.length]) / longer.length;
  };

  const findSimilarIngredients = (name) => {
    if (!name || name.length < 2) return [];
    return masterIngredients.filter(mi => { const sim = similarity(name, mi.name); return sim > 0.7 && sim < 1; });
  };

  const findExactMatch = (name) => masterIngredients.find(mi => normalizeName(mi.name) === normalizeName(name));

  const addToMasterIngredients = (ingredient) => {
    if (!ingredient.name) return;
    const exactMatch = findExactMatch(ingredient.name);
    if (exactMatch) {
      if (ingredient.cost || ingredient.source || ingredient.section !== 'Other') {
        setMasterIngredients(prev => prev.map(mi => mi.id === exactMatch.id ? { ...mi, cost: ingredient.cost || mi.cost, source: ingredient.source || mi.source, section: ingredient.section !== 'Other' ? ingredient.section : mi.section } : mi));
      }
      return;
    }
    setMasterIngredients(prev => [...prev, { id: Date.now() + Math.random(), name: ingredient.name, cost: ingredient.cost || '', unit: ingredient.unit || 'oz', source: ingredient.source || '', section: ingredient.section || 'Other' }]);
  };

  const mergeIngredients = (keepId, removeId) => {
    const keep = masterIngredients.find(i => i.id === keepId), remove = masterIngredients.find(i => i.id === removeId);
    if (!keep || !remove) return;
    const updatedRecipes = { ...recipes };
    Object.keys(updatedRecipes).forEach(category => {
      updatedRecipes[category] = updatedRecipes[category].map(recipe => ({ ...recipe, ingredients: recipe.ingredients.map(ing => normalizeName(ing.name) === normalizeName(remove.name) ? { ...ing, name: keep.name } : ing) }));
    });
    setRecipes(updatedRecipes);
    setMasterIngredients(prev => prev.filter(i => i.id !== removeId));
    setDuplicateWarnings(prev => prev.filter(d => d.ing1.id !== removeId && d.ing2.id !== removeId));
    alert(`Merged "${remove.name}" into "${keep.name}"`);
  };

  const scanForDuplicates = () => {
    const found = [], checked = new Set();
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

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportClientsCSV = () => { downloadCSV(Papa.unparse(clients, { columns: ['name', 'persons', 'address', 'email', 'phone', 'notes', 'mealsPerWeek', 'status'] }), 'clients.csv'); };
  
  const importClientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const imported = results.data.filter(row => row.name).map(row => ({ name: row.name || '', persons: parseInt(row.persons) || 1, address: row.address || '', email: row.email || '', phone: row.phone || '', notes: row.notes || '', mealsPerWeek: parseInt(row.mealsPerWeek) || 0, status: row.status || 'Active' }));
        setClients(imported);
        alert(`Imported ${imported.length} clients!`);
      },
      error: (err) => alert('Error parsing CSV: ' + err.message)
    });
    e.target.value = '';
  };

  const exportIngredientsCSV = () => { downloadCSV(Papa.unparse(masterIngredients.map(ing => ({ name: ing.name, cost: ing.cost, unit: ing.unit, source: ing.source, section: ing.section })), { columns: ['name', 'cost', 'unit', 'source', 'section'] }), 'ingredients.csv'); };
  
  const importIngredientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const imported = results.data.filter(row => row.name).map(row => ({ id: Date.now() + Math.random(), name: row.name || '', cost: row.cost || '', unit: row.unit || 'oz', source: row.source || '', section: row.section || 'Other' }));
        setMasterIngredients(imported);
        alert(`Imported ${imported.length} ingredients!`);
      },
      error: (err) => alert('Error parsing CSV: ' + err.message)
    });
    e.target.value = '';
  };

  const exportRecipesCSV = () => {
    const rows = [];
    Object.entries(recipes).forEach(([category, items]) => {
      items.forEach(recipe => {
        if (recipe.ingredients?.length > 0) {
          recipe.ingredients.forEach(ing => { rows.push({ 'Recipe Name': recipe.name, 'Category': category, 'Instructions': recipe.instructions || '', 'Ingredient': ing.name, 'Portion Size (oz)': ing.quantity, 'cost': ing.cost || '', 'source': ing.source || '', 'section': ing.section || 'Other' }); });
        } else {
          rows.push({ 'Recipe Name': recipe.name, 'Category': category, 'Instructions': recipe.instructions || '', 'Ingredient': '', 'Portion Size (oz)': '', 'cost': '', 'source': '', 'section': '' });
        }
      });
    });
    downloadCSV(Papa.unparse(rows, { columns: ['Recipe Name', 'Category', 'Instructions', 'Ingredient', 'Portion Size (oz)', 'cost', 'source', 'section'] }), 'recipes.csv');
  };

  const importRecipesCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const newRecipes = { protein: [], veg: [], starch: [], sauces: [], breakfast: [], soups: [] };
        const recipeMap = {}, ingredientsToAdd = [];
        results.data.forEach(row => {
          if (!row['Recipe Name']) return;
          const recipeName = row['Recipe Name'], category = (row['Category'] || 'protein').toLowerCase();
          if (!recipeMap[recipeName]) recipeMap[recipeName] = { name: recipeName, category, instructions: row['Instructions'] || '', ingredients: [] };
          if (row['Ingredient']) {
            const ingredient = { name: row['Ingredient'], quantity: row['Portion Size (oz)'] || '', unit: 'oz', cost: row['cost'] || '', source: row['source'] || '', section: row['section'] || 'Other' };
            recipeMap[recipeName].ingredients.push(ingredient);
            ingredientsToAdd.push(ingredient);
          }
        });
        Object.values(recipeMap).forEach(recipe => { if (newRecipes[recipe.category]) newRecipes[recipe.category].push({ name: recipe.name, instructions: recipe.instructions, ingredients: recipe.ingredients }); });
        setRecipes(newRecipes);
        ingredientsToAdd.forEach(ing => addToMasterIngredients(ing));
        alert(`Imported ${Object.values(newRecipes).flat().length} recipes!`);
      },
      error: (err) => alert('Error parsing CSV: ' + err.message)
    });
    e.target.value = '';
  };

  const addIngredient = () => setNewRecipe({ ...newRecipe, ingredients: [...newRecipe.ingredients, { name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }] });
  const updateIngredient = (index, field, value) => { const updated = [...newRecipe.ingredients]; updated[index][field] = value; setNewRecipe({ ...newRecipe, ingredients: updated }); };
  const removeIngredient = (index) => setNewRecipe({ ...newRecipe, ingredients: newRecipe.ingredients.filter((_, i) => i !== index) });
  const autoFillIngredient = (index, masterIng) => { const updated = [...newRecipe.ingredients]; updated[index] = { ...updated[index], name: masterIng.name, cost: masterIng.cost, source: masterIng.source, section: masterIng.section, unit: masterIng.unit }; setNewRecipe({ ...newRecipe, ingredients: updated }); };

  const saveRecipe = () => {
    if (!newRecipe.name) { alert('Please enter a recipe name'); return; }
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity);
    if (validIngredients.length === 0) { alert('Please add at least one ingredient with name and quantity'); return; }
    validIngredients.forEach(ing => addToMasterIngredients(ing));
    setRecipes({ ...recipes, [newRecipe.category]: [...recipes[newRecipe.category], { name: newRecipe.name, instructions: newRecipe.instructions, ingredients: validIngredients }] });
    setNewRecipe({ category: 'protein', name: '', instructions: '', ingredients: [{ name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }] });
    alert('Recipe saved!');
  };

  const deleteRecipe = (category, index) => { if (window.confirm('Delete this recipe?')) setRecipes({ ...recipes, [category]: recipes[category].filter((_, i) => i !== index) }); };
  const startEditingRecipe = (category, index) => { const recipe = recipes[category][index]; setEditingRecipe({ category, index, recipe: { ...recipe, ingredients: recipe.ingredients.map(ing => ({ name: ing.name || '', quantity: ing.quantity || '', unit: ing.unit || 'oz', cost: ing.cost || '', source: ing.source || '', section: ing.section || 'Other' })) } }); };
  const updateEditingIngredient = (index, field, value) => { const updated = [...editingRecipe.recipe.ingredients]; updated[index][field] = value; setEditingRecipe({ ...editingRecipe, recipe: { ...editingRecipe.recipe, ingredients: updated } }); };
  const addEditingIngredient = () => setEditingRecipe({ ...editingRecipe, recipe: { ...editingRecipe.recipe, ingredients: [...editingRecipe.recipe.ingredients, { name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }] } });
  const removeEditingIngredient = (index) => setEditingRecipe({ ...editingRecipe, recipe: { ...editingRecipe.recipe, ingredients: editingRecipe.recipe.ingredients.filter((_, i) => i !== index) } });
  
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

  const addMenuItem = () => {
    if (!newMenuItem.protein && !newMenuItem.veg && !newMenuItem.starch && newMenuItem.extras.length === 0) { alert('Please select at least one dish'); return; }
    if (selectedClients.length === 0) { alert('Please select at least one client'); return; }
    const newItems = selectedClients.map(clientName => {
      const client = clients.find(c => c.name === clientName);
      return { ...newMenuItem, clientName, date: menuDate, portions: client ? client.persons : 1, id: Date.now() + Math.random() };
    });
    setMenuItems(prev => [...prev, ...newItems]);
    setNewMenuItem({ protein: '', veg: '', starch: '', extras: [], portions: 1 });
  };

  const deleteMenuItem = (id) => setMenuItems(menuItems.filter(item => item.id !== id));
  const clearMenu = () => { if (window.confirm('Clear all menu items?')) { setMenuItems([]); setSelectedClients([]); setCompletedDishes({}); } };

  const toggleExtra = (recipeName) => {
    setNewMenuItem(prev => ({
      ...prev,
      extras: prev.extras.includes(recipeName) ? prev.extras.filter(e => e !== recipeName) : [...prev.extras, recipeName]
    }));
  };

  const getOrdersByClient = () => {
    const grouped = {};
    menuItems.forEach(item => {
      if (!grouped[item.clientName]) grouped[item.clientName] = [];
      grouped[item.clientName].push(item);
    });
    return grouped;
  };

  const categorizeIngredient = (name) => {
    const n = name.toLowerCase();
    if (['lettuce', 'cucumber', 'tomato', 'onion', 'garlic', 'carrot', 'potato', 'cauliflower', 'broccoli', 'spinach', 'pepper', 'celery', 'mushroom', 'zucchini', 'squash', 'asparagus', 'lemon', 'lime', 'ginger', 'cilantro', 'parsley'].some(x => n.includes(x))) return 'Produce';
    if (['chicken', 'beef', 'pork', 'salmon', 'fish', 'shrimp', 'turkey', 'lamb', 'bacon', 'sausage', 'steak', 'thigh', 'breast'].some(x => n.includes(x))) return 'Meat & Seafood';
    if (['milk', 'cheese', 'butter', 'egg', 'cream', 'yogurt'].some(x => n.includes(x))) return 'Dairy & Eggs';
    if (['salt', 'pepper', 'spice', 'cumin', 'paprika', 'oregano', 'thyme', 'cinnamon', 'cayenne', 'curry'].some(x => n.includes(x))) return 'Spices & Seasonings';
    if (['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'honey', 'bread', 'stock', 'broth'].some(x => n.includes(x))) return 'Pantry & Dry Goods';
    return 'Other';
  };

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
          const extraRecipe = [...recipes.sauces, ...recipes.breakfast, ...recipes.soups].find(r => r.name === extra);
          const category = recipes.sauces.find(r => r.name === extra) ? 'sauces' : recipes.breakfast.find(r => r.name === extra) ? 'breakfast' : 'soups';
          if (!kds[extra]) kds[extra] = { totalPortions: 0, category, clients: [] };
          kds[extra].totalPortions += item.portions;
          kds[extra].clients.push({ name: item.clientName, portions: item.portions });
        });
      }
    });
    return kds;
  };

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
            ingredients[key] = { name: ing.name, quantity: 0, unit: ing.unit || 'oz', section: ing.section || masterIng?.section || categorizeIngredient(ing.name), cost: masterIng?.cost || ing.cost || '', source: masterIng?.source || ing.source || '' };
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
    downloadCSV(Papa.unparse(prepList.map(item => ({ Source: item.source, Section: item.section, Ingredient: item.name, Quantity: item.quantity.toFixed(2), Unit: item.unit })), { columns: ['Source', 'Section', 'Ingredient', 'Quantity', 'Unit'] }), 'shopping-list.csv');
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
    if (!window.confirm('Mark all orders complete and move to history?')) return;
    const ordersByClient = getOrdersByClient();
    const newHistoryEntries = [];
    Object.entries(ordersByClient).forEach(([clientName, orders]) => {
      orders.forEach(order => {
        const dishes = [order.protein, order.veg, order.starch, ...(order.extras || [])].filter(Boolean);
        let totalCost = 0;
        dishes.forEach(dishName => {
          const category = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'].find(cat => recipes[cat]?.find(r => r.name === dishName));
          const recipe = category ? recipes[category].find(r => r.name === dishName) : null;
          if (recipe) totalCost += getRecipeCost(recipe) * order.portions;
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

  const deleteClient = (index) => { if (window.confirm('Delete this client?')) setClients(clients.filter((_, i) => i !== index)); };
  const addClient = () => {
    if (!newClient.name) { alert('Please enter a client name'); return; }
    setClients([...clients, { ...newClient }]);
    setNewClient({ name: '', persons: 1, address: '', email: '', phone: '', notes: '', mealsPerWeek: 0, status: 'Active' });
    alert('Client added!');
  };

  const addMasterIngredient2 = () => {
    if (!newIngredient.name) { alert('Please enter an ingredient name'); return; }
    const similar = findSimilarIngredients(newIngredient.name), exact = findExactMatch(newIngredient.name);
    if (exact) { alert(`"${newIngredient.name}" already exists as "${exact.name}"`); return; }
    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${newIngredient.name}" anyway?`)) return;
    setMasterIngredients([...masterIngredients, { ...newIngredient, id: Date.now() }]);
    setNewIngredient({ name: '', cost: '', unit: 'oz', source: '', section: 'Produce' });
    alert('Ingredient added!');
  };

  const deleteMasterIngredient = (id) => { if (window.confirm('Delete this ingredient?')) setMasterIngredients(masterIngredients.filter(ing => ing.id !== id)); };
  const startEditingMasterIngredient = (ing) => { setEditingIngredientId(ing.id); setEditingIngredientData({ ...ing }); };
  const saveEditingMasterIngredient = () => { setMasterIngredients(prev => prev.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData } : ing)); setEditingIngredientId(null); setEditingIngredientData(null); };
  const cancelEditingMasterIngredient = () => { setEditingIngredientId(null); setEditingIngredientData(null); };

  const kdsView = getKDSView();
  const prepList = getPrepList();
  const ordersByClient = getOrdersByClient();
  const historyByClient = getHistoryByClient();
  const recipeCounts = getRecipeCounts();
  
  const tabs = [
    { id: 'menu', label: 'Menu', icon: ChefHat },
    { id: 'recipes', label: 'Recipes', icon: Book },
    { id: 'kds', label: 'KDS', icon: Monitor },
    { id: 'prep', label: 'Shop', icon: List },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'ingredients', label: 'Ingredients', icon: DollarSign }
  ];

  const clientsFileRef = React.useRef();
  const recipesFileRef = React.useRef();
  const ingredientsFileRef = React.useRef();

  const extraCategories = [...recipes.sauces, ...recipes.breakfast, ...recipes.soups];

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
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-yellow-500 text-blue-700' : 'border-transparent text-gray-600 hover:text-blue-600'}`}
              style={activeTab === tab.id ? { borderColor: '#ffd700', color: '#3d59ab' } : {}}>
              <tab.icon size={18} />{tab.label}
            </button>
          ))}
        </div>
      </nav>
{activeTab === 'menu' && (
  <MenuView
    clients={clients}
    selectedClients={selectedClients}
    setSelectedClients={setSelectedClients}
    menuDate={menuDate}
    setMenuDate={setMenuDate}
  />
)}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {['protein', 'veg', 'starch'].map(type => (
                  <div key={type}>
                    <label className="block text-sm font-medium mb-2 capitalize" style={{ color: '#423d3c' }}>{type === 'veg' ? 'Vegetable' : type}</label>
                    <select value={newMenuItem[type]} onChange={(e) => setNewMenuItem({ ...newMenuItem, [type]: e.target.value })} className="w-full p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }}>
                      <option value="">Select...</option>
                      {recipes[type].map((r, i) => <option key={i} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {extraCategories.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Extras (Sauces, Breakfast, Soups)</label>
                  <div className="flex flex-wrap gap-2">
                    {extraCategories.map((recipe, i) => (
                      <button key={i} onClick={() => toggleExtra(recipe.name)}
                        className={`px-3 py-1 rounded-full border-2 transition-colors text-sm ${newMenuItem.extras.includes(recipe.name) ? 'text-white' : 'bg-white'}`}
                        style={newMenuItem.extras.includes(recipe.name) ? { backgroundColor: '#ebb582', borderColor: '#ebb582' } : { borderColor: '#ebb582', color: '#423d3c' }}>
                        {recipe.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={addMenuItem} className="flex items-center gap-2 px-6 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: '#ffd700', color: '#423d3c' }}><Plus size={20} />Add to Menu</button>
                {menuItems.length > 0 && <button onClick={clearMenu} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-red-100 text-red-700"><Trash2 size={20} />Clear All</button>}
              </div>
            </div>

            {menuItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Current Orders ({menuItems.length})</h2>
                <div className="space-y-4">
                  {Object.entries(ordersByClient).map(([clientName, orders]) => (
                    <div key={clientName} className="border-2 rounded-lg p-4" style={{ borderColor: '#ebb582' }}>
                      <h3 className="font-bold text-lg mb-2" style={{ color: '#3d59ab' }}>{clientName}</h3>
                      <div className="space-y-2">
                        {orders.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: '#f9f9ed' }}>
                            <div>
                              <p className="text-sm text-gray-500">{item.date} • {item.portions} portions</p>
                              <p className="text-sm">{[item.protein, item.veg, item.starch, ...(item.extras || [])].filter(Boolean).join(' • ')}</p>
                            </div>
                            <button onClick={() => deleteMenuItem(item.id)} className="text-red-600"><Trash2 size={18} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
  <RecipesView
    recipes={recipes}
    setRecipes={setRecipes}
    recipeCounts={recipeCounts}
    setRecipeCounts={setRecipeCounts}
    selectedClients={selectedClients}
    setSelectedClients={setSelectedClients}
    menuDate={menuDate}
    setMenuDate={setMenuDate}
    showNotes={showNotes}
    setShowNotes={setShowNotes}
  />
)}
                <div className="flex gap-2">
                  <button onClick={() => recipesFileRef.current.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ borderColor: '#3d59ab', color: '#3d59ab' }}><Upload size={18} />Import</button>
                  <button onClick={exportRecipesCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}><Download size={18} />Export</button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <select value={newRecipe.category} onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })} className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }}>
                    {['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'].map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
                  </select>
                  <input type="text" value={newRecipe.name} onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })} placeholder="Recipe name" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                </div>
                <textarea value={newRecipe.instructions} onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })} placeholder="Cooking instructions..." className="w-full p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} rows="2" />
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Ingredients</label>
                  {newRecipe.ingredients.map((ing, index) => {
                    const exactMatch = ing.name.length > 2 ? findExactMatch(ing.name) : null;
                    const similarIngs = ing.name.length > 2 && !exactMatch ? findSimilarIngredients(ing.name) : [];
                    return (
                      <div key={index} className="mb-2">
                        <div className="flex flex-wrap gap-2 p-2 rounded" style={{ backgroundColor: '#f9f9ed' }}>
                          <input type="text" value={ing.name} onChange={(e) => updateIngredient(index, 'name', e.target.value)} placeholder="Ingredient" className="flex-1 min-w-[120px] p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} list={`ing-${index}`} />
                          <datalist id={`ing-${index}`}>{masterIngredients.map((mi, i) => <option key={i} value={mi.name} />)}</datalist>
                          <input type="text" value={ing.quantity} onChange={(e) => updateIngredient(index, 'quantity', e.target.value)} placeholder="Oz" className="w-16 p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                          <input type="text" value={ing.cost} onChange={(e) => updateIngredient(index, 'cost', e.target.value)} placeholder="$" className="w-16 p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                          <input type="text" value={ing.source} onChange={(e) => updateIngredient(index, 'source', e.target.value)} placeholder="Source" className="w-20 p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                          <select value={ing.section} onChange={(e) => updateIngredient(index, 'section', e.target.value)} className="w-28 p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }}>
                            {['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Spices & Seasonings', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {newRecipe.ingredients.length > 1 && <button onClick={() => removeIngredient(index)} className="text-red-600 p-2"><X size={20} /></button>}
                        </div>
                        {exactMatch && <button onClick={() => autoFillIngredient(index, exactMatch)} className="mt-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700">Auto-fill "{exactMatch.name}"</button>}
                        {similarIngs.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="text-xs text-orange-600"><AlertCircle size={12} className="inline" /> Similar:</span>
                            {similarIngs.slice(0, 3).map((si, i) => <button key={i} onClick={() => autoFillIngredient(index, si)} className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">"{si.name}"</button>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={addIngredient} className="text-sm px-3 py-1 rounded" style={{ backgroundColor: '#ebb582' }}>+ Add Ingredient</button>
                </div>
                <button onClick={saveRecipe} className="px-6 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}><Save size={20} className="inline mr-2" />Save Recipe</button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Recipe Library</h2>
              {Object.entries(recipes).map(([category, items]) => items.length > 0 && (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-bold capitalize mb-2" style={{ color: '#ebb582' }}>{category} ({items.length})</h3>
                  <div className="space-y-2">
                    {items.map((recipe, index) => {
                      const cost = getRecipeCost(recipe);
                      return (
                        <div key={index}>
                          {editingRecipe?.category === category && editingRecipe?.index === index ? (
                            <div className="p-4 rounded-lg border-2" style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}>
                              <input type="text" value={editingRecipe.recipe.name} onChange={(e) => setEditingRecipe({ ...editingRecipe, recipe: { ...editingRecipe.recipe, name: e.target.value } })} className="w-full p-2 border-2 rounded-lg mb-2 font-bold" style={{ borderColor: '#ebb582' }} />
                              <textarea value={editingRecipe.recipe.instructions} onChange={(e) => setEditingRecipe({ ...editingRecipe, recipe: { ...editingRecipe.recipe, instructions: e.target.value } })} placeholder="Instructions..." className="w-full p-2 border-2 rounded-lg mb-2" style={{ borderColor: '#ebb582' }} rows="2" />
                              <p className="text-sm font-medium mb-2">Ingredients:</p>
                              {editingRecipe.recipe.ingredients.map((ing, ingIndex) => (
                                <div key={ingIndex} className="flex flex-wrap gap-2 mb-2">
                                  <input type="text" value={ing.name} onChange={(e) => updateEditingIngredient(ingIndex, 'name', e.target.value)} placeholder="Name" className="flex-1 min-w-[100px] p-1 border rounded text-sm" />
                                  <input type="text" value={ing.quantity} onChange={(e) => updateEditingIngredient(ingIndex, 'quantity', e.target.value)} placeholder="Oz" className="w-12 p-1 border rounded text-sm" />
                                  <input type="text" value={ing.cost} onChange={(e) => updateEditingIngredient(ingIndex, 'cost', e.target.value)} placeholder="$" className="w-12 p-1 border rounded text-sm" />
                                  <input type="text" value={ing.source} onChange={(e) => updateEditingIngredient(ingIndex, 'source', e.target.value)} placeholder="Source" className="w-16 p-1 border rounded text-sm" />
                                  <select value={ing.section} onChange={(e) => updateEditingIngredient(ingIndex, 'section', e.target.value)} className="w-24 p-1 border rounded text-sm">
                                    {['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Spices & Seasonings', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <button onClick={() => removeEditingIngredient(ingIndex)} className="text-red-600"><X size={16} /></button>
                                </div>
                              ))}
                              <button onClick={addEditingIngredient} className="text-sm px-2 py-1 rounded mb-2" style={{ backgroundColor: '#ebb582' }}>+ Add</button>
                              <div className="flex gap-2 mt-2">
                                <button onClick={saveEditingRecipe} className="flex items-center gap-1 px-3 py-1 rounded text-white text-sm" style={{ backgroundColor: '#3d59ab' }}><Check size={16} />Save</button>
                                <button onClick={() => setEditingRecipe(null)} className="px-3 py-1 rounded bg-gray-200 text-sm">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{recipe.name}</p>
                                  {cost > 0 && <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">${cost.toFixed(2)}/portion</span>}
                                </div>
                                <p className="text-sm text-gray-600">{recipe.ingredients?.map(i => `${i.name} (${i.quantity}oz)`).join(', ')}</p>
                                {recipe.instructions && <p className="text-xs text-gray-500 mt-1">{recipe.instructions}</p>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => startEditingRecipe(category, index)} className="text-blue-600"><Edit2 size={18} /></button>
                                <button onClick={() => deleteRecipe(category, index)} className="text-red-600"><Trash2 size={18} /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.values(recipes).flat().length === 0 && <p className="text-gray-500">No recipes yet.</p>}
            </div>
          </div>
        )}

       {activeTab === 'kds' && (
  <KDSView
    menuItems={menuItems}
    allDishesComplete={allDishesComplete}
    completeAllOrders={completeAllOrders}
  />
)}
            {Object.keys(kdsView).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(kdsView).map(([dishName, data]) => {
                  const recipe = recipes[data.category]?.find(r => r.name === dishName);
                  const isComplete = completedDishes[dishName];
                  return (
                    <div key={dishName} className={`border-2 rounded-lg p-4 ${isComplete ? 'opacity-50' : ''}`} style={{ borderColor: isComplete ? '#22c55e' : '#ebb582' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>{dishName}</h3>
                          <p className="text-lg font-semibold" style={{ color: '#ffd700' }}>{data.totalPortions} portions</p>
                          <p className="text-sm text-gray-500">{data.clients.map(c => `${c.name} (${c.portions})`).join(', ')}</p>
                        </div>
                        <button onClick={() => toggleDishComplete(dishName)}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isComplete ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                          <Check size={18} />{isComplete ? 'Done' : 'Mark Complete'}
                        </button>
                      </div>
                      {recipe?.ingredients && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-600 mb-2">Total Ingredients:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {recipe.ingredients.map((ing, i) => (
                              <div key={i} className="flex justify-between p-2 rounded" style={{ backgroundColor: '#f9f9ed' }}>
                                <span>{ing.name}</span>
                                <span className="font-bold">{(parseFloat(ing.quantity) * data.totalPortions).toFixed(1)} {ing.unit || 'oz'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {recipe?.instructions && <p className="mt-3 p-2 rounded text-sm" style={{ backgroundColor: '#fff4e0' }}>{recipe.instructions}</p>}
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-gray-500">No orders yet.</p>}
          </div>
        )}

        {activeTab === 'prep' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Shopping List</h2>
              {prepList.length > 0 && <button onClick={exportPrepList} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}><Download size={18} className="inline mr-2" />Export</button>}
            </div>
            {prepList.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  const sources = [...new Set(prepList.map(item => item.source || 'No Source'))].sort();
                  return sources.map(source => {
                    const sourceItems = prepList.filter(item => (item.source || 'No Source') === source);
                    const sections = [...new Set(sourceItems.map(item => item.section))].sort();
                    return (
                      <div key={source} className="border-2 rounded-lg p-4" style={{ borderColor: '#3d59ab' }}>
                        <h3 className="text-xl font-bold mb-3" style={{ color: '#3d59ab' }}>{source}</h3>
                        {sections.map(section => {
                          const sectionItems = sourceItems.filter(item => item.section === section);
                          return (
                            <div key={section} className="mb-4">
                              <h4 className="font-medium mb-2" style={{ color: '#ebb582' }}>{section}</h4>
                              {sectionItems.map((item, i) => (
                                <div key={i} className="flex justify-between p-2 rounded mb-1" style={{ backgroundColor: '#f9f9ed' }}>
                                  <span>{item.name}</span>
                                  <span className="font-bold">{item.quantity.toFixed(1)} {item.unit}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            ) : <p className="text-gray-500">No items. Add menu items first.</p>}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Order History</h2>
            {Object.keys(historyByClient).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(historyByClient).sort((a, b) => a[0].localeCompare(b[0])).map(([clientName, orders]) => (
                  <div key={clientName} className="border-2 rounded-lg p-4" style={{ borderColor: '#ebb582' }}>
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#3d59ab' }}>{clientName}</h3>
                    <div className="space-y-2">
                      {orders.map(order => (
                        <div key={order.id} className="flex justify-between items-center p-3 rounded" style={{ backgroundColor: '#f9f9ed' }}>
                          <div>
                            <p className="font-medium">{order.date}</p>
                            <p className="text-sm text-gray-600">{order.dishes.join(' • ')}</p>
                            <p className="text-sm text-gray-500">{order.portions} portions</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg" style={{ color: '#22c55e' }}>${order.cost.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between">
                      <span className="font-medium">Total ({orders.length} orders)</span>
                      <span className="font-bold" style={{ color: '#3d59ab' }}>${orders.reduce((sum, o) => sum + o.cost, 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500">No order history yet. Complete orders in KDS to see them here.</p>}
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Add Client</h2>
                <div className="flex gap-2">
                  <button onClick={() => clientsFileRef.current.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ borderColor: '#3d59ab', color: '#3d59ab' }}><Upload size={18} />Import</button>
                  <button onClick={exportClientsCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}><Download size={18} />Export</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Client name" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                <input type="number" value={newClient.persons} onChange={(e) => setNewClient({ ...newClient, persons: parseInt(e.target.value) || 1 })} placeholder="Household size" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                <input type="text" value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} placeholder="Address" className="p-2 border-2 rounded-lg md:col-span-2" style={{ borderColor: '#ebb582' }} />
                <input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="Email" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                <input type="tel" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} placeholder="Phone" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                <input type="number" value={newClient.mealsPerWeek} onChange={(e) => setNewClient({ ...newClient, mealsPerWeek: parseInt(e.target.value) || 0 })} placeholder="Meals/week" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
              </div>
              <button onClick={addClient} className="mt-4 px-6 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}><Plus size={20} className="inline mr-2" />Add</button>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Clients ({clients.length})</h2>
              <div className="space-y-3">
                {clients.map((client, i) => (
                  <div key={i} className="border-2 rounded-lg p-4 flex justify-between" style={{ borderColor: '#ebb582' }}>
                    <div>
                      <h3 className="font-bold text-lg">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.persons} persons • {client.mealsPerWeek} meals/week</p>
                      {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
                    </div>
                    <button onClick={() => deleteClient(i)} className="text-red-600 self-start"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ingredients' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Ingredients</h2>
                <div className="flex gap-2">
                  <button onClick={scanForDuplicates} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-orange-400 text-orange-600"><AlertCircle size={18} />Find Duplicates</button>
                  <button onClick={() => ingredientsFileRef.current.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ borderColor: '#3d59ab', color: '#3d59ab' }}><Upload size={18} />Import</button>
                  <button onClick={exportIngredientsCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}><Download size={18} />Export</button>
                </div>
              </div>
              {duplicateWarnings.length > 0 && (
                <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                  <h3 className="font-bold text-orange-700 mb-2">Duplicates:</h3>
                  {duplicateWarnings.map((dup, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-orange-200 last:border-0">
                      <span className="text-sm">"{dup.ing1.name}" ↔ "{dup.ing2.name}"</span>
                      <div className="flex gap-2">
                        <button onClick={() => mergeIngredients(dup.ing1.id, dup.ing2.id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Keep "{dup.ing1.name}"</button>
                        <button onClick={() => mergeIngredients(dup.ing2.id, dup.ing1.id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Keep "{dup.ing2.name}"</button>
                        <button onClick={() => setDuplicateWarnings(prev => prev.filter((_, idx) => idx !== i))} className="text-xs px-2 py-1 rounded bg-gray-100">Ignore</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input type="text" value={newIngredient.name} onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })} placeholder="Name" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                <input type="text" value={newIngredient.cost} onChange={(e) => setNewIngredient({ ...newIngredient, cost: e.target.value })} placeholder="Cost/unit" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                <select value={newIngredient.unit} onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })} className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }}>
                  {['oz', 'lb', 'g', 'kg', 'each'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="text" value={newIngredient.source} onChange={(e) => setNewIngredient({ ...newIngredient, source: e.target.value })} placeholder="Source" className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }} />
                <select value={newIngredient.section} onChange={(e) => setNewIngredient({ ...newIngredient, section: e.target.value })} className="p-2 border-2 rounded-lg" style={{ borderColor: '#ebb582' }}>
                  {['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Spices & Seasonings', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={addMasterIngredient2} className="px-6 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}><Plus size={20} className="inline mr-2" />Add</button>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>All Ingredients ({masterIngredients.length})</h2>
              {masterIngredients.length > 0 ? (
                <div className="space-y-2">
                  {masterIngredients.map(ing => (
                    <div key={ing.id}>
                      {editingIngredientId === ing.id ? (
                        <div className="flex flex-wrap gap-2 p-3 rounded-lg border-2" style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}>
                          <input type="text" value={editingIngredientData.name} onChange={(e) => setEditingIngredientData({ ...editingIngredientData, name: e.target.value })} className="flex-1 min-w-[120px] p-2 border rounded" />
                          <input type="text" value={editingIngredientData.cost} onChange={(e) => setEditingIngredientData({ ...editingIngredientData, cost: e.target.value })} placeholder="$" className="w-16 p-2 border rounded" />
                          <select value={editingIngredientData.unit} onChange={(e) => setEditingIngredientData({ ...editingIngredientData, unit: e.target.value })} className="w-16 p-2 border rounded">
                            {['oz', 'lb', 'g', 'kg', 'each'].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input type="text" value={editingIngredientData.source} onChange={(e) => setEditingIngredientData({ ...editingIngredientData, source: e.target.value })} placeholder="Source" className="w-20 p-2 border rounded" />
                          <select value={editingIngredientData.section} onChange={(e) => setEditingIngredientData({ ...editingIngredientData, section: e.target.value })} className="w-28 p-2 border rounded">
                            {['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Spices & Seasonings', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={saveEditingMasterIngredient} className="px-3 py-2 rounded text-white" style={{ backgroundColor: '#3d59ab' }}><Check size={18} /></button>
                          <button onClick={cancelEditingMasterIngredient} className="px-3 py-2 rounded bg-gray-200"><X size={18} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                          <div>
                            <p className="font-medium">{ing.name}</p>
                            <p className="text-sm text-gray-600">{ing.cost && `$${ing.cost}/${ing.unit}`} {ing.source && `• ${ing.source}`} • {ing.section}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEditingMasterIngredient(ing)} className="text-blue-600"><Edit2 size={18} /></button>
                            <button onClick={() => deleteMasterIngredient(ing.id)} className="text-red-600"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500">No ingredients yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
