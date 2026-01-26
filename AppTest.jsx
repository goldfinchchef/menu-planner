// Testing with KDSTab
import React from 'react';
import { ChefHat } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import KDSTab from './tabs/KDSTab';

export default function App() {
  const { clients, recipes } = useAppData();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>KDSTab Test Works!</h1>
      <p>Clients: {clients?.length || 0}</p>
      <KDSTab kdsView={{ monTue: {}, thursday: {} }} />
    </div>
  );
}
