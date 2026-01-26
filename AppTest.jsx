// Testing lucide + constants
import React from 'react';
import { ChefHat } from 'lucide-react';
import { DEFAULT_NEW_CLIENT, TABS } from './constants';

export default function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>Constants Test Works!</h1>
      <p>Tabs: {TABS.length}</p>
    </div>
  );
}
