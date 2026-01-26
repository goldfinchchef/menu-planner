// Testing PrepTab import
import React from 'react';
import { ChefHat } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import PrepTab from './tabs/PrepTab';

export default function App() {
  const { recipes } = useAppData();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>PrepTab Import Test!</h1>
      <p>Import successful</p>
    </div>
  );
}
