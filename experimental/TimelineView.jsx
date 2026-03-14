import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Check, ChevronLeft, ChevronRight, Loader2, Receipt } from 'lucide-react';

// Retro palette colors
const COLORS = {
  deepBlue: '#3d59ab',
  goldenYellow: '#ffd700',
  warmTan: '#ebb582',
  cream: '#f9f9ed',
  darkBrown: '#423d3c',
  green: '#22c55e'
};

// Status colors - uses menus.status as source of truth
const STATUS_COLORS = {
  skipped: { bg: '#6b7280', text: '#ffffff', label: 'Skipped' },
  scheduled: { bg: '#bbf7d0', text: '#166534', label: 'Scheduled' },
  confirmed: { bg: '#3d59ab', text: '#ffffff', label: 'Confirmed' }
};

// Get Monday of the week containing the given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Format date range as "Mar 10-16"
function formatWeekLabel(date) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
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

// Generate array of week objects with offset from current week
function getWeeksWithOffset(count, offset) {
  const weeks = [];
  const today = new Date();
  const currentWeekStart = getWeekStart(today);

  for (let i = 0; i < count; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() + ((offset + i) * 7));
    const weekId = getWeekId(weekStart);
    const isCurrentWeek = weekId === getWeekId(currentWeekStart);
    weeks.push({
      weekId,
      dateKey: getDateString(weekStart),
      label: formatWeekLabel(weekStart),
      start: new Date(weekStart),
      isCurrentWeek
    });
  }

  return weeks;
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
  onSchedule,
  onUnschedule
}) {
  if (!isOpen || !client || !week) return null;

  // Status from menus.status (not derived from approved)
  const status = cellState?.status || 'skipped';
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.skipped;
  const isScheduled = status === 'scheduled' || status === 'confirmed';
  const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 4;

  const handleSchedule = async () => {
    await onSchedule(client, week.weekId, week.dateKey);
    onClose();
  };

  const handleUnschedule = async () => {
    if (status === 'confirmed') {
      if (!window.confirm('This menu is confirmed. Are you sure you want to unschedule it?')) {
        return;
      }
    }
    await onUnschedule(client.id, week.weekId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        style={{ fontSize: '12px' }}
      >
        {/* Header - compact */}
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
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
            <button
              onClick={onClose}
              className="p-0.5 hover:bg-gray-200 rounded"
              style={{ color: COLORS.darkBrown }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

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
              `${client.persons}p/${client.portions || mealsPerWeek}port`,
              client.frequency || 'Weekly'
            ].filter(Boolean).join(' • ')}
          </div>
        </div>

        {/* Weekly Menu table */}
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
                      <td colSpan={3} className="py-0.5 italic">Not scheduled</td>
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

        {/* Footer - actions */}
        <div
          className="px-3 py-2 flex items-center justify-between gap-2"
          style={{ backgroundColor: '#fafafa', borderTop: '1px solid #e5e7eb' }}
        >
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border hover:bg-white"
            style={{ borderColor: '#d1d5db', color: '#374151' }}
            title="Open billing"
          >
            <Receipt size={10} />
            Billing
          </button>

          <div className="flex gap-2">
            {!isScheduled ? (
              <button
                onClick={handleSchedule}
                className="px-3 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: COLORS.deepBlue }}
              >
                Schedule
              </button>
            ) : (
              <button
                onClick={handleUnschedule}
                className="px-3 py-1 rounded text-xs font-medium text-white bg-red-500 hover:bg-red-600"
              >
                Unschedule
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 rounded text-xs border"
              style={{ borderColor: '#d1d5db', color: COLORS.darkBrown }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const VISIBLE_WEEKS = 8;

export default function TimelineView({
  clients,
  scheduleMenus,
  scheduleMenusLoading,
  loadScheduleMenus,
  scheduleClientWeek,
  unscheduleClientWeek,
  getScheduleCellState
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [weekOffset, setWeekOffset] = useState(-2);
  const [actionLoading, setActionLoading] = useState(null);

  const weeks = useMemo(() => getWeeksWithOffset(VISIBLE_WEEKS, weekOffset), [weekOffset]);
  const weekIds = useMemo(() => weeks.map(w => w.weekId), [weeks]);

  // All active clients - always show as rows
  const activeClients = useMemo(() =>
    clients.filter(c => c.status === 'Active' || c.status === 'active'),
    [clients]
  );

  // Load schedule menus when visible weeks change
  useEffect(() => {
    if (loadScheduleMenus && weekIds.length > 0) {
      loadScheduleMenus(weekIds);
    }
  }, [weekIds, loadScheduleMenus]);

  // Get all meals for a client + week (for modal)
  const getClientWeekMeals = (clientId, weekId) => {
    return scheduleMenus
      .filter(m => m.client_id === clientId && m.week_id === weekId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  };

  const shiftWeeks = (direction) => {
    setWeekOffset(prev => prev + direction);
  };

  const openModal = (client, week) => {
    const cellState = getScheduleCellState(client.id, week.weekId);
    const clientWeekMeals = getClientWeekMeals(client.id, week.weekId);
    setSelectedCell({ client, week, cellState, clientWeekMeals });
    setModalOpen(true);
  };

  const handleSchedule = async (client, weekId, dateKey) => {
    setActionLoading(`${client.id}::${weekId}`);
    try {
      await scheduleClientWeek(client, weekId, dateKey);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnschedule = async (clientId, weekId) => {
    setActionLoading(`${clientId}::${weekId}`);
    try {
      await unscheduleClientWeek(clientId, weekId);
    } finally {
      setActionLoading(null);
    }
  };

  // Status-only cell styling - uses menus.status
  const getCellStyle = (cellState) => {
    const status = cellState?.status || 'skipped';
    const colors = STATUS_COLORS[status] || STATUS_COLORS.skipped;
    return { backgroundColor: colors.bg, color: colors.text };
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation and legend */}
      <div className="flex justify-between items-center">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeeks(-1)}
            className="p-2 rounded-lg hover:bg-white transition-colors border"
            style={{ borderColor: COLORS.warmTan, color: COLORS.darkBrown }}
            title="Show earlier weeks"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium px-2" style={{ color: COLORS.darkBrown }}>
            {weeks[0]?.label} — {weeks[weeks.length - 1]?.label}
          </span>
          <button
            onClick={() => shiftWeeks(1)}
            className="p-2 rounded-lg hover:bg-white transition-colors border"
            style={{ borderColor: COLORS.warmTan, color: COLORS.darkBrown }}
            title="Show later weeks"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setWeekOffset(-2)}
            className="ml-2 px-3 py-1.5 text-xs rounded border hover:bg-white transition-colors"
            style={{ borderColor: COLORS.warmTan, color: COLORS.darkBrown }}
          >
            Reset
          </button>
          {scheduleMenusLoading && (
            <Loader2 size={16} className="animate-spin ml-2" style={{ color: COLORS.deepBlue }} />
          )}
        </div>

        {/* Legend - status only */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.skipped.bg }} />
            <span style={{ color: COLORS.darkBrown }}>Skipped</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.scheduled.bg }} />
            <span style={{ color: COLORS.darkBrown }}>Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.confirmed.bg }} />
            <span style={{ color: COLORS.darkBrown }}>Confirmed</span>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {/* Week Headers */}
          <div className="flex border-b-2" style={{ borderColor: COLORS.warmTan }}>
            <div
              className="flex-shrink-0 p-3 font-medium"
              style={{ width: '180px', color: COLORS.darkBrown, backgroundColor: COLORS.cream }}
            >
              Client ({activeClients.length})
            </div>
            {weeks.map((week) => (
              <div
                key={week.weekId}
                className="flex-1 p-2 text-center relative min-w-[100px]"
                style={{
                  backgroundColor: week.isCurrentWeek ? '#fefce8' : '#f9fafb',
                  borderLeft: week.isCurrentWeek ? `3px solid ${COLORS.goldenYellow}` : 'none'
                }}
              >
                {week.isCurrentWeek && (
                  <div
                    className="text-xs uppercase tracking-wide font-medium mb-0.5"
                    style={{ color: COLORS.darkBrown }}
                  >
                    This Week
                  </div>
                )}
                <div className="text-sm font-semibold" style={{ color: COLORS.darkBrown }}>
                  {week.label}
                </div>
              </div>
            ))}
          </div>

          {/* Client Rows */}
          {activeClients.length === 0 ? (
            <div className="p-8 text-center" style={{ color: COLORS.darkBrown }}>
              No active clients. Add clients in the Clients tab.
            </div>
          ) : (
            activeClients.map((client, clientIdx) => (
              <div
                key={client.id || client.name}
                className="flex border-b"
                style={{
                  borderColor: '#e5e7eb',
                  backgroundColor: clientIdx % 2 === 0 ? 'white' : '#fafafa'
                }}
              >
                {/* Client Name Cell */}
                <div
                  className="flex-shrink-0 p-2.5"
                  style={{
                    width: '180px',
                    backgroundColor: clientIdx % 2 === 0 ? 'white' : '#fafafa'
                  }}
                >
                  <div className="font-medium text-sm" style={{ color: COLORS.darkBrown }}>
                    {client.name}
                  </div>
                  <div className="text-xs" style={{ color: COLORS.darkBrown, opacity: 0.7 }}>
                    {client.persons}p • {client.mealsPerWeek || client.meals_per_week} meals
                  </div>
                </div>

                {/* Week Cells */}
                {weeks.map((week) => {
                  const cellState = getScheduleCellState(client.id, week.weekId);
                  const cellStyle = getCellStyle(cellState);
                  const isLoading = actionLoading === `${client.id}::${week.weekId}`;
                  const status = cellState?.status || 'skipped';
                  const isScheduled = status === 'scheduled' || status === 'confirmed';
                  const isEmpty = cellState?.isEmpty;

                  return (
                    <div
                      key={week.weekId}
                      className="flex-1 p-1 min-w-[100px] relative"
                      style={{
                        backgroundColor: week.isCurrentWeek ? '#fefce8' : 'transparent',
                        borderLeft: week.isCurrentWeek ? `3px solid ${COLORS.goldenYellow}` : 'none'
                      }}
                    >
                      <button
                        onClick={() => openModal(client, week)}
                        disabled={isLoading}
                        className="w-full h-9 rounded-lg flex items-center justify-center gap-1
                                   transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer disabled:opacity-50"
                        style={cellStyle}
                      >
                        {isLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : status === 'skipped' ? (
                          <span className="text-sm">—</span>
                        ) : status === 'confirmed' ? (
                          <>
                            <Check size={12} />
                            <span className="text-xs font-medium">Done</span>
                          </>
                        ) : isEmpty ? (
                          <>
                            <Calendar size={12} />
                            <span className="text-xs">Empty</span>
                          </>
                        ) : (
                          <>
                            <Calendar size={12} />
                            <span className="text-xs font-medium">Menu</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-sm text-center" style={{ color: COLORS.darkBrown, opacity: 0.7 }}>
        Click any cell to schedule or view details • Use arrows to navigate weeks
      </p>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        client={selectedCell?.client}
        week={selectedCell?.week}
        cellState={selectedCell?.cellState}
        clientWeekMeals={selectedCell?.clientWeekMeals || []}
        onSchedule={handleSchedule}
        onUnschedule={handleUnschedule}
      />
    </div>
  );
}
