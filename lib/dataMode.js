// Data mode management utility
// Controls whether the app uses localStorage only or Supabase

const DATA_MODE_KEY = 'goldfinch_admin_data_mode';

/**
 * Get the current data mode
 * @returns {'local' | 'supabase'}
 */
export function getDataMode() {
  try {
    const mode = localStorage.getItem(DATA_MODE_KEY);
    return mode === 'supabase' ? 'supabase' : 'local';
  } catch (e) {
    return 'local';
  }
}

/**
 * Set the data mode
 * @param {'local' | 'supabase'} mode
 */
export function setDataMode(mode) {
  localStorage.setItem(DATA_MODE_KEY, mode);
  // Dispatch event so components can react to mode change
  window.dispatchEvent(new CustomEvent('dataModeChanged', { detail: { mode } }));
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
