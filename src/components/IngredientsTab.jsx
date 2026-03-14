import React, { useState } from 'react';
import { Plus, Upload, Download, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { findSimilarIngredients, findExactMatch, normalizeName, similarity, SECTIONS, UNITS } from '../utils/ingredients';
import { exportIngredientsCSV } from '../utils/csv';

export default function IngredientsTab({
  masterIngredients,
  setMasterIngredients,
  recipes,
  setRecipes,
  ingredientsFileRef
}) {
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    cost: '',
    unit: 'oz',
    source: '',
    section: 'Produce'
  });
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [editingIngredientData, setEditingIngredientData] = useState(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);

  const addMasterIngredient = () => {
    if (!newIngredient.name) {
      alert('Please enter an ingredient name');
      return;
    }
    const similar = findSimilarIngredients(newIngredient.name, masterIngredients);
    const exact = findExactMatch(newIngredient.name, masterIngredients);

    if (exact) {
      alert(`"${newIngredient.name}" already exists as "${exact.name}"`);
      return;
    }

    if (similar.length > 0 && !window.confirm(`Similar ingredients found: ${similar.map(s => s.name).join(', ')}\n\nAdd "${newIngredient.name}" anyway?`)) {
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

  const startEditingMasterIngredient = (ing) => {
    setEditingIngredientId(ing.id);
    setEditingIngredientData({ ...ing });
  };

  const saveEditingMasterIngredient = () => {
    setMasterIngredients(prev =>
      prev.map(ing => ing.id === editingIngredientId ? { ...editingIngredientData } : ing)
    );
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
        if (sim > 0.7 && sim < 1) {
          found.push({ ing1, ing2, similarity: sim });
        }
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
          normalizeName(ing.name) === normalizeName(remove.name)
            ? { ...ing, name: keep.name }
            : ing
        )
      }));
    });
    setRecipes(updatedRecipes);
    setMasterIngredients(prev => prev.filter(i => i.id !== removeId));
    setDuplicateWarnings(prev => prev.filter(d => d.ing1.id !== removeId && d.ing2.id !== removeId));
    alert(`Merged "${remove.name}" into "${keep.name}"`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Ingredients</h2>
          <div className="flex gap-2">
            <button
              onClick={scanForDuplicates}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-orange-400 text-orange-600"
            >
              <AlertCircle size={18} />Find Duplicates
            </button>
            <button
              onClick={() => ingredientsFileRef.current.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
              style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
            >
              <Upload size={18} />Import
            </button>
            <button
              onClick={() => exportIngredientsCSV(masterIngredients)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <Download size={18} />Export
            </button>
          </div>
        </div>

        {duplicateWarnings.length > 0 && (
          <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
            <h3 className="font-bold text-orange-700 mb-2">Duplicates:</h3>
            {duplicateWarnings.map((dup, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-orange-200 last:border-0">
                <span className="text-sm">"{dup.ing1.name}" ↔ "{dup.ing2.name}"</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => mergeIngredients(dup.ing1.id, dup.ing2.id)}
                    className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700"
                  >
                    Keep "{dup.ing1.name}"
                  </button>
                  <button
                    onClick={() => mergeIngredients(dup.ing2.id, dup.ing1.id)}
                    className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700"
                  >
                    Keep "{dup.ing2.name}"
                  </button>
                  <button
                    onClick={() => setDuplicateWarnings(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-xs px-2 py-1 rounded bg-gray-100"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            value={newIngredient.name}
            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
            placeholder="Name"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
          <input
            type="text"
            value={newIngredient.cost}
            onChange={(e) => setNewIngredient({ ...newIngredient, cost: e.target.value })}
            placeholder="Cost/unit"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
          <select
            value={newIngredient.unit}
            onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          >
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input
            type="text"
            value={newIngredient.source}
            onChange={(e) => setNewIngredient({ ...newIngredient, source: e.target.value })}
            placeholder="Source"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
          <select
            value={newIngredient.section}
            onChange={(e) => setNewIngredient({ ...newIngredient, section: e.target.value })}
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          >
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={addMasterIngredient}
          className="px-6 py-2 rounded-lg text-white"
          style={{ backgroundColor: '#3d59ab' }}
        >
          <Plus size={20} className="inline mr-2" />Add
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
          All Ingredients ({masterIngredients.length})
        </h2>
        {masterIngredients.length > 0 ? (
          <div className="space-y-2">
            {masterIngredients.map(ing => (
              <div key={ing.id}>
                {editingIngredientId === ing.id ? (
                  <div
                    className="flex flex-wrap gap-2 p-3 rounded-lg border-2"
                    style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}
                  >
                    <input
                      type="text"
                      value={editingIngredientData.name}
                      onChange={(e) => setEditingIngredientData({ ...editingIngredientData, name: e.target.value })}
                      className="flex-1 min-w-[120px] p-2 border rounded"
                    />
                    <input
                      type="text"
                      value={editingIngredientData.cost}
                      onChange={(e) => setEditingIngredientData({ ...editingIngredientData, cost: e.target.value })}
                      placeholder="$"
                      className="w-16 p-2 border rounded"
                    />
                    <select
                      value={editingIngredientData.unit}
                      onChange={(e) => setEditingIngredientData({ ...editingIngredientData, unit: e.target.value })}
                      className="w-16 p-2 border rounded"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input
                      type="text"
                      value={editingIngredientData.source}
                      onChange={(e) => setEditingIngredientData({ ...editingIngredientData, source: e.target.value })}
                      placeholder="Source"
                      className="w-20 p-2 border rounded"
                    />
                    <select
                      value={editingIngredientData.section}
                      onChange={(e) => setEditingIngredientData({ ...editingIngredientData, section: e.target.value })}
                      className="w-28 p-2 border rounded"
                    >
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={saveEditingMasterIngredient}
                      className="px-3 py-2 rounded text-white"
                      style={{ backgroundColor: '#3d59ab' }}
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={cancelEditingMasterIngredient}
                      className="px-3 py-2 rounded bg-gray-200"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex justify-between items-center p-3 rounded-lg"
                    style={{ backgroundColor: '#f9f9ed' }}
                  >
                    <div>
                      <p className="font-medium">{ing.name}</p>
                      <p className="text-sm text-gray-600">
                        {ing.cost && `$${ing.cost}/${ing.unit}`} {ing.source && `• ${ing.source}`} • {ing.section}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditingMasterIngredient(ing)} className="text-blue-600">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deleteMasterIngredient(ing.id)} className="text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No ingredients yet.</p>
        )}
      </div>
    </div>
  );
}
