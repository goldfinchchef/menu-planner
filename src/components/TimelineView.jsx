import React, { useState } from 'react';
import { X, Calendar, Link, DollarSign, Check } from 'lucide-react';

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
// light = scheduled/unpaid, dark = paid/confirmed
const WEEK_PALETTES = [
  { light: '#c5d4e8', dark: '#3d59ab', name: 'Blue' },      // Week 1 - Blue
  { light: '#f5d9b3', dark: '#d4883c', name: 'Orange' },    // Week 2 - Orange/Tan
  { light: '#c8e6c9', dark: '#388e3c', name: 'Green' },     // Week 3 - Green
  { light: '#e1bee7', dark: '#7b1fa2', name: 'Purple' }     // Week 4 - Purple
];

const INACTIVE_COLOR = '#9ca3af';

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

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

function getWeekKey(date) {
  const start = getWeekStart(date);
  return start.toISOString().split('T')[0];
}

function getNextNWeeks(n) {
  const weeks = [];
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const weekStart = getWeekStart(today);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    weeks.push({
      key: getWeekKey(weekStart),
      label: formatWeekLabel(weekStart),
      start: new Date(weekStart),
      isCurrentWeek: i === 0,
      palette: WEEK_PALETTES[i]
    });
  }

  return weeks;
}

