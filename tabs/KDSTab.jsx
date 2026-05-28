import React, { useState, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, Utensils, Calendar, Printer, AlertCircle, RefreshCw, Clock, FileText, Package, Download } from 'lucide-react';
import { fetchBaseWeeklyMenus } from '../lib/database';
import { isSupabaseMode } from '../lib/dataMode';

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
  clients = [],
  completedDishes,
  toggleDishComplete,
  allDishesComplete,
  completeAllOrders,
  getKDSView,
  selectedWeekId,
  currentWeek,
  kdsLoading = false,
  kdsLastRefresh = null,
  lastMenusApprovedAt = null,
  isSyncing = false,
  unapprovedMenuCount = 0,
  unapprovedByClient = {},
  onApproveAll = null,
  exportShoppingList = null
}) {
  const [expandedTiles, setExpandedTiles] = useState({});
  const [isPrintingProduction, setIsPrintingProduction] = useState(false);
  const kdsView = getKDSView();

  // Active clients for print functions
  const activeClients = clients.filter(c => c.status === 'active');

  // Format last refresh time
  const formatRefreshTime = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Determine if we're in "syncing" state
  // Syncing = KDS is empty AND (loading OR menus approved within last 120 seconds OR isSyncing flag)
  const SYNC_WINDOW_MS = 120000; // 120 seconds
  const recentlyApproved = lastMenusApprovedAt && (Date.now() - lastMenusApprovedAt) < SYNC_WINDOW_MS;

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
    // Block if unapproved menus exist
    if (unapprovedMenuCount > 0) {
      const topClients = Object.entries(unapprovedByClient).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(', ');
      console.log('[PRINT BLOCKED]', { weekId: selectedWeekId, unapprovedMenuCount, unapprovedByClient });
      alert(`Cannot print yet: ${unapprovedMenuCount} unapproved menu(s).\n\nClients: ${topClients}\n\nApprove all menus first.`);
      return;
    }

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

  // Production Sheet print function
  const printProductionSheet = async () => {
    if (unapprovedMenuCount > 0) {
      const topClients = Object.entries(unapprovedByClient).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(', ');
      alert(`Cannot print yet: ${unapprovedMenuCount} unapproved menu(s).\n\nClients: ${topClients}\n\nApprove all menus first.`);
      return;
    }

    setIsPrintingProduction(true);

    try {
      // Check if menus use base menu workflow
      const hasBaseMenuData = menuItems.some(m => m.baseMealIndex != null || m.base_meal_index != null);

      let baseMenus = [];
      if (hasBaseMenuData && isSupabaseMode()) {
        try {
          baseMenus = await fetchBaseWeeklyMenus(selectedWeekId);
        } catch (err) {
          console.warn('Failed to fetch base menus:', err);
        }
      }

      const useBaseMenuWorkflow = hasBaseMenuData && baseMenus.length > 0;

      // Helper: find client by ID or name
      const findClient = (menu) => {
        if (menu.clientId || menu.client_id) {
          const byId = activeClients.find(c => c.id === (menu.clientId || menu.client_id));
          if (byId) return byId;
        }
        return activeClients.find(c => c.name === menu.clientName || c.displayName === menu.clientName);
      };

      // Group menus by meal
      const mealNumbers = [1, 2, 3, 4];
      const menusByMeal = {};

      if (useBaseMenuWorkflow) {
        mealNumbers.forEach(mealNum => {
          menusByMeal[mealNum] = menuItems.filter(m => {
            const baseMealIdx = m.baseMealIndex || m.base_meal_index;
            return baseMealIdx === mealNum && (m.protein || m.veg || m.starch);
          });
        });
      } else {
        mealNumbers.forEach(mealNum => {
          menusByMeal[mealNum] = menuItems.filter(m =>
            (m.mealIndex || m.meal_index) === mealNum && (m.protein || m.veg || m.starch)
          );
        });
      }

      // Build base menu lookup
      const baseMenuByIndex = {};
      baseMenus.forEach(bm => { baseMenuByIndex[bm.meal_index] = bm; });

      const printWindow = window.open('', '_blank');

      let content = `
        <html>
        <head>
          <title>Production Sheet - ${selectedWeekId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; line-height: 1.4; }
            h1 { color: #000; margin-bottom: 5px; font-size: 20px; }
            .header { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #000; }
            .header p { margin: 0; color: #333; font-size: 11px; }
            .meal-section { margin-bottom: 30px; }
            .meal-header { color: #000; padding: 12px 0; font-size: 16px; font-weight: bold; margin-bottom: 16px; border-bottom: 3px solid #000; }
            .base-meal-header { color: #000; padding: 10px 0; font-size: 13px; margin-bottom: 12px; border-bottom: 2px solid #000; }
            .base-label { font-weight: bold; }
            .base-components { font-weight: bold; }
            .total { float: right; font-weight: bold; }
            .standard-section { margin-bottom: 16px; margin-left: 10px; }
            .standard-header { color: #000; padding: 6px 0; font-size: 12px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #000; }
            .override-section { margin-bottom: 16px; margin-left: 10px; border-left: 3px solid #000; padding-left: 10px; }
            .override-header { color: #000; padding: 6px 0; font-size: 11px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #000; }
            .client-list { margin-left: 4px; }
            .client-line { font-size: 11px; color: #000; padding: 2px 0; }
            .client-line:before { content: "•"; margin-right: 6px; color: #000; }
            .dietary { margin-left: 18px; font-size: 10px; color: #000; font-style: italic; }
            .client-extras { margin-left: 18px; font-size: 10px; color: #000; font-weight: bold; }
            .override-menu { font-size: 10px; color: #000; margin-left: 18px; margin-top: 2px; }
            .extras-summary { font-size: 10px; color: #000; font-weight: bold; margin-top: 8px; padding: 4px 8px; border: 1px solid #000; border-radius: 3px; }
            .group { margin-bottom: 20px; margin-left: 10px; break-inside: avoid; }
            .group-header { color: #000; padding: 8px 0; font-size: 13px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; }
            @media print { body { padding: 15px; } .meal-section { break-inside: avoid-page; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Production Sheet</h1>
            <p>Week: ${selectedWeekId} | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
      `;

      mealNumbers.forEach(mealNum => {
        const menus = menusByMeal[mealNum];
        if (!menus || menus.length === 0) return;

        content += `<div class="meal-section">`;
        content += `<div class="meal-header">MEAL ${mealNum}</div>`;

        if (useBaseMenuWorkflow && baseMenuByIndex[mealNum]) {
          const baseMeal = baseMenuByIndex[mealNum];
          const baseComponents = [baseMeal.protein, baseMeal.veg, baseMeal.starch].filter(Boolean).join(' + ');

          // Separate standard vs override
          const standard = [];
          const overrideGroups = {};
          let totalPortions = 0;

          menus.forEach(menu => {
            const client = findClient(menu);
            const clientName = client?.displayName || client?.name || menu.clientName;
            const portions = menu.portions || 1;
            totalPortions += portions;

            const proteinMatch = (menu.protein || '') === (baseMeal.protein || '');
            const vegMatch = (menu.veg || '') === (baseMeal.veg || '');
            const starchMatch = (menu.starch || '') === (baseMeal.starch || '');
            const isStandard = proteinMatch && vegMatch && starchMatch;

            const clientData = { name: clientName, portions, dietaryRestrictions: client?.dietaryRestrictions, extras: menu.extras || [], menu };

            if (isStandard) {
              standard.push(clientData);
            } else {
              const diffs = [];
              if (!proteinMatch) diffs.push(`Protein → ${menu.protein || '(none)'}`);
              if (!vegMatch) diffs.push(`Veg → ${menu.veg || '(none)'}`);
              if (!starchMatch) diffs.push(`Starch → ${menu.starch || '(none)'}`);
              const key = diffs.join(', ');
              if (!overrideGroups[key]) overrideGroups[key] = { label: key, clients: [], totalPortions: 0 };
              overrideGroups[key].clients.push(clientData);
              overrideGroups[key].totalPortions += portions;
            }
          });

          const standardPortions = standard.reduce((sum, c) => sum + c.portions, 0);

          content += `<div class="base-meal-header">`;
          content += `<span class="base-label">Base:</span> <span class="base-components">${baseComponents || '(empty)'}</span>`;
          content += `<span class="total">${totalPortions}p total</span>`;
          content += `</div>`;

          if (standard.length > 0) {
            content += `<div class="standard-section">`;
            content += `<div class="standard-header">STANDARD — ${standardPortions} portions</div>`;
            content += `<div class="client-list">`;
            standard.sort((a, b) => b.portions - a.portions || a.name.localeCompare(b.name));
            standard.forEach(c => {
              content += `<div class="client-line">${c.name} (${c.portions})</div>`;
              if (c.dietaryRestrictions) content += `<div class="dietary">${c.dietaryRestrictions}</div>`;
              if (c.extras?.length > 0) content += `<div class="client-extras">+ ${c.extras.join(', ')}</div>`;
            });
            content += `</div></div>`;
          }

          Object.values(overrideGroups).sort((a, b) => b.totalPortions - a.totalPortions).forEach(og => {
            content += `<div class="override-section">`;
            content += `<div class="override-header">OVERRIDE: ${og.label} — ${og.totalPortions}p</div>`;
            content += `<div class="client-list">`;
            og.clients.sort((a, b) => b.portions - a.portions || a.name.localeCompare(b.name));
            og.clients.forEach(c => {
              content += `<div class="client-line">${c.name} (${c.portions})</div>`;
              if (c.dietaryRestrictions) content += `<div class="dietary">${c.dietaryRestrictions}</div>`;
              content += `<div class="override-menu">[${c.menu.protein || '—'} | ${c.menu.veg || '—'} | ${c.menu.starch || '—'}]</div>`;
              if (c.extras?.length > 0) content += `<div class="client-extras">+ ${c.extras.join(', ')}</div>`;
            });
            content += `</div></div>`;
          });

        } else {
          // Legacy: group by protein+veg or similar
          const groups = {};
          menus.forEach(menu => {
            const client = findClient(menu);
            const key = [menu.protein, menu.veg, menu.starch].filter(Boolean).join(' + ') || '(Empty)';
            if (!groups[key]) groups[key] = { name: key, portions: 0, clients: [] };
            groups[key].portions += menu.portions || 1;
            groups[key].clients.push({
              name: client?.displayName || client?.name || menu.clientName,
              portions: menu.portions || 1,
              dietaryRestrictions: client?.dietaryRestrictions,
              extras: menu.extras || []
            });
          });

          Object.values(groups).sort((a, b) => b.portions - a.portions).forEach(group => {
            content += `<div class="group">`;
            content += `<div class="group-header">${group.name} — ${group.portions} portions</div>`;
            content += `<div class="client-list">`;
            group.clients.sort((a, b) => b.portions - a.portions || a.name.localeCompare(b.name));
            group.clients.forEach(c => {
              content += `<div class="client-line">${c.name} (${c.portions})</div>`;
              if (c.dietaryRestrictions) content += `<div class="dietary">${c.dietaryRestrictions}</div>`;
              if (c.extras?.length > 0) content += `<div class="client-extras">+ ${c.extras.join(', ')}</div>`;
            });
            content += `</div></div>`;
          });
        }

        content += `</div>`;
      });

      content += `</body></html>`;
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    } finally {
      setIsPrintingProduction(false);
    }
  };

  // Packing List print function
  const printPackingList = () => {
    if (unapprovedMenuCount > 0) {
      const topClients = Object.entries(unapprovedByClient).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(', ');
      alert(`Cannot print yet: ${unapprovedMenuCount} unapproved menu(s).\n\nClients: ${topClients}\n\nApprove all menus first.`);
      return;
    }

    // Group by client
    const ordersByClient = {};
    menuItems.forEach(item => {
      const clientName = item.clientName || 'Unknown';
      if (!ordersByClient[clientName]) ordersByClient[clientName] = [];
      ordersByClient[clientName].push(item);
    });

    const printWindow = window.open('', '_blank');

    let content = `
      <html>
      <head>
        <title>Packing List - ${selectedWeekId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 15px; font-size: 11px; line-height: 1.3; }
          h1 { color: #3d59ab; margin-bottom: 3px; font-size: 18px; }
          .header { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #3d59ab; }
          .header p { margin: 0; color: #666; font-size: 10px; }
          .columns { column-count: 2; column-gap: 25px; }
          .client { break-inside: avoid; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dotted #ccc; }
          .client-name { font-weight: bold; font-size: 12px; color: #3d59ab; margin-bottom: 4px; }
          .portions { color: #888; font-size: 10px; font-weight: normal; margin-left: 6px; }
          .meals { margin-left: 4px; }
          .meal { margin-bottom: 6px; }
          .protein { font-weight: bold; font-size: 11px; color: #333; padding: 2px 0; }
          .protein:before { content: "•"; margin-right: 6px; color: #3d59ab; font-weight: bold; }
          .sides { margin-left: 16px; color: #555; font-size: 10px; }
          .side { padding: 1px 0; }
          .side:before { content: "◦"; margin-right: 5px; color: #999; }
          .extras { margin-left: 16px; margin-top: 2px; }
          .extra { color: #7c3aed; font-style: italic; font-size: 10px; padding: 1px 0; }
          .extra:before { content: "+"; margin-right: 4px; }
          @media print { body { padding: 10px; } .columns { column-count: 2; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Packing List</h1>
          <p>Week: ${selectedWeekId} | ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="columns">
    `;

    Object.entries(ordersByClient)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([clientName, orders]) => {
        const client = activeClients.find(c => (c.displayName || c.name) === clientName) ||
                       activeClients.find(c => c.name === clientName);
        const displayName = client?.displayName || clientName;
        const portions = orders[0]?.portions || 1;

        content += `<div class="client">`;
        content += `<div class="client-name">${displayName}<span class="portions">(${portions}p)</span></div>`;
        content += `<div class="meals">`;

        orders.forEach(order => {
          content += `<div class="meal">`;
          if (order.protein) {
            content += `<div class="protein">${order.protein}</div>`;
            if (order.veg || order.starch) {
              content += `<div class="sides">`;
              if (order.veg) content += `<div class="side">${order.veg}</div>`;
              if (order.starch) content += `<div class="side">${order.starch}</div>`;
              content += `</div>`;
            }
          } else {
            if (order.veg) content += `<div class="protein">${order.veg}</div>`;
            if (order.starch) content += `<div class="protein">${order.starch}</div>`;
          }
          if (order.extras?.length > 0) {
            content += `<div class="extras">`;
            order.extras.forEach(extra => { content += `<div class="extra">${extra}</div>`; });
            content += `</div>`;
          }
          content += `</div>`;
        });

        content += `</div></div>`;
      });

    content += `</div></body></html>`;
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

  // Determine which state to show when empty
  const isLoadingState = kdsLoading && !hasAnyItems;
  const isSyncingState = !hasAnyItems && !kdsLoading && (recentlyApproved || isSyncing);
  const isEmptyState = !hasAnyItems && !kdsLoading && !isSyncingState;

  return (
    <div>
      {/* Loading Banner - only show when initially loading */}
      {isLoadingState && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-3">
          <RefreshCw size={20} className="text-blue-500 animate-spin" />
          <span className="text-blue-700 font-medium">Loading KDS...</span>
        </div>
      )}

      {/* Syncing Banner - show when empty but menus recently approved */}
      {isSyncingState && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
          <RefreshCw size={20} className="text-amber-500 animate-spin" />
          <span className="text-amber-700 font-medium">Syncing menus in progress...</span>
        </div>
      )}

      {/* Unapproved Menus Warning Banner */}
      {unapprovedMenuCount > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-bold">
                ⚠️ {unapprovedMenuCount} menu row{unapprovedMenuCount !== 1 ? 's are' : ' is'} not approved
              </p>
              <p className="text-red-600 text-sm mt-1">
                KDS totals & shopping list may be missing items.
              </p>
              {Object.keys(unapprovedByClient).length > 0 && (
                <p className="text-red-500 text-xs mt-2">
                  Clients: {Object.entries(unapprovedByClient).map(([name, count]) => `${name} (${count})`).join(', ')}
                </p>
              )}
            </div>
            {onApproveAll && (
              <button
                onClick={onApproveAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium flex-shrink-0"
                style={{ backgroundColor: '#22c55e' }}
              >
                <Check size={18} />
                Approve All Menus
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Kitchen Display</h2>
            <p className="text-sm text-gray-500 mt-1">
              Dishes grouped by production day and category
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Last refresh timestamp */}
            {kdsLastRefresh && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={12} />
                Last refresh: {formatRefreshTime(kdsLastRefresh)}
              </span>
            )}
            {hasAnyItems && (
              <>
                <button
                  onClick={printProductionSheet}
                  disabled={unapprovedMenuCount > 0 || isPrintingProduction}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    unapprovedMenuCount > 0 || isPrintingProduction ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={unapprovedMenuCount > 0 ? 'Approve all menus first' : 'Print Production Sheet'}
                >
                  <FileText size={16} />
                  Production
                </button>
                <button
                  onClick={printPackingList}
                  disabled={unapprovedMenuCount > 0}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    unapprovedMenuCount > 0 ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={unapprovedMenuCount > 0 ? 'Approve all menus first' : 'Print Packing List'}
                >
                  <Package size={16} />
                  Packing
                </button>
                {exportShoppingList && (
                  <button
                    onClick={() => {
                      if (unapprovedMenuCount > 0) {
                        const topClients = Object.entries(unapprovedByClient).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(', ');
                        alert(`Cannot export yet: ${unapprovedMenuCount} unapproved menu(s).\n\nClients: ${topClients}\n\nApprove all menus first.`);
                        return;
                      }
                      exportShoppingList();
                    }}
                    disabled={unapprovedMenuCount > 0}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                      unapprovedMenuCount > 0 ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    title={unapprovedMenuCount > 0 ? 'Approve all menus first' : 'Export Shopping List CSV'}
                  >
                    <Download size={16} />
                    Shopping
                  </button>
                )}
                <div className="relative group">
                  <button
                    onClick={printKDS}
                    disabled={unapprovedMenuCount > 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
                      unapprovedMenuCount > 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
                    title={unapprovedMenuCount > 0 ? 'Approve all menus to enable printing' : 'Print KDS'}
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  {unapprovedMenuCount > 0 && (
                    <span className="absolute -bottom-5 left-0 text-xs text-amber-600 whitespace-nowrap">
                      Approve all menus to enable
                    </span>
                  )}
                </div>
              </>
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
          {/* Loading skeleton */}
          {isLoadingState && (
            <div className="space-y-4 py-8">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mx-auto" />
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Syncing state */}
          {isSyncingState && (
            <div className="text-center py-12">
              <RefreshCw size={48} className="mx-auto mb-4 text-amber-400 animate-spin" />
              <p className="text-amber-600 text-lg font-medium">Syncing menus...</p>
              <p className="text-gray-400 text-sm mt-2">
                Menus were recently approved. They should appear shortly.
              </p>
            </div>
          )}

          {/* Truly empty state */}
          {isEmptyState && (
            <div className="text-center py-12">
              <Utensils size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">No menus found for this week</p>
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
          )}
        </div>
      )}
    </div>
  );
}
