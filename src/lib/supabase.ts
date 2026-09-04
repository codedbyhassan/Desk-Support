import { createClient } from '@supabase/supabase-js'
import type { Asset, Ticket, User } from '@/types/database'

export type { Asset, User }
export type Tickets = Ticket

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.')
}

/**
 * Single browser Supabase client.
 *
 * The database schema is the runtime source of truth. Generated database
 * typings are maintained separately so stale historical types cannot silently
 * redirect the application to removed tables or columns.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
