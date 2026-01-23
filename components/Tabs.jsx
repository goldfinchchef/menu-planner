import React from 'react';
import { TABS } from '../constants';

export default function Tabs({ activeTab, setActiveTab }) {
  return (
    <>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === tab.id ? 'border-b-2 text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
          style={activeTab === tab.id ? { borderColor: '#3d59ab', color: '#3d59ab' } : {}}
        >
          <tab.icon size={18} />
          {tab.label}
        </button>
      ))}
    </>
  );
}
