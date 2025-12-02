// src/components/Tabs.jsx
import { Calendar, ChefHat, BookOpen } from 'lucide-react';

const tabs = [
  { id: 'menu', label: 'Menu', icon: Calendar },
  { id: 'clients', label: 'Clients', icon: ChefHat },
  { id: 'recipes', label: 'Recipes', icon: BookOpen },
];

export default function Tabs({ activeTab, setActiveTab }) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            color: activeTab === tab.id ? 'blue' : 'black',
          }}
        >
          <tab.icon style={{ width: 16, height: 16, marginRight: 6 }} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
