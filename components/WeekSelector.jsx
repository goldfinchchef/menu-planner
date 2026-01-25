import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock, Calendar, AlertTriangle } from 'lucide-react';
import {
  getWeekId,
  formatWeekRange,
  getAdjacentWeekId
} from '../utils/weekUtils';

export default function WeekSelector({
  selectedWeekId,
  setSelectedWeekId,
  weeks = {},
  compact = false,
  onUnlockWeek
}) {
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const currentWeekId = getWeekId();
  const selectedWeek = weeks[selectedWeekId];
  const isLocked = selectedWeek?.status === 'locked';
  const isPast = selectedWeekId < currentWeekId;
  const isReadOnly = isLocked && isPast;

  const goToPreviousWeek = () => {
    setSelectedWeekId(getAdjacentWeekId(selectedWeekId, -1));
  };

  const goToNextWeek = () => {
    setSelectedWeekId(getAdjacentWeekId(selectedWeekId, 1));
  };

  const goToCurrentWeek = () => {
    setSelectedWeekId(currentWeekId);
  };

  // Get available weeks for dropdown
  const weekOptions = [];
  const existingWeekIds = Object.keys(weeks).sort().reverse();

  // Add current week if not in list
  if (!existingWeekIds.includes(currentWeekId)) {
    weekOptions.push({ id: currentWeekId, label: `${formatWeekRange(currentWeekId)} (Current)`, isCurrent: true });
  }

  existingWeekIds.forEach(weekId => {
    const week = weeks[weekId];
    const isCurrent = weekId === currentWeekId;
    const statusLabel = week?.status === 'locked' ? ' [Locked]' : '';
    weekOptions.push({
      id: weekId,
      label: `${formatWeekRange(weekId)}${isCurrent ? ' (Current)' : ''}${statusLabel}`,
      isCurrent,
      isLocked: week?.status === 'locked'
    });
  });

  // Sort by weekId descending
  weekOptions.sort((a, b) => b.id.localeCompare(a.id));

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={goToPreviousWeek}
          className="p-1 rounded hover:bg-gray-100"
          title="Previous week"
        >
          <ChevronLeft size={20} />
        </button>

        <select
          value={selectedWeekId}
          onChange={(e) => setSelectedWeekId(e.target.value)}
          className="p-2 border-2 rounded-lg text-sm"
          style={{ borderColor: '#ebb582' }}
        >
          {weekOptions.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={goToNextWeek}
          className="p-1 rounded hover:bg-gray-100"
          title="Next week"
        >
          <ChevronRight size={20} />
        </button>

        {selectedWeekId !== currentWeekId && (
          <button
            onClick={goToCurrentWeek}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700"
          >
            Today
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Previous week"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex items-center gap-2">
            <Calendar size={20} style={{ color: '#3d59ab' }} />
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#3d59ab' }}>
                {formatWeekRange(selectedWeekId)}
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">{selectedWeekId}</span>
                {selectedWeekId === currentWeekId && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                    Current Week
                  </span>
                )}
                {isLocked && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Lock size={12} />
                    Locked
                  </span>
                )}
                {isLocked && onUnlockWeek && (
                  <button
                    onClick={() => setShowUnlockConfirm(true)}
                    className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1 hover:bg-red-200 transition-colors"
                  >
                    <Unlock size={12} />
                    Unlock
                  </button>
                )}
                {isReadOnly && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                    Read-only
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Next week"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedWeekId !== currentWeekId && (
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#3d59ab', color: 'white' }}
            >
              Go to Current Week
            </button>
          )}

          <select
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          >
            {weekOptions.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Unlock Confirmation Modal */}
      {showUnlockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b flex items-center gap-3" style={{ backgroundColor: '#fef3c7' }}>
              <AlertTriangle size={24} className="text-amber-600" />
              <h3 className="text-lg font-bold text-amber-800">Unlock Week?</h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                You are about to unlock <strong>{formatWeekRange(selectedWeekId)}</strong>.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 font-medium mb-2">Warning:</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Changes you make may affect what clients see in their portal</li>
                  <li>• Menu items can be edited or removed</li>
                  <li>• You will need to re-approve and lock the week when done</li>
                  <li>• Delivery history and logs will be preserved</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500">
                Only unlock if you need to make corrections to this week's data.
              </p>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowUnlockConfirm(false)}
                className="px-4 py-2 rounded-lg border-2 hover:bg-gray-50"
                style={{ borderColor: '#ebb582' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUnlockWeek(selectedWeekId);
                  setShowUnlockConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                style={{ backgroundColor: '#dc2626' }}
              >
                <Unlock size={16} />
                Unlock Week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
