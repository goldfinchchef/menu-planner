import React from 'react';
import { Calendar, Users, Receipt, Package, UtensilsCrossed, Book, Apple, DollarSign, LayoutGrid, ShoppingCart, Clock } from 'lucide-react';

// Subview definitions for each section
const SUBVIEWS = {
  clients: [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'directory', label: 'Directory', icon: Users },
    { id: 'billing', label: 'Billing', icon: Receipt },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'menus', label: 'Menus', icon: UtensilsCrossed }
  ],
  kitchen: [
    { id: 'recipes', label: 'Recipes', icon: Book },
    { id: 'ingredients', label: 'Ingredients', icon: Apple },
    { id: 'costing', label: 'Costing', icon: DollarSign },
    { id: 'dish-totals', label: 'Dish Totals', icon: LayoutGrid },
    { id: 'shop', label: 'Shop', icon: ShoppingCart },
    { id: 'history', label: 'History', icon: Clock }
  ]
};

// Default subviews when entering a section
const DEFAULT_SUBVIEWS = {
  clients: 'schedule',
  kitchen: 'recipes'
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
