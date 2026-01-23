import React from 'react';
import { Download } from 'lucide-react';

export default function PrepTab({ prepList, exportPrepList }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Shopping List</h2>
        {prepList.length > 0 && (
          <button
            onClick={exportPrepList}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#3d59ab' }}
          >
            <Download size={18} className="inline mr-2" />Export
          </button>
        )}
      </div>
      {prepList.length > 0 ? (
        <div className="space-y-6">
          {(() => {
            const sources = [...new Set(prepList.map(item => item.source || 'No Source'))].sort();
            return sources.map(source => {
              const sourceItems = prepList.filter(item => (item.source || 'No Source') === source);
              const sections = [...new Set(sourceItems.map(item => item.section))].sort();
              return (
                <div key={source} className="border-2 rounded-lg p-4" style={{ borderColor: '#3d59ab' }}>
                  <h3 className="text-xl font-bold mb-3" style={{ color: '#3d59ab' }}>{source}</h3>
                  {sections.map(section => {
                    const sectionItems = sourceItems.filter(item => item.section === section);
                    return (
                      <div key={section} className="mb-4">
                        <h4 className="font-medium mb-2" style={{ color: '#ebb582' }}>{section}</h4>
                        {sectionItems.map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between p-2 rounded mb-1"
                            style={{ backgroundColor: '#f9f9ed' }}
                          >
                            <span>{item.name}</span>
                            <span className="font-bold">{item.quantity.toFixed(1)} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <p className="text-gray-500">No items. Add menu items first.</p>
      )}
    </div>
  );
}
