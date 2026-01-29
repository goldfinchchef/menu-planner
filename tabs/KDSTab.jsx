import React, { useState, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, Utensils, Calendar, Printer, AlertCircle } from 'lucide-react';

// Category display config
const CATEGORY_CONFIG = {
  protein: { label: 'Proteins', color: '#dc2626' },
  veg: { label: 'Veggies', color: '#16a34a' },
  starch: { label: 'Starch', color: '#ca8a04' },
  extras: { label: 'Extras', color: '#7c3aed' }
};

// Production day config
const PRODUCTION_DAYS = {
  monTue: { label: 'Monday/Tuesday Production', deliveries: 'For Mon & Tue deliveries', icon: '🍳' },
  thursday: { label: 'Thursday Production', deliveries: 'For Thu deliveries', icon: '🍳' }
};

// Dish tile component
function DishTile({ dishName, data, recipe, isComplete, isExpanded, onToggleExpand, onToggleComplete }) {
  return (
    <div
      className={`border-2 rounded-lg overflow-hidden transition-all ${isComplete ? 'opacity-60' : ''}`}
      style={{ borderColor: isComplete ? '#22c55e' : '#ebb582' }}
    >
      {/* Tile Header */}
      <div
        className="p-3 cursor-pointer select-none"
        style={{ backgroundColor: isComplete ? '#dcfce7' : '#f9f9ed' }}
        onClick={onToggleExpand}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate" style={{ color: '#3d59ab' }}>
              {dishName}
            </h4>
            <p className="text-xl font-bold" style={{ color: isComplete ? '#22c55e' : '#3d59ab' }}>
              {data.totalPortions} <span className="text-xs font-normal text-gray-500">portions</span>
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {isComplete && <Check size={18} className="text-green-600" />}
            {isExpanded ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 border-t text-sm" style={{ borderColor: '#ebb582' }}>
          {/* Client breakdown */}
          <p className="text-xs text-gray-500 mb-3">
            {data.clients.map(c => `${c.name} (${c.portions})`).join(', ')}
          </p>

          {/* Mark Complete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete();
            }}
            className={`w-full mb-3 px-3 py-2 rounded-lg flex items-center justify-center gap-2 font-medium text-sm ${
              isComplete ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Check size={16} />
            {isComplete ? 'Completed' : 'Mark Complete'}
          </button>

          {/* Ingredients */}
          {recipe?.ingredients && recipe.ingredients.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Ingredients:</p>
              <div className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs p-1.5 rounded"
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
              <p className="text-xs font-semibold text-gray-700 mb-1">Instructions:</p>
              <p className="text-xs p-2 rounded" style={{ backgroundColor: '#fff4e0' }}>
                {recipe.instructions}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Production day section component
function ProductionDaySection({
  productionDay,
  config,
  data,
  recipes,
  completedDishes,
  expandedTiles,
  onToggleExpand,
  onToggleComplete,
  onCompleteAll
}) {
  // Get all dishes for this production day
  const allDishes = [];
  ['protein', 'veg', 'starch', 'extras'].forEach(category => {
    Object.entries(data[category] || {}).forEach(([dishName, dishData]) => {
      allDishes.push({ dishName, ...dishData, categoryType: category });
    });
  });

  const completedCount = allDishes.filter(d => completedDishes[d.dishName]).length;
  const allComplete = allDishes.length > 0 && completedCount === allDishes.length;
  const hasItems = allDishes.length > 0;

  if (!hasItems) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2" style={{ borderColor: '#ebb582' }}>
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3d59ab' }}>
            <span>{config.icon}</span>
            {config.label}
          </h3>
          <p className="text-sm text-gray-500">{config.deliveries}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {completedCount}/{allDishes.length} done
          </span>
          {allComplete && (
            <button
              onClick={onCompleteAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#22c55e' }}
            >
              <Check size={16} />
              Ready for Delivery
            </button>
          )}
        </div>
      </div>

      {/* Category Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['protein', 'veg', 'starch', 'extras'].map(category => {
          const categoryDishes = Object.entries(data[category] || {})
            .sort((a, b) => b[1].totalPortions - a[1].totalPortions); // Sort high to low by quantity
          const catConfig = CATEGORY_CONFIG[category];

          if (categoryDishes.length === 0) return null;

          return (
            <div key={category}>
              {/* Column Header */}
              <div
                className="text-center py-2 px-3 rounded-t-lg mb-2 font-bold text-white text-sm"
                style={{ backgroundColor: catConfig.color }}
              >
                {catConfig.label}
              </div>

              {/* Dishes in this category */}
              <div className="space-y-3">
                {categoryDishes.map(([dishName, dishData]) => {
                  // Find recipe - check all recipe categories
                  let recipe = null;
                  const recipeCategory = dishData.category;
                  if (recipeCategory && recipes[recipeCategory]) {
                    recipe = recipes[recipeCategory].find(r => r.name === dishName);
                  }
                  // Fallback: search all categories
                  if (!recipe) {
                    for (const cat of ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups']) {
                      const found = recipes[cat]?.find(r => r.name === dishName);
                      if (found) {
                        recipe = found;
                        break;
                      }
                    }
                  }

                  return (
                    <DishTile
                      key={dishName}
                      dishName={dishName}
                      data={dishData}
                      recipe={recipe}
                      isComplete={completedDishes[dishName]}
                      isExpanded={expandedTiles[dishName]}
                      onToggleExpand={() => onToggleExpand(dishName)}
                      onToggleComplete={() => onToggleComplete(dishName, category)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KDSTab({
  menuItems,
  recipes,
  completedDishes,
  toggleDishComplete,
  allDishesComplete,
  completeAllOrders,
  getKDSView,
  selectedWeekId,
  currentWeek
}) {
  const [expandedTiles, setExpandedTiles] = useState({});
  const kdsView = getKDSView();

  // Guard: No week selected
  if (!selectedWeekId) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-amber-400" />
          <p className="text-gray-600 text-lg font-medium">No Week Selected</p>
          <p className="text-gray-400 text-sm mt-2">
            Please select a week from the navigation bar to view the kitchen display.
          </p>
        </div>
      </div>
    );
  }

  const toggleExpand = (dishName) => {
    setExpandedTiles(prev => ({
      ...prev,
      [dishName]: !prev[dishName]
    }));
  };

  // Print function for collapsed KDS view
  const printKDS = () => {
    const printWindow = window.open('', '_blank');

    let content = `
      <html>
      <head>
        <title>KDS - Kitchen Production List</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #3d59ab; margin-bottom: 5px; }
          h2 { color: #666; margin-top: 20px; border-bottom: 2px solid #ebb582; padding-bottom: 5px; }
          h3 { margin: 10px 0 5px 0; color: #333; }
          .category { margin-bottom: 15px; }
          .category-header { font-weight: bold; padding: 5px 10px; color: white; display: inline-block; margin-bottom: 5px; }
          .protein { background: #dc2626; }
          .veg { background: #16a34a; }
          .starch { background: #ca8a04; }
          .extras { background: #7c3aed; }
          .dish { padding: 3px 0; border-bottom: 1px dotted #ddd; }
          .dish-name { font-weight: 500; }
          .portions { color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Kitchen Production List</h1>
        <p style="color: #666; margin-bottom: 20px;">Printed: ${new Date().toLocaleDateString()}</p>
    `;

    ['monTue', 'thursday'].forEach(prodDay => {
      const dayData = kdsView[prodDay];
      const dayLabel = prodDay === 'monTue' ? 'Monday/Tuesday Production' : 'Thursday Production';
      const hasDishes = ['protein', 'veg', 'starch', 'extras'].some(cat => Object.keys(dayData?.[cat] || {}).length > 0);

      if (hasDishes) {
        content += `<h2>${dayLabel}</h2>`;

        ['protein', 'veg', 'starch', 'extras'].forEach(category => {
          const dishes = Object.entries(dayData[category] || {})
            .sort((a, b) => b[1].totalPortions - a[1].totalPortions);

          if (dishes.length > 0) {
            const catLabel = CATEGORY_CONFIG[category].label;
            content += `<div class="category"><span class="category-header ${category}">${catLabel}</span>`;

            dishes.forEach(([name, data]) => {
              content += `<div class="dish"><span class="dish-name">${name}</span> <span class="portions">(${data.totalPortions} portions)</span></div>`;
            });

            content += `</div>`;
          }
        });
      }
    });

    content += `</body></html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // Check if there are any items at all
  const hasMonTueItems = ['protein', 'veg', 'starch', 'extras'].some(
    cat => Object.keys(kdsView.monTue?.[cat] || {}).length > 0
  );
  const hasThursdayItems = ['protein', 'veg', 'starch', 'extras'].some(
    cat => Object.keys(kdsView.thursday?.[cat] || {}).length > 0
  );
  const hasAnyItems = hasMonTueItems || hasThursdayItems;

  return (
    <div>
      {/* Main Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Kitchen Display</h2>
            <p className="text-sm text-gray-500 mt-1">
              Dishes grouped by production day and category
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAnyItems && (
              <button
                onClick={printKDS}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
              >
                <Printer size={18} />
                Print
              </button>
            )}
            {menuItems.length > 0 && allDishesComplete() && (
              <button
                onClick={completeAllOrders}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#22c55e' }}
              >
                <Check size={18} />
                Complete All & Ready for Delivery
              </button>
            )}
          </div>
        </div>
      </div>

      {hasAnyItems ? (
        <>
          {/* Monday/Tuesday Production */}
          {hasMonTueItems && (
            <ProductionDaySection
              productionDay="monTue"
              config={PRODUCTION_DAYS.monTue}
              data={kdsView.monTue}
              recipes={recipes}
              completedDishes={completedDishes}
              expandedTiles={expandedTiles}
              onToggleExpand={toggleExpand}
              onToggleComplete={toggleDishComplete}
              onCompleteAll={completeAllOrders}
            />
          )}

          {/* Thursday Production */}
          {hasThursdayItems && (
            <ProductionDaySection
              productionDay="thursday"
              config={PRODUCTION_DAYS.thursday}
              data={kdsView.thursday}
              recipes={recipes}
              completedDishes={completedDishes}
              expandedTiles={expandedTiles}
              onToggleExpand={toggleExpand}
              onToggleComplete={toggleDishComplete}
              onCompleteAll={completeAllOrders}
            />
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center py-12">
            <Utensils size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">No dishes to cook yet</p>
            <p className="text-gray-400 text-sm mt-2">
              {selectedWeekId ? (
                <>Approved menus for week <strong>{selectedWeekId}</strong> will appear here when ready for cooking.</>
              ) : (
                <>Select a week and approve menus to see dishes here.</>
              )}
            </p>
            {!currentWeek && selectedWeekId && (
              <p className="text-amber-500 text-xs mt-3">
                Week {selectedWeekId} has no data yet. Menus will be created when clients are assigned.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
