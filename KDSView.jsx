// KDSView.jsx
import React from 'react';
import { Check } from 'lucide-react';

const KDSView = ({ menuItems, allDishesComplete, completeAllOrders }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
          Kitchen Display
        </h2>

        {menuItems.length > 0 && allDishesComplete() && (
          <button
            onClick={completeAllOrders}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#3d59ab' }}
          >
            <Check size={18} />
            Complete All & Save to History
          </button>
        )}
      </div>
    </div>
  );
};

export default KDSView;
