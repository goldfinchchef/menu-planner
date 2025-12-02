const [duplicateWarnings, setDuplicateWarnings] = useState([]);
const [completedDishes, setCompletedDishes] = useState({});
const [orderHistory, setOrderHistory] = useState([]);
  const [editingCostId, setEditingCostId] = useState(null);
  const [editingCostValue, setEditingCostValue] = useState('');

useEffect(() => {
const savedData = localStorage.getItem('goldfinchChefData');
@@ -43,13 +45,19 @@ export default function App() {
localStorage.setItem('goldfinchChefData', JSON.stringify(dataToSave));
}, [recipes, clients, menuItems, masterIngredients, orderHistory]);

  // Title Case helper
  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

const normalizeName = (name) => name.toLowerCase().trim().replace(/s$/, '').replace(/es$/, '').replace(/ies$/, 'y').replace(/[^a-z0-9]/g, '');

const similarity = (str1, str2) => {
const s1 = normalizeName(str1), s2 = normalizeName(str2);
if (s1 === s2) return 1;
if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    const longer = s1.length > s2.length ? s1 : s2, shorter = s1.length > s2.length ? s2 : s1;
    const longer = s1.length > s2.length ? s1 : s2;
if (longer.length === 0) return 1;
const costs = [];
for (let i = 0; i <= s1.length; i++) {
@@ -77,14 +85,15 @@ export default function App() {

const addToMasterIngredients = (ingredient) => {
if (!ingredient.name) return;
    const exactMatch = findExactMatch(ingredient.name);
    const titleCaseName = toTitleCase(ingredient.name);
    const exactMatch = findExactMatch(titleCaseName);
if (exactMatch) {
if (ingredient.cost || ingredient.source || ingredient.section !== 'Other') {
setMasterIngredients(prev => prev.map(mi => mi.id === exactMatch.id ? { ...mi, cost: ingredient.cost || mi.cost, source: ingredient.source || mi.source, section: ingredient.section !== 'Other' ? ingredient.section : mi.section } : mi));
}
return;
}
    setMasterIngredients(prev => [...prev, { id: Date.now() + Math.random(), name: ingredient.name, cost: ingredient.cost || '', unit: ingredient.unit || 'oz', source: ingredient.source || '', section: ingredient.section || 'Other' }]);
    setMasterIngredients(prev => [...prev, { id: Date.now() + Math.random(), name: titleCaseName, cost: ingredient.cost || '', unit: ingredient.unit || 'oz', source: ingredient.source || '', section: ingredient.section || 'Other' }]);
};

const mergeIngredients = (keepId, removeId) => {
@@ -172,7 +181,7 @@ export default function App() {
Papa.parse(file, {
header: true,
complete: (results) => {
        const imported = results.data.filter(row => row.name).map(row => ({ id: Date.now() + Math.random(), name: row.name || '', cost: row.cost || '', unit: row.unit || 'oz', source: row.source || '', section: row.section || 'Other' }));
        const imported = results.data.filter(row => row.name).map(row => ({ id: Date.now() + Math.random(), name: toTitleCase(row.name || ''), cost: row.cost || '', unit: row.unit || 'oz', source: row.source || '', section: row.section || 'Other' }));
setMasterIngredients(imported);
alert(`Imported ${imported.length} ingredients!`);
},
@@ -208,7 +217,7 @@ export default function App() {
const recipeName = row['Recipe Name'], category = (row['Category'] || 'protein').toLowerCase();
if (!recipeMap[recipeName]) recipeMap[recipeName] = { name: recipeName, category, instructions: row['Instructions'] || '', ingredients: [] };
if (row['Ingredient']) {
            const ingredient = { name: row['Ingredient'], quantity: row['Portion Size (oz)'] || '', unit: 'oz', cost: row['cost'] || '', source: row['source'] || '', section: row['section'] || 'Other' };
            const ingredient = { name: toTitleCase(row['Ingredient']), quantity: row['Portion Size (oz)'] || '', unit: 'oz', cost: row['cost'] || '', source: row['source'] || '', section: row['section'] || 'Other' };
recipeMap[recipeName].ingredients.push(ingredient);
ingredientsToAdd.push(ingredient);
}
@@ -230,7 +239,7 @@ export default function App() {

const saveRecipe = () => {
if (!newRecipe.name) { alert('Please enter a recipe name'); return; }
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity);
    const validIngredients = newRecipe.ingredients.filter(ing => ing.name && ing.quantity).map(ing => ({ ...ing, name: toTitleCase(ing.name) }));
if (validIngredients.length === 0) { alert('Please add at least one ingredient with name and quantity'); return; }
validIngredients.forEach(ing => addToMasterIngredients(ing));
setRecipes({ ...recipes, [newRecipe.category]: [...recipes[newRecipe.category], { name: newRecipe.name, instructions: newRecipe.instructions, ingredients: validIngredients }] });
@@ -246,7 +255,7 @@ export default function App() {

const saveEditingRecipe = () => {
const { category, index, recipe } = editingRecipe;
    const validIngredients = recipe.ingredients.filter(ing => ing.name && ing.quantity);
    const validIngredients = recipe.ingredients.filter(ing => ing.name && ing.quantity).map(ing => ({ ...ing, name: toTitleCase(ing.name) }));
validIngredients.forEach(ing => addToMasterIngredients(ing));
const updatedRecipes = { ...recipes };
updatedRecipes[category][index] = { ...recipe, ingredients: validIngredients };
@@ -307,7 +316,6 @@ export default function App() {
});
if (item.extras) {
item.extras.forEach(extra => {
          const extraRecipe = [...recipes.sauces, ...recipes.breakfast, ...recipes.soups].find(r => r.name === extra);
const category = recipes.sauces.find(r => r.name === extra) ? 'sauces' : recipes.breakfast.find(r => r.name === extra) ? 'breakfast' : 'soups';
if (!kds[extra]) kds[extra] = { totalPortions: 0, category, clients: [] };
kds[extra].totalPortions += item.portions;
@@ -408,19 +416,29 @@ export default function App() {

const addMasterIngredient2 = () => {
if (!newIngredient.name) { alert('Please enter an ingredient name'); return; }
    const similar = findSimilarIngredients(newIngredient.name), exact = findExactMatch(newIngredient.name);
    if (exact) { alert(`"${newIngredient.name}" already exists as "${exact.name}"`); return; }
    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${newIngredient.name}" anyway?`)) return;
    setMasterIngredients([...masterIngredients, { ...newIngredient, id: Date.now() }]);
    const titleCaseName = toTitleCase(newIngredient.name);
    const similar = findSimilarIngredients(titleCaseName), exact = findExactMatch(titleCaseName);
    if (exact) { alert(`"${titleCaseName}" already exists as "${exact.name}"`); return; }
    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${titleCaseName}" anyway?`)) return;
    setMasterIngredients([...masterIngredients, { ...newIngredient, name: titleCaseName, id: Date.now() }]);
setNewIngredient({ name: '', cost: '', unit: 'oz', source: '', section: 'Produce' });
alert('Ingredient added!');
};

const deleteMasterIngredient = (id) => { if (window.confirm('Delete this ingredient?')) setMasterIngredients(masterIngredients.filter(ing => ing.id !== id)); };
const startEditingMasterIngredient = (ing) => { setEditingIngredientId(ing.id); setEditingIngredientData({ ...ing }); };
  const saveEditingMasterIngredient = () => { setMasterIngredients(prev => prev.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData } : ing)); setEditingIngredientId(null); setEditingIngredientData(null); };
  const saveEditingMasterIngredient = () => { setMasterIngredients(prev => prev.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData, name: toTitleCase(editingIngredientData.name) } : ing)); setEditingIngredientId(null); setEditingIngredientData(null); };
const cancelEditingMasterIngredient = () => { setEditingIngredientId(null); setEditingIngredientData(null); };

  // Inline cost editing
  const startEditingCost = (ing) => { setEditingCostId(ing.id); setEditingCostValue(ing.cost || ''); };
  const saveEditingCost = () => {
    setMasterIngredients(prev => prev.map(ing => ing.id === editingCostId ? { ...ing, cost: editingCostValue } : ing));
    setEditingCostId(null);
    setEditingCostValue('');
  };
  const handleCostKeyDown = (e) => { if (e.key === 'Enter') saveEditingCost(); if (e.key === 'Escape') { setEditingCostId(null); setEditingCostValue(''); } };

const kdsView = getKDSView();
const prepList = getPrepList();
const ordersByClient = getOrdersByClient();
@@ -852,11 +870,11 @@ export default function App() {
<div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
<h3 className="font-bold text-orange-700 mb-2">Duplicates:</h3>
{duplicateWarnings.map((dup, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-orange-200 last:border-0">
                    <div key={i} className="flex flex-wrap items-center justify-between py-2 border-b border-orange-200 last:border-0 gap-2">
<span className="text-sm">"{dup.ing1.name}" ↔ "{dup.ing2.name}"</span>
<div className="flex gap-2">
                        <button onClick={() => mergeIngredients(dup.ing1.id, dup.ing2.id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Keep "{dup.ing1.name}"</button>
                        <button onClick={() => mergeIngredients(dup.ing2.id, dup.ing1.id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Keep "{dup.ing2.name}"</button>
                        <button onClick={() => mergeIngredients(dup.ing1.id, dup.ing2.id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Keep "{dup.ing1.name}", delete "{dup.ing2.name}"</button>
                        <button onClick={() => mergeIngredients(dup.ing2.id, dup.ing1.id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Keep "{dup.ing2.name}", delete "{dup.ing1.name}"</button>
<button onClick={() => setDuplicateWarnings(prev => prev.filter((_, idx) => idx !== i))} className="text-xs px-2 py-1 rounded bg-gray-100">Ignore</button>
</div>
</div>
@@ -898,9 +916,30 @@ export default function App() {
</div>
) : (
<div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                          <div>
                          <div className="flex-1">
<p className="font-medium">{ing.name}</p>
                            <p className="text-sm text-gray-600">{ing.cost && `$${ing.cost}/${ing.unit}`} {ing.source && `• ${ing.source}`} • {ing.section}</p>
                            <p className="text-sm text-gray-600">
                              {editingCostId === ing.id ? (
                                <input
                                  type="text"
                                  value={editingCostValue}
                                  onChange={(e) => setEditingCostValue(e.target.value)}
                                  onBlur={saveEditingCost}
                                  onKeyDown={handleCostKeyDown}
                                  className="w-16 p-1 border rounded text-sm"
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  onClick={() => startEditingCost(ing)} 
                                  className="cursor-pointer hover:bg-yellow-100 px-1 rounded"
                                  title="Click to edit cost"
                                >
                                  {ing.cost ? `$${ing.cost}/${ing.unit}` : 'No cost'}
                                </span>
                              )}
                              {ing.source && ` • ${ing.source}`} • {ing.section}
                            </p>
</div>
<div className="flex gap-2">
<button onClick={() => startEditingMasterIngredient(ing)} className="text-blue-600"><Edit2 size={18} /></button>
