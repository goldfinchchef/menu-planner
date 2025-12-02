import React, { useState, useEffect, useRef } from 'react';
import { 
  ChefHat, Users, BookOpen, Monitor, ShoppingCart, Clock, 
  Plus, Trash2, Edit3, Download, Upload, Check, X, Search,
  Calendar, MapPin, Phone, Mail, Package, ChevronDown, ChevronRight
} from 'lucide-react';
import Papa from 'papaparse';

// ============================================================
// PART 1: CONSTANTS & CONFIGURATION
// ============================================================

const STORAGE_KEY = 'goldfinchChefData';

const COLORS = {
  blue: '#3d59ab',
  gold: '#ffd700',
  peach: '#ebb582',
  cream: '#f9f9ed',
  brown: '#423d3c'
};

const SECTIONS = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry & Dry Goods',
  'Spices & Seasonings',
  'Other'
];

const UNITS = ['oz', 'lb', 'g', 'kg', 'each', 'cup', 'tbsp', 'tsp', 'ml', 'L'];

const RECIPE_CATEGORIES = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'];

const TABS = [
  { id: 'menu', label: 'Menu', icon: Calendar },
  { id: 'recipes', label: 'Recipes', icon: BookOpen },
  { id: 'kds', label: 'KDS', icon: Monitor },
  { id: 'shop', label: 'Shop', icon: ShoppingCart },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'ingredients', label: 'Ingredients', icon: Package }
];

// ============================================================
// PART 2: UTILITY FUNCTIONS
// ============================================================

const normalizeText = (text) => 
  text?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || '';

const findExactMatch = (name, ingredients) => 
  ingredients.find(i => normalizeText(i.name) === normalizeText(name));

const findSimilarIngredients = (name, ingredients, threshold = 0.7) => {
  const normalized = normalizeText(name);
  if (!normalized) return [];
  
  return ingredients.filter(i => {
    const other = normalizeText(i.name);
    if (other.includes(normalized) || normalized.includes(other)) return true;
    
    // Simple similarity check
    const longer = other.length > normalized.length ? other : normalized;
    const shorter = other.length > normalized.length ? normalized : other;
    const matches = [...shorter].filter((c, i) => longer[i] === c).length;
    return matches / longer.length >= threshold;
  });
};

const getRecipeCost = (recipe) => {
  if (!recipe?.ingredients?.length) return 0;
  return recipe.ingredients.reduce((sum, ing) => sum + (parseFloat(ing.cost) || 0), 0);
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const formatDate = (date) => new Date(date).toLocaleDateString();

const getDefaultData = () => ({
  clients: [],
  recipes: {},
  menuItems: [],
  masterIngredients: [],
  orderHistory: []
});

// ============================================================
// PART 3: HOOKS - DATA PERSISTENCE
// ============================================================

const useLocalStorage = (key, initialValue) => {
  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));
  }, [key, data]);

  return [data, setData];
};

// ============================================================
// PART 4: REUSABLE COMPONENTS
// ============================================================

