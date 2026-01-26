import React from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock, Calendar } from 'lucide-react';
import { getWeekId, formatWeekRange, getAdjacentWeekId } from '../utils';

export default function WeekSelector({
  selectedWeekId,
  setSelectedWeekId,
  weeks = {},
  compact = false,
  onLockWeek,
  onUnlockWeek
}) {
  const currentWeekId = getWeekId();
  const selectedWeek = weeks[selectedWeekId];
  const isLocked = selectedWeek?.status === 'locked';

  const goToPreviousWeek = () => {
    setSelectedWeekId(getAdjacentWeekId(selectedWeekId, -1));
  };

  const goToNextWeek = () => {
    setSelectedWeekId(getAdjacentWeekId(selectedWeekId, 1));
  };

  const goToCurrentWeek = () => {
    setSelectedWeekId(currentWeekId);
  };

  const handleToggleLock = () => {
    if (isLocked && onUnlockWeek) {
      onUnlockWeek(selectedWeekId);
    } else if (!isLocked && onLockWeek) {
      onLockWeek(selectedWeekId);
    }
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

          {/* Simple Lock/Unlock Toggle Button */}
          {(onLockWeek || onUnlockWeek) && (
            <button
              onClick={handleToggleLock}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                isLocked
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock size={16} />
                  Locked
                </>
              ) : (
                <>
                  <Unlock size={16} />
                  Unlocked
                </>
              )}
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
    </div>
  );
}
