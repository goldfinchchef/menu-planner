/**
 * MenuBuilderPage - /test/menu/builder
 * Compact operations dashboard for weekly menu planning
 * Cards grouped by client_id + week_id showing full weekly menu
 */

import React, { useMemo, useState } from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import { Receipt, Check, Edit2, X } from 'lucide-react';

// Status colors (matches schedule grid)
const STATUS_COLORS = {
  scheduled: { bg: '#bbf7d0', text: '#166534', label: 'Scheduled' },
  confirmed: { bg: '#3d59ab', text: '#ffffff', label: 'Confirmed' }
};

export default function MenuBuilderPage() {
  const {
    clients,
    recipes,
    selectedWeekId,
    scheduleMenus,
    setMenuItems,
    getRecipeCost
  } = useExperimentalContext();

  const [editingClient, setEditingClient] = useState(null);
  const [editingMealIdx, setEditingMealIdx] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Get all menus for selected week
  const weekMenus = useMemo(() => {
    return scheduleMenus.filter(m => m.week_id === selectedWeekId);
  }, [scheduleMenus, selectedWeekId]);

  // Group menus by client_id - one card per client with all their meals
  const clientCards = useMemo(() => {
    const groups = {};

    weekMenus.forEach(menu => {
      const clientId = menu.client_id;
      if (!groups[clientId]) {
        const client = clients.find(c => c.id === clientId);
        groups[clientId] = {
          clientId,
          client: client || { name: menu.client_name, id: clientId },
          meals: []
        };
      }
      groups[clientId].meals.push(menu);
    });

    // Sort meals by date within each client
    Object.values(groups).forEach(g => {
      g.meals.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    });

    // Sort clients alphabetically
    return Object.values(groups).sort((a, b) =>
      (a.client.name || '').localeCompare(b.client.name || '')
    );
  }, [weekMenus, clients]);

  // Get status from menus (all confirmed = confirmed, else scheduled)
  const getClientStatus = (meals) => {
    if (meals.length === 0) return 'scheduled';
    const allApproved = meals.every(m => m.approved === true);
    return allApproved ? 'confirmed' : 'scheduled';
  };

  // Check if any meal is empty
  const hasEmptyMeals = (meals) => {
    return meals.some(m => !m.protein && !m.veg && !m.starch);
  };

  // Calculate total weekly cost
  const getWeeklyCost = (meals) => {
    let total = 0;
    meals.forEach(menu => {
      ['protein', 'veg', 'starch'].forEach(type => {
        if (menu[type]) {
          const recipe = recipes[type]?.find(r => r.name === menu[type]);
          if (recipe && getRecipeCost) {
            total += getRecipeCost(recipe) * (menu.portions || 1);
          }
        }
      });
    });
    return total;
  };

  // Start editing a meal
  const startEditing = (clientId, mealIdx, meal) => {
    setEditingClient(clientId);
    setEditingMealIdx(mealIdx);
    setEditForm({
      protein: meal.protein || '',
      veg: meal.veg || '',
      starch: meal.starch || ''
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingClient(null);
    setEditingMealIdx(null);
    setEditForm({});
  };

  // Save meal (update local state)
  const saveMeal = (menuId) => {
    setMenuItems(prev => prev.map(item => {
      if (item.id === menuId) {
        return {
          ...item,
          protein: editForm.protein || null,
          veg: editForm.veg || null,
          starch: editForm.starch || null
        };
      }
      return item;
    }));
    cancelEditing();
  };

  // Get recipe options
  const getRecipeOptions = (category) => recipes[category] || [];

  // Format phone for display
  const formatPhone = (phone) => {
    if (!phone) return null;
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  // Truncate text
  const truncate = (str, len) => {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  };

  return (
    <div className="space-y-3" style={{ fontSize: '12px' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#3d59ab' }}>
            Weekly Menu Builder
          </h2>
          <span className="text-gray-500">
            {clientCards.length} client{clientCards.length !== 1 ? 's' : ''} • {weekMenus.length} meals
          </span>
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: STATUS_COLORS.scheduled.bg, color: STATUS_COLORS.scheduled.text }}>
            Scheduled: {clientCards.filter(c => getClientStatus(c.meals) === 'scheduled').length}
          </span>
          <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: STATUS_COLORS.confirmed.bg, color: STATUS_COLORS.confirmed.text }}>
            Confirmed: {clientCards.filter(c => getClientStatus(c.meals) === 'confirmed').length}
          </span>
        </div>
      </div>

      {/* No clients message */}
      {clientCards.length === 0 && (
        <div className="bg-white rounded border p-6 text-center text-gray-500">
          No clients scheduled for this week. Go to Schedule to add clients.
        </div>
      )}

      {/* Client cards - 2 column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {clientCards.map(({ clientId, client, meals }) => {
          const status = getClientStatus(meals);
          const statusStyle = STATUS_COLORS[status];
          const weeklyCost = getWeeklyCost(meals);
          const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 4;

          return (
            <div
              key={clientId}
              className="bg-white rounded border overflow-hidden"
              style={{ borderColor: status === 'confirmed' ? '#3d59ab' : '#d1d5db' }}
            >
              {/* Section 1: Client Header (logistics) */}
              <div
                className="px-2 py-1 flex items-center justify-between border-b"
                style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-semibold truncate" style={{ color: '#1f2937' }}>
                    {client.name}
                  </span>
                  {client.zone && (
                    <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 text-xs shrink-0">
                      {client.zone}
                    </span>
                  )}
                  {client.delivery_day || client.deliveryDay ? (
                    <span className="text-gray-500 shrink-0">
                      {(client.delivery_day || client.deliveryDay).slice(0, 3)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-500">
                    {client.persons}p/{client.portions || mealsPerWeek}port
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                  >
                    {statusStyle.label}
                  </span>
                </div>
              </div>

              {/* Contact info row */}
              <div
                className="px-2 py-0.5 text-gray-500 truncate border-b"
                style={{ backgroundColor: '#fafafa', borderColor: '#f3f4f6', fontSize: '11px' }}
              >
                {[
                  truncate(client.address, 30),
                  formatPhone(client.phone),
                  client.email
                ].filter(Boolean).join(' • ') || 'No contact info'}
              </div>

              {/* Section 2: Weekly Menu (meals table) */}
              <div className="px-2 py-1">
                <table className="w-full" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr className="text-gray-400 text-left">
                      <th className="w-8 font-normal">#</th>
                      <th className="font-normal">Protein</th>
                      <th className="font-normal">Veg</th>
                      <th className="font-normal">Starch</th>
                      <th className="w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: mealsPerWeek }).map((_, idx) => {
                      const meal = meals[idx];
                      const isEditing = editingClient === clientId && editingMealIdx === idx;
                      const isEmpty = meal && !meal.protein && !meal.veg && !meal.starch;

                      if (!meal) {
                        // No menu row for this meal slot
                        return (
                          <tr key={idx} className="text-gray-300">
                            <td className="py-0.5">M{idx + 1}</td>
                            <td colSpan={4} className="py-0.5 italic">Not scheduled</td>
                          </tr>
                        );
                      }

                      if (isEditing) {
                        // Inline edit mode
                        return (
                          <tr key={meal.id || idx} className="bg-blue-50">
                            <td className="py-0.5">M{idx + 1}</td>
                            <td className="py-0.5 pr-1">
                              <select
                                value={editForm.protein}
                                onChange={(e) => setEditForm(p => ({ ...p, protein: e.target.value }))}
                                className="w-full px-1 py-0.5 border rounded text-xs"
                              >
                                <option value="">—</option>
                                {getRecipeOptions('protein').map(r => (
                                  <option key={r.name} value={r.name}>{r.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-0.5 pr-1">
                              <select
                                value={editForm.veg}
                                onChange={(e) => setEditForm(p => ({ ...p, veg: e.target.value }))}
                                className="w-full px-1 py-0.5 border rounded text-xs"
                              >
                                <option value="">—</option>
                                {getRecipeOptions('veg').map(r => (
                                  <option key={r.name} value={r.name}>{r.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-0.5 pr-1">
                              <select
                                value={editForm.starch}
                                onChange={(e) => setEditForm(p => ({ ...p, starch: e.target.value }))}
                                className="w-full px-1 py-0.5 border rounded text-xs"
                              >
                                <option value="">—</option>
                                {getRecipeOptions('starch').map(r => (
                                  <option key={r.name} value={r.name}>{r.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-0.5">
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => saveMeal(meal.id)}
                                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                  title="Save"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // Display mode
                      return (
                        <tr
                          key={meal.id || idx}
                          className={isEmpty ? 'text-gray-400' : 'text-gray-700'}
                        >
                          <td className="py-0.5">M{idx + 1}</td>
                          <td className="py-0.5 truncate max-w-[100px]">
                            {truncate(meal.protein, 15) || '—'}
                          </td>
                          <td className="py-0.5 truncate max-w-[100px]">
                            {truncate(meal.veg, 15) || '—'}
                          </td>
                          <td className="py-0.5 truncate max-w-[100px]">
                            {truncate(meal.starch, 15) || '—'}
                          </td>
                          <td className="py-0.5">
                            {status !== 'confirmed' && (
                              <button
                                onClick={() => startEditing(clientId, idx, meal)}
                                className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit2 size={10} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Section 3: Status and Billing */}
              <div
                className="px-2 py-1 flex items-center justify-between border-t"
                style={{ backgroundColor: '#fafafa', borderColor: '#e5e7eb' }}
              >
                <button
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded border hover:bg-white"
                  style={{ borderColor: '#d1d5db', color: '#374151' }}
                  title="Open billing"
                >
                  <Receipt size={10} />
                  Billing
                </button>
                <div className="flex items-center gap-3">
                  {hasEmptyMeals(meals) && (
                    <span className="text-orange-500 text-xs">
                      {meals.filter(m => !m.protein && !m.veg && !m.starch).length} empty
                    </span>
                  )}
                  <span className="font-semibold" style={{ color: '#059669' }}>
                    ${weeklyCost.toFixed(0)}/wk
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
