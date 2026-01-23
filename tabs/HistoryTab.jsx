import React from 'react';

export default function HistoryTab({ historyByClient }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Order History</h2>
      {Object.keys(historyByClient).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(historyByClient).sort((a, b) => a[0].localeCompare(b[0])).map(([clientName, orders]) => (
            <div key={clientName} className="border-2 rounded-lg p-4" style={{ borderColor: '#ebb582' }}>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#3d59ab' }}>{clientName}</h3>
              <div className="space-y-2">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center p-3 rounded"
                    style={{ backgroundColor: '#f9f9ed' }}
                  >
                    <div>
                      <p className="font-medium">{order.date}</p>
                      <p className="text-sm text-gray-600">{order.dishes.join(' • ')}</p>
                      <p className="text-sm text-gray-500">{order.portions} portions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{ color: '#22c55e' }}>
                        ${order.cost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between">
                <span className="font-medium">Total ({orders.length} orders)</span>
                <span className="font-bold" style={{ color: '#3d59ab' }}>
                  ${orders.reduce((sum, o) => sum + o.cost, 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No order history yet. Complete orders in KDS to see them here.</p>
      )}
    </div>
  );
}
