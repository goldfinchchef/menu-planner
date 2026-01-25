import React, { useState } from 'react';
import { Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function KDSTab({
  menuItems,
  recipes,
  completedDishes,
  toggleDishComplete,
  allDishesComplete,
  completeAllOrders,
  getKDSView,
  pendingApprovalCount = 0
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

      {/* Show pending approvals notice */}
      {pendingApprovalCount > 0 && Object.keys(kdsView).length === 0 && (
        <div className="mb-6 p-4 rounded-lg border-2 border-amber-300 bg-amber-50">
          <div className="flex items-start gap-3">
            <Clock size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                {pendingApprovalCount} menu{pendingApprovalCount > 1 ? 's' : ''} waiting for approval
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Menus need to be approved before they appear here for cooking.
              </p>
              <Link
                to="/admin?section=menu-approval"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: '#3d59ab' }}
              >
                Go to Menu Approval
              </Link>
            </div>
          </div>
        </div>
      )}

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
        pendingApprovalCount === 0 && (
          <p className="text-gray-500">No orders yet. Create menus in the Menu tab and approve them to see dishes here.</p>
        )
      )}
    </div>
  );
}
