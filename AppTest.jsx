// Testing with Tabs component
import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import Tabs from './components/Tabs';

export default function App() {
  const [activeTab, setActiveTab] = useState('kds');
  const { clients, recipes } = useAppData();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>Tabs Component Test!</h1>
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <p>Active: {activeTab}</p>
    </div>
  );
}
