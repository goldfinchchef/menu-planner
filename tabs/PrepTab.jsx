import React, { useState, useEffect, useRef } from 'react';
import { Download, Trash2, Check, Plus, ChevronRight, X, RefreshCw } from 'lucide-react';

const SHOP_DATA_KEY = 'goldfinchShopData';
const SHOP_CHECKED_KEY = 'goldfinchShopChecked';
const SHOP_DAYS = ['Sunday', 'Thursday'];

export default function PrepTab({ prepList, shoppingListsByDay = {}, exportPrepList }) {
  // Checked items state (persisted separately so it survives list regeneration)
  const [checkedItems, setCheckedItems] = useState(() => {
    try {
      const saved = localStorage.getItem(SHOP_CHECKED_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Manual items added by user (persisted)
  const [manualItems, setManualItems] = useState(() => {
    try {
      const saved = localStorage.getItem(SHOP_DATA_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // Extract only manual items
        const manual = {};
        SHOP_DAYS.forEach(day => {
          manual[day] = (data[day] || []).filter(item => item.manual);
        });
        return manual;
      }
    } catch {}
    return { Sunday: [], Thursday: [] };
  });

  const [newItemText, setNewItemText] = useState('');
  const [addingToDay, setAddingToDay] = useState(null);
  const [movingItem, setMovingItem] = useState(null);

  // Save checked items to localStorage
  useEffect(() => {
    localStorage.setItem(SHOP_CHECKED_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  // Save manual items to localStorage
  useEffect(() => {
    // Combine auto-generated and manual items for storage
    const combined = {};
    SHOP_DAYS.forEach(day => {
      const autoItems = (shoppingListsByDay[day] || []).map(item => ({
        ...item,
        id: `auto-${item.name}-${item.unit}`,
        manual: false
      }));
      combined[day] = [...autoItems, ...(manualItems[day] || [])];
    });
    localStorage.setItem(SHOP_DATA_KEY, JSON.stringify(combined));
  }, [manualItems, shoppingListsByDay]);

  // Get combined list for a day (auto-generated + manual)
  const getItemsForDay = (day) => {
    const autoItems = (shoppingListsByDay[day] || []).map(item => ({
      ...item,
      id: `auto-${item.name}-${item.unit}`,
      manual: false,
      checked: checkedItems[`auto-${item.name}-${item.unit}`] || false
    }));
    const manualItemsForDay = (manualItems[day] || []).map(item => ({
      ...item,
      checked: checkedItems[item.id] || false
    }));
    return [...autoItems, ...manualItemsForDay];
  };

  const toggleItem = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
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
      manual: true
    };

    setManualItems(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), newItem]
    }));
    setNewItemText('');
    setAddingToDay(null);
  };

  const removeManualItem = (day, itemId) => {
    setManualItems(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter(item => item.id !== itemId)
    }));
    // Also remove from checked
    setCheckedItems(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const clearChecked = (day) => {
    const items = getItemsForDay(day);
    const checkedIds = items.filter(i => i.checked).map(i => i.id);

    // Remove checked manual items
    setManualItems(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter(item => !checkedIds.includes(item.id))
    }));

    // Clear checked state for all items in this day
    setCheckedItems(prev => {
      const updated = { ...prev };
      checkedIds.forEach(id => delete updated[id]);
      return updated;
    });
  };

  const clearAllChecks = () => {
    if (window.confirm('Clear all checked items?')) {
      setCheckedItems({});
    }
  };

  const getDayStats = (day) => {
    const items = getItemsForDay(day);
    const checked = items.filter(i => i.checked).length;
    return { total: items.length, checked };
  };

  // Group items by source then section
  const getGroupedItems = (day) => {
    const items = getItemsForDay(day);
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

  // Get description for each shopping day
  const getDayDescription = (day) => {
    if (day === 'Sunday') return 'For Monday & Tuesday deliveries';
    if (day === 'Thursday') return 'For Thursday deliveries';
    return '';
  };

  // Calculate totals
  const totalItems = SHOP_DAYS.reduce((sum, day) => sum + getDayStats(day).total, 0);
  const totalChecked = SHOP_DAYS.reduce((sum, day) => sum + getDayStats(day).checked, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Shopping Lists</h2>
            <p className="text-sm text-gray-600">
              Auto-generated from approved menus • {totalChecked}/{totalItems} items checked
            </p>
          </div>
          <div className="flex gap-2">
            {totalChecked > 0 && (
              <button
                onClick={clearAllChecks}
                className="px-4 py-2 rounded-lg border-2 flex items-center gap-2"
                style={{ borderColor: '#ebb582', color: '#423d3c' }}
              >
                <RefreshCw size={18} />
                Reset Checks
              </button>
            )}
            <button
              onClick={exportPrepList}
              className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <Download size={18} />
              Export All
            </button>
          </div>
        </div>

        {totalItems === 0 && (
          <div className="text-center py-8 mb-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
            <p className="text-gray-500">No shopping items yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Approve menus in Menu Planner to auto-generate shopping lists
            </p>
          </div>
        )}

        {/* Day columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-xs text-white/70">
                      {getDayDescription(day)}
                    </p>
                    <p className="text-sm text-white/80 mt-1">
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
                <div className="p-4 max-h-[500px] overflow-y-auto" style={{ backgroundColor: '#f9f9ed' }}>
                  {stats.total === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items for this day</p>
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
                                key={item.id}
                                className={`flex items-center gap-2 p-2 rounded mb-1 group ${
                                  item.checked ? 'opacity-50' : ''
                                }`}
                                style={{ backgroundColor: 'white' }}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleItem(item.id)}
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
                                {item.quantity != null && (
                                  <span className={`text-xs font-medium ${item.checked ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {typeof item.quantity === 'number' ? item.quantity.toFixed(1) : item.quantity} {item.unit}
                                  </span>
                                )}

                                {/* Remove button (only for manual items) */}
                                {item.manual && (
                                  <button
                                    onClick={() => removeManualItem(day, item.id)}
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
    </div>
  );
}
