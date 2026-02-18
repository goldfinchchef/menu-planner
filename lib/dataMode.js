// Data mode management utility
// Controls whether the app uses localStorage only or Supabase
// DEFAULT: Supabase mode (local is fallback only)

const DATA_MODE_KEY = 'goldfinch_admin_data_mode';

/**
 * Get the current data mode
 * DEFAULT: 'supabase' if no key is set
 * @returns {'local' | 'supabase'}
 */
export function getDataMode() {
  try {
    const mode = localStorage.getItem(DATA_MODE_KEY);
    // Default to 'supabase' if key is missing or null
    if (mode === null || mode === undefined) {
      return 'supabase';
    }
    return mode === 'local' ? 'local' : 'supabase';
  } catch (e) {
    // If localStorage fails, default to supabase (will fall back if unavailable)
    return 'supabase';
  }
}

/**
 * Set the data mode
 * @param {'local' | 'supabase'} mode
 */
export function setDataMode(mode) {
  try {
    localStorage.setItem(DATA_MODE_KEY, mode);
    // Dispatch event so components can react to mode change
    window.dispatchEvent(new CustomEvent('dataModeChanged', { detail: { mode } }));
  } catch (e) {
    console.error('[dataMode] Failed to set mode:', e);
  }
}

/**
 * Check if Supabase mode is enabled
 * @returns {boolean}
 */
export function isSupabaseMode() {
  return getDataMode() === 'supabase';
}

/**
 * Check if in local-only mode
 * @returns {boolean}
 */
export function isLocalMode() {
  return getDataMode() === 'local';
}

/**
 * Ensure Supabase is the default mode on fresh installs
 * Call this at app startup before loading data
 */
export function ensureSupabaseDefault() {
  try {
    const mode = localStorage.getItem(DATA_MODE_KEY);
    if (mode === null || mode === undefined) {
      localStorage.setItem(DATA_MODE_KEY, 'supabase');
      console.log('[dataMode] Initialized default mode: supabase');
    }
  } catch (e) {
    console.error('[dataMode] Failed to ensure default:', e);
  }
}

/**
 * Force fallback to local mode (when Supabase unavailable)
 * Returns true if mode was changed
 */
export function fallbackToLocalMode() {
  const current = getDataMode();
  if (current !== 'local') {
    setDataMode('local');
    console.log('[dataMode] Falling back to local mode');
    return true;
  }
  return false;
}
