import React from 'react';
import { Receipt } from 'lucide-react';

const COLORS = {
  deepBlue: '#3d59ab',
  warmTan: '#ebb582',
  cream: '#f9f9ed',
  darkBrown: '#423d3c'
};

export default function BillingView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <Receipt
          size={48}
          className="mx-auto mb-4"
          style={{ color: COLORS.warmTan }}
        />
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.deepBlue }}>
          Billing
        </h2>
        <p style={{ color: COLORS.darkBrown }}>
          Detailed billing management coming soon.
        </p>
        <div
          className="mt-6 p-4 rounded-lg text-sm"
          style={{ backgroundColor: COLORS.cream, color: COLORS.darkBrown }}
        >
          For now, billing status is managed in the Schedule view.
          This view will eventually show invoices, payment history, and billing reports.
        </div>
      </div>
    </div>
  );
}
