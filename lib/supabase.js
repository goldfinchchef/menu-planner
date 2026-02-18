import { createClient } from '@supabase/supabase-js';
import { isSupabaseMode } from './dataMode';

// Capture env vars at build time (Vite inlines these)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Track configuration error state
let configError = null;
let supabase = null;

// === DIAGNOSTIC LOGGING ===
const BUILD_TIMESTAMP = new Date().toISOString();

// Parse and validate URL
let supabaseHost = null;
let isValidProjectUrl = false;
try {
  if (supabaseUrl) {
    const parsed = new URL(supabaseUrl);
    supabaseHost = parsed.host;
    // Valid project URLs end with .supabase.co or .supabase.cloud
    isValidProjectUrl = supabaseHost.endsWith('.supabase.co') || supabaseHost.endsWith('.supabase.cloud');
  }
} catch (e) {
  supabaseHost = 'INVALID_URL';
}

console.log('[Supabase Init] Build:', BUILD_TIMESTAMP);
console.log('[Supabase Init] Host:', supabaseHost || 'NOT_SET');
console.log('[Supabase Init] Valid project URL:', isValidProjectUrl);
console.log('[Supabase Init] Anon key present:', !!supabaseAnonKey);

// Warn if using wrong URL
if (supabaseHost === 'api.supabase.com') {
  console.error('[Supabase Init] ❌ WRONG URL! api.supabase.com is the management API, not your project database.');
  console.error('[Supabase Init] ❌ Use your project URL: https://<project-ref>.supabase.co');
}
// === END DIAGNOSTIC ===

// Initialize Supabase client
if (!supabaseUrl || !supabaseAnonKey) {
  configError = 'Supabase not configured (build env missing)';
  console.error('[Supabase Init] ERROR:', configError);
  console.error('[Supabase Init] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify environment variables');
} else if (!isValidProjectUrl) {
  configError = `Invalid Supabase URL: ${supabaseHost}. Expected *.supabase.co or *.supabase.cloud`;
  console.error('[Supabase Init] ERROR:', configError);
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase Init] ✓ Client created for', supabaseHost);
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
 * Always attempts connection if credentials exist (mode doesn't matter)
 */
export async function checkConnection() {
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
 * Check if Supabase credentials are configured
 * (mode doesn't matter - Supabase is always attempted first if configured)
 */
export function isConfigured() {
  return !!supabase && !configError;
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
    host: supabaseHost,
    isValidProjectUrl: isValidProjectUrl,
    hasKey: !!supabaseAnonKey,
    clientCreated: !!supabase,
    configError: configError,
    isSupabaseMode: isSupabaseMode()
  };
}