function BillingModal({ isOpen, onClose, client, week, weekIdx, data, onSave }) {
  const [formData, setFormData] = useState({
    status: data?.status || 'inactive',
    dueDate: data?.dueDate || '',
    invoiceLink: data?.invoiceLink || '',
    paidDate: data?.paidDate || '',
    notes: data?.notes || ''
  });

  if (!isOpen) return null;

  const palette = WEEK_PALETTES[weekIdx];

  const handleSave = () => {
    onSave(formData);
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
            <h3 className="text-lg font-bold">{client?.name}</h3>
            <p className="text-sm opacity-90">{week?.label}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white hover:bg-opacity-20 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.darkBrown }}>
              Delivery Status
            </label>
            <div className="flex gap-2">
              {[
                { value: 'inactive', label: 'Inactive', color: INACTIVE_COLOR },
                { value: 'scheduled', label: 'Scheduled', color: palette.light },
                { value: 'paid', label: 'Paid', color: palette.dark }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-all ${
                    formData.status === opt.value ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: formData.status === opt.value ? opt.color : 'white',
                    borderColor: opt.color,
                    color: formData.status === opt.value && opt.value !== 'scheduled' ? 'white' : COLORS.darkBrown,
                    ringColor: opt.color
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {formData.status !== 'inactive' && (
            <>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: COLORS.darkBrown }}>
                  <Calendar size={16} />
                  Bill Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full p-2 border-2 rounded-lg"
                  style={{ borderColor: COLORS.warmTan }}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: COLORS.darkBrown }}>
                  <Link size={16} />
                  Invoice Link
                </label>
                <input
                  type="url"
                  value={formData.invoiceLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceLink: e.target.value }))}
                  placeholder="https://..."
                  className="w-full p-2 border-2 rounded-lg"
                  style={{ borderColor: COLORS.warmTan }}
                />
              </div>

              {formData.status === 'paid' && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: COLORS.darkBrown }}>
                    <DollarSign size={16} />
                    Paid Date
                  </label>
                  <input
                    type="date"
                    value={formData.paidDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, paidDate: e.target.value }))}
                    className="w-full p-2 border-2 rounded-lg"
                    style={{ borderColor: COLORS.warmTan }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.darkBrown }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full p-2 border-2 rounded-lg resize-none"
                  style={{ borderColor: COLORS.warmTan }}
                  placeholder="Optional notes..."
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg border-2"
            style={{ borderColor: COLORS.warmTan, color: COLORS.darkBrown }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 rounded-lg font-medium"
            style={{ backgroundColor: COLORS.deepBlue, color: 'white' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TimelineView({ clients, deliverySchedule, setDeliverySchedule }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  const weeks = getNextNWeeks(4);
  const activeClients = clients.filter(c => c.status === 'Active');

  const getScheduleKey = (clientName, weekKey) => `${clientName}::${weekKey}`;

  const getDeliveryData = (clientName, weekKey) => {
    const key = getScheduleKey(clientName, weekKey);
    return deliverySchedule[key] || { status: 'inactive' };
  };

  const openBillingModal = (client, week, weekIdx) => {
    setSelectedCell({ client, week, weekIdx });
    setModalOpen(true);
  };

  const handleSaveBilling = (formData) => {
    if (!selectedCell) return;
    const key = getScheduleKey(selectedCell.client.name, selectedCell.week.key);
    setDeliverySchedule(prev => ({
      ...prev,
      [key]: formData
    }));
  };

  const getCellStyle = (status, weekIdx) => {
    const palette = WEEK_PALETTES[weekIdx];
    if (status === 'inactive') {
      return { backgroundColor: INACTIVE_COLOR, color: '#ffffff' };
    }
    if (status === 'scheduled') {
      return { backgroundColor: palette.light, color: COLORS.darkBrown };
    }
    if (status === 'paid') {
      return { backgroundColor: palette.dark, color: '#ffffff' };
    }
    return { backgroundColor: INACTIVE_COLOR, color: '#ffffff' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold" style={{ color: COLORS.deepBlue }}>
          Schedule
        </h2>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: INACTIVE_COLOR }} />
            <span style={{ color: COLORS.darkBrown }}>Inactive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: '#e8e8e8', borderColor: '#ccc' }} />
            <span style={{ color: COLORS.darkBrown }}>Scheduled (light)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.deepBlue }} />
            <span style={{ color: COLORS.darkBrown }}>Paid (dark)</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {/* Week Headers */}
          <div className="flex border-b-2" style={{ borderColor: COLORS.warmTan }}>
            <div
              className="flex-shrink-0 p-3 font-medium"
              style={{ width: '200px', color: COLORS.darkBrown, backgroundColor: COLORS.cream }}
            >
              Client
            </div>
            {weeks.map((week, idx) => (
              <div
                key={week.key}
                className="flex-1 p-3 text-center relative min-w-[140px]"
                style={{ backgroundColor: WEEK_PALETTES[idx].light + '40' }}
              >
                {week.isCurrentWeek && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: COLORS.goldenYellow }}
                  />
                )}
                <div
                  className="text-xs uppercase tracking-wide font-medium"
                  style={{ color: WEEK_PALETTES[idx].dark }}
                >
                  {week.isCurrentWeek ? 'This Week' : `Week ${idx + 1}`}
                </div>
                <div className="font-semibold" style={{ color: COLORS.darkBrown }}>
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
                key={client.name}
                className="flex border-b"
                style={{
                  borderColor: '#e5e7eb',
                  backgroundColor: clientIdx % 2 === 0 ? 'white' : COLORS.cream
                }}
              >
                {/* Client Name Cell */}
                <div
                  className="flex-shrink-0 p-3"
                  style={{
                    width: '200px',
                    backgroundColor: clientIdx % 2 === 0 ? 'white' : COLORS.cream
                  }}
                >
                  <div className="font-medium" style={{ color: COLORS.darkBrown }}>
                    {client.name}
                  </div>
                  <div className="text-xs" style={{ color: COLORS.darkBrown, opacity: 0.7 }}>
                    {client.persons}p / {client.mealsPerWeek} meals
                  </div>
                </div>

                {/* Week Cells - Gantt Bars */}
                {weeks.map((week, weekIdx) => {
                  const data = getDeliveryData(client.name, week.key);
                  const cellStyle = getCellStyle(data.status, weekIdx);

                  return (
                    <div
                      key={week.key}
                      className="flex-1 p-2 min-w-[140px] relative"
                      style={{ backgroundColor: WEEK_PALETTES[weekIdx].light + '20' }}
                    >
                      {week.isCurrentWeek && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: COLORS.goldenYellow }}
                        />
                      )}
                      <button
                        onClick={() => openBillingModal(client, week, weekIdx)}
                        className="w-full h-12 rounded-lg flex items-center justify-center gap-2
                                   transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer"
                        style={cellStyle}
                      >
                        {data.status === 'inactive' && (
                          <span className="text-sm opacity-70">-</span>
                        )}
                        {data.status === 'scheduled' && (
                          <>
                            <Calendar size={14} />
                            <span className="text-xs font-medium">Scheduled</span>
                          </>
                        )}
                        {data.status === 'paid' && (
                          <>
                            <Check size={14} />
                            <span className="text-xs font-medium">Paid</span>
                          </>
                        )}
                      </button>
                      {/* Show due date if scheduled */}
                      {data.status === 'scheduled' && data.dueDate && (
                        <div
                          className="text-xs text-center mt-1"
                          style={{ color: WEEK_PALETTES[weekIdx].dark }}
                        >
                          Due: {new Date(data.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                      {/* Show paid date if paid */}
                      {data.status === 'paid' && data.paidDate && (
                        <div
                          className="text-xs text-center mt-1"
                          style={{ color: WEEK_PALETTES[weekIdx].dark }}
                        >
                          Paid: {new Date(data.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend showing week colors */}
      <div className="flex justify-center gap-6 text-xs" style={{ color: COLORS.darkBrown }}>
        {WEEK_PALETTES.map((palette, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: palette.light }} />
              <div className="w-3 h-3 rounded" style={{ backgroundColor: palette.dark }} />
            </div>
            <span>Week {idx + 1}</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-center" style={{ color: COLORS.darkBrown, opacity: 0.7 }}>
        Click any cell to open billing details
      </p>

      {/* Billing Modal */}
      <BillingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        client={selectedCell?.client}
        week={selectedCell?.week}
        weekIdx={selectedCell?.weekIdx}
        data={selectedCell ? getDeliveryData(selectedCell.client.name, selectedCell.week.key) : null}
        onSave={handleSaveBilling}
      />
    </div>
  );
}
