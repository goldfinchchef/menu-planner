/**
 * GroceryBillingPage - /test/finance/grocery-billing
 * Dense operational finance dashboard for grocery billing
 * Groups weekly grocery totals by billing_cycles table
 */

import React, { useState, useMemo } from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import {
  ChevronDown,
  ChevronRight,
  Receipt,
  Download,
  FileText,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CreditCard
} from 'lucide-react';

// Status badge colors
const STATUS_STYLES = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  invoiced: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Invoiced' },
  paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' }
};

export default function GroceryBillingPage() {
  const {
    billingCycles,
    billingCyclesLoading,
    billingCyclesError,
    loadBillingCycles,
    generateBillingCycleInvoice,
    exportInvoiceJSON,
    selectedWeekId,
    weeks,
    getWeekApprovedMenuItems,
    getRecipeCost,
    recipes
  } = useExperimentalContext();

  // UI state
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedCycles, setExpandedCycles] = useState({});
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(null);

  // Calculate finance snapshot from real data
  const financeSnapshot = useMemo(() => {
    // Value of Week: sum of billable totals for current week's billing cycles
    // OR calculate from approved menu items if no cycles match
    let valueOfWeek = 0;
    let foodCost = 0;

    // Try to get from billing cycles that overlap with selected week
    const currentWeekCycles = billingCycles.filter(cycle => {
      if (!selectedWeekId) return false;
      // Check if selected week falls within this cycle's date range
      const weekStart = selectedWeekId; // This is in format 2026-W04
      // For now, sum all pending/invoiced cycles as "value"
      return cycle.status === 'pending' || cycle.status === 'invoiced';
    });

    // Sum billable totals from current cycles
    currentWeekCycles.forEach(cycle => {
      valueOfWeek += cycle.calculated?.billableTotal || 0;
      foodCost += cycle.calculated?.rawGroceryCost || 0;
    });

    // If no billing cycles, calculate from approved menus for current week
    if (valueOfWeek === 0 && getWeekApprovedMenuItems && recipes) {
      const approvedMenus = getWeekApprovedMenuItems();
      const markupMultiplier = 1.15; // 15% markup

      approvedMenus.forEach(menu => {
        let menuCost = 0;
        ['protein', 'veg', 'starch'].forEach(type => {
          if (menu[type]) {
            const recipe = recipes[type]?.find(r => r.name === menu[type]);
            if (recipe && getRecipeCost) {
              menuCost += getRecipeCost(recipe) * (menu.portions || 1);
            }
          }
        });
        // Add extras
        (menu.extras || []).forEach(extra => {
          const category = ['sauces', 'breakfast', 'soups'].find(cat =>
            recipes[cat]?.find(r => r.name === extra)
          );
          if (category) {
            const recipe = recipes[category].find(r => r.name === extra);
            if (recipe && getRecipeCost) {
              menuCost += getRecipeCost(recipe) * (menu.portions || 1);
            }
          }
        });
        foodCost += menuCost;
      });
      valueOfWeek = foodCost * markupMultiplier;
    }

    // Cash In: sum of paid billing cycles (this week)
    const cashIn = billingCycles
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (c.total_due || c.calculated?.billableTotal || 0), 0);

    // Weekly Spend: from grocery bills in weeks data
    const currentWeek = weeks?.[selectedWeekId];
    const weeklySpend = currentWeek?.grocery_bills?.reduce((sum, bill) => {
      return sum + (parseFloat(bill.amount) || 0);
    }, 0) || null; // null if no data

    return { valueOfWeek, cashIn, foodCost, weeklySpend };
  }, [billingCycles, selectedWeekId, weeks, getWeekApprovedMenuItems, getRecipeCost, recipes]);

  // Toggle expanded state
  const toggleClient = (clientName) => {
    setExpandedClients(prev => ({ ...prev, [clientName]: !prev[clientName] }));
  };

  const toggleCycle = (cycleId) => {
    setExpandedCycles(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  };

  // Group billing cycles by client
  const clientData = {};
  billingCycles.forEach(cycle => {
    const clientName = cycle.client_name || 'Unknown';
    if (!clientData[clientName]) {
      clientData[clientName] = {
        clientId: cycle.client_id,
        cycles: [],
        totalBillable: 0
      };
    }
    clientData[clientName].cycles.push(cycle);
    clientData[clientName].totalBillable += cycle.calculated?.billableTotal || 0;
  });

  const clientNames = Object.keys(clientData).sort();

  // Format date range
  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return `$${value.toFixed(0)}`;
  };

  // Handle generate invoice
  const handleGenerateInvoice = async (cycleId) => {
    setGeneratingInvoice(cycleId);
    try {
      const invoice = await generateBillingCycleInvoice(cycleId);
      if (invoice) {
        setPreviewInvoice(invoice);
      }
    } finally {
      setGeneratingInvoice(null);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Finance Snapshot - compact metric cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded px-3 py-2 border-l-4 shadow-sm" style={{ borderColor: '#3d59ab' }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase">
            <TrendingUp size={12} />
            Value of Week
          </div>
          <div className="text-lg font-bold" style={{ color: '#3d59ab' }}>
            {formatCurrency(financeSnapshot.valueOfWeek)}
          </div>
        </div>
        <div className="bg-white rounded px-3 py-2 border-l-4 shadow-sm" style={{ borderColor: '#22c55e' }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase">
            <CreditCard size={12} />
            Cash In
          </div>
          <div className="text-lg font-bold" style={{ color: '#22c55e' }}>
            {formatCurrency(financeSnapshot.cashIn)}
          </div>
        </div>
        <div className="bg-white rounded px-3 py-2 border-l-4 shadow-sm" style={{ borderColor: '#f59e0b' }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase">
            <DollarSign size={12} />
            Food Cost
          </div>
          <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>
            {formatCurrency(financeSnapshot.foodCost)}
          </div>
        </div>
        <div className="bg-white rounded px-3 py-2 border-l-4 shadow-sm" style={{ borderColor: '#ef4444' }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase">
            <ShoppingCart size={12} />
            Weekly Spend
          </div>
          <div className="text-lg font-bold" style={{ color: '#ef4444' }}>
            {formatCurrency(financeSnapshot.weeklySpend)}
          </div>
        </div>
      </div>

      {/* Main billing content */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        {/* Compact header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#3d59ab' }}>Grocery Billing</h2>
            <span className="text-sm text-gray-500">
              {billingCycles.length} cycle{billingCycles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={loadBillingCycles}
            disabled={billingCyclesLoading}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={billingCyclesLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error state */}
        {billingCyclesError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={14} />
            <span>{billingCyclesError}</span>
          </div>
        )}

        {/* Loading state */}
        {billingCyclesLoading && billingCycles.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            <RefreshCw size={20} className="animate-spin mx-auto mb-1" />
            Loading...
          </div>
        )}

        {/* Empty state */}
        {!billingCyclesLoading && billingCycles.length === 0 && !billingCyclesError && (
          <div className="text-center py-6 text-gray-500 text-sm">
            <Clock size={24} className="mx-auto mb-1 opacity-50" />
            <p>No billing cycles found.</p>
            <p className="text-xs mt-1">Create billing cycles in Admin to get started.</p>
          </div>
        )}

        {/* Client list - compact */}
        {clientNames.length > 0 && (
          <div className="space-y-1.5">
            {clientNames.map(clientName => {
              const client = clientData[clientName];
              const isExpanded = expandedClients[clientName] || false;

              return (
                <div
                  key={clientName}
                  className="border rounded overflow-hidden"
                  style={{ borderColor: '#3d59ab' }}
                >
                  {/* Client header - compact */}
                  <button
                    onClick={() => toggleClient(clientName)}
                    className="w-full px-3 py-2 flex justify-between items-center hover:opacity-90"
                    style={{ backgroundColor: '#dbeafe' }}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="font-semibold" style={{ color: '#3d59ab' }}>
                        {clientName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({client.cycles.length})
                      </span>
                    </div>
                    <span className="font-bold" style={{ color: '#22c55e' }}>
                      ${client.totalBillable.toFixed(2)}
                    </span>
                  </button>

                  {/* Cycles - compact */}
                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: '#3d59ab' }}>
                      {client.cycles.map(cycle => {
                        const isCycleExpanded = expandedCycles[cycle.id] || false;
                        const canGenerateInvoice = cycle.status === 'pending' && cycle.calculated?.menuCount > 0;

                        return (
                          <div
                            key={cycle.id}
                            className="border-b last:border-b-0"
                            style={{ borderColor: '#e5e7eb' }}
                          >
                            {/* Cycle header - compact */}
                            <div
                              className="px-3 py-1.5 flex justify-between items-center"
                              style={{ backgroundColor: '#f9f9ed' }}
                            >
                              <button
                                onClick={() => toggleCycle(cycle.id)}
                                className="flex items-center gap-2 hover:opacity-80"
                              >
                                <span className="pl-3">
                                  {isCycleExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </span>
                                <div className="text-left">
                                  <span className="text-sm font-medium text-gray-700">
                                    {formatDateRange(cycle.start_date, cycle.end_date)}
                                  </span>
                                  {cycle.cycle_number && (
                                    <span className="text-xs text-gray-400 ml-1">#{cycle.cycle_number}</span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-2">
                                    {cycle.calculated?.menuCount || 0} meals
                                  </span>
                                </div>
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm" style={{ color: '#22c55e' }}>
                                  ${(cycle.calculated?.billableTotal || 0).toFixed(2)}
                                </span>
                                <StatusBadge status={cycle.status} />
                                {canGenerateInvoice && (
                                  <button
                                    onClick={() => handleGenerateInvoice(cycle.id)}
                                    disabled={generatingInvoice === cycle.id}
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded text-white hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#3d59ab' }}
                                  >
                                    {generatingInvoice === cycle.id ? (
                                      <RefreshCw size={10} className="animate-spin" />
                                    ) : (
                                      <Receipt size={10} />
                                    )}
                                    Invoice
                                  </button>
                                )}
                                {cycle.status === 'invoiced' && <CheckCircle size={14} className="text-blue-500" />}
                                {cycle.status === 'paid' && <CheckCircle size={14} className="text-green-500" />}
                              </div>
                            </div>

                            {/* Line items - compact */}
                            {isCycleExpanded && (
                              <div className="p-2 pl-10 space-y-1 bg-white">
                                {cycle.lineItems && cycle.lineItems.length > 0 ? (
                                  cycle.lineItems.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="px-2 py-1 rounded text-xs flex justify-between items-center"
                                      style={{ backgroundColor: '#fafafa' }}
                                    >
                                      <div>
                                        <span className="text-gray-400 mr-1.5">{item.date}</span>
                                        <span className="font-medium">{item.description}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-400 mr-1.5">
                                          {item.portions}×${item.rateWithMarkup.toFixed(2)}
                                        </span>
                                        <span className="font-medium" style={{ color: '#22c55e' }}>
                                          ${item.lineTotal.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-2 text-gray-400 text-xs">
                                    No approved menus
                                  </div>
                                )}
                                {cycle.lineItems && cycle.lineItems.length > 0 && (
                                  <div className="pt-1.5 border-t border-gray-200 flex justify-between text-xs">
                                    <span className="text-gray-500">Due: {cycle.due_date || '—'}</span>
                                    <span className="font-bold" style={{ color: '#22c55e' }}>
                                      Total: ${(cycle.calculated?.billableTotal || 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
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

      {/* Invoice Preview Modal - compact */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[85vh] overflow-auto">
            {/* Modal header */}
            <div
              className="sticky top-0 flex justify-between items-center px-4 py-3 border-b"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText size={16} />
                Invoice Preview
              </h3>
              <button onClick={() => setPreviewInvoice(null)} className="text-white hover:opacity-80">
                <X size={18} />
              </button>
            </div>

            {/* Invoice content */}
            <div className="p-4 space-y-4">
              {/* Invoice header info */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Invoice</div>
                  <div className="font-mono text-xs">{previewInvoice.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Client</div>
                  <div className="font-semibold">{previewInvoice.clientName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Status</div>
                  <StatusBadge status={previewInvoice.status} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Period</div>
                  <div>{formatDateRange(previewInvoice.startDate, previewInvoice.endDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Due</div>
                  <div>{previewInvoice.dueDate}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Created</div>
                  <div>{new Date(previewInvoice.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Line Items</div>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-600">Date</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-600">Description</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">Qty</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">Rate</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoice.lineItems.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1.5 text-gray-600">{item.date}</td>
                          <td className="px-2 py-1.5">{item.description}</td>
                          <td className="px-2 py-1.5 text-right">{item.portions}</td>
                          <td className="px-2 py-1.5 text-right">${item.rateWithMarkup.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-medium">${item.lineTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-3 flex justify-end">
                <div className="flex justify-between font-bold text-lg w-48" style={{ color: '#22c55e' }}>
                  <span>Total Due:</span>
                  <span>${previewInvoice.billableTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* HoneyBook placeholder */}
              <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-500">
                HoneyBook integration not connected yet.
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-gray-50 px-4 py-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setPreviewInvoice(null)}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => exportInvoiceJSON(previewInvoice)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded text-white hover:opacity-90"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Download size={14} />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
