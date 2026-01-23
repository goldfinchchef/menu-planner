import React from 'react';
import { Plus, Trash2, Upload, Download, AlertCircle, Edit2, Check, X } from 'lucide-react';
import { STORE_SECTIONS, UNITS } from '../constants';

export default function IngredientsTab({
  masterIngredients,
  newIngredient,
  setNewIngredient,
  editingIngredientId,
  editingIngredientData,
  setEditingIngredientData,
  duplicateWarnings,
  setDuplicateWarnings,
  scanForDuplicates,
  mergeIngredients,
  addMasterIngredient,
  deleteMasterIngredient,
  startEditingMasterIngredient,
  saveEditingMasterIngredient,
  cancelEditingMasterIngredient,
  ingredientsFileRef,
  exportIngredientsCSV
}) {
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
              onClick={exportIngredientsCSV}
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
            {STORE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                      {STORE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
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
