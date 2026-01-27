import React, { useState, useEffect } from 'react';
import { Database, Cloud, AlertTriangle, AlertCircle } from 'lucide-react';
import { getDataMode, setDataMode } from '../lib/dataMode';
import { getConfigError, getDiagnostics, hasCredentials } from '../lib/supabase';

export default function DataModeToggle({ onModeChange }) {
  const [mode, setMode] = useState(getDataMode);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const configError = getConfigError();
  const credentials = hasCredentials();

  useEffect(() => {
    const handleModeChange = (e) => {
      setMode(e.detail.mode);
    };
    window.addEventListener('dataModeChanged', handleModeChange);
    return () => window.removeEventListener('dataModeChanged', handleModeChange);
  }, []);

  const handleToggle = () => {
    // Don't allow switching to Supabase if not configured
    if (mode === 'local' && configError) {
      setShowDiagnostics(true);
      return;
    }

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
      {/* Config Error Banner - shown when there's an error */}
      {configError && mode === 'supabase' && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-sm">
          <AlertCircle size={16} />
          <span className="font-medium">Config Error</span>
          <button
            onClick={() => setShowDiagnostics(true)}
            className="underline text-xs"
          >
            Details
          </button>
        </div>
      )}

      {/* Mode Indicator & Toggle */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          configError && !isLocal
            ? 'bg-red-100 text-red-800 hover:bg-red-200'
            : isLocal
            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            : 'bg-green-100 text-green-800 hover:bg-green-200'
        }`}
        title={configError ? configError : `Currently in ${isLocal ? 'Local' : 'Supabase'} mode. Click to switch.`}
      >
        {configError && !isLocal ? (
          <>
            <AlertCircle size={16} />
            <span>Config Error</span>
          </>
        ) : isLocal ? (
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

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Supabase Configuration</h3>
            </div>

            {configError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">{configError}</p>
              </div>
            )}

            <div className="mb-4 p-3 bg-gray-50 border rounded-lg font-mono text-xs">
              <p><strong>Build:</strong> {getDiagnostics().buildTimestamp}</p>
              <p><strong>URL present:</strong> {getDiagnostics().hasUrl ? '✓' : '✗'}</p>
              <p><strong>Key present:</strong> {getDiagnostics().hasKey ? '✓' : '✗'}</p>
              <p><strong>Client created:</strong> {getDiagnostics().clientCreated ? '✓' : '✗'}</p>
              <p><strong>Mode:</strong> {getDiagnostics().isSupabaseMode ? 'Supabase' : 'Local'}</p>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              If URL/Key are missing, ensure <code className="bg-gray-100 px-1">VITE_SUPABASE_URL</code> and{' '}
              <code className="bg-gray-100 px-1">VITE_SUPABASE_ANON_KEY</code> are set in Netlify Environment Variables,
              then do "Clear cache and deploy".
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setShowDiagnostics(false)}
                className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
