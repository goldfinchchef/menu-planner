// Testing RecipesTab import
import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import RecipesTab from './tabs/RecipesTab';

export default function App() {
  const { recipes } = useAppData();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>RecipesTab Import Test!</h1>
      <p>Recipes loaded: {Object.keys(recipes || {}).length} categories</p>
    </div>
  );
}
