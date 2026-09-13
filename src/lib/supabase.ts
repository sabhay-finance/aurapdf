import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Returns a browser-safe Supabase client if public credentials are configured.
 * Safely returns null if running in offline local development without Supabase keys.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}
