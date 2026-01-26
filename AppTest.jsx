// Testing lucide + constants + useAppData hook
import React from 'react';
import { ChefHat } from 'lucide-react';
import { DEFAULT_NEW_CLIENT, TABS } from './constants';
import { useAppData } from './hooks/useAppData';

export default function App() {
  const { clients, recipes } = useAppData();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>useAppData Test Works!</h1>
      <p>Clients: {clients?.length || 0}</p>
      <p>Recipes: {Object.keys(recipes || {}).length}</p>
    </div>
  );
}
