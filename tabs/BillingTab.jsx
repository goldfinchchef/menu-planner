import React, { useState, useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react';

// Helper functions
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Date Slot Picker Component
function DateSlotPicker({ value, onChange, minDate, slotIndex }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (date) => {
    if (date) {
      const dateStr = formatLocalDate(date);
      onChange(dateStr);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const selectedDate = value ? new Date(value + 'T12:00:00') : undefined;

  return (
    <div className="relative">
      {/* Date slot button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-left rounded-lg border-2 text-sm font-medium transition-colors ${
          value
            ? 'bg-white text-gray-800 hover:border-blue-400'
            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
        style={{ borderColor: value ? '#ebb582' : '#e5e7eb' }}
      >
        {value ? formatDisplayDate(value) : '+ Add'}
      </button>

      {/* Calendar popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="date-picker-popover absolute top-full left-0 mt-2"
          style={{ minWidth: '300px' }}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={{ before: minDate }}
            defaultMonth={selectedDate || minDate}
            showOutsideDays
            fixedWeeks
          />
          <div className="flex justify-between pt-2 mt-2 border-t" style={{ borderColor: '#ebb582' }}>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            >
              Clear
            </button>
            <button
              onClick={() => handleSelect(new Date())}
              className="px-3 py-1.5 text-sm rounded"
              style={{ backgroundColor: '#f9f9ed', color: '#3d59ab' }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main BillingTab Component
export default function BillingTab({ clients, updateClients, blockedDates, updateBlockedDates, saveDeliveryDatesToSupabase }) {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const today = new Date();

  const activeClients = clients.filter(c => c.status === 'active');
  const pausedClients = clients.filter(c => c.status === 'paused');

  const updateClientField = (clientName, field, value) => {
    const updated = clients.map(c =>
      c.name === clientName ? { ...c, [field]: value } : c
    );
    updateClients(updated);
  };

  const updateDeliveryDate = async (clientName, index, value) => {
    console.log('[deliveryDates] updateDeliveryDate called', { clientName, index, value });

    const client = clients.find(c => c.name === clientName);
    if (!client) {
      console.error('[deliveryDates] client not found by name:', clientName);
      return;
    }

    console.log('[deliveryDates] client found', { id: client.id, name: client.name, hasSupabaseFn: !!saveDeliveryDatesToSupabase });

    // Get current future dates (filter out past dates)
    const todayStr = formatLocalDate(today);
    const currentFutureDates = (client.deliveryDates || []).filter(d => d && d >= todayStr);

    // Build the new dates array
    const dates = [...currentFutureDates];
    while (dates.length < 4) dates.push('');
    dates[index] = value;

    // Filter to future dates only, sort, and dedupe
    const futureDates = dates
      .filter(d => d && d >= todayStr)
      .sort()
      .filter((d, i, arr) => arr.indexOf(d) === i); // dedupe

    console.log('[deliveryDates] future dates (cleaned)', futureDates);

    // Update local state
    updateClientField(clientName, 'deliveryDates', futureDates);

    // Save to Supabase if available
    if (saveDeliveryDatesToSupabase && client.id) {
      console.log('[deliveryDates] calling saveDeliveryDatesToSupabase...');
      await saveDeliveryDatesToSupabase(client.id, clientName, futureDates);
    } else {
      console.log('[deliveryDates] skip Supabase save', { hasFn: !!saveDeliveryDatesToSupabase, hasId: !!client.id });
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const toggleBlockedDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    if (blockedDates.includes(dateStr)) {
      updateBlockedDates(blockedDates.filter(d => d !== dateStr));
    } else {
      updateBlockedDates([...blockedDates, dateStr]);
    }
  };

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* All Clients - Billing & Dates */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3d59ab' }}>
          <Calendar className="inline mr-2" size={24} />
          Delivery Scheduling
        </h2>
        <p className="text-gray-500 text-sm mb-3">
          Set the next 4 upcoming delivery dates for each client
        </p>

        <div className="space-y-2">
          {activeClients.map((client, idx) => {
            // Check confirmedDates first (migrated data), fall back to deliveryDates
            const allDates = client.confirmedDates?.length > 0
              ? client.confirmedDates
              : (client.deliveryDates || []);
            // Filter out past dates and keep only future/today dates
            const todayStr = formatLocalDate(today);
            const futureDates = allDates.filter(d => d && d >= todayStr);
            // Ensure we have exactly 4 slots for display
            const displayDates = [...futureDates];
            while (displayDates.length < 4) displayDates.push('');

            return (
              <div
                key={idx}
                className="px-4 py-3 rounded-lg border"
                style={{ borderColor: '#ebb582', backgroundColor: '#f9f9ed' }}
              >
                {/* Client name row */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold" style={{ color: '#3d59ab' }}>
                    {client.displayName || client.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {client.mealsPerWeek} meals × {client.portions || 1} portions
                  </span>
                </div>

                {/* Date slot pickers */}
                <div className="grid grid-cols-4 gap-3">
                  {displayDates.slice(0, 4).map((date, i) => (
                    <DateSlotPicker
                      key={i}
                      value={date}
                      onChange={(newDate) => updateDeliveryDate(client.name, i, newDate)}
                      minDate={today}
                      slotIndex={i}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paused Clients */}
      {pausedClients.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>
            Paused Clients ({pausedClients.length})
          </h2>
          <div className="space-y-2">
            {pausedClients.map((client, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg flex items-center justify-between bg-gray-50 border border-gray-200"
              >
                <div>
                  <h3 className="font-medium">{client.displayName || client.name}</h3>
                  {client.pausedDate && (
                    <p className="text-sm text-gray-500">
                      Paused: {new Date(client.pausedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  {client.billingNotes && (
                    <p className="text-sm text-gray-500">{client.billingNotes}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                  Paused
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability Calendar - Collapsed */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Calendar size={24} style={{ color: '#3d59ab' }} />
            <span className="text-lg font-bold" style={{ color: '#3d59ab' }}>
              Availability Calendar
            </span>
            {blockedDates.length > 0 && (
              <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-700">
                {blockedDates.length} blocked
              </span>
            )}
          </div>
          {showCalendar ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>

        {showCalendar && (
          <div className="p-6 border-t">
            <p className="text-gray-600 mb-4">
              Click dates to block them from client selection
            </p>

            {/* Calendar navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 rounded hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded hover:bg-gray-100"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
              {getDaysInMonth(calendarMonth).map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const dateStr = date.toISOString().split('T')[0];
                const isBlocked = blockedDates.includes(dateStr);
                const isPast = date < new Date(today.toISOString().split('T')[0]);
                const isToday = dateStr === today.toISOString().split('T')[0];

                return (
                  <button
                    key={dateStr}
                    onClick={() => !isPast && toggleBlockedDate(date)}
                    disabled={isPast}
                    className={`p-2 rounded-lg text-center transition-colors ${
                      isPast
                        ? 'text-gray-300 cursor-not-allowed'
                        : isBlocked
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : isToday
                        ? 'bg-blue-100 hover:bg-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Blocked dates list */}
            {blockedDates.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-700 mb-2">
                  {blockedDates.length} date{blockedDates.length > 1 ? 's' : ''} blocked:
                </p>
                <div className="flex flex-wrap gap-2">
                  {blockedDates.sort().map(date => (
                    <span
                      key={date}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 flex items-center gap-1"
                    >
                      {formatDate(date)}
                      <button onClick={() => updateBlockedDates(blockedDates.filter(d => d !== date))}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
