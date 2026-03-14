/**
 * GroceryBillingPage - /test/finance/grocery-billing
 * Client weekly grocery cost breakdown with invoice generation
 */

import React, { useState } from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import { ChevronDown, ChevronRight, Receipt, Download, FileText, X } from 'lucide-react';

export default function GroceryBillingPage() {
  const {
    buildClientBreakdown,
    generateGroceryInvoice,
    exportInvoiceJSON,
    groceryInvoices,
    GROCERY_MARKUP_PERCENT
  } = useExperimentalContext();

  // UI state
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // Toggle expanded state
  const toggleClient = (clientName) => {
    setExpandedClients(prev => ({ ...prev, [clientName]: !prev[clientName] }));
  };

  const toggleWeek = (key) => {
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Build the data
  const weekData = buildClientBreakdown();
  const weekIds = Object.keys(weekData);

  // Reorganize by client, then by week
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
        weekStart: week.weekStart,
        weekEnd: week.weekEnd
      };
      clientData[clientName].total += data.total;
    });
  });

  const clientNames = Object.keys(clientData).sort();

  // Check if invoice already exists for client-week
  const hasInvoice = (clientName, weekId) => {
    return groceryInvoices.some(inv => inv.clientName === clientName && inv.weekId === weekId);
  };

  // Handle generate invoice
  const handleGenerateInvoice = (clientName, weekId) => {
    const invoice = generateGroceryInvoice(clientName, weekId, weekData);
    setPreviewInvoice(invoice);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Grocery Billing</h2>
            <p className="text-gray-600 text-sm mt-1">
              Generate invoices from weekly grocery costs. Markup: {GROCERY_MARKUP_PERCENT}%
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {groceryInvoices.length} invoice{groceryInvoices.length !== 1 ? 's' : ''} generated
          </div>
        </div>

        {/* Client list */}
        {clientNames.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No approved menu items found. Approve menus to see grocery costs.
          </div>
        ) : (
          <div className="space-y-2">
            {clientNames.map(clientName => {
              const client = clientData[clientName];
              const isExpanded = expandedClients[clientName] || false;
              const clientWeekIds = Object.keys(client.weeks).sort((a, b) => b.localeCompare(a));

              return (
                <div
                  key={clientName}
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: '#3d59ab' }}
                >
                  {/* Client header */}
                  <button
                    onClick={() => toggleClient(clientName)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:opacity-90"
                    style={{ backgroundColor: '#dbeafe' }}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="font-bold text-lg" style={{ color: '#3d59ab' }}>
                        {clientName}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({clientWeekIds.length} week{clientWeekIds.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="font-bold text-lg" style={{ color: '#22c55e' }}>
                      ${client.total.toFixed(2)}
                    </span>
                  </button>

                  {/* Weeks within client */}
                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: '#3d59ab' }}>
                      {clientWeekIds.map(weekId => {
                        const weekInfo = client.weeks[weekId];
                        const rowKey = `${clientName}_${weekId}`;
                        const isWeekExpanded = expandedWeeks[rowKey] || false;
                        const invoiceExists = hasInvoice(clientName, weekId);

                        return (
                          <div
                            key={weekId}
                            className="border-b last:border-b-0"
                            style={{ borderColor: '#ebb582' }}
                          >
                            {/* Week header */}
                            <div
                              className="px-4 py-2 flex justify-between items-center"
                              style={{ backgroundColor: '#f9f9ed' }}
                            >
                              <button
                                onClick={() => toggleWeek(rowKey)}
                                className="flex items-center gap-3 hover:opacity-80"
                              >
                                <span className="pl-4">
                                  {isWeekExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                  {weekInfo.label}
                                </span>
                              </button>
                              <div className="flex items-center gap-3">
                                <span className="font-bold" style={{ color: '#22c55e' }}>
                                  ${weekInfo.total.toFixed(2)}
                                </span>
                                {invoiceExists ? (
                                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                    Invoice Generated
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleGenerateInvoice(clientName, weekId)}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded text-white transition-colors hover:opacity-90"
                                    style={{ backgroundColor: '#3d59ab' }}
                                  >
                                    <Receipt size={14} />
                                    Generate Invoice
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Meal details */}
                            {isWeekExpanded && (
                              <div className="p-3 pl-12 space-y-2 bg-white">
                                {weekInfo.meals.map((meal, mealIdx) => (
                                  <div
                                    key={mealIdx}
                                    className="p-2 rounded text-sm"
                                    style={{ backgroundColor: '#fafafa' }}
                                  >
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
                                      {meal.dishes
                                        .filter(d => d.type !== 'extra')
                                        .map((dish, i, arr) => (
                                          <span key={i} className="inline-flex items-center gap-1">
                                            <span className="font-medium">{dish.name}</span>
                                            <span className="text-gray-500">
                                              (${dish.costPerPortion.toFixed(2)})
                                            </span>
                                            {i < arr.length - 1 && (
                                              <span className="text-gray-300 ml-1">+</span>
                                            )}
                                          </span>
                                        ))}
                                    </div>
                                    {meal.dishes.filter(d => d.type === 'extra').length > 0 && (
                                      <div className="text-gray-500 text-xs mb-1">
                                        Extras:{' '}
                                        {meal.dishes
                                          .filter(d => d.type === 'extra')
                                          .map((d, i, arr) => (
                                            <span key={i}>
                                              {d.name} (${d.costPerPortion.toFixed(2)})
                                              {i < arr.length - 1 ? ', ' : ''}
                                            </span>
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

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* Modal header */}
            <div
              className="sticky top-0 flex justify-between items-center px-6 py-4 border-b"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={20} />
                Invoice Preview
              </h3>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="text-white hover:opacity-80"
              >
                <X size={20} />
              </button>
            </div>

            {/* Invoice content */}
            <div className="p-6 space-y-6">
              {/* Invoice header info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Invoice ID</div>
                  <div className="font-mono text-sm">{previewInvoice.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Status</div>
                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                    {previewInvoice.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Client</div>
                  <div className="font-semibold">{previewInvoice.clientName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Week</div>
                  <div>{previewInvoice.weekLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Due Date</div>
                  <div>{previewInvoice.invoiceDueDate}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Created</div>
                  <div>{new Date(previewInvoice.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Line Items</div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Rate</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoice.lineItems.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2 text-gray-600">{item.date}</td>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">{item.portions}</td>
                          <td className="px-3 py-2 text-right">${item.costPerPortion.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">${item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Grocery Subtotal:</span>
                      <span>${previewInvoice.rawGroceryTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Markup ({previewInvoice.markupPercent}%):</span>
                      <span>${previewInvoice.markupAmount.toFixed(2)}</span>
                    </div>
                    <div
                      className="flex justify-between font-bold text-lg pt-2 border-t"
                      style={{ color: '#22c55e' }}
                    >
                      <span>Total Due:</span>
                      <span>${previewInvoice.billableTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HoneyBook placeholder */}
              {previewInvoice.honeybookUrl ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <span className="font-medium text-green-800">HoneyBook:</span>{' '}
                  <a href={previewInvoice.honeybookUrl} className="text-blue-600 underline">
                    {previewInvoice.honeybookUrl}
                  </a>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-500">
                  HoneyBook integration not connected yet.
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setPreviewInvoice(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  exportInvoiceJSON(previewInvoice);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Download size={16} />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
