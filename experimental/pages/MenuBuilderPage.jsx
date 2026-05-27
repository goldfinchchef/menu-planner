/**
 * MenuBuilderPage - /test/menu/builder
 * Menu-first workflow: Build base weekly menu, then apply to clients
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import { Check, Edit2, X, ChevronDown, ChevronUp, Wand2, Save, Users, Loader2, Trash2, AlertCircle, Plus } from 'lucide-react';

// Compact multi-select dropdown for extras
function ExtrasDropdown({ options, selected, onChange, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleExtra = (name) => {
    if (selected.includes(name)) {
      onChange(selected.filter(e => e !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  if (options.length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${
          selected.length > 0
            ? 'bg-purple-50 border-purple-300 text-purple-700'
            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
        }`}
      >
        {selected.length > 0 ? (
          <span className="truncate max-w-[120px]">
            {compact ? `+${selected.length}` : selected.join(', ')}
          </span>
        ) : (
          <>
            <Plus size={12} />
            <span>Extras</span>
          </>
        )}
        <ChevronDown size={12} className={isOpen ? 'rotate-180' : ''} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] max-h-48 overflow-y-auto">
          {options.map((recipe, i) => {
            const isSelected = selected.includes(recipe.name);
            return (
              <label
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleExtra(recipe.name)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className={isSelected ? 'text-purple-700 font-medium' : 'text-gray-700'}>
                  {recipe.name}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    loadScheduleData,
    saveBaseMenus,
    saveMealAssignment,
    deleteMealAssignment,
    getClientAssignedMeals,
    applyBaseMenu,
    getDefaultMealAssignment,
    updateClientMeal,
    confirmClientMenus,
    clearWeekMenus,
    removeClientFromWeek,
    scheduledClientIds
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

  // Confirming state (tracks which client is being confirmed)
  const [confirmingClient, setConfirmingClient] = useState(null);

  // Clear week state
  const [clearing, setClearing] = useState(false);
  const [showNoDateClients, setShowNoDateClients] = useState(false);

  // Removing client from week state
  const [removingClient, setRemovingClient] = useState(null);

  // Load base menu data AND schedule menus on mount and when week changes
  useEffect(() => {
    loadBaseMenuData(selectedWeekId);
    loadScheduleData([selectedWeekId]);
  }, [selectedWeekId, loadBaseMenuData, loadScheduleData]);

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

  // Get extras options (sauces, breakfast, soups - matching production MenuTab)
  const extraCategories = useMemo(() => {
    return [
      ...(recipes.sauces || []),
      ...(recipes.breakfast || []),
      ...(recipes.soups || [])
    ];
  }, [recipes]);

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

    // Don't show alert - the inline result display is clearer
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
      starch: meal.starch || '',
      extras: meal.extras || []
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
      starch: editForm.starch || '',
      extras: editForm.extras || []
    });

    if (!result.success) {
      alert(`Failed to save: ${result.error}`);
    }
    cancelEditing();
  };

  // Handle confirm menu for a client
  const handleConfirmMenu = async (clientId) => {
    setConfirmingClient(clientId);
    try {
      const result = await confirmClientMenus(clientId, selectedWeekId);
      if (!result.success) {
        alert(`Failed to confirm: ${result.error}`);
      }
    } finally {
      setConfirmingClient(null);
    }
  };

  // Handle clear week menus (Reset Week)
  const handleClearWeek = async () => {
    const confirmed = window.confirm(
      `This will delete all client menu rows for week ${selectedWeekId}.\n\n` +
      `• Base Weekly Menu will remain intact\n` +
      `• Client Meal Assignments will remain intact\n` +
      `• ${clientCards.length} client menu(s) will be deleted\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setClearing(true);
    try {
      const result = await clearWeekMenus(selectedWeekId);
      if (result.success) {
        setApplyResult(null); // Clear any previous apply result
        alert(`Cleared ${result.deleted} menu rows for ${selectedWeekId}`);
      } else {
        alert(`Failed to clear: ${result.error}`);
      }
    } finally {
      setClearing(false);
    }
  };

  // Handle remove single client from week
  const handleRemoveClientFromWeek = async (clientId, clientName) => {
    const confirmed = window.confirm(
      `Remove ${clientName}'s menus from ${selectedWeekId}?\n\n` +
      `This will delete their menu rows for this week only.\n` +
      `Other weeks and base menus are not affected.`
    );

    if (!confirmed) return;

    setRemovingClient(clientId);
    try {
      const result = await removeClientFromWeek(clientId, selectedWeekId);
      if (!result.success) {
        alert(`Failed to remove: ${result.error}`);
      }
    } finally {
      setRemovingClient(null);
    }
  };

  // Get list of unscheduled client names for display
  const unscheduledClients = useMemo(() => {
    return clients
      .filter(c => c.status === 'active' && !scheduledClientIds.has(c.id))
      .map(c => c.name)
      .sort();
  }, [clients, scheduledClientIds]);

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
        <button
          onClick={handleClearWeek}
          disabled={clearing || clientCards.length === 0}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded border ${
            clearing || clientCards.length === 0
              ? 'text-gray-400 border-gray-300 cursor-not-allowed'
              : 'text-red-600 border-red-300 hover:bg-red-50'
          }`}
        >
          {clearing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          Reset Week
        </button>
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
                  <th className="py-2">Extras</th>
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
                    <td className="py-2">
                      {editingBase ? (
                        <ExtrasDropdown
                          options={extraCategories}
                          selected={baseMenuForm[idx].extras || []}
                          onChange={(newExtras) => {
                            const newForm = [...baseMenuForm];
                            newForm[idx] = { ...newForm[idx], extras: newExtras };
                            setBaseMenuForm(newForm);
                          }}
                        />
                      ) : (
                        <span className={(baseMenuForm[idx].extras || []).length > 0 ? 'text-purple-600 text-sm' : 'text-gray-400'}>
                          {(baseMenuForm[idx].extras || []).length > 0
                            ? `+${baseMenuForm[idx].extras.join(', +')}`
                            : '—'}
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
              <div className={`mt-3 p-3 rounded text-sm ${
                applyResult.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 text-red-700'
              }`}>
                {applyResult.success ? (
                  <div className="space-y-2">
                    {/* Regenerated clients */}
                    {applyResult.regenerated > 0 && (
                      <div className="flex items-center gap-2 text-green-700">
                        <span className="font-medium">
                          ✓ Regenerated {applyResult.regenerated} client{applyResult.regenerated !== 1 ? 's' : ''}
                        </span>
                        <span className="text-gray-500 text-xs">
                          ({applyResult.deleted} deleted, {applyResult.created} created)
                        </span>
                      </div>
                    )}

                    {/* Skipped - no confirmed date */}
                    {applyResult.skippedNoDate > 0 && (
                      <div className="text-amber-600">
                        <span className="font-medium">
                          ○ {applyResult.skippedNoDate} skipped (not scheduled)
                        </span>
                        <span className="ml-1 text-amber-500 text-xs">
                          — see grayed-out clients in Assignments section
                        </span>
                      </div>
                    )}

                    {/* Message if no clients eligible */}
                    {applyResult.regenerated === 0 && applyResult.message && (
                      <div className="text-gray-600 italic">{applyResult.message}</div>
                    )}

                    {/* Errors */}
                    {applyResult.errors?.length > 0 && (
                      <div className="text-red-600">
                        <span className="font-medium">Errors:</span>
                        <ul className="mt-1 ml-4 list-disc">
                          {applyResult.errors.map((e, i) => (
                            <li key={i}>{e.client}: {e.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <span>{applyResult.error}</span>
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
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {scheduledClientIds.size}/{activeClients.length} scheduled
            </span>
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

            {/* Unscheduled clients warning */}
            {unscheduledClients.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                <button
                  onClick={() => setShowNoDateClients(!showNoDateClients)}
                  className="flex items-center gap-2 text-amber-700 text-sm font-medium w-full"
                >
                  <AlertCircle size={14} />
                  <span>{unscheduledClients.length} client{unscheduledClients.length !== 1 ? 's' : ''} not scheduled for this week</span>
                  {showNoDateClients ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
                </button>
                {showNoDateClients && (
                  <div className="mt-2 text-sm text-amber-600 pl-6">
                    {unscheduledClients.map((name, i) => (
                      <div key={i}>• {name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {activeClients.slice(0, 12).map(client => {
                const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 3;
                const assignedMeals = getClientAssignedMeals(client.id, mealsPerWeek);
                const defaultMeals = getDefaultMealAssignment(mealsPerWeek);
                const isOverride = JSON.stringify(assignedMeals) !== JSON.stringify(defaultMeals);
                const isScheduled = scheduledClientIds.has(client.id);

                return (
                  <div
                    key={client.id}
                    className={`p-2 rounded border ${
                      !isScheduled
                        ? 'border-gray-200 bg-gray-100 opacity-50'
                        : isOverride
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium text-sm truncate ${!isScheduled ? 'text-gray-400' : ''}`}>
                        {client.name}
                      </span>
                      {!isScheduled ? (
                        <span className="text-xs text-gray-400 italic">Not Scheduled</span>
                      ) : (
                        <span className="text-xs text-gray-500">{mealsPerWeek} meals</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 ${!isScheduled ? 'pointer-events-none' : ''}`}>
                      <span className="text-xs text-gray-500">Gets:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(mealNum => {
                          const isAssigned = assignedMeals.includes(mealNum);
                          return (
                            <button
                              key={mealNum}
                              disabled={!isScheduled}
                              onClick={() => {
                                if (!isScheduled) return;
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
                                !isScheduled
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : isAssigned
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {mealNum}
                            </button>
                          );
                        })}
                      </div>
                      {isOverride && isScheduled && (
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
                  const allApproved = meals.every(m => m.approved);
                  const isConfirming = confirmingClient === clientId;
                  const isRemoving = removingClient === clientId;

                  // Check for warning states
                  const isPaused = client.status === 'paused';
                  const hasNoDate = !scheduledClientIds.has(clientId);
                  const hasWarning = isPaused || hasNoDate;

                  // Determine border color based on state
                  const getBorderColor = () => {
                    if (hasWarning) return '#ef4444'; // red
                    if (allApproved) return '#22c55e'; // green
                    if (allComplete) return '#3d59ab'; // blue
                    return '#d1d5db'; // gray
                  };

                  return (
                    <div
                      key={clientId}
                      className={`border-2 rounded overflow-hidden ${hasWarning ? 'bg-red-50' : ''}`}
                      style={{ borderColor: getBorderColor() }}
                    >
                      {/* Warning banner for paused/no-date clients */}
                      {hasWarning && (
                        <div className="px-3 py-1.5 bg-red-100 border-b border-red-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-red-600" />
                            <span className="text-xs font-medium text-red-700">
                              {isPaused ? 'Client Paused' : 'No Confirmed Date'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveClientFromWeek(clientId, client.name)}
                            disabled={isRemoving}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {isRemoving ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Trash2 size={10} />
                            )}
                            Remove From Week
                          </button>
                        </div>
                      )}

                      {/* Client header */}
                      <div className={`px-3 py-2 border-b flex items-center justify-between ${hasWarning ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${hasWarning ? 'text-red-800' : ''}`}>{client.name}</span>
                          {client.zone && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${hasWarning ? 'bg-red-200 text-red-700' : 'bg-gray-200'}`}>
                              {client.zone}
                            </span>
                          )}
                          {isPaused && (
                            <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs font-medium">
                              Paused
                            </span>
                          )}
                          {!isPaused && hasNoDate && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-xs font-medium">
                              No Date
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">
                            {mealsPerWeek} × {client.portions || 1}
                          </span>
                          {!hasWarning && allApproved ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-600 text-white">
                              Confirmed
                            </span>
                          ) : !hasWarning && allComplete ? (
                            <button
                              onClick={() => handleConfirmMenu(clientId)}
                              disabled={isConfirming}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {isConfirming ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Check size={10} />
                              )}
                              Confirm
                            </button>
                          ) : !hasWarning ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                              Incomplete
                            </span>
                          ) : null}
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
                              <th className="font-normal">Extras</th>
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
                                    <td className="py-1 pr-1">
                                      <ExtrasDropdown
                                        options={extraCategories}
                                        selected={editForm.extras || []}
                                        onChange={(newExtras) => setEditForm(p => ({ ...p, extras: newExtras }))}
                                        compact
                                      />
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
                                  <td className="py-1 truncate max-w-[100px]">
                                    {(meal.extras || []).length > 0 ? (
                                      <span className="text-purple-600 text-xs">
                                        +{meal.extras.length}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
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
