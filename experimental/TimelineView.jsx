import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';

// Retro palette colors
const COLORS = {
  deepBlue: '#3d59ab',
  goldenYellow: '#ffd700',
  warmTan: '#ebb582',
  cream: '#f9f9ed',
  darkBrown: '#423d3c',
  green: '#22c55e'
};

// Status colors - four display states
// Architecture:
//   empty = no data in menus or client_week_status (default)
//   unconfirmed = client_week_status.status = 'unconfirmed' (planning intent)
//   confirmed = menus row exists (date picked & paid)
//   skipped = client_week_status.status = 'skipped' (explicit opt-out)
const STATUS_COLORS = {
  empty: {
    bg: '#fef7ed',           // warm tan
    text: '#9ca3af',         // muted grey
    border: '1px dashed #d1d5db',
    label: ''
  },
  unconfirmed: {
    bg: '#ecfdf5',           // soft green
    text: '#059669',         // green text
    border: '1px solid #10b981',
    label: 'unconfirmed'
  },
  confirmed: {
    bg: '#3d59ab',           // deep navy
    text: '#ffffff',         // white text
    border: 'none',
    label: 'confirmed'
  },
  skipped: {
    bg: '#f9fafb',           // very light grey
    text: '#9ca3af',         // muted text
    border: 'none',
    label: 'skipped'
  }
};

// Get Monday of the week containing the given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Format date as "Mar 9" (week start only)
function formatWeekLabel(date) {
  const start = getWeekStart(date);
  const month = start.toLocaleDateString('en-US', { month: 'short' });
  const day = start.getDate();
  return `${month} ${day}`;
}

// Get ISO week ID from date (e.g., "2026-W12")
function getWeekId(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Get date string from date (YYYY-MM-DD)
function getDateString(date) {
  return date.toISOString().split('T')[0];
}

// Get week start date from weekId (e.g., "2026-W12" -> Date)
function getWeekStartFromWeekId(weekId) {
  const [yearStr, weekPart] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekPart, 10);

  // January 4th is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const jan4WeekStart = getWeekStart(jan4);

  // Add (weekNum - 1) weeks to get target week
  const result = new Date(jan4WeekStart);
  result.setDate(result.getDate() + (weekNum - 1) * 7);
  return result;
}

// Generate array of weeks centered around selectedWeekId
// Returns newest → oldest (for left-to-right rendering)
// Selected week appears at position 3 (center-left of 8)
function getWeeksAroundWeekId(selectedWeekId, count) {
  const weeks = [];
  const selectedWeekStart = getWeekStartFromWeekId(selectedWeekId);

  // Also track current week (today) for secondary highlight
  const today = new Date();
  const currentWeekId = getWeekId(today);

  // Position selected week at index 3: show 3 future + selected + 4 past
  const futureWeeks = Math.floor(count / 2) - 1; // = 3 for count=8

  for (let i = 0; i < count; i++) {
    const weekStart = new Date(selectedWeekStart);
    const weekIndex = futureWeeks - i; // +3, +2, +1, 0, -1, -2, -3, -4
    weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
    const weekId = getWeekId(weekStart);

    weeks.push({
      weekId,
      dateKey: getDateString(weekStart),
      label: formatWeekLabel(weekStart),
      start: new Date(weekStart),
      isSelectedWeek: weekId === selectedWeekId,
      isCurrentWeek: weekId === currentWeekId
    });
  }

  return weeks;
}

// Issue types for structured issues array
const ISSUE_TYPES = {
  INCOMPLETE: 'incomplete',
  BILLING: 'billing'
};

// Generate specific issues for a client/week
// Returns array of { type, message } objects
// Issues only appear when:
//   - status = 'confirmed' (menu rows exist)
//   - AND some meal is incomplete (missing protein/veg/starch)
// No issues for: empty, unconfirmed, skipped
function getIssuesForClientWeek(clientWeekMeals, mealsPerWeek, status) {
  // Only check 'confirmed' status (menu rows exist, may be incomplete)
  if (status !== 'confirmed') return [];

  const issues = [];

  // Check individual meal slots for missing components
  for (let i = 0; i < mealsPerWeek; i++) {
    const meal = clientWeekMeals[i];
    const mealNum = i + 1;

    if (!meal) {
      // Meal slot missing entirely
      issues.push({ type: ISSUE_TYPES.INCOMPLETE, message: `Meal ${mealNum} not planned` });
      continue;
    }

    // Check for missing components
    if (!meal.protein) issues.push({ type: ISSUE_TYPES.INCOMPLETE, message: `Meal ${mealNum} protein missing` });
    if (!meal.veg) issues.push({ type: ISSUE_TYPES.INCOMPLETE, message: `Meal ${mealNum} veg missing` });
    if (!meal.starch) issues.push({ type: ISSUE_TYPES.INCOMPLETE, message: `Meal ${mealNum} starch missing` });
  }

  // Future: billing cycle missing, invoice due date missing

  return issues;
}

