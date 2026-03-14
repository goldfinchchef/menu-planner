import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, UtensilsCrossed, LayoutGrid, ShoppingCart, Book, Apple, Users, Clock, Receipt } from 'lucide-react';

// Subview definitions for each section with route paths
const SUBVIEWS = {
  schedule: [
    { id: 'weekly-schedule', label: 'Weekly Schedule', icon: Calendar, path: '/test/schedule' }
  ],
  menu: [
    { id: 'menu-builder', label: 'Weekly Menu Builder', icon: UtensilsCrossed, path: '/test/menu/builder' }
  ],
  kitchen: [
    { id: 'dish-totals', label: 'Dish Totals', icon: LayoutGrid, path: '/test/kitchen/dish-totals' },
    { id: 'shopping-list', label: 'Shopping List', icon: ShoppingCart, path: '/test/kitchen/shopping-list' },
    { id: 'recipes', label: 'Recipes', icon: Book, path: '/test/kitchen/recipes' },
    { id: 'ingredients', label: 'Ingredients', icon: Apple, path: '/test/kitchen/ingredients' }
  ],
  clients: [
    { id: 'directory', label: 'Client Directory', icon: Users, path: '/test/clients/directory' },
    { id: 'history', label: 'Order History', icon: Clock, path: '/test/clients/history' }
  ],
  finance: [
    { id: 'grocery-billing', label: 'Grocery Billing', icon: Receipt, path: '/test/finance/grocery-billing' }
  ]
};

export default function SubNav() {
  const location = useLocation();

  // Determine which section is active based on current path
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.startsWith('/test/schedule')) return 'schedule';
    if (path.startsWith('/test/menu')) return 'menu';
    if (path.startsWith('/test/kitchen')) return 'kitchen';
    if (path.startsWith('/test/clients')) return 'clients';
    if (path.startsWith('/test/finance')) return 'finance';
    return null;
  };

  const activeSection = getActiveSection();
  const subviews = activeSection ? SUBVIEWS[activeSection] : null;

  // Don't render if section has no subviews or only one subview
  if (!subviews || subviews.length <= 1) return null;

  return (
    <div
      className="flex gap-1 px-4 py-2 border-b"
      style={{ backgroundColor: '#f9f9ed', borderColor: '#ebb582' }}
    >
      {subviews.map(subview => {
        const Icon = subview.icon;
        const isActive = location.pathname === subview.path;
        return (
          <NavLink
            key={subview.id}
            to={subview.path}
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
          </NavLink>
        );
      })}
    </div>
  );
}

export { SUBVIEWS };
