/**
 * DashboardTab - Financial dashboard
 * Shows expected revenue, grocery costs, and client profitability
 */

import React, { useState, useRef } from 'react';
import { DollarSign, Receipt, TrendingUp, X, Upload, ChevronDown, ChevronUp, Users } from 'lucide-react';
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
  const [showAllBills, setShowAllBills] = useState(false);
  const [showClientCosts, setShowClientCosts] = useState(() => {
    const saved = localStorage.getItem('dashboard_showClientCosts');
    return saved === 'true';
  });
  const [showGroceryDetails, setShowGroceryDetails] = useState(false);

  const toggleClientCosts = () => {
    setShowClientCosts(prev => {
      const newValue = !prev;
      localStorage.setItem('dashboard_showClientCosts', String(newValue));
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

  // Helper to find column value case-insensitively
  const findColumnValue = (row, ...possibleNames) => {
    const keys = Object.keys(row);
    for (const name of possibleNames) {
      // Exact match first
      if (row[name] !== undefined) return row[name];
      // Case-insensitive match
      const key = keys.find(k => k.toLowerCase() === name.toLowerCase());
      if (key && row[key] !== undefined) return row[key];
    }
    return undefined;
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
        let duplicates = 0;

        // Build set of existing bills for duplicate detection (date + amount)
        const existingBills = new Set(
          groceryBills.map(b => `${b.date}_${Math.abs(b.amount).toFixed(2)}`)
        );

        results.data.forEach((row, index) => {
          // Find columns case-insensitively
          const dateVal = findColumnValue(row, 'Date', 'Transaction Date', 'Txn Date');
          const amountVal = findColumnValue(row, 'Amount', 'Debit', 'Credit', 'Total');
          const storeVal = findColumnValue(row, 'Store', 'Vendor', 'Payee', 'Name', 'Description', 'Memo');

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

          // Check for duplicate (same date and amount)
          const billKey = `${parsedDate}_${amount.toFixed(2)}`;
          if (existingBills.has(billKey)) {
            duplicates++;
            return;
          }
          existingBills.add(billKey); // Prevent duplicates within same import

          bills.push({
            date: parsedDate,
            amount: amount,
            store: storeVal ? String(storeVal).trim() : '',
            id: Date.now() + index
          });
        });

        if (bills.length > 0 && importGroceryBills) {
          importGroceryBills(bills);
          let msg = `Imported ${bills.length} transaction${bills.length !== 1 ? 's' : ''}`;
          if (duplicates > 0) msg += ` (${duplicates} duplicate${duplicates !== 1 ? 's' : ''} skipped)`;
          if (skipped > 0) msg += ` (${skipped} invalid row${skipped !== 1 ? 's' : ''} skipped)`;
          alert(msg);
        } else if (bills.length === 0) {
          if (duplicates > 0) {
            alert(`No new transactions to import. ${duplicates} duplicate${duplicates !== 1 ? 's' : ''} found.`);
          } else {
            alert('No valid transactions found. Make sure your CSV has Date and Amount columns.');
          }
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

  // Handle clear all grocery bills
  const handleClearAllBills = () => {
    if (!groceryBills.length) return;
    if (confirm(`Are you sure you want to delete all ${groceryBills.length} grocery bills? This cannot be undone.`)) {
      groceryBills.forEach(bill => deleteGroceryBill(bill.id));
    }
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

  // Get this week's grocery spending (using Saturday-Friday week)
  const getThisWeekGrocerySpending = () => {
    if (!weekStart) return 0;
    // Calculate Saturday-Friday week containing the selected Monday
    const monday = new Date(weekStart + 'T12:00:00');
    if (isNaN(monday.getTime())) return 0;
    const day = monday.getDay();
    const daysSinceSaturday = (day + 1) % 7;
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() - daysSinceSaturday);
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);

    const saturdayStr = saturday.toISOString().split('T')[0];
    const fridayStr = friday.toISOString().split('T')[0];

    return groceryBills
      .filter(bill => {
        if (!bill.date) return false;
        return bill.date >= saturdayStr && bill.date <= fridayStr;
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

  // Helper to get week info from a date (Saturday-Friday week for grocery tracking)
  const getWeekInfo = (dateStr) => {
    if (!dateStr) return { weekId: '', label: '', weekStart: null, weekEnd: null };
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return { weekId: '', label: '', weekStart: null, weekEnd: null };
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Calculate days since Saturday (Sat=0, Sun=1, Mon=2, ..., Fri=6)
    const daysSinceSaturday = (day + 1) % 7;
    const saturday = new Date(date);
    saturday.setDate(date.getDate() - daysSinceSaturday);
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);
    const weekId = saturday.toISOString().split('T')[0];
    return {
      weekId,
      weekStart: saturday,
      weekEnd: friday,
      label: `${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    };
  };

  // Get Saturday-Friday week range that contains the app's selected week (Monday-based)
  const getGroceryWeekRange = () => {
    if (!weekStart) return { start: '', end: '' };
    // Use the Monday (weekStart) to find the containing Saturday-Friday week
    const weekInfo = getWeekInfo(weekStart);
    if (!weekInfo.weekStart || !weekInfo.weekEnd) return { start: '', end: '' };
    return {
      start: weekInfo.weekStart.toISOString().split('T')[0],
      end: weekInfo.weekEnd.toISOString().split('T')[0],
      label: weekInfo.label
    };
  };

  const groceryWeek = getGroceryWeekRange();

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
      // Check confirmedDates first (migrated data), fall back to deliveryDates
      const dates = client.confirmedDates?.length > 0
        ? client.confirmedDates
        : (client.deliveryDates || []);
      // Check if any date falls within this week
      return dates.some(dateStr => {
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

  // Calculate client profitability (revenue - grocery cost per client)
  const getClientProfitability = () => {
    const weekData = buildClientBreakdown();
    const clientProfits = [];

    scheduledClients.forEach(client => {
      const clientName = client.name;
      const planPrice = parseFloat(client.planPrice) || 0;
      const serviceFee = client.pickup ? 0 : (parseFloat(client.serviceFee) || 0);
      const subtotal = planPrice + serviceFee;
      const discount = client.prepayDiscount ? subtotal * 0.1 : 0;
      const revenue = subtotal - discount;

      // Find grocery cost for this client this week
      let groceryCost = 0;
      Object.values(weekData).forEach(week => {
        if (week.clients[clientName]) {
          groceryCost += week.clients[clientName].total;
        }
      });

      const profit = revenue - groceryCost;
      const margin = revenue > 0 ? ((profit / revenue) * 100) : 0;

      clientProfits.push({
        name: client.displayName || clientName,
        revenue,
        groceryCost,
        profit,
        margin
      });
    });

    // Sort by margin for finding highest/lowest
    const sorted = [...clientProfits].sort((a, b) => b.margin - a.margin);

    const avgProfit = clientProfits.length > 0
      ? clientProfits.reduce((sum, c) => sum + c.profit, 0) / clientProfits.length
      : 0;

    return {
      clients: clientProfits,
      avgProfit,
      highest: sorted[0] || null,
      lowest: sorted[sorted.length - 1] || null
    };
  };

  const profitability = getClientProfitability();

  // Average revenue per delivery
  const avgPerDelivery = scheduledClients.length > 0
    ? valueOfOrders / scheduledClients.length
    : 0;

  // Get last 6 weeks of grocery spending for mini chart
  const getWeeklyGroceryTrend = () => {
    const weeks = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      const weekInfo = getWeekInfo(weekDate.toISOString().split('T')[0]);

      if (weekInfo.weekStart && weekInfo.weekEnd) {
        const startStr = weekInfo.weekStart.toISOString().split('T')[0];
        const endStr = weekInfo.weekEnd.toISOString().split('T')[0];

        const weekSpending = groceryBills
          .filter(bill => bill.date && bill.date >= startStr && bill.date <= endStr)
          .reduce((sum, bill) => sum + (bill.amount || 0), 0);

        weeks.push({
          label: weekInfo.label,
          spending: weekSpending,
          isCurrent: startStr === groceryWeek.start
        });
      }
    }

    return weeks;
  };

  const weeklyTrend = getWeeklyGroceryTrend();

  // Food cost calculation from approved menu items
  const { projectedTotal: weeklyFoodCost } = buildCookListWithCosts();
  const actualSpending = getThisWeekGrocerySpending();
  const difference = actualSpending - weeklyFoodCost;
  const wastePercent = weeklyFoodCost > 0 ? ((difference / weeklyFoodCost) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
          Financial Dashboard
        </h2>
        <p className="text-gray-500">
          {formatDate(weekStart)} - {formatDate(weekEnd)}
        </p>
      </div>

      {/* Top Row: 3 Executive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Expected Cash In */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={24} className="text-green-600" />
            <h3 className="text-lg font-bold text-gray-700">Expected Cash In</h3>
          </div>
          <p className="text-4xl font-bold text-green-600 mb-4">
            ${valueOfOrders.toFixed(2)}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Deliveries</span>
              <span className="font-medium">{scheduledClients.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg per Delivery</span>
              <span className="font-medium">${avgPerDelivery.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Grocery Costs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={24} style={{ color: '#3d59ab' }} />
              <h3 className="text-lg font-bold text-gray-700">Grocery Costs</h3>
            </div>
            <button
              onClick={() => setShowGroceryDetails(!showGroceryDetails)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showGroceryDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Projected</p>
              <p className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
                ${weeklyFoodCost.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Actual</p>
              <p className={`text-2xl font-bold ${actualSpending > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                ${actualSpending.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Variance */}
          <div className={`p-2 rounded-lg text-center ${difference > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <span className={`text-sm font-medium ${difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {difference > 0 ? 'Over by ' : 'Under by '}${Math.abs(difference).toFixed(2)}
              {weeklyFoodCost > 0 && ` (${wastePercent}%)`}
            </span>
          </div>

          {/* Mini Line Chart (6 weeks) */}
          {showGroceryDetails && weeklyTrend.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">Last 6 Weeks</p>
              <div className="flex items-end gap-1 h-16">
                {(() => {
                  const maxSpending = Math.max(...weeklyTrend.map(w => w.spending), 1);
                  return weeklyTrend.map((week, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t ${week.isCurrent ? 'bg-blue-500' : 'bg-gray-300'}`}
                        style={{ height: `${(week.spending / maxSpending) * 100}%`, minHeight: '2px' }}
                        title={`${week.label}: $${week.spending.toFixed(0)}`}
                      />
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Client Profitability */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={24} style={{ color: '#3d59ab' }} />
            <h3 className="text-lg font-bold text-gray-700">Client Profitability</h3>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase">Avg Profit per Client</p>
            <p className={`text-3xl font-bold ${profitability.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${profitability.avgProfit.toFixed(2)}
            </p>
          </div>

          {profitability.highest && profitability.lowest && profitability.clients.length > 1 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 rounded bg-green-50">
                <span className="text-gray-600 truncate mr-2">{profitability.highest.name}</span>
                <span className="font-medium text-green-600 whitespace-nowrap">
                  {profitability.highest.margin.toFixed(0)}% margin
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-red-50">
                <span className="text-gray-600 truncate mr-2">{profitability.lowest.name}</span>
                <span className="font-medium text-red-600 whitespace-nowrap">
                  {profitability.lowest.margin.toFixed(0)}% margin
                </span>
              </div>
            </div>
          )}

          {profitability.clients.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              No scheduled clients this week
            </p>
          )}
        </div>
      </div>

      {/* Grocery Input */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3d59ab' }}>
            <Receipt size={24} />
            Grocery Input
          </h3>
          <div className="flex gap-2">
            {groceryBills.length > 0 && (
              <button
                onClick={handleClearAllBills}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
              >
                <X size={16} />
                Clear All
              </button>
            )}
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
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Add Bill Form */}
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
          </div>

          {/* Bills List */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-600">
                {showAllBills ? `All Bills (${groceryBills.length})` : `This Week (${groceryWeek.label || 'Sat-Fri'})`}
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
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sortedWeeks.map(([weekId, weekData]) => (
                      <div key={weekId} className="border rounded-lg overflow-hidden" style={{ borderColor: weekId === groceryWeek.start ? '#3d59ab' : '#e5e7eb' }}>
                        <div className="flex justify-between items-center px-3 py-2 text-sm font-medium" style={{ backgroundColor: weekId === groceryWeek.start ? '#dbeafe' : '#f9fafb' }}>
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
                // Show only this week's bills (Saturday-Friday)
                const thisWeekBills = groceryBills.filter(bill => {
                  if (!bill.date || !groceryWeek.start || !groceryWeek.end) return false;
                  return bill.date >= groceryWeek.start && bill.date <= groceryWeek.end;
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

      {/* Client Costs by Week (Collapsible - default collapsed) */}
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
        const totalGroceryCost = clientNames.reduce((sum, name) => sum + clientData[name].total, 0);

        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={toggleClientCosts}
              className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <TrendingUp size={24} style={{ color: '#3d59ab' }} />
                <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
                  Client Grocery Costs
                </h3>
                <span className="text-sm text-gray-500">
                  ({clientNames.length} client{clientNames.length !== 1 ? 's' : ''})
                </span>
                <span className="font-bold text-green-600">${totalGroceryCost.toFixed(2)}</span>
              </div>
              {showClientCosts ? <ChevronUp size={24} className="text-gray-400" /> : <ChevronDown size={24} className="text-gray-400" />}
            </button>

            {showClientCosts && (
              <div className="p-6 pt-0 border-t space-y-2">
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
            )}
          </div>
        );
      })()}
    </div>
  );
}
