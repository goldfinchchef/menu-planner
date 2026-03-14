import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, UtensilsCrossed, ChefHat, Users, DollarSign } from 'lucide-react';

const SECTIONS = [
  { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/test/schedule' },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed, path: '/test/menu/builder' },
  { id: 'kitchen', label: 'Kitchen', icon: ChefHat, path: '/test/kitchen/dish-totals' },
  { id: 'clients', label: 'Clients', icon: Users, path: '/test/clients/directory' },
  { id: 'finance', label: 'Finance', icon: DollarSign, path: '/test/finance/grocery-billing' }
];

export default function TopNav() {
  const location = useLocation();

  // Determine which section is active based on current path
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.startsWith('/test/schedule')) return 'schedule';
    if (path.startsWith('/test/menu')) return 'menu';
    if (path.startsWith('/test/kitchen')) return 'kitchen';
    if (path.startsWith('/test/clients')) return 'clients';
    if (path.startsWith('/test/finance')) return 'finance';
    return 'schedule';
  };

  const activeSection = getActiveSection();

  return (
    <div className="flex">
      {SECTIONS.map(section => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <NavLink
            key={section.id}
            to={section.path}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? 'border-b-2' : 'border-b-2 border-transparent hover:bg-blue-50'
            }`}
            style={isActive
              ? { color: '#3d59ab', borderColor: '#3d59ab', backgroundColor: 'white' }
              : { color: '#423d3c' }
            }
          >
            <Icon size={16} />
            {section.label}
          </NavLink>
        );
      })}
    </div>
  );
}

export { SECTIONS };