// Get alert stripe color based on issues (priority: incomplete > billing)
// Only shows for 'confirmed' status with incomplete meals
function getAlertStripeColor(issues, status) {
  // Only show stripes for 'confirmed' with issues
  if (status !== 'confirmed') return null;
  if (issues.length === 0) return null;

  const hasIncomplete = issues.some(i => i.type === ISSUE_TYPES.INCOMPLETE);
  const hasBilling = issues.some(i => i.type === ISSUE_TYPES.BILLING);

  if (hasIncomplete) return '#f97316'; // orange
  if (hasBilling) return '#a855f7';    // purple

  return null;
}

// Truncate text helper
function truncate(str, len) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// Format phone helper
function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Compact Schedule Modal - matches MenuBuilderPage card style
function ScheduleModal({
  isOpen,
  onClose,
  client,
  week,
  cellState,
  clientWeekMeals,
  issues,
  onTransitionToConfirmed,
  onTransitionToPlanning,
  onTransitionToEmpty
}) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null); // { targetStatus, hasContent }
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setStatusDropdownOpen(false);
      }
    };
    if (statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showConfirmDialog) {
          setShowConfirmDialog(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirmDialog, onClose]);

  if (!isOpen || !client || !week) return null;

  // Status from cell state: empty, unconfirmed, confirmed, skipped
  const status = cellState?.status || 'empty';
  const hasMenuRow = cellState?.hasRow === true;
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.empty;
  const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 3;
  const portions = client.portions || 4;
  const modalIssues = issues || [];

  // Check if confirmed week has meal content
  const hasContent = clientWeekMeals.some(m => m?.protein || m?.veg || m?.starch);
  const mealCount = clientWeekMeals.length;

  // Handle status transitions
  const handleStatusChange = async (newStatus) => {
    if (newStatus === status) {
      setStatusDropdownOpen(false);
      return;
    }

    // Changing FROM confirmed requires confirmation
    if (status === 'confirmed') {
      setShowConfirmDialog({ targetStatus: newStatus, hasContent });
      setStatusDropdownOpen(false);
      return;
    }

    // Other transitions proceed directly
    await executeTransition(newStatus);
  };

  const executeTransition = async (newStatus) => {
    setStatusUpdating(true);
    setStatusDropdownOpen(false);
    try {
      if (newStatus === 'confirmed') {
        await onTransitionToConfirmed(client, week.weekId, week.dateKey);
      } else if (newStatus === 'empty') {
        await onTransitionToEmpty(client.id, week.weekId);
      } else {
        // unconfirmed or skipped
        await onTransitionToPlanning(client.id, week.weekId, newStatus);
      }
      onClose();
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmDialogConfirm = async () => {
    const targetStatus = showConfirmDialog.targetStatus;
    setShowConfirmDialog(null);
    await executeTransition(targetStatus);
  };

  const handleConfirmDialogCancel = () => {
    setShowConfirmDialog(null);
  };

  // Build meal summary for confirmation dialog
  const getMealSummary = () => {
    const proteins = clientWeekMeals.filter(m => m?.protein).map(m => m.protein);
    return {
      mealCount,
      proteins: proteins.slice(0, 3).join(', ') + (proteins.length > 3 ? '...' : ''),
      totalPortions: clientWeekMeals.reduce((sum, m) => sum + (m?.portions || 0), 0)
    };
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (showConfirmDialog) {
        setShowConfirmDialog(null);
      } else {
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleBackdropClick}
    >
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-4"
          style={{ fontSize: '12px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠</span>
            <span className="font-semibold" style={{ color: COLORS.darkBrown }}>
              Remove Confirmed Menu?
            </span>
          </div>
          {showConfirmDialog.hasContent ? (
            <div className="mb-4 text-gray-600">
              <p className="mb-2">This week has menu content that will be deleted:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>{getMealSummary().mealCount} meal(s) planned</li>
                {getMealSummary().proteins && <li>Protein: {getMealSummary().proteins}</li>}
                <li>Total portions: {getMealSummary().totalPortions}</li>
              </ul>
              <p className="mt-2 text-red-600 text-xs">This action cannot be undone.</p>
            </div>
          ) : (
            <div className="mb-4 text-gray-600">
              <p>This will remove the confirmed status.</p>
              <p className="text-sm text-gray-500">No meal content has been added yet.</p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleConfirmDialogCancel}
              className="px-3 py-1.5 text-xs rounded border hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDialogConfirm}
              className="px-3 py-1.5 text-xs rounded text-white"
              style={{ backgroundColor: showConfirmDialog.hasContent ? '#dc2626' : COLORS.deepBlue }}
            >
              {showConfirmDialog.targetStatus === 'empty'
                ? 'Remove Menu & Clear Week'
                : `Remove Menu & Mark ${showConfirmDialog.targetStatus.charAt(0).toUpperCase() + showConfirmDialog.targetStatus.slice(1)}`}
            </button>
          </div>
        </div>
      )}

      {/* Main Modal */}
      {!showConfirmDialog && (
        <div
          className="bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-auto"
          style={{ fontSize: '12px', maxWidth: '800px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - compact with actions */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-semibold truncate" style={{ color: COLORS.darkBrown }}>
                {client.name}
              </span>
              <span className="text-gray-500 shrink-0">{week.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Status dropdown - always show */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  disabled={statusUpdating}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                >
                  {statusUpdating ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <>
                      {statusStyle.label}
                      <ChevronDown size={10} />
                    </>
                  )}
                </button>
                {statusDropdownOpen && (
                  <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10" style={{ minWidth: '110px' }}>
                    <button
                      onClick={() => handleStatusChange('empty')}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 ${status === 'empty' ? 'font-medium bg-gray-50' : ''}`}
                      style={{ color: STATUS_COLORS.empty.text }}
                    >
                      Empty
                    </button>
                    <button
                      onClick={() => handleStatusChange('unconfirmed')}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 ${status === 'unconfirmed' ? 'font-medium bg-gray-50' : ''}`}
                      style={{ color: STATUS_COLORS.unconfirmed.text }}
                    >
                      Unconfirmed
                    </button>
                    <button
                      onClick={() => handleStatusChange('confirmed')}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 ${status === 'confirmed' ? 'font-medium bg-gray-50' : ''}`}
                      style={{ color: COLORS.deepBlue }}
                    >
                      Confirmed
                    </button>
                    <button
                      onClick={() => handleStatusChange('skipped')}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 ${status === 'skipped' ? 'font-medium bg-gray-50' : ''}`}
                      style={{ color: '#6b7280' }}
                    >
                      Skipped
                    </button>
                  </div>
                )}
              </div>
              {/* Billing - disabled until wired */}
              <span
                className="px-1.5 py-0.5 text-xs rounded opacity-40 cursor-not-allowed"
                style={{ color: '#9ca3af' }}
                title="Billing"
              >
                $
              </span>
              {/* Close */}
              <button
                onClick={onClose}
                className="p-0.5 hover:bg-gray-200 rounded"
                style={{ color: COLORS.darkBrown }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Alert line - show first issue if any */}
          {modalIssues.length > 0 && (
            <div
              className="px-3 py-1 text-xs flex items-center gap-1"
              style={{ backgroundColor: '#fef9c3', borderBottom: '1px solid #fde047', color: '#854d0e' }}
            >
              <span>⚠</span>
              <span>{modalIssues[0].message}</span>
            </div>
          )}

          {/* Logistics rows */}
          <div style={{ fontSize: '11px', backgroundColor: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
            <div className="px-3 py-0.5 text-gray-500 truncate">
              {[
                truncate(client.address, 35),
                formatPhone(client.phone),
                client.email
              ].filter(Boolean).join(' • ') || 'No contact info'}
            </div>
            <div className="px-3 py-0.5 text-gray-500 truncate">
              {[
                client.zone && `Zone ${client.zone}`,
                (client.delivery_day || client.deliveryDay),
                `${mealsPerWeek} x ${portions}`,
                client.frequency || 'Weekly'
              ].filter(Boolean).join(' • ')}
            </div>
          </div>

          {/* Weekly Menu table - only show for confirmed status */}
          {status === 'confirmed' ? (
            <div className="px-3 py-2">
              <table className="w-full" style={{ fontSize: '11px' }}>
                <thead>
                  <tr className="text-gray-400 text-left">
                    <th className="w-8 font-normal py-0.5">#</th>
                    <th className="font-normal py-0.5">Protein</th>
                    <th className="font-normal py-0.5">Veg</th>
                    <th className="font-normal py-0.5">Starch</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: mealsPerWeek }).map((_, idx) => {
                    const meal = clientWeekMeals[idx];
                    const isEmpty = meal && !meal.protein && !meal.veg && !meal.starch;

                    if (!meal) {
                      return (
                        <tr key={idx} className="text-gray-300">
                          <td className="py-0.5">M{idx + 1}</td>
                          <td colSpan={3} className="py-0.5 italic">Not planned</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={meal.id || idx} className={isEmpty ? 'text-gray-400' : 'text-gray-700'}>
                        <td className="py-0.5">M{idx + 1}</td>
                        <td className="py-0.5 truncate max-w-[80px]">{truncate(meal.protein, 12)}</td>
                        <td className="py-0.5 truncate max-w-[80px]">{truncate(meal.veg, 12)}</td>
                        <td className="py-0.5 truncate max-w-[80px]">{truncate(meal.starch, 12)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-gray-400 text-xs italic">
              {status === 'empty' && 'No planning data for this week'}
              {status === 'unconfirmed' && 'Week marked as unconfirmed (planning)'}
              {status === 'skipped' && 'Week marked as skipped'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const VISIBLE_WEEKS = 8;

export default function TimelineView({
  clients,
  scheduleMenus,
  scheduleMenusLoading,
  loadScheduleData,
  transitionToConfirmed,
  transitionToPlanning,
  transitionToEmpty,
  getScheduleCellState,
  selectedWeekId
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Generate 8-week window centered around selectedWeekId
  const weeks = useMemo(() => getWeeksAroundWeekId(selectedWeekId, VISIBLE_WEEKS), [selectedWeekId]);
  const weekIds = useMemo(() => weeks.map(w => w.weekId), [weeks]);

  // All active clients - always show as rows
  const activeClients = useMemo(() =>
    clients.filter(c => c.status === 'Active' || c.status === 'active'),
    [clients]
  );

  // Load schedule data (menus + client_week_status) when visible weeks change
  useEffect(() => {
    if (loadScheduleData && weekIds.length > 0) {
      loadScheduleData(weekIds);
    }
  }, [weekIds, loadScheduleData]);

  // Get all meals for a client + week (for modal)
  const getClientWeekMeals = (clientId, weekId) => {
    return scheduleMenus
      .filter(m => m.client_id === clientId && m.week_id === weekId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  };

  const openModal = (client, week) => {
    const cellState = getScheduleCellState(client.id, week.weekId);
    const clientWeekMeals = getClientWeekMeals(client.id, week.weekId);
    const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 3;
    const status = cellState?.status || 'empty';
    const issues = getIssuesForClientWeek(clientWeekMeals, mealsPerWeek, status);
    setSelectedCell({ client, week, cellState, clientWeekMeals, issues });
    setModalOpen(true);
  };

  // Cell styling based on status
  const getCellStyle = (cellState) => {
    const status = cellState?.status || 'empty';
    const colors = STATUS_COLORS[status] || STATUS_COLORS.empty;
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      border: colors.border || 'none'
    };
  };

  // Current week highlight (subtle saffron)
  const currentWeekHighlight = 'rgba(244, 180, 0, 0.05)';

  return (
    <div className="space-y-4">
      {/* Schedule Grid */}
      <div
        className="bg-white rounded-lg shadow-md"
        style={{ overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}
      >
        <table
          className="w-full"
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            minWidth: '900px',
            fontSize: '11px'
          }}
        >
          {/* Sticky Header Row */}
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 20 }}>
              {/* Corner cell - sticky both directions */}
              <th
                className="text-left font-normal"
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 30,
                  width: '140px',
                  minWidth: '140px',
                  padding: '6px 8px',
                  backgroundColor: COLORS.cream,
                  borderBottom: `2px solid ${COLORS.warmTan}`,
                  color: COLORS.darkBrown
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 500 }}>Clients ({activeClients.length})</span>
                  {scheduleMenusLoading && (
                    <Loader2 size={10} className="animate-spin" style={{ color: COLORS.deepBlue }} />
                  )}
                </span>
              </th>
              {/* Week header cells */}
              {weeks.map((week) => {
                // Selected week = primary highlight (blue border)
                // Current week = subtle saffron background
                const isCurrentNotSelected = week.isCurrentWeek && !week.isSelectedWeek;
                const bgColor = week.isSelectedWeek
                  ? '#dbeafe'
                  : isCurrentNotSelected
                    ? currentWeekHighlight
                    : '#f9fafb';

                return (
                  <th
                    key={week.weekId}
                    className="text-center font-normal"
                    style={{
                      padding: '6px 4px',
                      minWidth: '80px',
                      backgroundColor: bgColor,
                      borderBottom: `2px solid ${COLORS.warmTan}`,
                      borderLeft: week.isSelectedWeek ? `3px solid ${COLORS.deepBlue}` : 'none'
                    }}
                  >
                    {/* Label: Selected takes priority over Current */}
                    {week.isSelectedWeek ? (
                      <div
                        style={{
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 500,
                          color: COLORS.deepBlue,
                          marginBottom: '2px'
                        }}
                      >
                        Selected
                      </div>
                    ) : week.isCurrentWeek ? (
                      <div
                        style={{
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 500,
                          color: '#b45309',
                          marginBottom: '2px'
                        }}
                      >
                        Today
                      </div>
                    ) : null}
                    <div style={{ fontWeight: 500, color: COLORS.darkBrown }}>
                      {week.label}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Client Rows */}
          <tbody>
            {activeClients.length === 0 ? (
              <tr>
                <td
                  colSpan={weeks.length + 1}
                  className="text-center"
                  style={{ padding: '32px', color: COLORS.darkBrown }}
                >
                  No active clients. Add clients in the Clients tab.
                </td>
              </tr>
            ) : (
              activeClients.map((client, clientIdx) => {
                const rowBg = clientIdx % 2 === 0 ? '#ffffff' : '#fafafa';

                return (
                  <tr key={client.id || client.name}>
                    {/* Sticky Client Name Cell */}
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        width: '140px',
                        minWidth: '140px',
                        padding: '4px 8px',
                        backgroundColor: rowBg,
                        borderBottom: '1px solid #e5e7eb',
                        fontWeight: 500,
                        color: COLORS.darkBrown
                      }}
                    >
                      <span className="truncate block" style={{ maxWidth: '124px' }}>
                        {client.name}
                      </span>
                    </td>

                    {/* Week Cells */}
                    {weeks.map((week) => {
                      const cellState = getScheduleCellState(client.id, week.weekId);
                      const cellStyle = getCellStyle(cellState);
                      const isLoading = actionLoading === `${client.id}::${week.weekId}`;
                      const status = cellState?.status || 'empty';
                      const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 4;
                      const clientWeekMeals = getClientWeekMeals(client.id, week.weekId);
                      const issues = getIssuesForClientWeek(clientWeekMeals, mealsPerWeek, status);
                      const stripeColor = getAlertStripeColor(issues, status);
                      const isCurrentNotSelected = week.isCurrentWeek && !week.isSelectedWeek;
                      const isEmpty = status === 'empty';

                      // Column background: selected = blue tint, current = subtle saffron
                      const colBgColor = week.isSelectedWeek
                        ? '#dbeafe'
                        : isCurrentNotSelected
                          ? currentWeekHighlight
                          : rowBg;

                      return (
                        <td
                          key={week.weekId}
                          style={{
                            padding: '3px 4px',
                            backgroundColor: colBgColor,
                            borderBottom: '1px solid #e5e7eb',
                            borderLeft: week.isSelectedWeek ? `3px solid ${COLORS.deepBlue}` : 'none'
                          }}
                        >
                          <button
                            onClick={() => openModal(client, week)}
                            disabled={isLoading}
                            className="w-full rounded flex items-center justify-center relative overflow-hidden transition-all hover:opacity-90 cursor-pointer disabled:opacity-50 group"
                            style={{
                              ...cellStyle,
                              height: '24px'
                            }}
                          >
                            {/* Alert stripe - left edge */}
                            {stripeColor && (
                              <span
                                className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                                style={{ backgroundColor: stripeColor }}
                              />
                            )}
                            {isLoading ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : isEmpty ? (
                              /* Empty cell: show + on hover only */
                              <span
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ fontSize: '14px', color: '#9ca3af' }}
                              >
                                +
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', fontWeight: 400 }}>
                                {STATUS_COLORS[status]?.label || ''}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        client={selectedCell?.client}
        week={selectedCell?.week}
        cellState={selectedCell?.cellState}
        clientWeekMeals={selectedCell?.clientWeekMeals || []}
        issues={selectedCell?.issues || []}
        onTransitionToConfirmed={transitionToConfirmed}
        onTransitionToPlanning={transitionToPlanning}
        onTransitionToEmpty={transitionToEmpty}
      />
    </div>
  );
}
