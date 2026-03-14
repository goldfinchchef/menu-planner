/**
 * MenuBuilderPage - /test/menu/builder
 * Experimental menu builder that shows cards for all scheduled clients
 * including empty menu cards ready to be filled in
 */

import React, { useMemo, useState } from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import { ChefHat, Check, AlertCircle, Edit2, Save, X } from 'lucide-react';

// Colors
const COLORS = {
  deepBlue: '#3d59ab',
  goldenYellow: '#ffd700',
  warmTan: '#ebb582',
  cream: '#f9f9ed',
  darkBrown: '#423d3c',
  green: '#22c55e'
};

export default function MenuBuilderPage() {
  const {
    clients,
    recipes,
    selectedWeekId,
    menuItems,
    setMenuItems,
    scheduleMenus,
    scheduleMenuLookup,
    getRecipeCost
  } = useExperimentalContext();

  const [editingMenuId, setEditingMenuId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Get all menus for selected week (from scheduleMenus which are loaded in context)
  const weekMenus = useMemo(() => {
    return scheduleMenus.filter(m => m.week_id === selectedWeekId);
  }, [scheduleMenus, selectedWeekId]);

  // Build client cards - one per scheduled menu row
  const clientCards = useMemo(() => {
    const cards = [];

    weekMenus.forEach(menu => {
      const client = clients.find(c => c.id === menu.client_id);
      const isEmpty = !menu.protein && !menu.veg && !menu.starch;
      const isComplete = menu.protein && menu.veg && menu.starch;
      const isApproved = menu.approved === true;

      cards.push({
        menu,
        client: client || { name: menu.client_name, id: menu.client_id },
        isEmpty,
        isComplete,
        isApproved,
        state: isApproved ? 'approved' : isComplete ? 'complete' : isEmpty ? 'empty' : 'partial'
      });
    });

    // Sort: empty first, then partial, then complete, then approved
    const stateOrder = { empty: 0, partial: 1, complete: 2, approved: 3 };
    cards.sort((a, b) => stateOrder[a.state] - stateOrder[b.state]);

    return cards;
  }, [weekMenus, clients]);

  // Start editing a menu
  const startEditing = (menu) => {
    setEditingMenuId(menu.id);
    setEditForm({
      protein: menu.protein || '',
      veg: menu.veg || '',
      starch: menu.starch || '',
      portions: menu.portions || 4
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMenuId(null);
    setEditForm({});
  };

  // Save menu changes (update local menuItems for now)
  const saveMenu = async (menuId) => {
    // Update the menuItems array with new values
    setMenuItems(prev => prev.map(item => {
      if (item.id === menuId) {
        return {
          ...item,
          protein: editForm.protein || null,
          veg: editForm.veg || null,
          starch: editForm.starch || null,
          portions: editForm.portions
        };
      }
      return item;
    }));

    setEditingMenuId(null);
    setEditForm({});
  };

  // Get recipe options for dropdown
  const getRecipeOptions = (category) => {
    return recipes[category] || [];
  };

  // Calculate menu cost
  const getMenuCost = (menu) => {
    let cost = 0;
    ['protein', 'veg', 'starch'].forEach(type => {
      if (menu[type]) {
        const recipe = recipes[type]?.find(r => r.name === menu[type]);
        if (recipe && getRecipeCost) {
          cost += getRecipeCost(recipe);
        }
      }
    });
    return cost * (menu.portions || 1);
  };

  // State badge component
  const StateBadge = ({ state }) => {
    const styles = {
      empty: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Empty' },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Partial' },
      complete: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Complete' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' }
    };
    const style = styles[state] || styles.empty;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold" style={{ color: COLORS.deepBlue }}>
            Weekly Menu Builder
          </h2>
          <p className="text-sm text-gray-500">
            {clientCards.length} client{clientCards.length !== 1 ? 's' : ''} scheduled for this week
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-2 py-1 bg-gray-100 rounded">
            Empty: {clientCards.filter(c => c.state === 'empty').length}
          </span>
          <span className="px-2 py-1 bg-yellow-100 rounded">
            Partial: {clientCards.filter(c => c.state === 'partial').length}
          </span>
          <span className="px-2 py-1 bg-blue-100 rounded">
            Complete: {clientCards.filter(c => c.state === 'complete').length}
          </span>
          <span className="px-2 py-1 bg-green-100 rounded">
            Approved: {clientCards.filter(c => c.state === 'approved').length}
          </span>
        </div>
      </div>

      {/* No scheduled clients message */}
      {clientCards.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <ChefHat size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-gray-500">No clients scheduled for this week.</p>
          <p className="text-sm text-gray-400 mt-1">
            Go to Schedule to add clients to this week.
          </p>
        </div>
      )}

      {/* Client cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientCards.map(({ menu, client, isEmpty, isComplete, isApproved, state }) => {
          const isEditing = editingMenuId === menu.id;
          const cost = getMenuCost(menu);

          return (
            <div
              key={menu.id}
              className={`bg-white rounded-lg shadow-sm border-2 overflow-hidden ${
                isEmpty ? 'border-dashed border-gray-300' :
                isApproved ? 'border-green-400' :
                isComplete ? 'border-blue-400' : 'border-yellow-400'
              }`}
            >
              {/* Card header */}
              <div
                className="px-4 py-3 flex justify-between items-center"
                style={{
                  backgroundColor: isEmpty ? '#f9fafb' :
                    isApproved ? '#dcfce7' :
                    isComplete ? '#dbeafe' : '#fef3c7'
                }}
              >
                <div>
                  <h3 className="font-semibold" style={{ color: COLORS.darkBrown }}>
                    {client.name}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {client.persons || menu.portions}p • {menu.portions} portions
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StateBadge state={state} />
                  {!isApproved && !isEditing && (
                    <button
                      onClick={() => startEditing(menu)}
                      className="p-1.5 rounded hover:bg-white/50"
                      title="Edit menu"
                    >
                      <Edit2 size={14} style={{ color: COLORS.deepBlue }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                {isEditing ? (
                  /* Edit form */
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Protein</label>
                      <select
                        value={editForm.protein}
                        onChange={(e) => setEditForm(prev => ({ ...prev, protein: e.target.value }))}
                        className="w-full mt-1 p-2 border rounded text-sm"
                      >
                        <option value="">Select protein...</option>
                        {getRecipeOptions('protein').map(r => (
                          <option key={r.name} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Vegetable</label>
                      <select
                        value={editForm.veg}
                        onChange={(e) => setEditForm(prev => ({ ...prev, veg: e.target.value }))}
                        className="w-full mt-1 p-2 border rounded text-sm"
                      >
                        <option value="">Select vegetable...</option>
                        {getRecipeOptions('veg').map(r => (
                          <option key={r.name} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Starch</label>
                      <select
                        value={editForm.starch}
                        onChange={(e) => setEditForm(prev => ({ ...prev, starch: e.target.value }))}
                        className="w-full mt-1 p-2 border rounded text-sm"
                      >
                        <option value="">Select starch...</option>
                        {getRecipeOptions('starch').map(r => (
                          <option key={r.name} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Portions</label>
                      <input
                        type="number"
                        value={editForm.portions}
                        onChange={(e) => setEditForm(prev => ({ ...prev, portions: parseInt(e.target.value) || 1 }))}
                        className="w-full mt-1 p-2 border rounded text-sm"
                        min="1"
                        max="20"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={cancelEditing}
                        className="flex-1 py-2 px-3 border rounded text-sm flex items-center justify-center gap-1"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={() => saveMenu(menu.id)}
                        className="flex-1 py-2 px-3 rounded text-sm text-white flex items-center justify-center gap-1"
                        style={{ backgroundColor: COLORS.deepBlue }}
                      >
                        <Save size={14} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : isEmpty ? (
                  /* Empty state */
                  <div className="text-center py-4">
                    <AlertCircle size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">No menu assigned yet</p>
                    <button
                      onClick={() => startEditing(menu)}
                      className="mt-2 text-sm px-4 py-1.5 rounded border hover:bg-gray-50"
                      style={{ borderColor: COLORS.deepBlue, color: COLORS.deepBlue }}
                    >
                      Add Menu
                    </button>
                  </div>
                ) : (
                  /* Menu display */
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1 border-b">
                      <span className="text-xs text-gray-500 uppercase">Protein</span>
                      <span className="text-sm font-medium">{menu.protein || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b">
                      <span className="text-xs text-gray-500 uppercase">Veg</span>
                      <span className="text-sm font-medium">{menu.veg || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b">
                      <span className="text-xs text-gray-500 uppercase">Starch</span>
                      <span className="text-sm font-medium">{menu.starch || '—'}</span>
                    </div>
                    {menu.extras && menu.extras.length > 0 && (
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-xs text-gray-500 uppercase">Extras</span>
                        <span className="text-sm">{menu.extras.join(', ')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-gray-500">Est. Cost</span>
                      <span className="text-sm font-bold" style={{ color: COLORS.green }}>
                        ${cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card footer - approval status */}
              {isApproved && (
                <div className="px-4 py-2 bg-green-50 border-t border-green-200 flex items-center gap-2 text-green-700 text-sm">
                  <Check size={14} />
                  Approved
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
