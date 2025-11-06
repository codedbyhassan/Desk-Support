import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grsxdhsargbqxvamcstt.supabase.co'
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyc3hkaHNhcmdicXh2YW1jc3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDM2MDIsImV4cCI6MjA3NjI3OTYwMn0.bqeWlBW-wLXv3cKzhJs0wDoCTluIyTJWSGAL4oqlDLg'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  }
})

// ============================================================================
// IMPORTANT: All type definitions have been moved to @/types/database
// Import from there instead of this file!
// 
// Example:
// import { User, Asset, Ticket } from '@/types/database'
// ============================================================================