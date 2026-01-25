import React, { useState, useEffect } from 'react';
import { Download, Trash2, Check } from 'lucide-react';

const CHECKED_ITEMS_KEY = 'goldfinchShopCheckedItems';

export default function PrepTab({ prepList, exportPrepList }) {
  const [checkedItems, setCheckedItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CHECKED_ITEMS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage whenever checkedItems changes
  useEffect(() => {
    localStorage.setItem(CHECKED_ITEMS_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleItem = (itemKey) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const clearChecked = () => {
    if (window.confirm('Clear all checked items?')) {
      setCheckedItems({});
    }
  };

  // Generate a unique key for each item
  const getItemKey = (item) => `${item.name}-${item.unit}-${item.source || 'none'}`;

  // Count checked items
  const checkedCount = prepList.filter(item => checkedItems[getItemKey(item)]).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Shopping List</h2>
          {prepList.length > 0 && (
            <p className="text-sm text-gray-500">
              {checkedCount} of {prepList.length} items checked
            </p>
          )}
        </div>
        {prepList.length > 0 && (
          <div className="flex gap-2">
            {checkedCount > 0 && (
              <button
                onClick={clearChecked}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <Trash2 size={18} />
                Clear Checked
              </button>
            )}
            <button
              onClick={exportPrepList}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <Download size={18} className="inline mr-2" />Export
            </button>
          </div>
        )}
      </div>
      {prepList.length > 0 ? (
        <div className="space-y-6">
          {(() => {
            const sources = [...new Set(prepList.map(item => item.source || 'No Source'))].sort();
            return sources.map(source => {
              const sourceItems = prepList.filter(item => (item.source || 'No Source') === source);
              const sections = [...new Set(sourceItems.map(item => item.section))].sort();
              const sourceCheckedCount = sourceItems.filter(item => checkedItems[getItemKey(item)]).length;

              return (
                <div key={source} className="border-2 rounded-lg p-4" style={{ borderColor: '#3d59ab' }}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>{source}</h3>
                    <span className="text-sm text-gray-500">
                      {sourceCheckedCount}/{sourceItems.length}
                    </span>
                  </div>
                  {sections.map(section => {
                    const sectionItems = sourceItems.filter(item => item.section === section);
                    return (
                      <div key={section} className="mb-4">
                        <h4 className="font-medium mb-2" style={{ color: '#ebb582' }}>{section}</h4>
                        {sectionItems.map((item, i) => {
                          const itemKey = getItemKey(item);
                          const isChecked = checkedItems[itemKey];
                          return (
                            <div
                              key={i}
                              onClick={() => toggleItem(itemKey)}
                              className={`flex items-center gap-3 p-2 rounded mb-1 cursor-pointer transition-all ${
                                isChecked ? 'opacity-50' : 'hover:bg-amber-50'
                              }`}
                              style={{ backgroundColor: '#f9f9ed' }}
                            >
                              <div
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check size={16} className="text-white" />}
                              </div>
                              <span className={`flex-1 ${isChecked ? 'line-through text-gray-400' : ''}`}>
                                {item.name}
                              </span>
                              <span className={`font-bold ${isChecked ? 'line-through text-gray-400' : ''}`}>
                                {item.quantity.toFixed(1)} {item.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <p className="text-gray-500">No items. Add menu items first.</p>
      )}
    </div>
  );
}
