import React, { useState } from 'react';
import { Plus, Trash2, Check, AlertTriangle, Eye, X, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import WeekSelector from '../components/WeekSelector';

// Styled Menu Card Component - matches client portal
function StyledMenuCard({ client, date, menuItems }) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  const meals = [];
  menuItems.forEach(item => {
    const meal = {
      protein: item.protein,
      sides: [item.veg, item.starch].filter(Boolean)
    };
    if (meal.protein || meal.sides.length > 0) {
      meals.push(meal);
    }
    if (item.extras) {
      item.extras.forEach(extra => {
        meals.push({ protein: extra, sides: [], isExtra: true });
      });
    }
  });

  const displayName = client.displayName || client.name;

  return (
    <div className="overflow-hidden shadow-lg rounded-lg" style={{ backgroundColor: '#fff' }}>
      <div
        className="relative px-4 pt-6 pb-8"
        style={{
          backgroundColor: '#f9f9ed',
          backgroundImage: 'url(/pattern4.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <p
          className="text-center mb-2"
          style={{
            fontFamily: '"Glacial Indifference", sans-serif',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: '#5a5a5a'
          }}
        >
          GOLDFINCH CHEF SERVICES
        </p>

        <h2
          className="text-center mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '18px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textDecoration: 'underline',
            textDecorationColor: '#3d59ab',
            textUnderlineOffset: '4px'
          }}
        >
          {displayName}'s Menu
        </h2>

        <p
          className="text-center mb-4"
          style={{
            color: '#5a5a5a',
            fontFamily: '"Beth Ellen", cursive',
            fontSize: '12px'
          }}
        >
          here's what to expect on your plate!
        </p>

        <div className="flex items-center justify-center gap-3">
          <img
            src="/goldfinch5.png"
            alt="Goldfinch"
            className="w-12 h-12 object-contain"
          />
          <p
            style={{
              fontFamily: '"Glacial Indifference", sans-serif',
              fontSize: '14px',
              letterSpacing: '0.2em',
              color: '#5a5a5a'
            }}
          >
            {displayDate}
          </p>
        </div>
      </div>

      <div
        className="px-6 py-8"
        style={{ backgroundColor: '#d9a87a' }}
      >
        <div className="space-y-8">
          {meals.map((meal, idx) => (
            <div key={idx} className="text-center">
              {meal.protein && (
                <h3
                  style={{
                    color: '#ffffff',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: meal.sides.length > 0 ? '0.5rem' : 0
                  }}
                >
                  {meal.protein}
                </h3>
              )}
              {meal.sides.length > 0 && (
                <p
                  style={{
                    color: '#f5e6d3',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  {meal.sides.join(', ')}
                </p>
              )}
            </div>
          ))}
          {meals.length === 0 && (
            <p className="text-center text-white/70 italic">No menu items yet</p>
          )}
        </div>
      </div>

      <div
        className="relative px-6 py-6"
        style={{
          backgroundColor: '#f9f9ed',
          fontFamily: '"Glacial Indifference", sans-serif'
        }}
      >
        <h4
          className="mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Get Ready!
        </h4>
        <p
          className="mb-4 pr-20"
          style={{
            color: '#5a5a5a',
            fontSize: '0.9rem',
            lineHeight: '1.5'
          }}
        >
          Remember to put out bags, containers, and ice packs. And get excited – great food is on the way!
        </p>
        <img
          src="/stemflower.png"
          alt=""
          className="absolute right-4 bottom-4 h-20 object-contain"
        />
      </div>
    </div>
  );
}

export default function MenuTab({
  menuDate,
  setMenuDate,
  clients,
  allClients,
  selectedClients,
  setSelectedClients,
  recipes,
  newMenuItem,
  setNewMenuItem,
  menuItems,
  setMenuItems,
  addMenuItem,
  clearMenu,
  deleteMenuItem,
  getOrdersByClient,
  clientPortalData = {},
  weeklyTasks = {},
  weeks = {},
  selectedWeekId,
  setSelectedWeekId,
  lockWeekAndSnapshot,
  unlockWeekById
}) {
  const [previewClient, setPreviewClient] = useState(null);
  const [editingClientMenu, setEditingClientMenu] = useState(null);
  const [showMenuBuilder, setShowMenuBuilder] = useState(true);

  // Get active clients only
  const activeClients = (allClients || clients || []).filter(c => c.status === 'active');

  // Get week start date (Monday)
  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const weekStart = getWeekStart();
  const tasks = weeklyTasks[weekStart] || {};

  // Get client status (approved, warning, no menu)
  const getClientStatus = (client) => {
    const clientName = client.displayName || client.name;
    const clientMenuItems = menuItems.filter(item => item.clientName === clientName);
    const hasMenu = clientMenuItems.length > 0;
    const allApproved = hasMenu && clientMenuItems.every(item => item.approved);

    // Check for payment issues
    let warning = null;
    if (client.billDueDate) {
      const dueDate = new Date(client.billDueDate + 'T12:00:00');
      const now = new Date();
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      if (daysOverdue >= 1) {
        warning = `Invoice overdue (${daysOverdue} day${daysOverdue > 1 ? 's' : ''})`;
      }
    }

    if (!client.deliveryDates || client.deliveryDates.length === 0) {
      warning = warning || 'Delivery dates not set';
    }

    if (!hasMenu) {
      return { status: 'none', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50', warning };
    }

    if (allApproved) {
      return { status: 'approved', icon: Check, color: 'text-green-600', bg: 'bg-green-50', warning };
    }

    if (warning) {
      return { status: 'warning', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', warning };
    }

    return { status: 'pending', icon: Circle, color: 'text-blue-600', bg: 'bg-blue-50', warning };
  };

  // Get clients delivering this week
  const getDeliveringThisWeek = () => {
    return activeClients.filter(c => {
      const hasMenuItems = menuItems.some(item => {
        const clientName = c.displayName || c.name;
        return item.clientName === clientName;
      });
      return hasMenuItems;
    });
  };

  // Approve menu for a client
  const approveClientMenu = (clientName) => {
    setMenuItems(prev =>
      prev.map(item =>
        item.clientName === clientName ? { ...item, approved: true } : item
      )
    );
  };

  // Approve all ready menus
  const approveAllReady = () => {
    const readyClients = activeClients.filter(c => {
      const clientName = c.displayName || c.name;
      const status = getClientStatus(c);
      return status.status === 'pending' && !status.warning;
    });

    if (readyClients.length === 0) {
      alert('No menus ready to approve');
      return;
    }

    readyClients.forEach(c => {
      const clientName = c.displayName || c.name;
      approveClientMenu(clientName);
    });

    alert(`Approved ${readyClients.length} menu(s)`);
  };

  // Deny (remove) menu for a client
  const denyClientMenu = (clientName) => {
    if (window.confirm(`Remove all menu items for ${clientName}?`)) {
      setMenuItems(prev => prev.filter(item => item.clientName !== clientName));
      setPreviewClient(null);
    }
  };

  // Get menu items for a specific client
  const getClientMenuItems = (clientName) => {
    return menuItems.filter(item => item.clientName === clientName);
  };

  // Toggle extra dish selection
  const toggleExtra = (recipeName) => {
    setNewMenuItem(prev => ({
      ...prev,
      extras: prev.extras.includes(recipeName)
        ? prev.extras.filter(e => e !== recipeName)
        : [...prev.extras, recipeName]
    }));
  };

  const extraCategories = [...(recipes.sauces || []), ...(recipes.breakfast || []), ...(recipes.soups || [])];
  const ordersByClient = getOrdersByClient();
  const deliveringThisWeek = getDeliveringThisWeek();

  // Count status summary
  const statusSummary = {
    approved: activeClients.filter(c => getClientStatus(c).status === 'approved').length,
    pending: activeClients.filter(c => getClientStatus(c).status === 'pending').length,
    warning: activeClients.filter(c => getClientStatus(c).warning).length,
    noMenu: activeClients.filter(c => getClientStatus(c).status === 'none').length
  };

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      {weeks && selectedWeekId && setSelectedWeekId && (
        <WeekSelector
          selectedWeekId={selectedWeekId}
          setSelectedWeekId={setSelectedWeekId}
          weeks={weeks}
          onLockWeek={lockWeekAndSnapshot}
          onUnlockWeek={unlockWeekById}
        />
      )}

      {/* 1. Delivering This Week - Compact client list with checkmarks */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Delivering This Week</h2>
          {menuItems.filter(item => !item.approved).length > 0 && (
            <button
              onClick={approveAllReady}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: '#10b981' }}
            >
              Approve All Ready
            </button>
          )}
        </div>

        {activeClients.length > 0 ? (
          <div className="flex flex-wrap gap-x-1 gap-y-1 text-sm">
            {activeClients.map((client, i) => {
              const clientName = client.displayName || client.name;
              const hasMenu = menuItems.some(item => item.clientName === clientName);
              const isApproved = hasMenu && menuItems.filter(item => item.clientName === clientName).every(item => item.approved);

              return (
                <span key={i} className="inline-flex items-center">
                  {hasMenu && (
                    <Check
                      size={14}
                      className={isApproved ? 'text-green-600 mr-0.5' : 'text-blue-500 mr-0.5'}
                    />
                  )}
                  <span className={hasMenu ? (isApproved ? 'text-green-700 font-medium' : 'text-blue-600') : 'text-gray-500'}>
                    {clientName}
                  </span>
                  {i < activeClients.length - 1 && <span className="text-gray-300 mx-1">,</span>}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No active clients</p>
        )}
      </div>

      {/* 2. Current Orders - Menus planned but not approved */}
      {menuItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
            Current Orders ({menuItems.length})
          </h2>
          <div className="space-y-3">
            {Object.entries(ordersByClient).map(([clientName, orders]) => {
              const allApproved = orders.every(o => o.approved);
              const client = activeClients.find(c => (c.displayName || c.name) === clientName);

              return (
                <div
                  key={clientName}
                  className="border-2 rounded-lg p-4"
                  style={{ borderColor: allApproved ? '#22c55e' : '#ebb582', backgroundColor: allApproved ? '#f0fdf4' : 'white' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold" style={{ color: '#3d59ab' }}>{clientName}</h3>
                      {allApproved ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 flex items-center gap-1">
                          <Check size={12} /> Approved
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {client && (
                        <button
                          onClick={() => setPreviewClient(client)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white border"
                          style={{ borderColor: '#ebb582' }}
                        >
                          <Eye size={12} /> Preview
                        </button>
                      )}
                      {!allApproved && (
                        <button
                          onClick={() => approveClientMenu(clientName)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: '#22c55e' }}
                        >
                          <Check size={12} /> Approve
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {orders.map(item => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-2 rounded text-sm"
                        style={{ backgroundColor: '#f9f9ed' }}
                      >
                        <div>
                          <span className="text-gray-500">{item.date} • {item.portions}p:</span>{' '}
                          <span>{[item.protein, item.veg, item.starch, ...(item.extras || [])].filter(Boolean).join(', ')}</span>
                        </div>
                        <button onClick={() => deleteMenuItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Build Menu Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#3d59ab' }}>Build Menu</h2>
          <button
            onClick={() => setShowMenuBuilder(!showMenuBuilder)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            {showMenuBuilder ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showMenuBuilder ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {showMenuBuilder && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Menu Date</label>
                <input
                  type="date"
                  value={menuDate}
                  onChange={(e) => setMenuDate(e.target.value)}
                  className="w-full p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>Select Clients</label>
                <div className="flex flex-wrap gap-1">
                  {activeClients.map((client, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedClients(prev =>
                        prev.includes(client.name)
                          ? prev.filter(c => c !== client.name)
                          : [...prev, client.name]
                      )}
                      className={`px-2 py-1 rounded-full border text-xs transition-colors ${
                        selectedClients.includes(client.name) ? 'text-white' : 'bg-white'
                      }`}
                      style={selectedClients.includes(client.name)
                        ? { backgroundColor: '#3d59ab', borderColor: '#3d59ab' }
                        : { borderColor: '#ebb582', color: '#423d3c' }}
                    >
                      {client.displayName || client.name}
                    </button>
                  ))}
                </div>
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
                    {(recipes[type] || []).map((r, i) => (
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm"
                >
                  <Trash2 size={16} />Clear All
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-bold" style={{ color: '#3d59ab' }}>
                Menu Preview
              </h3>
              <button
                onClick={() => setPreviewClient(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <StyledMenuCard
                client={previewClient}
                date={menuDate}
                menuItems={getClientMenuItems(previewClient.displayName || previewClient.name)}
              />
            </div>

            <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => denyClientMenu(previewClient.displayName || previewClient.name)}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700"
              >
                Remove Menu
              </button>
              <button
                onClick={() => {
                  setSelectedClients([previewClient.name]);
                  setShowMenuBuilder(true);
                  setPreviewClient(null);
                }}
                className="px-4 py-2 rounded-lg border-2 flex items-center gap-2"
                style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
              >
                <Edit2 size={18} /> Edit
              </button>
              <button
                onClick={() => {
                  approveClientMenu(previewClient.displayName || previewClient.name);
                  setPreviewClient(null);
                }}
                className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                style={{ backgroundColor: '#22c55e' }}
              >
                <Check size={18} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
