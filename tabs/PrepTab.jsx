import React, { useState, useEffect } from 'react';
import { Download, Trash2, Check, Plus, ChevronRight, X } from 'lucide-react';

const SHOP_DATA_KEY = 'goldfinchShopData';
const SHOP_DAYS = ['Sunday', 'Tuesday', 'Thursday'];

export default function PrepTab({ prepList, exportPrepList }) {
  // Shop data structure: { Sunday: [...items], Tuesday: [...items], Thursday: [...items] }
  const [shopData, setShopData] = useState(() => {
    try {
      const saved = localStorage.getItem(SHOP_DATA_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return { Sunday: [], Tuesday: [], Thursday: [] };
  });

  const [newItemText, setNewItemText] = useState('');
  const [addingToDay, setAddingToDay] = useState(null);
  const [movingItem, setMovingItem] = useState(null); // { day, index }

  // Save to localStorage whenever shopData changes
  useEffect(() => {
    localStorage.setItem(SHOP_DATA_KEY, JSON.stringify(shopData));
  }, [shopData]);

  // Auto-populate from prepList if a day is empty
  useEffect(() => {
    if (prepList.length > 0) {
      // Check if we should auto-populate Sunday (main shop day)
      const hasManualItems = SHOP_DAYS.some(day =>
        shopData[day]?.some(item => item.manual)
      );

      // Only auto-populate if there are no manual items (user hasn't customized)
      if (!hasManualItems && shopData.Sunday?.length === 0) {
        const autoItems = prepList.map(item => ({
          id: `${item.name}-${item.unit}-${Date.now()}-${Math.random()}`,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          section: item.section,
          source: item.source,
          checked: false,
          manual: false
        }));
        setShopData(prev => ({ ...prev, Sunday: autoItems }));
      }
    }
  }, [prepList]);

  const toggleItem = (day, index) => {
    setShopData(prev => ({
      ...prev,
      [day]: prev[day].map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  const addManualItem = (day) => {
    if (!newItemText.trim()) return;

    const newItem = {
      id: `manual-${Date.now()}-${Math.random()}`,
      name: newItemText.trim(),
      quantity: null,
      unit: '',
      section: 'Manual Items',
      source: '',
      checked: false,
      manual: true
    };

    setShopData(prev => ({
      ...prev,
      [day]: [...prev[day], newItem]
    }));
    setNewItemText('');
    setAddingToDay(null);
  };

  const removeItem = (day, index) => {
    setShopData(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const moveItem = (fromDay, index, toDay) => {
    const item = shopData[fromDay][index];
    setShopData(prev => ({
      ...prev,
      [fromDay]: prev[fromDay].filter((_, i) => i !== index),
      [toDay]: [...prev[toDay], item]
    }));
    setMovingItem(null);
  };

  const clearChecked = (day) => {
    setShopData(prev => ({
      ...prev,
      [day]: prev[day].filter(item => !item.checked)
    }));
  };

  const clearAllForDay = (day) => {
    if (window.confirm(`Clear all items for ${day}?`)) {
      setShopData(prev => ({ ...prev, [day]: [] }));
    }
  };

  const getDayStats = (day) => {
    const items = shopData[day] || [];
    const checked = items.filter(i => i.checked).length;
    return { total: items.length, checked };
  };

  // Group items by source then section
  const getGroupedItems = (day) => {
    const items = shopData[day] || [];
    const grouped = {};

    items.forEach((item, index) => {
      const source = item.source || 'Other';
      const section = item.section || 'Other';

      if (!grouped[source]) grouped[source] = {};
      if (!grouped[source][section]) grouped[source][section] = [];
      grouped[source][section].push({ ...item, originalIndex: index });
    });

    return grouped;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Shopping Lists</h2>
          <button
            onClick={exportPrepList}
            className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
            style={{ backgroundColor: '#3d59ab' }}
          >
            <Download size={18} />
            Export All
          </button>
        </div>

        {/* Day tabs */}
        <div className="grid grid-cols-3 gap-4">
          {SHOP_DAYS.map(day => {
            const stats = getDayStats(day);
            const grouped = getGroupedItems(day);
            const sources = Object.keys(grouped).sort();

            return (
              <div
                key={day}
                className="border-2 rounded-lg overflow-hidden"
                style={{ borderColor: '#ebb582' }}
              >
                {/* Day header */}
                <div
                  className="p-4 flex justify-between items-center"
                  style={{ backgroundColor: '#3d59ab' }}
                >
                  <div>
                    <h3 className="text-lg font-bold text-white">{day}</h3>
                    <p className="text-sm text-white/70">
                      {stats.checked}/{stats.total} done
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {stats.checked > 0 && (
                      <button
                        onClick={() => clearChecked(day)}
                        className="p-2 rounded bg-white/20 hover:bg-white/30 text-white"
                        title="Remove checked items"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items list */}
                <div className="p-4 max-h-96 overflow-y-auto" style={{ backgroundColor: '#f9f9ed' }}>
                  {stats.total === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items</p>
                  ) : (
                    sources.map(source => (
                      <div key={source} className="mb-4">
                        <h4 className="font-bold text-sm mb-2" style={{ color: '#3d59ab' }}>
                          {source}
                        </h4>
                        {Object.entries(grouped[source]).map(([section, sectionItems]) => (
                          <div key={section} className="mb-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">{section}</p>
                            {sectionItems.map((item) => (
                              <div
                                key={item.id || item.originalIndex}
                                className={`flex items-center gap-2 p-2 rounded mb-1 group ${
                                  item.checked ? 'opacity-50' : ''
                                }`}
                                style={{ backgroundColor: 'white' }}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleItem(day, item.originalIndex)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    item.checked
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300 bg-white hover:border-green-400'
                                  }`}
                                >
                                  {item.checked && <Check size={12} className="text-white" />}
                                </button>

                                {/* Item name */}
                                <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : ''}`}>
                                  {item.name}
                                </span>

                                {/* Quantity */}
                                {item.quantity && (
                                  <span className={`text-xs font-medium ${item.checked ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {typeof item.quantity === 'number' ? item.quantity.toFixed(1) : item.quantity} {item.unit}
                                  </span>
                                )}

                                {/* Move button */}
                                <button
                                  onClick={() => setMovingItem({ day, index: item.originalIndex })}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100"
                                  title="Move to another day"
                                >
                                  <ChevronRight size={14} className="text-gray-400" />
                                </button>

                                {/* Remove button (only for manual items) */}
                                {item.manual && (
                                  <button
                                    onClick={() => removeItem(day, item.originalIndex)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100"
                                    title="Remove item"
                                  >
                                    <X size={14} className="text-red-400" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                {/* Add item section */}
                <div className="p-3 border-t" style={{ borderColor: '#ebb582' }}>
                  {addingToDay === day ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addManualItem(day)}
                        placeholder="Item name..."
                        className="flex-1 px-3 py-2 border rounded text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => addManualItem(day)}
                        className="px-3 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: '#3d59ab' }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingToDay(null); setNewItemText(''); }}
                        className="px-3 py-2 rounded border text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToDay(day)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm hover:bg-gray-100"
                      style={{ color: '#3d59ab' }}
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Move item modal */}
      {movingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#3d59ab' }}>
              Move to which day?
            </h3>
            <div className="space-y-2">
              {SHOP_DAYS.filter(d => d !== movingItem.day).map(day => (
                <button
                  key={day}
                  onClick={() => moveItem(movingItem.day, movingItem.index, day)}
                  className="w-full p-3 rounded-lg border-2 text-left hover:bg-gray-50"
                  style={{ borderColor: '#ebb582' }}
                >
                  {day}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMovingItem(null)}
              className="w-full mt-4 p-2 rounded-lg border text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
