// Testing DeliveriesTab import
import React from 'react';
import { ChefHat } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import DeliveriesTab from './tabs/DeliveriesTab';

export default function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>DeliveriesTab Import Test!</h1>
      <p>Import successful</p>
    </div>
  );
}
