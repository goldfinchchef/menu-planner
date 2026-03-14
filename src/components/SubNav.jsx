import React from 'react';
import { Calendar, UtensilsCrossed, LayoutGrid, ShoppingCart, Book, Apple, Users, Clock } from 'lucide-react';

// Subview definitions for each section
const SUBVIEWS = {
  schedule: [
    { id: 'weekly-schedule', label: 'Weekly Schedule', icon: Calendar }
  ],
  menu: [
    { id: 'menu-builder', label: 'Weekly Menu Builder', icon: UtensilsCrossed }
  ],
  kitchen: [
    { id: 'dish-totals', label: 'Dish Totals', icon: LayoutGrid },
    { id: 'shopping-list', label: 'Shopping List', icon: ShoppingCart },
    { id: 'recipes', label: 'Recipes', icon: Book },
    { id: 'ingredients', label: 'Ingredients', icon: Apple }
  ],
  clients: [
    { id: 'directory', label: 'Client Directory', icon: Users },
    { id: 'history', label: 'Order History', icon: Clock }
  ]
};

// Default subviews when entering a section
const DEFAULT_SUBVIEWS = {
  schedule: 'weekly-schedule',
  menu: 'menu-builder',
  kitchen: 'dish-totals',
  clients: 'directory'
};

export default function SubNav({ activeSection, activeSubview, setActiveSubview }) {
  const subviews = SUBVIEWS[activeSection];

  // Don't render if section has no subviews
  if (!subviews) return null;

  return (
    <div
      className="flex gap-1 px-4 py-2 border-b"
      style={{ backgroundColor: '#f9f9ed', borderColor: '#ebb582' }}
    >
      {subviews.map(subview => {
        const Icon = subview.icon;
        const isActive = activeSubview === subview.id;
        return (
          <button
            key={subview.id}
            onClick={() => setActiveSubview(subview.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
              isActive ? 'font-medium' : 'hover:bg-white'
            }`}
            style={isActive
              ? { backgroundColor: '#3d59ab', color: 'white' }
              : { color: '#423d3c' }
            }
          >
            <Icon size={14} />
            {subview.label}
          </button>
        );
      })}
    </div>
  );
}

export { SUBVIEWS, DEFAULT_SUBVIEWS };
