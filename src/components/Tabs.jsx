import React from 'react';
import { ChefHat, Book, Monitor, List, Clock, Users, DollarSign, Calendar } from 'lucide-react';

const TABS = [
  { id: 'menu', label: 'Menu', icon: ChefHat },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'recipes', label: 'Recipes', icon: Book },
  { id: 'kds', label: 'KDS', icon: Monitor },
  { id: 'prep', label: 'Shop', icon: List },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'ingredients', label: 'Ingredients', icon: DollarSign }
];

export default function Tabs({ activeTab, setActiveTab }) {
  return (
    <>
      {TABS.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-current font-semibold' : 'border-transparent hover:bg-gray-50'
            }`}
            style={activeTab === tab.id ? { color: '#3d59ab', borderColor: '#3d59ab' } : { color: '#423d3c' }}
          >
            <Icon size={18} />
            {tab.label}
          </button>
        );
      })}
    </>
  );
}
