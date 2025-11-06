import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AuditLogEntry {
  id: string
  user_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  target_type: string
  target_id: string
  details: any
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

export function useAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async (filters?: {
    targetType?: string
    action?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(full_name, email)
        `)

      if (filters?.targetType) {
        query = query.eq('target_type', filters.targetType)
      }
      if (filters?.action) {
        query = query.eq('action', filters.action)
      }

      const { data, error: err } = await query
        .order('created_at', { ascending: false })
        .limit(100)

      if (err) throw err
      setLogs(data || [])
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit logs'
      setError(message)
      console.error('Audit log error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    logs,
    loading,
    error,
    fetchLogs
  }
}