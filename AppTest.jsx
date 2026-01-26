// Testing with WeekSelector component
import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import Tabs from './components/Tabs';
import WeekSelector from './components/WeekSelector';

export default function App() {
  const [activeTab, setActiveTab] = useState('kds');
  const { clients, recipes, weeks, selectedWeekId, setSelectedWeekId } = useAppData();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <ChefHat size={32} />
      <h1 style={{ color: '#3d59ab' }}>WeekSelector Test!</h1>
      <WeekSelector
        selectedWeekId={selectedWeekId}
        setSelectedWeekId={setSelectedWeekId}
        weeks={weeks}
      />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <p>Week: {selectedWeekId}</p>
    </div>
  );
}
