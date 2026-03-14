import React from 'react';
import { DollarSign } from 'lucide-react';

const COLORS = {
  deepBlue: '#3d59ab',
  warmTan: '#ebb582',
  cream: '#f9f9ed',
  darkBrown: '#423d3c'
};

export default function CostingView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <DollarSign
          size={48}
          className="mx-auto mb-4"
          style={{ color: COLORS.warmTan }}
        />
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.deepBlue }}>
          Costing
        </h2>
        <p style={{ color: COLORS.darkBrown }}>
          Recipe and menu costing analysis coming soon.
        </p>
        <div
          className="mt-6 p-4 rounded-lg text-sm"
          style={{ backgroundColor: COLORS.cream, color: COLORS.darkBrown }}
        >
          This view will show cost breakdowns per recipe, margin analysis,
          and pricing recommendations based on ingredient costs.
        </div>
      </div>
    </div>
  );
}
