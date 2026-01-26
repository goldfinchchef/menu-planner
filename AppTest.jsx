// Testing all 4 tabs together
import React from 'react';
import { ChefHat } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import RecipesTab from './tabs/RecipesTab';
import KDSTab from './tabs/KDSTab';
import PrepTab from './tabs/PrepTab';
import DeliveriesTab from './tabs/DeliveriesTab';

export default function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>All 4 Tabs Import Test!</h1>
      <p>All tabs imported successfully</p>
    </div>
  );
}
