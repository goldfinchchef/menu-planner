import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Utensils } from 'lucide-react';

export default function KDSTab({
  menuItems,
  recipes,
  completedDishes,
  toggleDishComplete,
  allDishesComplete,
  completeAllOrders,
  getKDSView
}) {
  const [expandedTiles, setExpandedTiles] = useState({});
  const kdsView = getKDSView();

  const toggleExpand = (dishName) => {
    setExpandedTiles(prev => ({
      ...prev,
      [dishName]: !prev[dishName]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Kitchen Display</h2>
        {menuItems.length > 0 && allDishesComplete() && (
          <button
            onClick={completeAllOrders}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#22c55e' }}
          >
            <Check size={18} />Complete All & Ready for Delivery
          </button>
        )}
      </div>

      {Object.keys(kdsView).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(kdsView).map(([dishName, data]) => {
            const recipe = recipes[data.category]?.find(r => r.name === dishName);
            const isComplete = completedDishes[dishName];
            const isExpanded = expandedTiles[dishName];

            return (
              <div
                key={dishName}
                className={`border-2 rounded-lg overflow-hidden transition-all ${isComplete ? 'opacity-60' : ''}`}
                style={{ borderColor: isComplete ? '#22c55e' : '#ebb582' }}
              >
                {/* Tile Header - Always visible */}
                <div
                  className="p-4 cursor-pointer select-none"
                  style={{ backgroundColor: isComplete ? '#dcfce7' : '#f9f9ed' }}
                  onClick={() => toggleExpand(dishName)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate" style={{ color: '#3d59ab' }}>
                        {dishName}
                      </h3>
                      <p className="text-2xl font-bold" style={{ color: isComplete ? '#22c55e' : '#3d59ab' }}>
                        {data.totalPortions} <span className="text-sm font-normal text-gray-500">portions</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {isComplete && <Check size={20} className="text-green-600" />}
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 border-t" style={{ borderColor: '#ebb582' }}>
                    {/* Client breakdown */}
                    <p className="text-xs text-gray-500 mb-3">
                      {data.clients.map(c => `${c.name} (${c.portions})`).join(', ')}
                    </p>

                    {/* Mark Complete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDishComplete(dishName);
                      }}
                      className={`w-full mb-4 px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium ${
                        isComplete ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Check size={18} />
                      {isComplete ? 'Completed' : 'Mark Complete'}
                    </button>

                    {/* Ingredients */}
                    {recipe?.ingredients && recipe.ingredients.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Ingredients:</p>
                        <div className="space-y-1">
                          {recipe.ingredients.map((ing, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm p-2 rounded"
                              style={{ backgroundColor: '#f9f9ed' }}
                            >
                              <span>{ing.name}</span>
                              <span className="font-bold">
                                {(parseFloat(ing.quantity) * data.totalPortions).toFixed(1)} {ing.unit || 'oz'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instructions */}
                    {recipe?.instructions && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Instructions:</p>
                        <p className="text-sm p-3 rounded" style={{ backgroundColor: '#fff4e0' }}>
                          {recipe.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Utensils size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">No dishes to cook yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Approved menus will appear here when ready for cooking.
          </p>
        </div>
      )}
    </div>
  );
}
