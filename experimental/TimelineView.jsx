import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Link, DollarSign, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Retro palette colors
const COLORS = {
  deepBlue: '#3d59ab',
  goldenYellow: '#ffd700',
  warmTan: '#ebb582',
  cream: '#f9f9ed',
  darkBrown: '#423d3c',
  green: '#22c55e'
};

// Week colors - each week gets its own distinct color
const WEEK_PALETTES = [
  { light: '#c5d4e8', dark: '#3d59ab', name: 'Blue' },
  { light: '#f5d9b3', dark: '#d4883c', name: 'Orange' },
  { light: '#c8e6c9', dark: '#388e3c', name: 'Green' },
  { light: '#e1bee7', dark: '#7b1fa2', name: 'Purple' },
  { light: '#b2dfdb', dark: '#00796b', name: 'Teal' },
  { light: '#ffccbc', dark: '#e64a19', name: 'DeepOrange' },
  { light: '#d1c4e9', dark: '#512da8', name: 'DeepPurple' },
  { light: '#b3e5fc', dark: '#0288d1', name: 'LightBlue' }
];

const INACTIVE_COLOR = '#e5e7eb';

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
      isCurrentWeek,
      palette: WEEK_PALETTES[i % WEEK_PALETTES.length]
    });
  }

  return weeks;
}

// Scheduling modal for a client + week cell
function ScheduleModal({ isOpen, onClose, client, week, cellState, onSchedule, onUnschedule }) {
  if (!isOpen || !client || !week) return null;

  const palette = week.palette || WEEK_PALETTES[0];
  const isScheduled = cellState?.status === 'scheduled' || cellState?.status === 'approved';
  const isApproved = cellState?.status === 'approved';
  const menu = cellState?.menu;

  const handleSchedule = async () => {
    await onSchedule(client, week.weekId, week.dateKey);
    onClose();
  };

  const handleUnschedule = async () => {
    if (isApproved) {
      if (!window.confirm('This menu is already approved. Are you sure you want to unschedule it?')) {
        return;
      }
    }
    await onUnschedule(client.id, week.weekId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div
          className="flex items-center justify-between p-4 rounded-t-lg"
          style={{ backgroundColor: palette.dark, color: 'white' }}
        >
          <div>
            <h3 className="text-lg font-bold">{client.name}</h3>
            <p className="text-sm opacity-90">{week.label}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white hover:bg-opacity-20 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current status */}
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: COLORS.darkBrown }}>
              Status
            </div>
            <div className="flex items-center gap-2">
              {!isScheduled && (
                <span className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600">
                  Not Scheduled
                </span>
              )}
              {isScheduled && !isApproved && (
                <span className="px-3 py-1.5 rounded-full text-sm" style={{ backgroundColor: palette.light, color: COLORS.darkBrown }}>
                  Scheduled {menu?.isEmpty ? '(Empty)' : '(Has Menu)'}
                </span>
              )}
              {isApproved && (
                <span className="px-3 py-1.5 rounded-full text-sm text-white" style={{ backgroundColor: palette.dark }}>
                  Approved
                </span>
              )}
            </div>
          </div>

          {/* Menu details if scheduled */}
          {menu && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 uppercase mb-2">Menu</div>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-500">Protein:</span> {menu.protein || '—'}</div>
                <div><span className="text-gray-500">Veg:</span> {menu.veg || '—'}</div>
                <div><span className="text-gray-500">Starch:</span> {menu.starch || '—'}</div>
                <div><span className="text-gray-500">Portions:</span> {menu.portions || '—'}</div>
              </div>
            </div>
          )}

          {/* Client info */}
          <div className="text-sm text-gray-500">
            <div>{client.persons}p • {client.mealsPerWeek || client.meals_per_week} meals/week</div>
            {client.deliveryDay && <div>Delivery: {client.deliveryDay}</div>}
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg border-2"
            style={{ borderColor: COLORS.warmTan, color: COLORS.darkBrown }}
          >
            Close
          </button>
          {!isScheduled ? (
            <button
              onClick={handleSchedule}
              className="flex-1 py-2 px-4 rounded-lg font-medium text-white"
              style={{ backgroundColor: COLORS.deepBlue }}
            >
              Schedule
            </button>
          ) : (
            <button
              onClick={handleUnschedule}
              className="flex-1 py-2 px-4 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600"
            >
              Unschedule
            </button>
          )}
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
  const [weekOffset, setWeekOffset] = useState(-2); // Start 2 weeks in the past
  const [actionLoading, setActionLoading] = useState(null); // Track which cell is loading

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

  const shiftWeeks = (direction) => {
    setWeekOffset(prev => prev + direction);
  };

  const openModal = (client, week) => {
    const cellState = getScheduleCellState(client.id, week.weekId);
    setSelectedCell({ client, week, cellState });
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

  const getCellStyleForState = (cellState, palette) => {
    if (!cellState || cellState.status === 'inactive') {
      return { backgroundColor: INACTIVE_COLOR, color: '#9ca3af' };
    }
    if (cellState.status === 'approved') {
      return { backgroundColor: palette.dark, color: '#ffffff' };
    }
    // Scheduled (not approved)
    return { backgroundColor: palette.light, color: COLORS.darkBrown };
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

        {/* Legend */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: INACTIVE_COLOR }} />
            <span style={{ color: COLORS.darkBrown }}>Not Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#c5d4e8' }} />
            <span style={{ color: COLORS.darkBrown }}>Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.deepBlue }} />
            <span style={{ color: COLORS.darkBrown }}>Approved</span>
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
                style={{ backgroundColor: week.palette.light + '40' }}
              >
                {week.isCurrentWeek && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: COLORS.goldenYellow }}
                  />
                )}
                <div
                  className="text-xs uppercase tracking-wide font-medium"
                  style={{ color: week.palette.dark }}
                >
                  {week.isCurrentWeek ? 'This Week' : ''}
                </div>
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
                  backgroundColor: clientIdx % 2 === 0 ? 'white' : COLORS.cream
                }}
              >
                {/* Client Name Cell */}
                <div
                  className="flex-shrink-0 p-2.5"
                  style={{
                    width: '180px',
                    backgroundColor: clientIdx % 2 === 0 ? 'white' : COLORS.cream
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
                  const cellStyle = getCellStyleForState(cellState, week.palette);
                  const isLoading = actionLoading === `${client.id}::${week.weekId}`;
                  const isScheduled = cellState?.status === 'scheduled' || cellState?.status === 'approved';
                  const isApproved = cellState?.status === 'approved';
                  const isEmpty = cellState?.isEmpty;

                  return (
                    <div
                      key={week.weekId}
                      className="flex-1 p-1 min-w-[100px] relative"
                      style={{ backgroundColor: week.palette.light + '15' }}
                    >
                      {week.isCurrentWeek && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: COLORS.goldenYellow }}
                        />
                      )}
                      <button
                        onClick={() => openModal(client, week)}
                        disabled={isLoading}
                        className="w-full h-9 rounded-lg flex items-center justify-center gap-1
                                   transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer disabled:opacity-50"
                        style={cellStyle}
                      >
                        {isLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : !isScheduled ? (
                          <span className="text-sm">—</span>
                        ) : isApproved ? (
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
        onSchedule={handleSchedule}
        onUnschedule={handleUnschedule}
      />
    </div>
  );
}
