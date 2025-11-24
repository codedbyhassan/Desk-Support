// supabase.ts - Fixed to prevent session loss
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://grsxdhsargbqxvamcstt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyc3hkaHNhcmdicXh2YW1jc3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDM2MDIsImV4cCI6MjA3NjI3OTYwMn0.bqeWlBW-wLXv3cKzhJs0wDoCTluIyTJWSGAL4oqlDLg'

// ✅ CRITICAL: Only log once, not on every import
let hasLoggedCreation = false

// ✅ Create a singleton instance - NEVER recreate this
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ Keep session in localStorage
    autoRefreshToken: true, // ✅ Auto refresh tokens
    storage: window.localStorage, // ✅ Use localStorage (not undefined check)
    storageKey: 'desk-support-auth', // ✅ Unique key
    detectSessionInUrl: true,
    // ✅ IMPORTANT: Don't trigger events on storage changes to prevent loops
    flowType: 'pkce',
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'desk-support-app'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// ✅ Only log once
if (!hasLoggedCreation) {
  console.log('🔌 Created Supabase client singleton')
  hasLoggedCreation = true
}

export { supabase }

// ============================================================================
// IMPORTANT: All type definitions have been moved to @/types/database
// Import from there instead of this file!
// 
// Example:
// import { User, Asset, Ticket } from '@/types/database'
// ============================================================================