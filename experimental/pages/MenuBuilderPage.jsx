/**
 * MenuBuilderPage - /test/menu/builder
 * Menu-first workflow: Build base weekly menu, then apply to clients
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import { Check, Edit2, X, ChevronDown, ChevronUp, Wand2, Save, Users } from 'lucide-react';

export default function MenuBuilderPage() {
  const {
    clients,
    recipes,
    selectedWeekId,
    scheduleMenus,
    getRecipeCost,
    // Base menu functions
    baseWeeklyMenus,
    clientMealAssignments,
    loadBaseMenuData,
    saveBaseMenus,
    saveMealAssignment,
    deleteMealAssignment,
    getClientAssignedMeals,
    applyBaseMenu,
    getDefaultMealAssignment,
    updateClientMeal
  } = useExperimentalContext();

  // Local state for editing base menus
  const [editingBase, setEditingBase] = useState(false);
  const [baseMenuForm, setBaseMenuForm] = useState([
    { protein: '', veg: '', starch: '', extras: [] },
    { protein: '', veg: '', starch: '', extras: [] },
    { protein: '', veg: '', starch: '', extras: [] },
    { protein: '', veg: '', starch: '', extras: [] }
  ]);

  // Local state for applying
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  // Sections expand/collapse
  const [showBaseMenu, setShowBaseMenu] = useState(true);
  const [showAssignments, setShowAssignments] = useState(true);
  const [showClientMenus, setShowClientMenus] = useState(true);

  // Client editing state
  const [editingClient, setEditingClient] = useState(null);
  const [editingMealIdx, setEditingMealIdx] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Load base menu data on mount and when week changes
  useEffect(() => {
    loadBaseMenuData(selectedWeekId);
  }, [selectedWeekId, loadBaseMenuData]);

  // Populate form when base menus load
  useEffect(() => {
    if (baseWeeklyMenus.length > 0) {
      const newForm = [1, 2, 3, 4].map(idx => {
        const meal = baseWeeklyMenus.find(m => m.meal_index === idx);
        return meal ? {
          protein: meal.protein || '',
          veg: meal.veg || '',
          starch: meal.starch || '',
          extras: meal.extras || []
        } : { protein: '', veg: '', starch: '', extras: [] };
      });
      setBaseMenuForm(newForm);
    }
  }, [baseWeeklyMenus]);

  // Get all menus for selected week
  const weekMenus = useMemo(() => {
    return scheduleMenus.filter(m => m.week_id === selectedWeekId);
  }, [scheduleMenus, selectedWeekId]);

  // Group menus by client
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

    // Sort meals by meal_index within each client
    Object.values(groups).forEach(g => {
      g.meals.sort((a, b) => (a.meal_index || 1) - (b.meal_index || 1));
    });

    // Sort clients alphabetically
    return Object.values(groups).sort((a, b) =>
      (a.client.name || '').localeCompare(b.client.name || '')
    );
  }, [weekMenus, clients]);

  // Active clients for assignment section
  const activeClients = useMemo(() => {
    return clients.filter(c => c.status === 'active').sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [clients]);

  // Check if base menu is defined
  const hasBaseMenu = baseWeeklyMenus.length > 0 && baseWeeklyMenus.some(m =>
    m.protein || m.veg || m.starch
  );

  // Get recipe options
  const getRecipeOptions = (category) => recipes[category] || [];

  // Handle save base menus
  const handleSaveBaseMenus = async () => {
    const result = await saveBaseMenus(baseMenuForm);
    if (result.success) {
      setEditingBase(false);
      alert('Base menus saved!');
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  };

  // Handle apply base menu
  const handleApplyBaseMenu = async () => {
    setApplying(true);
    setApplyResult(null);

    const result = await applyBaseMenu();
    setApplyResult(result);
    setApplying(false);

    if (result.success) {
      alert(`Applied base menu: ${result.created} menus created, ${result.skipped} clients skipped`);
    } else {
      alert(`Failed: ${result.error}`);
    }
  };

  // Handle assignment change
  const handleAssignmentChange = async (clientId, newAssignment) => {
    const client = clients.find(c => c.id === clientId);
    const mealsPerWeek = client?.meals_per_week || client?.mealsPerWeek || 3;
    const defaultAssignment = getDefaultMealAssignment(mealsPerWeek);

    // Check if it's the default
    const isDefault = JSON.stringify(newAssignment) === JSON.stringify(defaultAssignment);

    if (isDefault) {
      // Delete override (revert to default)
      await deleteMealAssignment(clientId);
    } else {
      // Save override
      await saveMealAssignment(clientId, newAssignment);
    }
  };

  // Client menu editing functions
  const startEditing = (clientId, mealIdx, meal) => {
    setEditingClient(clientId);
    setEditingMealIdx(mealIdx);
    setEditForm({
      protein: meal.protein || '',
      veg: meal.veg || '',
      starch: meal.starch || ''
    });
  };

  const cancelEditing = () => {
    setEditingClient(null);
    setEditingMealIdx(null);
    setEditForm({});
  };

  const saveMeal = async (menuId) => {
    const result = await updateClientMeal(menuId, {
      protein: editForm.protein || '',
      veg: editForm.veg || '',
      starch: editForm.starch || ''
    });

    if (!result.success) {
      alert(`Failed to save: ${result.error}`);
    }
    cancelEditing();
  };

  // Truncate text
  const truncate = (str, len) => {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  };

  return (
    <div className="space-y-4" style={{ fontSize: '12px' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#3d59ab' }}>
            Weekly Menu Builder
          </h2>
          <span className="text-gray-500">
            {selectedWeekId} • {clientCards.length} client{clientCards.length !== 1 ? 's' : ''} with menus
          </span>
        </div>
      </div>

      {/* Section 1: Base Weekly Menu */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <button
          onClick={() => setShowBaseMenu(!showBaseMenu)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: '#3d59ab' }}>Base Weekly Menu</span>
            {hasBaseMenu && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Defined</span>
            )}
          </div>
          {showBaseMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showBaseMenu && (
          <div className="p-4">
            <p className="text-gray-500 text-sm mb-4">
              Define 4 base meals for this week. Clients will inherit from these based on their meal plan.
            </p>

            {/* Base menu table */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-gray-500 text-left border-b">
                  <th className="py-2 w-16">Meal</th>
                  <th className="py-2">Protein</th>
                  <th className="py-2">Veg</th>
                  <th className="py-2">Starch</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map(idx => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 font-medium">Meal {idx + 1}</td>
                    <td className="py-2 pr-2">
                      {editingBase ? (
                        <select
                          value={baseMenuForm[idx].protein}
                          onChange={(e) => {
                            const newForm = [...baseMenuForm];
                            newForm[idx] = { ...newForm[idx], protein: e.target.value };
                            setBaseMenuForm(newForm);
                          }}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="">—</option>
                          {getRecipeOptions('protein').map(r => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={baseMenuForm[idx].protein ? 'text-gray-800' : 'text-gray-400'}>
                          {baseMenuForm[idx].protein || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {editingBase ? (
                        <select
                          value={baseMenuForm[idx].veg}
                          onChange={(e) => {
                            const newForm = [...baseMenuForm];
                            newForm[idx] = { ...newForm[idx], veg: e.target.value };
                            setBaseMenuForm(newForm);
                          }}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="">—</option>
                          {getRecipeOptions('veg').map(r => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={baseMenuForm[idx].veg ? 'text-gray-800' : 'text-gray-400'}>
                          {baseMenuForm[idx].veg || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      {editingBase ? (
                        <select
                          value={baseMenuForm[idx].starch}
                          onChange={(e) => {
                            const newForm = [...baseMenuForm];
                            newForm[idx] = { ...newForm[idx], starch: e.target.value };
                            setBaseMenuForm(newForm);
                          }}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="">—</option>
                          {getRecipeOptions('starch').map(r => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={baseMenuForm[idx].starch ? 'text-gray-800' : 'text-gray-400'}>
                          {baseMenuForm[idx].starch || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {editingBase ? (
                <>
                  <button
                    onClick={handleSaveBaseMenus}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Save size={14} />
                    Save Base Menu
                  </button>
                  <button
                    onClick={() => setEditingBase(false)}
                    className="px-3 py-1.5 text-gray-600 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingBase(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                  >
                    <Edit2 size={14} />
                    Edit Base Menu
                  </button>
                  <button
                    onClick={handleApplyBaseMenu}
                    disabled={!hasBaseMenu || applying}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded ${
                      hasBaseMenu && !applying
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Wand2 size={14} />
                    {applying ? 'Applying...' : 'Apply to Clients'}
                  </button>
                </>
              )}
            </div>

            {applyResult && (
              <div className={`mt-3 p-2 rounded text-sm ${
                applyResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {applyResult.success
                  ? `Created ${applyResult.created} menus, skipped ${applyResult.skipped} clients`
                  : applyResult.error
                }
                {applyResult.errors?.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc">
                    {applyResult.errors.map((e, i) => (
                      <li key={i}>{e.client}: {e.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Client Meal Assignments */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAssignments(!showAssignments)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: '#3d59ab' }} />
            <span className="font-semibold" style={{ color: '#3d59ab' }}>Client Meal Assignments</span>
            {clientMealAssignments.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                {clientMealAssignments.length} override{clientMealAssignments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {showAssignments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAssignments && (
          <div className="p-4">
            <p className="text-gray-500 text-sm mb-4">
              By default, clients get sequential meals starting from Meal 1. Override here to assign different meals.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {activeClients.slice(0, 12).map(client => {
                const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 3;
                const assignedMeals = getClientAssignedMeals(client.id, mealsPerWeek);
                const defaultMeals = getDefaultMealAssignment(mealsPerWeek);
                const isOverride = JSON.stringify(assignedMeals) !== JSON.stringify(defaultMeals);

                return (
                  <div
                    key={client.id}
                    className={`p-2 rounded border ${isOverride ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{client.name}</span>
                      <span className="text-xs text-gray-500">{mealsPerWeek} meals</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Gets:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(mealNum => {
                          const isAssigned = assignedMeals.includes(mealNum);
                          return (
                            <button
                              key={mealNum}
                              onClick={() => {
                                let newAssignment;
                                if (isAssigned) {
                                  // Remove if more than minimum
                                  if (assignedMeals.length > 1) {
                                    newAssignment = assignedMeals.filter(m => m !== mealNum);
                                  } else {
                                    return; // Can't have 0 meals
                                  }
                                } else {
                                  // Add (up to 4)
                                  if (assignedMeals.length < 4) {
                                    newAssignment = [...assignedMeals, mealNum].sort((a, b) => a - b);
                                  } else {
                                    return;
                                  }
                                }
                                handleAssignmentChange(client.id, newAssignment);
                              }}
                              className={`w-6 h-6 rounded text-xs font-medium ${
                                isAssigned
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {mealNum}
                            </button>
                          );
                        })}
                      </div>
                      {isOverride && (
                        <button
                          onClick={() => deleteMealAssignment(client.id)}
                          className="ml-1 text-xs text-gray-400 hover:text-red-500"
                          title="Reset to default"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {activeClients.length > 12 && (
              <p className="text-gray-400 text-xs mt-2">
                Showing first 12 clients. {activeClients.length - 12} more not shown.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Client Menus (existing cards) */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <button
          onClick={() => setShowClientMenus(!showClientMenus)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: '#3d59ab' }}>Client Menus</span>
            <span className="text-gray-500 text-sm">
              {clientCards.length} client{clientCards.length !== 1 ? 's' : ''}
            </span>
          </div>
          {showClientMenus ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showClientMenus && (
          <div className="p-4">
            {clientCards.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No client menus yet. Use "Apply to Clients" after defining the base menu.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {clientCards.map(({ clientId, client, meals }) => {
                  const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 4;
                  const allComplete = meals.every(m => m.protein && m.veg && m.starch);

                  return (
                    <div
                      key={clientId}
                      className="border rounded overflow-hidden"
                      style={{ borderColor: allComplete ? '#3d59ab' : '#d1d5db' }}
                    >
                      {/* Client header */}
                      <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{client.name}</span>
                          {client.zone && (
                            <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                              {client.zone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">
                            {mealsPerWeek} × {client.portions || 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            allComplete ? 'bg-blue-600 text-white' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {allComplete ? 'Complete' : 'Incomplete'}
                          </span>
                        </div>
                      </div>

                      {/* Meals table */}
                      <div className="px-3 py-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400 text-left">
                              <th className="w-12 font-normal">#</th>
                              <th className="font-normal">Protein</th>
                              <th className="font-normal">Veg</th>
                              <th className="font-normal">Starch</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {meals.map((meal, idx) => {
                              const isEditing = editingClient === clientId && editingMealIdx === idx;
                              const isEmpty = !meal.protein && !meal.veg && !meal.starch;
                              const baseMealLabel = meal.base_meal_index
                                ? `(B${meal.base_meal_index})`
                                : '';

                              if (isEditing) {
                                return (
                                  <tr key={meal.id || idx} className="bg-blue-50">
                                    <td className="py-1">M{meal.meal_index || idx + 1}</td>
                                    <td className="py-1 pr-1">
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
                                    <td className="py-1 pr-1">
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
                                    <td className="py-1 pr-1">
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
                                    <td className="py-1">
                                      <div className="flex gap-0.5">
                                        <button
                                          onClick={() => saveMeal(meal.id)}
                                          className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                        >
                                          <Check size={12} />
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr
                                  key={meal.id || idx}
                                  className={isEmpty ? 'text-gray-400' : 'text-gray-700'}
                                >
                                  <td className="py-1">
                                    M{meal.meal_index || idx + 1}
                                    {baseMealLabel && (
                                      <span className="text-xs text-blue-500 ml-1">{baseMealLabel}</span>
                                    )}
                                  </td>
                                  <td className="py-1 truncate max-w-[100px]">
                                    {truncate(meal.protein, 15)}
                                  </td>
                                  <td className="py-1 truncate max-w-[100px]">
                                    {truncate(meal.veg, 15)}
                                  </td>
                                  <td className="py-1 truncate max-w-[100px]">
                                    {truncate(meal.starch, 15)}
                                  </td>
                                  <td className="py-1">
                                    <button
                                      onClick={() => startEditing(clientId, idx, meal)}
                                      className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