const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants = {
    primary: { background: COLORS.blue, color: 'white' },
    secondary: { background: COLORS.peach, color: COLORS.brown },
    danger: { background: '#dc2626', color: 'white' },
    ghost: { background: 'transparent', color: COLORS.brown }
  };
  const sizes = { sm: '0.5rem 0.75rem', md: '0.625rem 1rem', lg: '0.75rem 1.5rem' };
  
  return (
    <button
      onClick={onClick}
      style={{
        ...variants[variant],
        padding: sizes[size],
        borderRadius: '0.5rem',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 500,
        fontSize: size === 'sm' ? '0.875rem' : '1rem',
        transition: 'opacity 0.2s'
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    {label && <label style={{ fontSize: '0.875rem', color: COLORS.brown, fontWeight: 500 }}>{label}</label>}
    <input
      style={{
        padding: '0.625rem',
        border: `1px solid ${COLORS.peach}`,
        borderRadius: '0.5rem',
        background: 'white',
        fontSize: '1rem'
      }}
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    {label && <label style={{ fontSize: '0.875rem', color: COLORS.brown, fontWeight: 500 }}>{label}</label>}
    <select
      style={{
        padding: '0.625rem',
        border: `1px solid ${COLORS.peach}`,
        borderRadius: '0.5rem',
        background: 'white',
        fontSize: '1rem'
      }}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    ...style
  }}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${COLORS.peach}`
        }}>
          <h3 style={{ margin: 0, color: COLORS.brown }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color={COLORS.brown} />
          </button>
        </div>
        <div style={{ padding: '1.25rem' }}>{children}</div>
      </div>
    </div>
  );
};

// CSV Import/Export helpers
const exportToCSV = (data, filename) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

const ImportButton = ({ onImport, accept = '.csv' }) => {
  const inputRef = useRef();
  
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => onImport(results.data),
      error: (err) => console.error('CSV parse error:', err)
    });
    e.target.value = '';
  };
  
  return (
    <>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display: 'none' }} />
      <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload size={16} /> Import
      </Button>
    </>
  );
};

// ============================================================
// PART 5: TAB COMPONENTS
// ============================================================

// --- CLIENTS TAB ---
const ClientsTab = ({ clients, setClients, masterIngredients }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', persons: 2, address: '', email: '', phone: '', notes: '', mealsPerWeek: 5, status: 'active' });

  const resetForm = () => {
    setForm({ name: '', persons: 2, address: '', email: '', phone: '', notes: '', mealsPerWeek: 5, status: 'active' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    
    if (editing !== null) {
      setClients(clients.map((c, i) => i === editing ? form : c));
    } else {
      setClients([...clients, form]);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    setForm(clients[index]);
    setEditing(index);
    setShowForm(true);
  };

  const handleDelete = (index) => {
    if (confirm('Delete this client?')) {
      setClients(clients.filter((_, i) => i !== index));
    }
  };

  const handleImport = (data) => {
    const imported = data.filter(row => row.name).map(row => ({
      name: row.name || '',
      persons: parseInt(row.persons) || 2,
      address: row.address || '',
      email: row.email || '',
      phone: row.phone || '',
      notes: row.notes || '',
      mealsPerWeek: parseInt(row.mealsPerWeek) || 5,
      status: row.status || 'active'
    }));
    setClients([...clients, ...imported]);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: COLORS.brown }}>Clients</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ImportButton onImport={handleImport} />
          <Button variant="ghost" size="sm" onClick={() => exportToCSV(clients, 'clients.csv')}>
            <Download size={16} /> Export
          </Button>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Client</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {clients.map((client, idx) => (
          <Card key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: COLORS.blue }}>{client.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Edit3 size={16} color={COLORS.brown} />
                </button>
                <button onClick={() => handleDelete(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={16} color="#dc2626" />
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: COLORS.brown, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={14} /> {client.persons} persons • {client.mealsPerWeek} meals/week
              </div>
              {client.address && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> {client.address}</div>}
              {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} /> {client.email}</div>}
              {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={14} /> {client.phone}</div>}
              {client.notes && <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>{client.notes}</div>}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editing !== null ? 'Edit Client' : 'Add Client'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Household Size" type="number" min="1" value={form.persons} onChange={e => setForm({ ...form, persons: parseInt(e.target.value) || 1 })} />
            <Input label="Meals/Week" type="number" min="1" value={form.mealsPerWeek} onChange={e => setForm({ ...form, mealsPerWeek: parseInt(e.target.value) || 1 })} />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- INGREDIENTS TAB ---
const IngredientsTab = ({ ingredients, setIngredients }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', cost: '', unit: 'each', source: '', section: 'Other' });

  const filtered = ingredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const duplicates = ingredients.reduce((acc, ing, idx) => {
    const similar = findSimilarIngredients(ing.name, ingredients.filter((_, i) => i !== idx));
    if (similar.length > 0) acc.push({ ingredient: ing, similar });
    return acc;
  }, []);

  const resetForm = () => {
    setForm({ name: '', cost: '', unit: 'each', source: '', section: 'Other' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    
    const newIng = { ...form, id: editing || generateId(), cost: parseFloat(form.cost) || 0 };
    
    if (editing) {
      setIngredients(ingredients.map(i => i.id === editing ? newIng : i));
    } else {
      setIngredients([...ingredients, newIng]);
    }
    resetForm();
  };

  const handleEdit = (ing) => {
    setForm(ing);
    setEditing(ing.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this ingredient?')) {
      setIngredients(ingredients.filter(i => i.id !== id));
    }
  };

  const handleMerge = (keep, remove) => {
    setIngredients(ingredients.filter(i => i.id !== remove.id));
  };

  const handleImport = (data) => {
    const imported = data.filter(row => row.name).map(row => ({
      id: generateId(),
      name: row.name || '',
      cost: parseFloat(row.cost) || 0,
      unit: row.unit || 'each',
      source: row.source || '',
      section: row.section || 'Other'
    }));
    setIngredients([...ingredients, ...imported]);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, color: COLORS.brown }}>Master Ingredients</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ImportButton onImport={handleImport} />
          <Button variant="ghost" size="sm" onClick={() => exportToCSV(ingredients, 'ingredients.csv')}>
            <Download size={16} /> Export
          </Button>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add</Button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: COLORS.brown }} />
        <input
          placeholder="Search ingredients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.5rem' }}
        />
      </div>

      {duplicates.length > 0 && (
        <Card style={{ marginBottom: '1rem', background: '#fef3c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={18} color="#d97706" />
            <strong>Possible Duplicates</strong>
          </div>
          {duplicates.slice(0, 3).map(({ ingredient, similar }) => (
            <div key={ingredient.id} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              "{ingredient.name}" similar to: {similar.map(s => s.name).join(', ')}
              <Button variant="ghost" size="sm" onClick={() => handleMerge(similar[0], ingredient)} style={{ marginLeft: '0.5rem' }}>
                Merge
              </Button>
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {SECTIONS.map(section => {
          const sectionItems = filtered.filter(i => i.section === section);
          if (sectionItems.length === 0) return null;
          
          return (
            <Card key={section}>
              <h4 style={{ margin: '0 0 0.75rem', color: COLORS.blue }}>{section}</h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {sectionItems.map(ing => (
                  <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: COLORS.cream, borderRadius: '0.375rem' }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{ing.name}</span>
                      <span style={{ color: COLORS.brown, fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                        ${ing.cost}/{ing.unit} • {ing.source || 'No source'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => handleEdit(ing)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Edit3 size={14} color={COLORS.brown} />
                      </button>
                      <button onClick={() => handleDelete(ing.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Ingredient' : 'Add Ingredient'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Cost" type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
            <Select label="Unit" options={UNITS} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Source" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
            <Select label="Section" options={SECTIONS} value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- RECIPES TAB ---
const RecipesTab = ({ recipes, setRecipes, masterIngredients, setMasterIngredients }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState('protein');
  const [form, setForm] = useState({ name: '', instructions: '', ingredients: [] });
  const [newIng, setNewIng] = useState({ name: '', quantity: '', unit: 'each', cost: '', source: '', section: 'Other' });

  const categoryRecipes = recipes[category] || [];

  const resetForm = () => {
    setForm({ name: '', instructions: '', ingredients: [] });
    setNewIng({ name: '', quantity: '', unit: 'each', cost: '', source: '', section: 'Other' });
    setEditing(null);
    setShowForm(false);
  };

  const handleIngredientNameChange = (name) => {
    const match = findExactMatch(name, masterIngredients);
    if (match) {
      setNewIng({ ...newIng, name, cost: match.cost, unit: match.unit, source: match.source, section: match.section });
    } else {
      setNewIng({ ...newIng, name });
    }
  };

  const addIngredient = () => {
    if (!newIng.name.trim()) return;
    setForm({ ...form, ingredients: [...form.ingredients, { ...newIng, cost: parseFloat(newIng.cost) || 0 }] });
    setNewIng({ name: '', quantity: '', unit: 'each', cost: '', source: '', section: 'Other' });
  };

  const removeIngredient = (idx) => {
    setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    
    const updated = { ...recipes };
    if (!updated[category]) updated[category] = [];
    
    if (editing !== null) {
      updated[category] = updated[category].map((r, i) => i === editing ? form : r);
    } else {
      updated[category] = [...updated[category], form];
    }
    
    // Add new ingredients to master list
    form.ingredients.forEach(ing => {
      if (!findExactMatch(ing.name, masterIngredients)) {
        setMasterIngredients(prev => [...prev, { id: generateId(), name: ing.name, cost: ing.cost, unit: ing.unit, source: ing.source, section: ing.section }]);
      }
    });
    
    setRecipes(updated);
    resetForm();
  };

  const handleEdit = (idx) => {
    setForm(categoryRecipes[idx]);
    setEditing(idx);
    setShowForm(true);
  };

  const handleDelete = (idx) => {
    if (confirm('Delete this recipe?')) {
      const updated = { ...recipes };
      updated[category] = updated[category].filter((_, i) => i !== idx);
      setRecipes(updated);
    }
  };

  const handleImport = (data) => {
    // Group by recipe name, aggregate ingredients
    const grouped = data.reduce((acc, row) => {
      if (!row.name) return acc;
      if (!acc[row.name]) {
        acc[row.name] = { name: row.name, instructions: row.instructions || '', ingredients: [] };
      }
      if (row.ingredientName) {
        acc[row.name].ingredients.push({
          name: row.ingredientName,
          quantity: row.quantity || '',
          unit: row.unit || 'each',
          cost: parseFloat(row.cost) || 0,
          source: row.source || '',
          section: row.section || 'Other'
        });
      }
      return acc;
    }, {});
    
    const updated = { ...recipes };
    if (!updated[category]) updated[category] = [];
    updated[category] = [...updated[category], ...Object.values(grouped)];
    setRecipes(updated);
  };

  const exportRecipes = () => {
    const flat = categoryRecipes.flatMap(r => 
      r.ingredients.length > 0 
        ? r.ingredients.map(ing => ({ name: r.name, instructions: r.instructions, ingredientName: ing.name, quantity: ing.quantity, unit: ing.unit, cost: ing.cost, source: ing.source, section: ing.section }))
        : [{ name: r.name, instructions: r.instructions }]
    );
    exportToCSV(flat, `recipes-${category}.csv`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, color: COLORS.brown }}>Recipes</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ImportButton onImport={handleImport} />
          <Button variant="ghost" size="sm" onClick={exportRecipes}>
            <Download size={16} /> Export
          </Button>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Recipe</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {RECIPE_CATEGORIES.map(cat => (
          <Button
            key={cat}
            variant={category === cat ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {categoryRecipes.map((recipe, idx) => (
          <Card key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: COLORS.blue }}>{recipe.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Edit3 size={16} color={COLORS.brown} />
                </button>
                <button onClick={() => handleDelete(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={16} color="#dc2626" />
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: COLORS.brown }}>
              <div style={{ fontWeight: 500, color: COLORS.gold }}>${getRecipeCost(recipe).toFixed(2)}/portion</div>
              <div>{recipe.ingredients.length} ingredients</div>
              {recipe.instructions && <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>{recipe.instructions.slice(0, 100)}...</div>}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editing !== null ? 'Edit Recipe' : 'Add Recipe'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Recipe Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          
          <div>
            <label style={{ fontSize: '0.875rem', color: COLORS.brown, fontWeight: 500 }}>Instructions</label>
            <textarea
              value={form.instructions}
              onChange={e => setForm({ ...form, instructions: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: '0.625rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.5rem', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: COLORS.brown, fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Ingredients</label>
            
            {form.ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', padding: '0.5rem', background: COLORS.cream, borderRadius: '0.375rem' }}>
                <span style={{ flex: 1 }}>{ing.quantity} {ing.unit} {ing.name} (${ing.cost})</span>
                <button onClick={() => removeIngredient(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={14} color="#dc2626" />
                </button>
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                placeholder="Ingredient name"
                value={newIng.name}
                onChange={e => handleIngredientNameChange(e.target.value)}
                list="ingredients-list"
                style={{ padding: '0.5rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.375rem' }}
              />
              <datalist id="ingredients-list">
                {masterIngredients.map(i => <option key={i.id} value={i.name} />)}
              </datalist>
              <input
                placeholder="Qty"
                value={newIng.quantity}
                onChange={e => setNewIng({ ...newIng, quantity: e.target.value })}
                style={{ padding: '0.5rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.375rem' }}
              />
              <select
                value={newIng.unit}
                onChange={e => setNewIng({ ...newIng, unit: e.target.value })}
                style={{ padding: '0.5rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.375rem' }}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                placeholder="Cost"
                type="number"
                step="0.01"
                value={newIng.cost}
                onChange={e => setNewIng({ ...newIng, cost: e.target.value })}
                style={{ padding: '0.5rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.375rem' }}
              />
              <input
                placeholder="Source"
                value={newIng.source}
                onChange={e => setNewIng({ ...newIng, source: e.target.value })}
                style={{ padding: '0.5rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.375rem' }}
              />
              <select
                value={newIng.section}
                onChange={e => setNewIng({ ...newIng, section: e.target.value })}
                style={{ padding: '0.5rem', border: `1px solid ${COLORS.peach}`, borderRadius: '0.375rem' }}
              >
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={addIngredient} style={{ marginTop: '0.5rem' }}>
              <Plus size={14} /> Add Ingredient
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave}>Save Recipe</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- MENU TAB ---
const MenuTab = ({ menuItems, setMenuItems, clients, recipes }) => {
  const [form, setForm] = useState({ clientName: '', date: new Date().toISOString().split('T')[0], protein: '', veg: '', starch: '', extras: [] });

  const allRecipes = Object.entries(recipes).flatMap(([cat, items]) => 
    items.map(r => ({ ...r, category: cat }))
  );

  const getRecipesByCategory = (cat) => recipes[cat] || [];

  const handleAdd = () => {
    if (!form.clientName || !form.date) return;
    
    const client = clients.find(c => c.name === form.clientName);
    const portions = client?.persons || 1;
    
    const newItem = {
      id: generateId(),
      ...form,
      portions
    };
    
    setMenuItems([...menuItems, newItem]);
    setForm({ ...form, protein: '', veg: '', starch: '', extras: [] });
  };

  const handleDelete = (id) => {
    setMenuItems(menuItems.filter(m => m.id !== id));
  };

  const toggleExtra = (recipeName) => {
    setForm(prev => ({
      ...prev,
      extras: prev.extras.includes(recipeName)
        ? prev.extras.filter(e => e !== recipeName)
        : [...prev.extras, recipeName]
    }));
  };

  const groupedByDate = menuItems.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  return (
    <div>
      <h2 style={{ margin: '0 0 1rem', color: COLORS.brown }}>Menu Planning</h2>
      
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Select
            label="Client"
            value={form.clientName}
            onChange={e => setForm({ ...form, clientName: e.target.value })}
            options={[{ value: '', label: 'Select client...' }, ...clients.map(c => ({ value: c.name, label: c.name }))]}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
          />
          <Select
            label="Protein"
            value={form.protein}
            onChange={e => setForm({ ...form, protein: e.target.value })}
            options={[{ value: '', label: 'Select...' }, ...getRecipesByCategory('protein').map(r => ({ value: r.name, label: r.name }))]}
          />
          <Select
            label="Veg"
            value={form.veg}
            onChange={e => setForm({ ...form, veg: e.target.value })}
            options={[{ value: '', label: 'Select...' }, ...getRecipesByCategory('veg').map(r => ({ value: r.name, label: r.name }))]}
          />
          <Select
            label="Starch"
            value={form.starch}
            onChange={e => setForm({ ...form, starch: e.target.value })}
            options={[{ value: '', label: 'Select...' }, ...getRecipesByCategory('starch').map(r => ({ value: r.name, label: r.name }))]}
          />
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.875rem', color: COLORS.brown, fontWeight: 500 }}>Extras (sauces, soups, breakfast)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {['sauces', 'soups', 'breakfast'].flatMap(cat => getRecipesByCategory(cat)).map(r => (
              <button
                key={r.name}
                onClick={() => toggleExtra(r.name)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '1rem',
                  border: `1px solid ${form.extras.includes(r.name) ? COLORS.blue : COLORS.peach}`,
                  background: form.extras.includes(r.name) ? COLORS.blue : 'white',
                  color: form.extras.includes(r.name) ? 'white' : COLORS.brown,
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
        
        <Button onClick={handleAdd} style={{ marginTop: '1rem' }}>
          <Plus size={16} /> Add to Menu
        </Button>
      </Card>

      {Object.entries(groupedByDate).sort((a, b) => a[0].localeCompare(b[0])).map(([date, items]) => (
        <div key={date} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: COLORS.blue, marginBottom: '0.75rem' }}>{formatDate(date)}</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {items.map(item => (
              <Card key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: COLORS.brown }}>{item.clientName}</strong>
                  <span style={{ marginLeft: '0.5rem', color: COLORS.blue }}>({item.portions} portions)</span>
                  <div style={{ fontSize: '0.875rem', color: COLORS.brown, marginTop: '0.25rem' }}>
                    {[item.protein, item.veg, item.starch, ...item.extras].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={16} color="#dc2626" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- KDS TAB ---
const KDSTab = ({ menuItems, setMenuItems, recipes, orderHistory, setOrderHistory }) => {
  const [completed, setCompleted] = useState({});

  const getKDSView = () => {
    const dishes = {};
    
    menuItems.forEach(item => {
      const dishNames = [item.protein, item.veg, item.starch, ...item.extras].filter(Boolean);
      
      dishNames.forEach(name => {
        if (!dishes[name]) {
          // Find recipe
          let recipe = null;
          for (const cat of RECIPE_CATEGORIES) {
            recipe = recipes[cat]?.find(r => r.name === name);
            if (recipe) break;
          }
          
          dishes[name] = {
            name,
            totalPortions: 0,
            instructions: recipe?.instructions || '',
            ingredients: recipe?.ingredients || [],
            orders: []
          };
        }
        
        dishes[name].totalPortions += item.portions;
        dishes[name].orders.push({ client: item.clientName, portions: item.portions });
      });
    });
    
    return Object.values(dishes);
  };

  const kdsView = getKDSView();

  const toggleComplete = (dishName) => {
    setCompleted(prev => ({ ...prev, [dishName]: !prev[dishName] }));
  };

  const completeAll = () => {
    // Move menu items to order history
    const orders = menuItems.map(item => ({
      id: generateId(),
      clientName: item.clientName,
      date: item.date,
      dishes: [item.protein, item.veg, item.starch, ...item.extras].filter(Boolean),
      portions: item.portions,
      cost: [item.protein, item.veg, item.starch, ...item.extras].filter(Boolean).reduce((sum, dishName) => {
        for (const cat of RECIPE_CATEGORIES) {
          const recipe = recipes[cat]?.find(r => r.name === dishName);
          if (recipe) return sum + getRecipeCost(recipe) * item.portions;
        }
        return sum;
      }, 0)
    }));
    
    setOrderHistory([...orderHistory, ...orders]);
    setMenuItems([]);
    setCompleted({});
  };

  const aggregateIngredients = (dish) => {
    const aggregated = {};
    dish.ingredients.forEach(ing => {
      const key = `${ing.name}-${ing.unit}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...ing, totalQty: 0 };
      }
      aggregated[key].totalQty += (parseFloat(ing.quantity) || 0) * dish.totalPortions;
    });
    return Object.values(aggregated);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: COLORS.brown }}>Kitchen Display</h2>
        {menuItems.length > 0 && (
          <Button onClick={completeAll}>
            <Check size={16} /> Complete All
          </Button>
        )}
      </div>

      {kdsView.length === 0 ? (
        <Card><p style={{ color: COLORS.brown, textAlign: 'center' }}>No dishes to prepare</p></Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {kdsView.map(dish => (
            <Card key={dish.name} style={{ opacity: completed[dish.name] ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: COLORS.blue }}>{dish.name}</h3>
                    <span style={{ background: COLORS.gold, color: COLORS.brown, padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 600 }}>
                      {dish.totalPortions} portions
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: COLORS.brown, marginBottom: '0.75rem' }}>
                    {dish.orders.map((o, i) => (
                      <span key={i}>{o.client} ({o.portions}){i < dish.orders.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>

                  {dish.ingredients.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ fontSize: '0.875rem' }}>Ingredients (scaled):</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                        {aggregateIngredients(dish).map((ing, i) => (
                          <span key={i} style={{ background: COLORS.cream, padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                            {ing.totalQty.toFixed(1)} {ing.unit} {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dish.instructions && (
                    <div style={{ fontSize: '0.875rem', fontStyle: 'italic', color: COLORS.brown }}>
                      {dish.instructions}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => toggleComplete(dish.name)}
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    border: `2px solid ${completed[dish.name] ? '#22c55e' : COLORS.peach}`,
                    background: completed[dish.name] ? '#22c55e' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {completed[dish.name] && <Check size={18} color="white" />}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// --- SHOP TAB ---
const ShopTab = ({ menuItems, recipes }) => {
  const getPrepList = () => {
    const list = {};
    
    menuItems.forEach(item => {
      const dishNames = [item.protein, item.veg, item.starch, ...item.extras].filter(Boolean);
      
      dishNames.forEach(name => {
        for (const cat of RECIPE_CATEGORIES) {
          const recipe = recipes[cat]?.find(r => r.name === name);
          if (recipe) {
            recipe.ingredients.forEach(ing => {
              const key = `${ing.name}-${ing.unit}-${ing.source}-${ing.section}`;
              if (!list[key]) {
                list[key] = { ...ing, totalQty: 0 };
              }
              list[key].totalQty += (parseFloat(ing.quantity) || 0) * item.portions;
            });
            break;
          }
        }
      });
    });
    
    return Object.values(list);
  };

  const prepList = getPrepList();

  // Group by source, then by section
  const grouped = prepList.reduce((acc, item) => {
    const source = item.source || 'No Source';
    const section = item.section || 'Other';
    
    if (!acc[source]) acc[source] = {};
    if (!acc[source][section]) acc[source][section] = [];
    acc[source][section].push(item);
    
    return acc;
  }, {});

  const exportList = () => {
    const flat = prepList.map(item => ({
      name: item.name,
      quantity: item.totalQty,
      unit: item.unit,
      source: item.source,
      section: item.section
    }));
    exportToCSV(flat, 'shopping-list.csv');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: COLORS.brown }}>Shopping List</h2>
        {prepList.length > 0 && (
          <Button variant="ghost" onClick={exportList}>
            <Download size={16} /> Export CSV
          </Button>
        )}
      </div>

      {prepList.length === 0 ? (
        <Card><p style={{ color: COLORS.brown, textAlign: 'center' }}>No items in menu</p></Card>
      ) : (
        Object.entries(grouped).map(([source, sections]) => (
          <div key={source} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: COLORS.blue, marginBottom: '0.75rem' }}>{source}</h3>
            {Object.entries(sections).map(([section, items]) => (
              <Card key={section} style={{ marginBottom: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: COLORS.brown, fontSize: '0.875rem' }}>{section}</h4>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem', background: COLORS.cream, borderRadius: '0.25rem' }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 500 }}>{item.totalQty.toFixed(1)} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

// --- HISTORY TAB ---
const HistoryTab = ({ orderHistory }) => {
  // Group by client
  const byClient = orderHistory.reduce((acc, order) => {
    if (!acc[order.clientName]) acc[order.clientName] = [];
    acc[order.clientName].push(order);
    return acc;
  }, {});

  const clientTotals = Object.entries(byClient).map(([name, orders]) => ({
    name,
    orders,
    totalCost: orders.reduce((sum, o) => sum + (o.cost || 0), 0),
    totalPortions: orders.reduce((sum, o) => sum + o.portions, 0)
  }));

  return (
    <div>
      <h2 style={{ margin: '0 0 1rem', color: COLORS.brown }}>Order History</h2>

      {clientTotals.length === 0 ? (
        <Card><p style={{ color: COLORS.brown, textAlign: 'center' }}>No completed orders</p></Card>
      ) : (
        clientTotals.map(client => (
          <Card key={client.name} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: COLORS.blue }}>{client.name}</h3>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: COLORS.gold }}>${client.totalCost.toFixed(2)} total</div>
                <div style={{ fontSize: '0.875rem', color: COLORS.brown }}>{client.totalPortions} portions</div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {client.orders.map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: COLORS.cream, borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{formatDate(order.date)}</span>
                    <span style={{ marginLeft: '0.75rem', color: COLORS.brown }}>{order.dishes.join(', ')}</span>
                  </div>
                  <div>
                    <span>{order.portions}p</span>
                    <span style={{ marginLeft: '0.5rem', fontWeight: 500 }}>${order.cost?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

// ============================================================
// PART 6: MAIN APP COMPONENT
// ============================================================

export default function GoldfinchChef() {
  const [data, setData] = useLocalStorage(STORAGE_KEY, getDefaultData());
  const [activeTab, setActiveTab] = useState('menu');

  const updateData = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'clients':
        return <ClientsTab clients={data.clients} setClients={v => updateData('clients', v)} masterIngredients={data.masterIngredients} />;
      case 'ingredients':
        return <IngredientsTab ingredients={data.masterIngredients} setIngredients={v => updateData('masterIngredients', v)} />;
      case 'recipes':
        return <RecipesTab recipes={data.recipes} setRecipes={v => updateData('recipes', v)} masterIngredients={data.masterIngredients} setMasterIngredients={v => updateData('masterIngredients', v)} />;
      case 'menu':
        return <MenuTab menuItems={data.menuItems} setMenuItems={v => updateData('menuItems', v)} clients={data.clients} recipes={data.recipes} />;
      case 'kds':
        return <KDSTab menuItems={data.menuItems} setMenuItems={v => updateData('menuItems', v)} recipes={data.recipes} orderHistory={data.orderHistory} setOrderHistory={v => updateData('orderHistory', v)} />;
      case 'shop':
        return <ShopTab menuItems={data.menuItems} recipes={data.recipes} />;
      case 'history':
        return <HistoryTab orderHistory={data.orderHistory} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream }}>
      {/* Header */}
      <header style={{ background: COLORS.brown, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ChefHat size={28} color={COLORS.gold} />
        <h1 style={{ margin: 0, color: COLORS.cream, fontSize: '1.5rem', fontWeight: 600 }}>Goldfinch Chef</h1>
      </header>

      {/* Navigation */}
      <nav style={{ background: 'white', borderBottom: `1px solid ${COLORS.peach}`, padding: '0 1rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: isActive ? COLORS.blue : COLORS.brown,
                  borderBottom: `3px solid ${isActive ? COLORS.gold : 'transparent'}`,
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {renderTab()}
      </main>
    </div>
  );
}
