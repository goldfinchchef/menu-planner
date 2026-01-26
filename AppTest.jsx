// Minimal test App - testing just lucide-react first
import React from 'react';
import { ChefHat } from 'lucide-react';

export default function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>Lucide Test Works!</h1>
    </div>
  );
}
