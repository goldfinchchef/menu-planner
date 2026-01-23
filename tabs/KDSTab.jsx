import React from 'react';
import { Check } from 'lucide-react';

export default function KDSTab({
  menuItems,
  recipes,
  completedDishes,
  toggleDishComplete,
  allDishesComplete,
  completeAllOrders,
  getKDSView
}) {
  const kdsView = getKDSView();

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
            <Check size={18} />Complete All & Save to History
          </button>
        )}
      </div>
      {Object.keys(kdsView).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(kdsView).map(([dishName, data]) => {
            const recipe = recipes[data.category]?.find(r => r.name === dishName);
            const isComplete = completedDishes[dishName];
            return (
              <div
                key={dishName}
                className={`border-2 rounded-lg p-4 ${isComplete ? 'opacity-50' : ''}`}
                style={{ borderColor: isComplete ? '#22c55e' : '#ebb582' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>{dishName}</h3>
                    <p className="text-lg font-semibold" style={{ color: '#ffd700' }}>
                      {data.totalPortions} portions
                    </p>
                    <p className="text-sm text-gray-500">
                      {data.clients.map(c => `${c.name} (${c.portions})`).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDishComplete(dishName)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      isComplete ? 'bg-green-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    <Check size={18} />{isComplete ? 'Done' : 'Mark Complete'}
                  </button>
                </div>
                {recipe?.ingredients && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Ingredients:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {recipe.ingredients.map((ing, i) => (
                        <div
                          key={i}
                          className="flex justify-between p-2 rounded"
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
                {recipe?.instructions && (
                  <p className="mt-3 p-2 rounded text-sm" style={{ backgroundColor: '#fff4e0' }}>
                    {recipe.instructions}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">No orders yet.</p>
      )}
    </div>
  );
}
