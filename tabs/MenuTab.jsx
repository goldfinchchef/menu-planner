import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function MenuTab({
  menuDate,
  setMenuDate,
  clients,
  selectedClients,
  setSelectedClients,
  recipes,
  newMenuItem,
  setNewMenuItem,
  menuItems,
  addMenuItem,
  clearMenu,
  deleteMenuItem,
  getOrdersByClient
}) {
  const toggleExtra = (recipeName) => {
    setNewMenuItem(prev => ({
      ...prev,
      extras: prev.extras.includes(recipeName)
        ? prev.extras.filter(e => e !== recipeName)
        : [...prev.extras, recipeName]
    }));
  };

  const extraCategories = [...recipes.sauces, ...recipes.breakfast, ...recipes.soups];
  const ordersByClient = getOrdersByClient();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Build Menu</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Menu Date</label>
          <input
            type="date"
            value={menuDate}
            onChange={(e) => setMenuDate(e.target.value)}
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Select Clients</label>
          <div className="flex flex-wrap gap-2">
            {clients.map((client, i) => (
              <button
                key={i}
                onClick={() => setSelectedClients(prev =>
                  prev.includes(client.name)
                    ? prev.filter(c => c !== client.name)
                    : [...prev, client.name]
                )}
                className={`px-3 py-1 rounded-full border-2 transition-colors ${
                  selectedClients.includes(client.name) ? 'text-white' : 'bg-white'
                }`}
                style={selectedClients.includes(client.name)
                  ? { backgroundColor: '#3d59ab', borderColor: '#3d59ab' }
                  : { borderColor: '#ebb582', color: '#423d3c' }}
              >
                {client.name} ({client.persons}p)
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {['protein', 'veg', 'starch'].map(type => (
            <div key={type}>
              <label className="block text-sm font-medium mb-2 capitalize" style={{ color: '#423d3c' }}>
                {type === 'veg' ? 'Vegetable' : type}
              </label>
              <select
                value={newMenuItem[type]}
                onChange={(e) => setNewMenuItem({ ...newMenuItem, [type]: e.target.value })}
                className="w-full p-2 border-2 rounded-lg"
                style={{ borderColor: '#ebb582' }}
              >
                <option value="">Select...</option>
                {recipes[type].map((r, i) => (
                  <option key={i} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {extraCategories.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>
              Extras (Sauces, Breakfast, Soups)
            </label>
            <div className="flex flex-wrap gap-2">
              {extraCategories.map((recipe, i) => (
                <button
                  key={i}
                  onClick={() => toggleExtra(recipe.name)}
                  className={`px-3 py-1 rounded-full border-2 transition-colors text-sm ${
                    newMenuItem.extras.includes(recipe.name) ? 'text-white' : 'bg-white'
                  }`}
                  style={newMenuItem.extras.includes(recipe.name)
                    ? { backgroundColor: '#ebb582', borderColor: '#ebb582' }
                    : { borderColor: '#ebb582', color: '#423d3c' }}
                >
                  {recipe.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={addMenuItem}
            className="flex items-center gap-2 px-6 py-2 rounded-lg hover:opacity-90"
            style={{ backgroundColor: '#ffd700', color: '#423d3c' }}
          >
            <Plus size={20} />Add to Menu
          </button>
          {menuItems.length > 0 && (
            <button
              onClick={clearMenu}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-red-100 text-red-700"
            >
              <Trash2 size={20} />Clear All
            </button>
          )}
        </div>
      </div>

      {menuItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
            Current Orders ({menuItems.length})
          </h2>
          <div className="space-y-4">
            {Object.entries(ordersByClient).map(([clientName, orders]) => (
              <div key={clientName} className="border-2 rounded-lg p-4" style={{ borderColor: '#ebb582' }}>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#3d59ab' }}>{clientName}</h3>
                <div className="space-y-2">
                  {orders.map(item => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2 rounded"
                      style={{ backgroundColor: '#f9f9ed' }}
                    >
                      <div>
                        <p className="text-sm text-gray-500">{item.date} • {item.portions} portions</p>
                        <p className="text-sm">
                          {[item.protein, item.veg, item.starch, ...(item.extras || [])].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <button onClick={() => deleteMenuItem(item.id)} className="text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
