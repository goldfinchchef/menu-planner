/**
 * DashboardTab - Weekly overview dashboard
 * Shows deliveries, order value, grocery costs, and analysis
 */

import React, { useState, useRef } from 'react';
import { Truck, DollarSign, Receipt, TrendingUp, X, Upload } from 'lucide-react';
import Papa from 'papaparse';

// Format date for display
function formatDate(date) {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function DashboardTab({
  weekStart,
  weekEnd,
  menuItems = [],
  allMenuItems = [],
  recipes = {},
  clients = [],
  groceryBills = [],
  newGroceryBill = { date: '', amount: '', store: '' },
  setNewGroceryBill,
  addGroceryBill,
  deleteGroceryBill,
  getRecipeCost,
  importGroceryBills
}) {
  const groceryFileRef = useRef();
  const [showGroceryAnalysis, setShowGroceryAnalysis] = useState(false);
  const [showAllBills, setShowAllBills] = useState(false);
  const [showRecipeBreakdown, setShowRecipeBreakdown] = useState(() => {
    const saved = localStorage.getItem('groceryAnalysis_showRecipeBreakdown');
    return saved === 'true';
  });

  const toggleRecipeBreakdown = () => {
    setShowRecipeBreakdown(prev => {
      const newValue = !prev;
      localStorage.setItem('groceryAnalysis_showRecipeBreakdown', String(newValue));
      return newValue;
    });
  };

  // State for expanded clients
  const [expandedClients, setExpandedClients] = useState(() => {
    try {
      const saved = localStorage.getItem('groceryAnalysis_expandedClients');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleClientExpanded = (clientName) => {
    setExpandedClients(prev => {
      const newValue = { ...prev, [clientName]: !prev[clientName] };
      localStorage.setItem('groceryAnalysis_expandedClients', JSON.stringify(newValue));
      return newValue;
    });
  };

  // State for expanded client-week rows
  const [expandedClientWeeks, setExpandedClientWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem('groceryAnalysis_expandedClientWeeks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleClientWeekExpanded = (key) => {
    setExpandedClientWeeks(prev => {
      const newValue = { ...prev, [key]: !prev[key] };
      localStorage.setItem('groceryAnalysis_expandedClientWeeks', JSON.stringify(newValue));
      return newValue;
    });
  };

  // Handle QB CSV import
  const handleQBImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const bills = [];
        let skipped = 0;

        results.data.forEach((row, index) => {
          // Try to find date, amount, and vendor columns (QB exports vary)
          const dateVal = row['Date'] || row['date'] || row['Transaction Date'] || row['Txn Date'];
          const amountVal = row['Amount'] || row['amount'] || row['Debit'] || row['Credit'] || row['Total'];
          const vendorVal = row['Vendor'] || row['vendor'] || row['Payee'] || row['Name'] || row['Description'] || row['Memo'];

          if (!dateVal || !amountVal) {
            skipped++;
            return;
          }

          // Parse date (handle various formats)
          let parsedDate;
          const dateStr = String(dateVal).trim();

          // Try MM/DD/YYYY format first
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const [m, d, y] = parts;
              const year = y.length === 2 ? '20' + y : y;
              parsedDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
          } else if (dateStr.includes('-')) {
            // Already YYYY-MM-DD format
            parsedDate = dateStr;
          }

          if (!parsedDate) {
            skipped++;
            return;
          }

          // Parse amount (remove $ and commas, handle negatives)
          let amount = String(amountVal).replace(/[$,]/g, '').trim();
          amount = parseFloat(amount);
          if (isNaN(amount)) {
            skipped++;
            return;
          }
          // Make positive (expenses might be negative in QB)
          amount = Math.abs(amount);

          bills.push({
            date: parsedDate,
            amount: amount,
            store: vendorVal ? String(vendorVal).trim() : '',
            id: Date.now() + index
          });
        });

        if (bills.length > 0 && importGroceryBills) {
          importGroceryBills(bills);
          alert(`Imported ${bills.length} transaction${bills.length !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
        } else if (bills.length === 0) {
          alert('No valid transactions found. Make sure your CSV has Date and Amount columns.');
        }

        // Reset file input
        event.target.value = '';
      },
      error: (error) => {
        alert('Error reading CSV: ' + error.message);
        event.target.value = '';
      }
    });
  };

  // Build aggregated cook list with costs
  const buildCookListWithCosts = () => {
    const approvedItems = menuItems.filter(item => item.approved);
    const cookList = {};

    approvedItems.forEach(item => {
      const portions = item.portions || 1;

      ['protein', 'veg', 'starch'].forEach(type => {
        if (!item[type]) return;
        const dishName = item[type];
        const recipe = recipes[type]?.find(r => r.name === dishName);
        const key = dishName.toLowerCase().trim();

        if (!cookList[key]) {
          cookList[key] = {
            name: dishName,
            category: type,
            totalPortions: 0,
            costPerPortion: recipe && getRecipeCost ? getRecipeCost(recipe) : 0
          };
        }
        cookList[key].totalPortions += portions;
      });

      if (item.extras) {
        item.extras.forEach(extra => {
          const category = ['sauces', 'breakfast', 'soups'].find(cat =>
            recipes[cat]?.find(r => r.name === extra)
          );
          const recipe = category ? recipes[category].find(r => r.name === extra) : null;
          const key = extra.toLowerCase().trim();

          if (!cookList[key]) {
            cookList[key] = {
              name: extra,
              category: category || 'extras',
              totalPortions: 0,
              costPerPortion: recipe && getRecipeCost ? getRecipeCost(recipe) : 0
            };
          }
          cookList[key].totalPortions += portions;
        });
      }
    });

    const entries = Object.values(cookList).map(entry => ({
      ...entry,
      totalCost: entry.totalPortions * entry.costPerPortion
    }));

    const projectedTotal = entries.reduce((sum, e) => sum + e.totalCost, 0);
    return { entries, projectedTotal };
  };

  // Get this week's grocery spending
  const getThisWeekGrocerySpending = () => {
    if (!weekStart || !weekEnd) return 0;
    const weekStartDate = new Date(weekStart + 'T00:00:00');
    const weekEndDate = new Date(weekEnd + 'T23:59:59');
    if (isNaN(weekStartDate.getTime()) || isNaN(weekEndDate.getTime())) return 0;

    return groceryBills
      .filter(bill => {
        if (!bill.date) return false;
        const billDate = new Date(bill.date + 'T12:00:00');
        if (isNaN(billDate.getTime())) return false;
        return billDate >= weekStartDate && billDate <= weekEndDate;
      })
      .reduce((sum, bill) => sum + (bill.amount || 0), 0);
  };

  // Get monthly grocery data for trend
  const getMonthlyGroceryData = () => {
    const months = {};
    groceryBills.forEach(bill => {
      if (!bill.date) return;
      const date = new Date(bill.date + 'T12:00:00');
      if (isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = { spending: 0, calculated: 0 };
      }
      months[monthKey].spending += bill.amount || 0;
    });
    return months;
  };

  // Helper to get week info from a date
  const getWeekInfo = (dateStr) => {
    if (!dateStr) return { weekId: '', label: '', monday: null, sunday: null };
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return { weekId: '', label: '', monday: null, sunday: null };
    const day = date.getDay();
    const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekId = monday.toISOString().split('T')[0];
    return {
      weekId,
      weekStart: monday,
      weekEnd: sunday,
      label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    };
  };

  // Build per-client breakdown grouped by week
  // Build client breakdown from ALL menu items (not just selected week)
  // This shows historical grocery costs for all clients including paused ones
  const buildClientBreakdown = () => {
    const approvedItems = (allMenuItems.length > 0 ? allMenuItems : menuItems).filter(item => item.approved);
    const weekData = {};

    approvedItems.forEach(item => {
      const clientName = item.clientName || 'Unknown';
      const itemDate = item.date || new Date().toISOString().split('T')[0];
      const weekInfo = getWeekInfo(itemDate);
      const { weekId, label } = weekInfo;

      if (!weekData[weekId]) {
        weekData[weekId] = { weekId, label, weekStart: weekInfo.weekStart, clients: {} };
      }

      if (!weekData[weekId].clients[clientName]) {
        weekData[weekId].clients[clientName] = { meals: [], total: 0 };
      }

      const portions = item.portions || 1;
      const mealDishes = [];
      let mealCostPerPortion = 0;

      ['protein', 'veg', 'starch'].forEach(type => {
        if (item[type]) {
          const recipe = recipes[type]?.find(r => r.name === item[type]);
          const costPerPortion = recipe && getRecipeCost ? getRecipeCost(recipe) : 0;
          mealDishes.push({ name: item[type], type, costPerPortion });
          mealCostPerPortion += costPerPortion;
        }
      });

      if (item.extras && item.extras.length > 0) {
        item.extras.forEach(extra => {
          const category = ['sauces', 'breakfast', 'soups'].find(cat =>
            recipes[cat]?.find(r => r.name === extra)
          );
          const recipe = category ? recipes[category].find(r => r.name === extra) : null;
          const costPerPortion = recipe && getRecipeCost ? getRecipeCost(recipe) : 0;
          mealDishes.push({ name: extra, type: 'extra', costPerPortion });
          mealCostPerPortion += costPerPortion;
        });
      }

      const mealTotal = mealCostPerPortion * portions;
      weekData[weekId].clients[clientName].meals.push({
        dishes: mealDishes,
        portions,
        costPerPortion: mealCostPerPortion,
        total: mealTotal
      });
      weekData[weekId].clients[clientName].total += mealTotal;
    });

    return weekData;
  };

  // Get scheduled clients - those with a delivery date within this week
  const getScheduledClients = () => {
    if (!weekStart || !weekEnd) return [];

    return clients.filter(client => {
      if (client.status !== 'active') return false;
      const deliveryDates = client.deliveryDates || [];
      // Check if any delivery date falls within this week
      return deliveryDates.some(dateStr => {
        if (!dateStr) return false;
        return dateStr >= weekStart && dateStr <= weekEnd;
      });
    });
  };

  const scheduledClients = getScheduledClients();

  // Calculate value of orders from scheduled clients
  const valueOfOrders = scheduledClients.reduce((total, client) => {
    const planPrice = parseFloat(client.planPrice) || 0;
    const serviceFee = client.pickup ? 0 : (parseFloat(client.serviceFee) || 0);
    const subtotal = planPrice + serviceFee;
    const discount = client.prepayDiscount ? subtotal * 0.1 : 0;
    return total + (subtotal - discount);
  }, 0);

  // Food cost calculation - only from approved menu items
  const approvedMenuItems = menuItems.filter(item => item.approved);
  const { entries: cookListEntries, projectedTotal: weeklyFoodCost } = buildCookListWithCosts();
  const actualSpending = getThisWeekGrocerySpending();
  const difference = actualSpending - weeklyFoodCost;
  const wastePercent = weeklyFoodCost > 0 ? ((difference / weeklyFoodCost) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* This Week at a Glance */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
          This Week at a Glance
        </h2>
        <p className="text-gray-500 mb-6">
          {formatDate(weekStart)} - {formatDate(weekEnd)}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stops This Week */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#dbeafe' }}>
            <div className="flex items-center gap-2 mb-3">
              <Truck size={28} style={{ color: '#3d59ab' }} />
              <span className="text-lg font-medium text-gray-600">Stops this week</span>
            </div>
            <p className="text-5xl font-bold mb-2" style={{ color: '#3d59ab' }}>
              {scheduledClients.length}
            </p>
            <p className="text-sm text-gray-500">clients with deliveries scheduled</p>
          </div>

          {/* Value of Orders */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={28} className="text-green-600" />
              <span className="text-lg font-medium text-gray-600">Value of orders this week</span>
            </div>
            <p className="text-5xl font-bold mb-2 text-green-600">
              ${valueOfOrders.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">total from {scheduledClients.length} client{scheduledClients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Grocery Input & Weekly Food Cost */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Grocery Input */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3d59ab' }}>
              <Receipt size={24} />
              Grocery Input
            </h3>
            {importGroceryBills && (
              <>
                <input
                  type="file"
                  ref={groceryFileRef}
                  onChange={handleQBImport}
                  accept=".csv"
                  className="hidden"
                />
                <button
                  onClick={() => groceryFileRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border"
                  style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
                >
                  <Upload size={16} />
                  Import QB
                </button>
              </>
            )}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={newGroceryBill.date}
                onChange={(e) => setNewGroceryBill({ ...newGroceryBill, date: e.target.value })}
                className="p-2 border-2 rounded-lg text-sm"
                style={{ borderColor: '#ebb582' }}
              />
              <input
                type="number"
                value={newGroceryBill.amount}
                onChange={(e) => setNewGroceryBill({ ...newGroceryBill, amount: e.target.value })}
                placeholder="Amount"
                className="p-2 border-2 rounded-lg text-sm"
                style={{ borderColor: '#ebb582' }}
              />
              <input
                type="text"
                value={newGroceryBill.store || ''}
                onChange={(e) => setNewGroceryBill({ ...newGroceryBill, store: e.target.value })}
                placeholder="Store"
                className="p-2 border-2 rounded-lg text-sm"
                style={{ borderColor: '#ebb582' }}
              />
            </div>
            <button
              onClick={addGroceryBill}
              className="w-full py-2 rounded-lg text-white"
              style={{ backgroundColor: '#3d59ab' }}
            >
              Add Bill
            </button>

            {/* Bills List */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-600">
                  {showAllBills ? `All Bills (${groceryBills.length})` : 'This Week\'s Bills'}
                </p>
                <button
                  onClick={() => setShowAllBills(!showAllBills)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: '#f0f0f0', color: '#3d59ab' }}
                >
                  {showAllBills ? 'Show This Week' : `Show All (${groceryBills.length})`}
                </button>
              </div>

              {(() => {
                if (showAllBills) {
                  // Group all bills by week
                  const billsByWeek = {};
                  groceryBills.forEach(bill => {
                    if (!bill.date) return;
                    const weekInfo = getWeekInfo(bill.date);
                    const weekId = weekInfo.weekId || 'unknown';
                    if (!billsByWeek[weekId]) {
                      billsByWeek[weekId] = { label: weekInfo.label || 'Unknown', bills: [], total: 0 };
                    }
                    billsByWeek[weekId].bills.push(bill);
                    billsByWeek[weekId].total += bill.amount || 0;
                  });

                  const sortedWeeks = Object.entries(billsByWeek).sort((a, b) => b[0].localeCompare(a[0]));

                  return sortedWeeks.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {sortedWeeks.map(([weekId, weekData]) => (
                        <div key={weekId} className="border rounded-lg overflow-hidden" style={{ borderColor: weekId === weekStart ? '#3d59ab' : '#e5e7eb' }}>
                          <div className="flex justify-between items-center px-3 py-2 text-sm font-medium" style={{ backgroundColor: weekId === weekStart ? '#dbeafe' : '#f9fafb' }}>
                            <span>{weekData.label}</span>
                            <span style={{ color: '#3d59ab' }}>${weekData.total.toFixed(2)}</span>
                          </div>
                          <div className="divide-y">
                            {weekData.bills.map(bill => (
                              <div key={bill.id} className="flex justify-between items-center text-sm px-3 py-1.5 bg-white">
                                <span className="text-gray-600">{formatDate(bill.date)} - {bill.store || 'N/A'}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">${bill.amount?.toFixed(2)}</span>
                                  <button
                                    onClick={() => deleteGroceryBill(bill.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">No bills entered yet</p>
                  );
                } else {
                  // Show only this week's bills
                  const thisWeekBills = groceryBills.filter(bill => {
                    if (!bill.date || !weekStart || !weekEnd) return false;
                    return bill.date >= weekStart && bill.date <= weekEnd;
                  });

                  return thisWeekBills.length > 0 ? (
                    <>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {thisWeekBills.map(bill => (
                          <div key={bill.id} className="flex justify-between items-center text-sm p-2 rounded" style={{ backgroundColor: '#f9f9ed' }}>
                            <span>{formatDate(bill.date)} - {bill.store || 'N/A'}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">${bill.amount?.toFixed(2)}</span>
                              <button
                                onClick={() => deleteGroceryBill(bill.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t text-right">
                        <span className="text-sm text-gray-500">Week Total: </span>
                        <span className="font-bold" style={{ color: '#3d59ab' }}>
                          ${thisWeekBills.reduce((sum, b) => sum + (b.amount || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">No bills for this week</p>
                  );
                }
              })()}
            </div>
          </div>
        </div>

        {/* Weekly Food Cost */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#3d59ab' }}>
            <DollarSign size={24} />
            Weekly Food Cost
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
              <p className="text-sm text-gray-600">Calculated from Menu</p>
              <p className="text-3xl font-bold" style={{ color: '#3d59ab' }}>
                ${weeklyFoodCost.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on approved menu items × portions
              </p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: actualSpending > 0 ? '#dcfce7' : '#f3f4f6' }}>
              <p className="text-sm text-gray-600">This Week's Spending</p>
              <p className={`text-3xl font-bold ${actualSpending > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                ${actualSpending.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grocery Analysis (Collapsible) */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setShowGroceryAnalysis(!showGroceryAnalysis)}
          className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
        >
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3d59ab' }}>
            <TrendingUp size={24} />
            Grocery Analysis
          </h3>
          <span className="text-2xl text-gray-400">
            {showGroceryAnalysis ? '−' : '+'}
          </span>
        </button>

        {showGroceryAnalysis && (
          <div className="p-6 pt-0 border-t">
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <p className="text-sm text-gray-600">Actual Spending</p>
                <p className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
                  ${actualSpending.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <p className="text-sm text-gray-600">Calculated Cost</p>
                <p className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
                  ${weeklyFoodCost.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: difference > 0 ? '#fee2e2' : '#dcfce7' }}>
                <p className="text-sm text-gray-600">Difference</p>
                <p className={`text-2xl font-bold ${difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {difference > 0 ? '+' : ''}${difference.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: parseFloat(wastePercent) > 10 ? '#fee2e2' : '#dcfce7' }}>
                <p className="text-sm text-gray-600">Waste %</p>
                <p className={`text-2xl font-bold ${parseFloat(wastePercent) > 10 ? 'text-red-600' : 'text-green-600'}`}>
                  {wastePercent}%
                </p>
              </div>
            </div>

            {/* Per-Recipe Breakdown */}
            {cookListEntries.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={toggleRecipeBreakdown}
                  className="w-full flex justify-between items-center hover:opacity-80"
                >
                  <h4 className="font-bold" style={{ color: '#3d59ab' }}>Recipe Cost Breakdown</h4>
                  <span className="text-xl text-gray-400">{showRecipeBreakdown ? '▼' : '▶'}</span>
                </button>
                {showRecipeBreakdown && (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2" style={{ borderColor: '#3d59ab' }}>
                          <th className="text-left py-2 px-2">Recipe</th>
                          <th className="text-left py-2 px-2">Category</th>
                          <th className="text-right py-2 px-2">Portions</th>
                          <th className="text-right py-2 px-2">Cost/Portion</th>
                          <th className="text-right py-2 px-2">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cookListEntries
                          .sort((a, b) => b.totalCost - a.totalCost)
                          .map((entry, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-1.5 px-2 font-medium">{entry.name}</td>
                              <td className="py-1.5 px-2 text-gray-500 capitalize">{entry.category}</td>
                              <td className="py-1.5 px-2 text-right">{entry.totalPortions}</td>
                              <td className="py-1.5 px-2 text-right">${entry.costPerPortion.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right font-medium">${entry.totalCost.toFixed(2)}</td>
                            </tr>
                          ))}
                        <tr className="border-t-2 font-bold" style={{ borderColor: '#3d59ab' }}>
                          <td className="py-2 px-2" colSpan={4}>Projected Total</td>
                          <td className="py-2 px-2 text-right">${weeklyFoodCost.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Monthly Trend */}
            <div>
              <h4 className="font-bold mb-3" style={{ color: '#3d59ab' }}>Monthly Trend</h4>
              <div className="space-y-2">
                {Object.entries(getMonthlyGroceryData())
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .slice(0, 6)
                  .map(([month, data]) => {
                    const monthDate = new Date(month + '-01');
                    const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    return (
                      <div key={month} className="flex items-center gap-4 p-2 rounded" style={{ backgroundColor: '#f9f9ed' }}>
                        <span className="w-24 text-sm font-medium">{monthName}</span>
                        <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${Math.min((data.spending / 1000) * 100, 100)}%`,
                              backgroundColor: '#3d59ab'
                            }}
                          />
                        </div>
                        <span className="w-24 text-right font-bold">${data.spending.toFixed(0)}</span>
                      </div>
                    );
                  })}
                {Object.keys(getMonthlyGroceryData()).length === 0 && (
                  <p className="text-gray-500 text-center py-4">No grocery data yet</p>
                )}
              </div>
            </div>

            {/* Client Costs by Week */}
            {(() => {
              const weekData = buildClientBreakdown();
              const weekIds = Object.keys(weekData);
              if (weekIds.length === 0) return null;

              const clientData = {};
              weekIds.forEach(weekId => {
                const week = weekData[weekId];
                Object.entries(week.clients).forEach(([clientName, data]) => {
                  if (!clientData[clientName]) {
                    clientData[clientName] = { weeks: {}, total: 0 };
                  }
                  clientData[clientName].weeks[weekId] = {
                    ...data,
                    label: week.label,
                    weekStart: week.weekStart
                  };
                  clientData[clientName].total += data.total;
                });
              });

              const clientNames = Object.keys(clientData).sort();

              return (
                <div className="mt-6 pt-6 border-t-2" style={{ borderColor: '#ebb582' }}>
                  <h4 className="font-bold mb-4" style={{ color: '#3d59ab' }}>Client Costs by Week</h4>
                  <div className="space-y-2">
                    {clientNames.map(clientName => {
                      const clientCostData = clientData[clientName];
                      const clientRecord = clients.find(c => c.name === clientName || c.displayName === clientName);
                      const isPaused = clientRecord?.status === 'paused';
                      const isClientExpanded = expandedClients[clientName] || false;
                      const clientWeekIds = Object.keys(clientCostData.weeks).sort((a, b) => b.localeCompare(a));

                      return (
                        <div key={clientName} className="border rounded-lg overflow-hidden" style={{ borderColor: isPaused ? '#9ca3af' : '#3d59ab' }}>
                          <button
                            onClick={() => toggleClientExpanded(clientName)}
                            className="w-full px-4 py-3 flex justify-between items-center hover:opacity-90"
                            style={{ backgroundColor: isPaused ? '#f3f4f6' : '#dbeafe' }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500">{isClientExpanded ? '▼' : '▶'}</span>
                              <span className="font-bold text-lg" style={{ color: isPaused ? '#6b7280' : '#3d59ab' }}>{clientName}</span>
                              {isPaused && <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">Paused</span>}
                              <span className="text-sm text-gray-500">({clientWeekIds.length} week{clientWeekIds.length !== 1 ? 's' : ''})</span>
                            </div>
                            <span className="font-bold text-lg" style={{ color: '#22c55e' }}>${clientCostData.total.toFixed(2)}</span>
                          </button>

                          {isClientExpanded && (
                            <div className="border-t" style={{ borderColor: isPaused ? '#9ca3af' : '#3d59ab' }}>
                              {clientWeekIds.map(weekId => {
                                const weekInfo = clientCostData.weeks[weekId];
                                const rowKey = `${clientName}_${weekId}`;
                                const isWeekExpanded = expandedClientWeeks[rowKey] || false;

                                return (
                                  <div key={weekId} className="border-b last:border-b-0" style={{ borderColor: '#ebb582' }}>
                                    <button
                                      onClick={() => toggleClientWeekExpanded(rowKey)}
                                      className="w-full px-4 py-2 flex justify-between items-center hover:opacity-90"
                                      style={{ backgroundColor: '#f9f9ed' }}
                                    >
                                      <div className="flex items-center gap-3 pl-4">
                                        <span className="text-gray-400">{isWeekExpanded ? '▼' : '▶'}</span>
                                        <span className="text-sm font-medium text-gray-700">{weekInfo.label}</span>
                                      </div>
                                      <span className="font-bold" style={{ color: '#22c55e' }}>${weekInfo.total.toFixed(2)}</span>
                                    </button>

                                    {isWeekExpanded && (
                                      <div className="p-3 pl-8 space-y-2 bg-white">
                                        {weekInfo.meals.map((meal, mealIdx) => (
                                          <div key={mealIdx} className="p-2 rounded text-sm" style={{ backgroundColor: '#fafafa' }}>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
                                              {meal.dishes.filter(d => d.type !== 'extra').map((dish, i) => (
                                                <span key={i} className="inline-flex items-center gap-1">
                                                  <span className="font-medium">{dish.name}</span>
                                                  <span className="text-gray-500">(${dish.costPerPortion.toFixed(2)})</span>
                                                  {i < meal.dishes.filter(d => d.type !== 'extra').length - 1 && (
                                                    <span className="text-gray-300 ml-1">+</span>
                                                  )}
                                                </span>
                                              ))}
                                            </div>
                                            {meal.dishes.filter(d => d.type === 'extra').length > 0 && (
                                              <div className="text-gray-500 text-xs mb-1">
                                                Extras: {meal.dishes.filter(d => d.type === 'extra').map((d, i) => (
                                                  <span key={i}>{d.name} (${d.costPerPortion.toFixed(2)}){i < meal.dishes.filter(x => x.type === 'extra').length - 1 ? ', ' : ''}</span>
                                                ))}
                                              </div>
                                            )}
                                            <div className="flex justify-between items-center pt-1 border-t border-gray-200 mt-1">
                                              <span className="text-gray-600">
                                                ${meal.costPerPortion.toFixed(2)}/portion × {meal.portions}
                                              </span>
                                              <span className="font-medium" style={{ color: '#22c55e' }}>
                                                ${meal.total.toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
