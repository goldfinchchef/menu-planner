import { createClient } from '@supabase/supabase-js';
import { isSupabaseMode } from './dataMode';

// Capture env vars at build time (Vite inlines these)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Track configuration error state
let configError = null;
let supabase = null;

// === TEMPORARY DIAGNOSTIC (remove after debugging mobile issue) ===
const BUILD_TIMESTAMP = new Date().toISOString();
console.log('[Supabase Init] Build timestamp:', BUILD_TIMESTAMP);
console.log('[Supabase Init] VITE_SUPABASE_URL present:', !!supabaseUrl);
console.log('[Supabase Init] VITE_SUPABASE_ANON_KEY present:', !!supabaseAnonKey);
console.log('[Supabase Init] URL starts with:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'N/A');
// === END TEMPORARY DIAGNOSTIC ===

// Initialize Supabase client
if (!supabaseUrl || !supabaseAnonKey) {
  configError = 'Supabase not configured (build env missing)';
  console.error('[Supabase Init] ERROR:', configError);
  console.error('[Supabase Init] Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Netlify environment variables');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase Init] Client created successfully');
  } catch (e) {
    configError = `Failed to create Supabase client: ${e.message}`;
    console.error('[Supabase Init] ERROR:', configError);
  }
}

export { supabase };

/**
 * Get configuration error if any
 * @returns {string|null} Error message or null if configured correctly
 */
export function getConfigError() {
  return configError;
}

/**
 * Check if Supabase is reachable
 */
export async function checkConnection() {
  // In local mode, don't even try to connect
  if (!isSupabaseMode()) {
    console.log('[checkConnection] Local mode - skipping connection check');
    return false;
  }

  if (configError) {
    console.error('[checkConnection] Config error:', configError);
    return false;
  }

  if (!supabase) {
    console.warn('[checkConnection] Supabase client not initialized');
    return false;
  }

  try {
    console.log('[checkConnection] Testing connection...');
    const { error } = await supabase.from('app_settings').select('key').limit(1);
    // If table doesn't exist yet, that's ok - connection still works
    if (error && !error.message.includes('does not exist')) {
      console.error('[checkConnection] Connection error:', error);
      return false;
    }
    console.log('[checkConnection] Connection successful');
    return true;
  } catch (e) {
    console.error('[checkConnection] Connection failed:', e);
    return false;
  }
}

/**
 * Check if Supabase is configured AND mode is supabase
 */
export function isConfigured() {
  // Must be in Supabase mode AND have credentials AND no config error
  return isSupabaseMode() && !!supabase && !configError;
}

/**
 * Check if credentials exist (regardless of mode)
 */
export function hasCredentials() {
  return !!supabase && !configError;
}

/**
 * Get diagnostic info for debugging
 */
export function getDiagnostics() {
  return {
    buildTimestamp: BUILD_TIMESTAMP,
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    clientCreated: !!supabase,
    configError: configError,
    isSupabaseMode: isSupabaseMode()
  };
}
