import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.')
}

/**
 * The single browser Supabase client for Desk-Support.
 *
 * Database is supplied at the client boundary so every feature shares the
 * same schema contract. Domain/feature types should be derived from
 * `@/types/database` or `@/types/domain`, never from another client wrapper.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
    storageKey: 'desk-support-auth',
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  db: { schema: 'public' },
  global: {
    headers: { 'X-Client-Info': 'desk-support-app' },
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})
