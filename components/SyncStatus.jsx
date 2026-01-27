import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';

export default function SyncStatus({
  isOnline,
  isSyncing,
  lastSyncedAt,
  syncError,
  dataSource,
  onForceSync
}) {
  // Format the last synced time
  const formatLastSynced = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Determine status color and icon
  const getStatusDisplay = () => {
    if (isSyncing) {
      return {
        icon: <RefreshCw size={16} className="animate-spin" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        text: 'Syncing...'
      };
    }

    if (syncError) {
      return {
        icon: <AlertCircle size={16} />,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        text: 'Sync error'
      };
    }

    if (!isOnline) {
      return {
        icon: <CloudOff size={16} />,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        text: 'Offline'
      };
    }

    return {
      icon: <Cloud size={16} />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      text: 'Synced'
    };
  };

  const status = getStatusDisplay();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bgColor}`}>
      <div className={`flex items-center gap-1.5 ${status.color}`}>
        {status.icon}
        <span className="text-sm font-medium">{status.text}</span>
      </div>

      {lastSyncedAt && !isSyncing && (
        <span className="text-xs text-gray-500">
          {formatLastSynced(lastSyncedAt)}
        </span>
      )}

      {!isSyncing && (
        <button
          onClick={onForceSync}
          className="ml-1 p-1 hover:bg-white/50 rounded transition-colors"
          title="Sync now"
        >
          <RefreshCw size={14} className="text-gray-500 hover:text-gray-700" />
        </button>
      )}

      {syncError && (
        <span className="text-xs text-amber-600 max-w-[150px] truncate" title={syncError}>
          {syncError}
        </span>
      )}

      {dataSource === 'localStorage' && !isOnline && (
        <span className="text-xs text-gray-500">(local)</span>
      )}
    </div>
  );
}
