import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error('Failed to create Supabase client:', e);
  }
}

export { supabase };

// Check if Supabase is reachable
export async function checkConnection() {
  if (!supabase) {
    console.warn('Supabase client not initialized - missing credentials');
    return false;
  }

  try {
    const { error } = await supabase.from('app_settings').select('key').limit(1);
    // If table doesn't exist yet, that's ok - connection still works
    if (error && !error.message.includes('does not exist')) {
      console.error('Supabase connection error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase connection failed:', e);
    return false;
  }
}

// Check if Supabase is configured (credentials present)
export function isConfigured() {
  return !!supabase;
}
