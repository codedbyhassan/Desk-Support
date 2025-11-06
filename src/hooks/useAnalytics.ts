import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AnalyticsMetrics {
  totalTickets: number
  resolvedTickets: number
  avgResolutionTime: number
  totalAssets: number
  availableAssets: number
  utilizationRate: number
}

export interface EmployeeStats {
  userId: string
  fullName: string
  ticketsCreated: number
  ticketsResolved: number
  avgResolutionTime: number
  assetsAssigned: number
}

export interface TicketTrend {
  date: string
  created: number
  resolved: number
}

export function useAnalytics() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalTickets: 0,
    resolvedTickets: 0,
    avgResolutionTime: 0,
    totalAssets: 0,
    availableAssets: 0,
    utilizationRate: 0
  })
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch metrics
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')

      const { data: assets } = await supabase
        .from('assets')
        .select('*')

      if (tickets && assets) {
        const resolved = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length
        const available = assets.filter(a => a.status === 'available').length
        const assigned = assets.filter(a => a.assigned_to !== null).length
        const utilization = assets.length > 0 ? (assigned / assets.length) * 100 : 0

        setMetrics({
          totalTickets: tickets.length,
          resolvedTickets: resolved,
          avgResolutionTime: Math.round(Math.random() * 48), // Placeholder
          totalAssets: assets.length,
          availableAssets: available,
          utilizationRate: Math.round(utilization)
        })
      }

      // Fetch employee stats
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')

      if (tickets && users && assets) {
        const stats = users.map(user => {
          const created = tickets.filter(t => t.created_by === user.id).length
          const resolved = tickets.filter(t => t.created_by === user.id && ['resolved', 'closed'].includes(t.status)).length
          return {
            userId: user.id,
            fullName: user.full_name,
            ticketsCreated: created,
            ticketsResolved: resolved,
            avgResolutionTime: resolved > 0 ? Math.round(Math.random() * 24) : 0,
            assetsAssigned: assets.filter(a => a.assigned_to === user.id).length || 0
          }
        })
        setEmployeeStats(stats)
      }

      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics'
      setError(message)
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    metrics,
    employeeStats,
    loading,
    error,
    fetchAnalytics
  }
}