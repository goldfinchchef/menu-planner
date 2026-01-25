import React, { useState } from 'react';
import { Plus, Trash2, ArrowRight, Check, AlertTriangle, Circle, Eye, X, Lock, Unlock, Users, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
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

  // Get clients who pick their own dishes (chefChoice = false)
  const dishPickerClients = activeClients.filter(c => c.chefChoice === false);

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

      {/* 1. Delivering This Week Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Delivering This Week</h2>
            <p className="text-gray-600">
              {deliveringThisWeek.length} clients with menus
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <Check size={16} /> {statusSummary.approved} approved
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <Circle size={16} /> {statusSummary.pending} pending
            </span>
            {statusSummary.warning > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle size={16} /> {statusSummary.warning} warnings
              </span>
            )}
          </div>
        </div>

        {statusSummary.pending > 0 && (
          <button
            onClick={approveAllReady}
            className="px-4 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#10b981' }}
          >
            Approve All Ready ({statusSummary.pending - statusSummary.warning})
          </button>
        )}
      </div>

      {/* 2. Build Menu Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Build Menu</h2>
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
                {activeClients.map((client, i) => (
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
                    {client.displayName || client.name} ({client.portions || client.persons || 1}p)
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
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-red-100 text-red-700"
                >
                  <Trash2 size={20} />Clear All
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. All Clients with Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>All Clients</h3>

        <div className="space-y-2">
          {activeClients.map((client, i) => {
            const clientName = client.displayName || client.name;
            const status = getClientStatus(client);
            const StatusIcon = status.icon;
            const clientMenuItems = getClientMenuItems(clientName);

            return (
              <div
                key={i}
                className={`border-2 rounded-lg p-3 flex items-center justify-between ${status.bg}`}
                style={{ borderColor: status.status === 'approved' ? '#22c55e' : '#ebb582' }}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon size={20} className={status.color} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{clientName}</span>
                      <span className="text-sm text-gray-500">
                        ({client.portions || 1}p)
                      </span>
                      {client.chefChoice === false && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          Client Picks
                        </span>
                      )}
                    </div>
                    {status.warning && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> {status.warning}
                      </p>
                    )}
                    {clientMenuItems.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {clientMenuItems.length} item(s) •{' '}
                        {clientMenuItems[0].protein || clientMenuItems[0].veg || 'Menu'}
                        {clientMenuItems.length > 1 && ` +${clientMenuItems.length - 1} more`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {clientMenuItems.length > 0 && (
                    <>
                      <button
                        onClick={() => setPreviewClient(client)}
                        className="flex items-center gap-1 px-3 py-1 rounded text-sm bg-white border"
                        style={{ borderColor: '#ebb582' }}
                      >
                        <Eye size={14} /> Preview
                      </button>
                      {status.status !== 'approved' && (
                        <button
                          onClick={() => approveClientMenu(clientName)}
                          className="flex items-center gap-1 px-3 py-1 rounded text-sm text-white"
                          style={{ backgroundColor: '#22c55e' }}
                        >
                          <Check size={14} /> Approve
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dish Selections from Clients */}
      {dishPickerClients.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
            <Users size={20} className="inline mr-2" />
            Client Dish Selections
          </h3>
          <p className="text-gray-600 mb-4">
            These clients pick their own dishes. Review their selections and create menus.
          </p>
          <div className="space-y-3">
            {dishPickerClients.map((client, i) => {
              // Portal data is stored by client.name, not displayName
              const portalData = clientPortalData[client.name];
              const clientDisplayName = client.displayName || client.name;

              // Check for general ingredient picks (legacy)
              const generalPicks = portalData?.ingredientPicks;

              // Check for per-date picks
              const datePicks = portalData?.dateIngredientPicks || {};
              const datePickEntries = Object.entries(datePicks);

              // Combine all dish names for display
              const getAllDishes = () => {
                const dishes = [];

                // From general picks
                if (generalPicks) {
                  if (generalPicks.proteins) dishes.push(...generalPicks.proteins.filter(Boolean));
                  if (generalPicks.veggies) dishes.push(...generalPicks.veggies.filter(Boolean));
                  if (generalPicks.starches) dishes.push(...generalPicks.starches.filter(Boolean));
                }

                // From date-specific picks
                datePickEntries.forEach(([date, picks]) => {
                  if (picks.proteins) dishes.push(...picks.proteins.filter(Boolean));
                  if (picks.veggies) dishes.push(...picks.veggies.filter(Boolean));
                  if (picks.starches) dishes.push(...picks.starches.filter(Boolean));
                });

                return [...new Set(dishes)]; // Remove duplicates
              };

              const allDishes = getAllDishes();
              const hasPicks = allDishes.length > 0 || datePickEntries.length > 0;

              return (
                <div
                  key={i}
                  className="border-2 rounded-lg p-4"
                  style={{ borderColor: '#ebb582' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{clientDisplayName}</h4>
                    <button
                      onClick={() => {
                        setSelectedClients([client.name]);
                        setShowMenuBuilder(true);
                      }}
                      className="px-3 py-1 rounded text-sm text-white"
                      style={{ backgroundColor: '#3d59ab' }}
                    >
                      Create Menu
                    </button>
                  </div>

                  {hasPicks ? (
                    <div className="space-y-2">
                      {/* Per-date picks */}
                      {datePickEntries.length > 0 && (
                        <div>
                          {datePickEntries.map(([date, picks]) => (
                            <div key={date} className="text-sm p-2 rounded bg-green-50 mb-1">
                              <p className="font-medium text-green-700">
                                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}:
                              </p>
                              <p className="text-gray-600">
                                <span className="text-red-600">P:</span> {picks.proteins?.filter(Boolean).join(', ') || 'none'} •{' '}
                                <span className="text-green-600">V:</span> {picks.veggies?.filter(Boolean).join(', ') || 'none'} •{' '}
                                <span className="text-amber-600">S:</span> {picks.starches?.filter(Boolean).join(', ') || 'none'}
                              </p>
                              {picks.notes && <p className="text-xs text-gray-500 mt-1">Notes: {picks.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* General picks (if no date-specific ones) */}
                      {generalPicks && datePickEntries.length === 0 && (
                        <div className="text-sm p-2 rounded bg-blue-50">
                          <p className="text-gray-600">
                            <span className="text-red-600">P:</span> {generalPicks.proteins?.filter(Boolean).join(', ') || 'none'} •{' '}
                            <span className="text-green-600">V:</span> {generalPicks.veggies?.filter(Boolean).join(', ') || 'none'} •{' '}
                            <span className="text-amber-600">S:</span> {generalPicks.starches?.filter(Boolean).join(', ') || 'none'}
                          </p>
                          {generalPicks.notes && <p className="text-xs text-gray-500 mt-1">Notes: {generalPicks.notes}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No dishes selected yet
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Orders */}
      {menuItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
            Current Orders ({menuItems.length})
          </h2>
          <div className="space-y-4">
            {Object.entries(ordersByClient).map(([clientName, orders]) => (
              <div key={clientName} className="border-2 rounded-lg p-4" style={{ borderColor: '#ebb582' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg" style={{ color: '#3d59ab' }}>{clientName}</h3>
                  {orders.every(o => o.approved) && (
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 flex items-center gap-1">
                      <Check size={12} /> Approved
                    </span>
                  )}
                </div>
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
                  setSelectedClient(previewClient);
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
