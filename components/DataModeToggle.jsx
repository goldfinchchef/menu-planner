import React, { useState, useEffect } from 'react';
import { Database, Cloud, AlertTriangle } from 'lucide-react';
import { getDataMode, setDataMode } from '../lib/dataMode';

export default function DataModeToggle({ onModeChange }) {
  const [mode, setMode] = useState(getDataMode);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  useEffect(() => {
    const handleModeChange = (e) => {
      setMode(e.detail.mode);
    };
    window.addEventListener('dataModeChanged', handleModeChange);
    return () => window.removeEventListener('dataModeChanged', handleModeChange);
  }, []);

  const handleToggle = () => {
    const newMode = mode === 'local' ? 'supabase' : 'local';

    // Show confirmation when switching to Supabase
    if (newMode === 'supabase') {
      setPendingMode(newMode);
      setShowConfirm(true);
    } else {
      // Switching to local doesn't need confirmation
      setDataMode(newMode);
      setMode(newMode);
      if (onModeChange) onModeChange(newMode);
    }
  };

  const confirmSwitch = () => {
    setDataMode(pendingMode);
    setMode(pendingMode);
    setShowConfirm(false);
    setPendingMode(null);
    if (onModeChange) onModeChange(pendingMode);
  };

  const cancelSwitch = () => {
    setShowConfirm(false);
    setPendingMode(null);
  };

  const isLocal = mode === 'local';

  return (
    <>
      {/* Mode Indicator & Toggle */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isLocal
            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            : 'bg-green-100 text-green-800 hover:bg-green-200'
        }`}
        title={`Currently in ${isLocal ? 'Local' : 'Supabase'} mode. Click to switch.`}
      >
        {isLocal ? (
          <>
            <Database size={16} />
            <span>Local Mode</span>
          </>
        ) : (
          <>
            <Cloud size={16} />
            <span>Supabase Mode</span>
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Switch to Supabase Mode?</h3>
            </div>

            <p className="text-gray-600 mb-6">
              This will enable cloud sync with Supabase. Changes will be saved to the database and may affect live data.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelSwitch}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitch}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
