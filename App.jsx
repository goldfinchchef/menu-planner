import React, { useState, useEffect } from 'react';
import { Plus, Trash2, List, Book, ChefHat, Users, X, Monitor, Save, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';

export default function App() {
  const [activeTab, setActiveTab] = useState('menu');
  const [recipes, setRecipes] = useState({
    protein: [
      { name: "Chicken Shawarma", instructions: "Marinate chicken in spices and lemon. Grill until internal temp reaches 165°F.", ingredients: [{ name: "Boneless Chicken Thighs", quantity: "5", unit: "oz" }, { name: "Lemon", quantity: "1", unit: "oz" }, { name: "Garlic", quantity: "0.5", unit: "oz" }] }
    ],
    veg: [
      { name: "Roasted Cauliflower", instructions: "", ingredients: [{ name: "Cauliflower", quantity: "8", unit: "oz" }, { name: "Olive Oil", quantity: "1", unit: "oz" }] }
    ],
    starch: [
      { name: "Roasted Potatoes", instructions: "", ingredients: [{ name: "Red Potato", quantity: "4", unit: "oz" }, { name: "Olive Oil", quantity: "1", unit: "oz" }] }
    ],
    sauces: [],
    breakfast: [],
    soups: []
  });
  
  const [menuItems, setMenuItems] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [clients, setClients] = useState([
    { name: "Tim Brown", persons: 7, address: "10590 Canterberry Rd, Fairfax Station, VA 22039", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" },
    { name: "Scott Inman", persons: 4, address: "3418 Putnam Rd, Falls Church, VA 22042", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" }
  ]);
  
  const [newClient, setNewClient] = useState({ name: '', persons: 1, address: '', email: '', phone: '', notes: '', mealsPerWeek: 0, status: 'Active' });
  const [newRecipe, setNewRecipe] = useState({
    category: 'protein',
    name: '',
    instructions: '',
    ingredients: [{ name: '', quantity: '', unit: 'oz' }]
  });
  const [newMenuItem, setNewMenuItem] = useState({
    protein: '',
    veg: '',
    starch: '',
    addons: [],
    portions: 1
  });
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ 
    name: '', 
    cost: '', 
    unit: 'oz', 
    source: '', 
    section: 'Produce' 
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('goldfinchChefData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.recipes) setRecipes(parsed.recipes);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.menuItems) setMenuItems(parsed.menuItems);
        if (parsed.masterIngredients) setMasterIngredients(parsed.masterIngredients);
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  // Save data to localStorage on change
  useEffect(() => {
    const dataToSave = { recipes, clients, menuItems, masterIngredients, lastSaved: new Date().toISOString() };
    localStorage.setItem('goldfinchChefData', JSON.stringify(dataToSave));
  }, [recipes, clients, menuItems, masterIngredients]);

  // ============ CSV IMPORT/EXPORT FUNCTIONS ============

  // CLIENTS CSV
  const exportClientsCSV = () => {
    const csv = Papa.unparse(clients);
    downloadCSV(csv, 'clients.csv');
  };

  const importClientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const imported = results.data
          .filter(row => row.name)
          .map(row => ({
            name: row.name || '',
            persons: parseInt(row.persons) || 1,
            address: row.address || '',
            email: row.email || '',
            phone: row.phone || '',
            notes: row.notes || '',
            mealsPerWeek: parseInt(row.mealsPerWeek) || 0,
            status: row.status || 'Active'
          }));
        setClients(imported);
        alert(`Imported ${imported.length} clients!`);
      },
      error: (err) => alert('Error parsing CSV: ' + err.message)
    });
    e.target.value = '';
  };

  // INGREDIENTS CSV
  const exportIngredientsCSV = () => {
    const csv = Papa.unparse(masterIngredients);
    downloadCSV(csv, 'ingredients.csv');
  };

  const importIngredientsCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const imported = results.data
          .filter(row => row.name)
          .map(row => ({
            id: Date.now() + Math.random(),
            name: row.name || '',
            cost: row.cost || '',
            unit: row.unit || 'oz',
            source: row.source || '',
            section: row.section || 'Other'
          }));
        setMasterIngredients(imported);
        alert(`Imported ${imported.length} ingredients!`);
      },
      error: (err) => alert('Error parsing CSV: ' + err.message)
    });
    e.target.value = '';
  };

  // RECIPES CSV
  const exportRecipesCSV = () => {
    const allRecipes = [];
    Object.entries(recipes).forEach(([category, items]) => {
      items.forEach(recipe => {
        allRecipes.push({
          category,
          name: recipe.name,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients ? recipe.ingredients.map(i => `${i.name}:${i.quantity}:${i.unit}`).join('|') : ''
        });
      });
    });
    const csv = Papa.unparse(allRecipes);
    downloadCSV(csv, 'recipes.csv');
  };

  const importRecipesCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const newRecipes = {
          protein: [],
          veg: [],
          starch: [],
          sauces: [],
          breakfast: [],
          soups: []
        };
        
        results.data.forEach(row => {
          if (!row.name || !row.category) return;
          
          const category = row.category.toLowerCase();
          if (!newRecipes[category]) return;
          
          const ingredients = row.ingredients 
            ? row.ingredients.split('|').map(ing => {
                const [name, quantity, unit] = ing.split(':');
                return { name: name || '', quantity: quantity || '', unit: unit || 'oz' };
              })
            : [];
          
          newRecipes[category].push({
            name: row.name,
            instructions: row.instructions || '',
            ingredients
          });
        });
        
        setRecipes(newRecipes);
        const total = Object.values(newRecipes).flat().length;
        alert(`Imported ${total} recipes!`);
      },
      error: (err) => alert('Error parsing CSV: ' + err.message)
    });
    e.target.value = '';
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

  // ============ OTHER FUNCTIONS ============

  const addMasterIngredient = () => {
    if (!newIngredient.name) {
      alert('Please enter an ingredient name');
      return;
    }
    setMasterIngredients([...masterIngredients, { ...newIngredient, id: Date.now() }]);
    setNewIngredient({ name: '', cost: '', unit: 'oz', source: '', section: 'Produce' });
    alert('Ingredient added!');
  };

  const deleteMasterIngredient = (id) => {
    if (window.confirm('Delete this ingredient?')) {
      setMasterIngredients(masterIngredients.filter(ing => ing.id !== id));
    }
  };

  const addIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { name: '', quantity: '', unit: 'oz' }]
    });
  };

  const updateIngredient = (index, field, value) => {
    const updated = [...newRecipe.ingredients];
    updated[index][field] = value;
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  const removeIngredient = (index) => {
    const updated = newRecipe.ingredients.filter((_, i) => i !== index);
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  const saveRecipe = () => {
    if (!newRecipe.name) {
      alert('Please enter a recipe name');
      return;
    }
    
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity && ing.unit);
    
    if (validIngredients.length === 0) {
      alert('Please add at least one complete ingredient');
      return;
    }

    setRecipes({
      ...recipes,
      [newRecipe.category]: [...recipes[newRecipe.category], {
        name: newRecipe.name,
        instructions: newRecipe.instructions,
        ingredients: validIngredients
      }]
    });

    setNewRecipe({
      category: 'protein',
      name: '',
      instructions: '',
      ingredients: [{ name: '', quantity: '', unit: 'oz' }]
    });
    
    alert('Recipe saved!');
  };

  const deleteRecipe = (category, index) => {
    if (window.confirm('Delete this recipe?')) {
      const updated = recipes[category].filter((_, i) => i !== index);
      setRecipes({ ...recipes, [category]: updated });
    }
  };

  const addMenuItem = () => {
    if (!newMenuItem.protein && !newMenuItem.veg && !newMenuItem.starch && newMenuItem.addons.length === 0) {
      alert('Please select at least one dish');
      return;
    }
    
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }
    
    const newItems = selectedClients.map(clientName => {
      const client = clients.find(c => c.name === clientName);
      return { 
        ...newMenuItem, 
        clientName: clientName,
        portions: client ? client.persons : 1,
        id: Date.now() + Math.random()
      };
    });
    
    setMenuItems(prev => [...prev, ...newItems]);
    setNewMenuItem({ protein: '', veg: '', starch: '', addons: [], portions: 1 });
  };

  const deleteMenuItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const clearMenu = () => {
    if (window.confirm('Clear all menu items?')) {
      setMenuItems([]);
      setSelectedClients([]);
    }
  };

  const categorizeIngredient = (name) => {
    const nameLower = name.toLowerCase();
    if (['lettuce', 'cucumber', 'tomato', 'onion', 'garlic', 'carrot', 'potato', 'cauliflower'].some(item => nameLower.includes(item))) return 'Produce';
    if (['chicken', 'beef', 'pork', 'salmon', 'fish'].some(item => nameLower.includes(item))) return 'Meat & Seafood';
    if (['milk', 'cheese', 'butter', 'egg'].some(item => nameLower.includes(item))) return 'Dairy & Eggs';
    if (['salt', 'pepper', 'spice'].some(item => nameLower.includes(item))) return 'Spices & Seasonings';
    if (['rice', 'pasta', 'flour', 'sugar', 'oil'].some(item => nameLower.includes(item))) return 'Pantry & Dry Goods';
    return 'Other';
  };

  const getKDSView = () => {
    const kds = {};
    menuItems.forEach(item => {
      ['protein', 'veg', 'starch'].forEach(type => {
        if (item[type]) {
          if (!kds[item[type]]) {
            kds[item[type]] = { totalPortions: 0, category: type };
          }
          kds[item[type]].totalPortions += item.portions;
        }
      });
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
          const key = `${ing.name}-${ing.unit}`;
          if (!ingredients[key]) {
            ingredients[key] = { 
              name: ing.name, 
              quantity: 0, 
              unit: ing.unit,
              section: categorizeIngredient(ing.name)
            };
          }
          ingredients[key].quantity += parseFloat(ing.quantity) * data.totalPortions;
        });
      }
    });
    
    return Object.values(ingredients).sort((a, b) => a.section.localeCompare(b.section));
  };

  const exportPrepList = () => {
    const prepList = getPrepList();
    let csv = 'Section,Ingredient,Quantity,Unit\n';
    prepList.forEach(item => {
      csv += `${item.section},"${item.name}",${item.quantity.toFixed(2)},${item.unit}\n`;
    });
    downloadCSV(csv, 'shopping-list.csv');
  };

  const deleteClient = (index) => {
    if (window.confirm('Delete this client?')) {
      const updated = clients.filter((_, i) => i !== index);
      setClients(updated);
    }
  };

  const addClient = () => {
    if (!newClient.name) {
      alert('Please enter a client name');
      return;
    }
    setClients([...clients, { ...newClient }]);
    setNewClient({ name: '', persons: 1, address: '', email: '', phone: '', notes: '', mealsPerWeek: 0, status: 'Active' });
    alert('Client added!');
  };

  const kdsView = getKDSView();
  const prepList = getPrepList();

  const tabs = [
    { id: 'menu', label: 'Menu', icon: ChefHat },
    { id: 'recipes', label: 'Recipes', icon: Book },
    { id: 'kds', label: 'KDS', icon: Monitor },
    { id: 'prep', label: 'Shop', icon: List },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'ingredients', label: 'Ingredients', icon: List }
  ];

  // Hidden file input refs
  const clientsFileRef = React.useRef();
  const recipesFileRef = React.useRef();
  const ingredientsFileRef = React.useRef();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      {/* Hidden file inputs */}
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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-yellow-500 text-blue-700' 
                  : 'border-transparent text-gray-600 hover:text-blue-600'
              }`}
              style={activeTab === tab.id ? { borderColor: '#ffd700', color: '#3d59ab' } : {}}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Build Menu</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Select Clients</label>
                <div className="flex flex-wrap gap-2">
                  {clients.map((client, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (selectedClients.includes(client.name)) {
                          setSelectedClients(selectedClients.filter(c => c !== client.name));
                        } else {
                          setSelectedClients([...selectedClients, client.name]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full border-2 transition-colors ${
                        selectedClients.includes(client.name) 
                          ? 'text-white' 
                          : 'bg-white'
                      }`}
                      style={selectedClients.includes(client.name) 
                        ? { backgroundColor: '#3d59ab', borderColor: '#3d59ab' }
                        : { borderColor: '#ebb582', color: '#423d3c' }
                      }
                    >
                      {client.name} ({client.persons}p)
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Protein</label>
                  <select
                    value={newMenuItem.protein}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, protein: e.target.value })}
                    className="w-full p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  >
                    <option value="">Select...</option>
                    {recipes.protein.map((r, i) => (
                      <option key={i} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Vegetable</label>
                  <select
                    value={newMenuItem.veg}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, veg: e.target.value })}
                    className="w-full p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  >
                    <option value="">Select...</option>
                    {recipes.veg.map((r, i) => (
                      <option key={i} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Starch</label>
                  <select
                    value={newMenuItem.starch}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, starch: e.target.value })}
                    className="w-full p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  >
                    <option value="">Select...</option>
                    {recipes.starch.map((r, i) => (
                      <option key={i} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addMenuItem}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg hover:opacity-90"
                  style={{ backgroundColor: '#ffd700', color: '#423d3c' }}
                >
                  <Plus size={20} />
                  Add to Menu
                </button>
                {menuItems.length > 0 && (
                  <button
                    onClick={clearMenu}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-red-100 text-red-700"
                  >
                    <Trash2 size={20} />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {menuItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Current Orders ({menuItems.length})</h2>
                <div className="space-y-3">
                  {menuItems.map(item => (
                    <div key={item.id} className="flex justify-between p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                      <div>
                        <p className="font-bold">{item.clientName} ({item.portions}p)</p>
                        <p className="text-sm">{[item.protein, item.veg, item.starch].filter(Boolean).join(' • ')}</p>
                      </div>
                      <button onClick={() => deleteMenuItem(item.id)} className="text-red-600">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Add New Recipe</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => recipesFileRef.current.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
                  >
                    <Upload size={18} />
                    Import CSV
                  </button>
                  <button
                    onClick={exportRecipesCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#3d59ab' }}
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={newRecipe.category}
                    onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })}
                    className="p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  >
                    <option value="protein">Protein</option>
                    <option value="veg">Vegetable</option>
                    <option value="starch">Starch</option>
                    <option value="sauces">Sauces</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="soups">Soups</option>
                  </select>
                  <input
                    type="text"
                    value={newRecipe.name}
                    onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                    placeholder="Recipe name"
                    className="p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  />
                </div>
                <textarea
                  value={newRecipe.instructions}
                  onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                  placeholder="Cooking instructions..."
                  className="w-full p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                  rows="3"
                />
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Ingredients</label>
                  {newRecipe.ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        placeholder="Ingredient name"
                        className="flex-1 p-2 border-2 rounded-lg"
                        style={{ borderColor: '#ebb582' }}
                      />
                      <input
                        type="text"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-20 p-2 border-2 rounded-lg"
                        style={{ borderColor: '#ebb582' }}
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        className="w-20 p-2 border-2 rounded-lg"
                        style={{ borderColor: '#ebb582' }}
                      >
                        <option value="oz">oz</option>
                        <option value="lb">lb</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="cup">cup</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="each">each</option>
                      </select>
                      {newRecipe.ingredients.length > 1 && (
                        <button onClick={() => removeIngredient(index)} className="text-red-600 p-2">
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addIngredient}
                    className="text-sm px-3 py-1 rounded"
                    style={{ backgroundColor: '#ebb582', color: '#423d3c' }}
                  >
                    + Add Ingredient
                  </button>
                </div>

                <button
                  onClick={saveRecipe}
                  className="px-6 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#3d59ab' }}
                >
                  <Save size={20} className="inline mr-2" />
                  Save Recipe
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Recipe Library</h2>
              {Object.entries(recipes).map(([category, items]) => (
                items.length > 0 && (
                  <div key={category} className="mb-4">
                    <h3 className="text-lg font-bold capitalize mb-2" style={{ color: '#ebb582' }}>{category}</h3>
                    <div className="space-y-2">
                      {items.map((recipe, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                          <div>
                            <p className="font-medium">{recipe.name}</p>
                            <p className="text-sm text-gray-600">
                              {recipe.ingredients?.map(i => i.name).join(', ')}
                            </p>
                          </div>
                          <button onClick={() => deleteRecipe(category, index)} className="text-red-600">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {activeTab === 'kds' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Kitchen Display</h2>
            {Object.keys(kdsView).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(kdsView).map(([dishName, data]) => {
                  const recipe = recipes[data.category]?.find(r => r.name === dishName);
                  return (
                    <div key={dishName} className="border-2 rounded-lg p-4" style={{ borderColor: '#ebb582' }}>
                      <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>{dishName}</h3>
                      <p className="text-lg font-semibold" style={{ color: '#ffd700' }}>Make {data.totalPortions} portions</p>
                      {recipe?.ingredients && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-600">Ingredients (per portion):</p>
                          <ul className="text-sm">
                            {recipe.ingredients.map((ing, i) => (
                              <li key={i}>{ing.name}: {ing.quantity} {ing.unit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {recipe?.instructions && (
                        <p className="mt-2 p-2 rounded text-sm" style={{ backgroundColor: '#fff4e0' }}>{recipe.instructions}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No orders yet. Add items from the Menu tab.</p>
            )}
          </div>
        )}

        {activeTab === 'prep' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Shopping List</h2>
              {prepList.length > 0 && (
                <button onClick={exportPrepList} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#3d59ab' }}>
                  <Download size={18} className="inline mr-2" />
                  Export CSV
                </button>
              )}
            </div>
            {prepList.length > 0 ? (
              <div className="space-y-6">
                {['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Spices & Seasonings', 'Other'].map(section => {
                  const items = prepList.filter(item => item.section === section);
                  if (items.length === 0) return null;
                  return (
                    <div key={section}>
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>{section}</h3>
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between p-2 rounded mb-1" style={{ backgroundColor: '#f9f9ed' }}>
                          <span>{item.name}</span>
                          <span className="font-bold">{item.quantity.toFixed(1)} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No items to shop for. Add menu items first.</p>
            )}
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Add New Client</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => clientsFileRef.current.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
                  >
                    <Upload size={18} />
                    Import CSV
                  </button>
                  <button
                    onClick={exportClientsCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#3d59ab' }}
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Client name"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
                <input
                  type="number"
                  value={newClient.persons}
                  onChange={(e) => setNewClient({ ...newClient, persons: parseInt(e.target.value) || 1 })}
                  placeholder="Household size"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
                <input
                  type="text"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  placeholder="Address"
                  className="p-2 border-2 rounded-lg md:col-span-2"
                  style={{ borderColor: '#ebb582' }}
                />
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="Email"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="Phone"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
                <input
                  type="number"
                  value={newClient.mealsPerWeek}
                  onChange={(e) => setNewClient({ ...newClient, mealsPerWeek: parseInt(e.target.value) || 0 })}
                  placeholder="Meals per week"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
              </div>
              <button
                onClick={addClient}
                className="mt-4 px-6 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} className="inline mr-2" />
                Add Client
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Your Clients ({clients.length})</h2>
              <div className="space-y-3">
                {clients.map((client, i) => (
                  <div key={i} className="border-2 rounded-lg p-4 flex justify-between" style={{ borderColor: '#ebb582' }}>
                    <div>
                      <h3 className="font-bold text-lg">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.persons} persons • {client.mealsPerWeek} meals/week</p>
                      {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
                      {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
                      {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
                    </div>
                    <button onClick={() => deleteClient(i)} className="text-red-600 self-start">
                      <Trash2 size={18} />
                    </button>
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
                <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Add Master Ingredient</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => ingredientsFileRef.current.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
                  >
                    <Upload size={18} />
                    Import CSV
                  </button>
                  <button
                    onClick={exportIngredientsCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#3d59ab' }}
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  placeholder="Ingredient name"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
                <input
                  type="text"
                  value={newIngredient.cost}
                  onChange={(e) => setNewIngredient({ ...newIngredient, cost: e.target.value })}
                  placeholder="Cost per unit"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                >
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="each">each</option>
                </select>
                <input
                  type="text"
                  value={newIngredient.source}
                  onChange={(e) => setNewIngredient({ ...newIngredient, source: e.target.value })}
                  placeholder="Source (e.g., Costco)"
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
                <select
                  value={newIngredient.section}
                  onChange={(e) => setNewIngredient({ ...newIngredient, section: e.target.value })}
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                >
                  <option value="Produce">Produce</option>
                  <option value="Meat & Seafood">Meat & Seafood</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Pantry & Dry Goods">Pantry & Dry Goods</option>
                  <option value="Spices & Seasonings">Spices & Seasonings</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <button
                onClick={addMasterIngredient}
                className="mt-4 px-6 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} className="inline mr-2" />
                Add Ingredient
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Master Ingredients ({masterIngredients.length})</h2>
              {masterIngredients.length > 0 ? (
                <div className="space-y-2">
                  {masterIngredients.map(ing => (
                    <div key={ing.id} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                      <div>
                        <p className="font-medium">{ing.name}</p>
                        <p className="text-sm text-gray-600">
                          {ing.cost && `$${ing.cost}/${ing.unit}`} {ing.source && `• ${ing.source}`} • {ing.section}
                        </p>
                      </div>
                      <button onClick={() => deleteMasterIngredient(ing.id)} className="text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No ingredients added yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
