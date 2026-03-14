import React from 'react';
import { Calendar, UtensilsCrossed, ChefHat, Users } from 'lucide-react';

const SECTIONS = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
  { id: 'clients', label: 'Clients', icon: Users }
];

export default function TopNav({ activeSection, setActiveSection, setActiveSubview, defaultSubviews }) {
  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
    // Set default subview for sections that have children
    if (defaultSubviews[sectionId]) {
      setActiveSubview(defaultSubviews[sectionId]);
    } else {
      setActiveSubview(null);
    }
  };

  return (
    <div className="flex">
      {SECTIONS.map(section => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            className={`flex items-center gap-2 px-5 py-3 font-medium transition-colors ${
              isActive ? 'border-b-2' : 'border-b-2 border-transparent hover:bg-blue-50'
            }`}
            style={isActive
              ? { color: '#3d59ab', borderColor: '#3d59ab', backgroundColor: 'white' }
              : { color: '#423d3c' }
            }
          >
            <Icon size={18} />
            {section.label}
          </button>
        );
      })}
    </div>
  );
}

export { SECTIONS };
