import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowUpRight, Bell, CheckCircle2, Clock3, Package, Plus, Ticket, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useAnalytics } from '@/hooks/useAnalytics'
import { getExactCompanyCounts, type ExactCompanyCounts } from '@/lib/dataAccess'
import { supabase } from '@/lib/supabase'
import Loader from '@/components/Loader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const EMPTY_COUNTS: ExactCompanyCounts = {
  users_total: 0,
  users_unique: 0,
  departments_total: 0,
  teams_total: 0,
  ticket_categories_total: 0,
  tickets_total: 0,
  tickets_open: 0,
  tickets_in_progress: 0,
  tickets_pending: 0,
  tickets_resolved: 0,
  tickets_closed: 0,
  tickets_unresolved: 0,
  tickets_overdue: 0,
  assets_total: 0,
  asset_assignments_active: 0,
  ticket_assignments_active: 0,
  ticket_comments_total: 0,
  ticket_attachments_total: 0,
  workspace_folders_total: 0,
  workspace_files_total: 0,
  notifications_unread: 0,
  attendance_today: 0,
  qr_codes_active: 0,
  qr_scans_today: 0,
  video_calls_total: 0,
  video_calls_active: 0,
  subscriptions_total: 0,
  payments_total: 0,
  audit_logs_total: 0,
}

export default function DashboardPage() {
  const { user, company } = useAuth()
  const navigate = useNavigate()
  const { metrics, ticketTrend, loading: analyticsLoading, error: analyticsError, fetchAnalytics } = useAnalytics()
  const [counts, setCounts] = useState<ExactCompanyCounts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!user?.company_id) return

    try {
      setError(null)
      setCounts(await getExactCompanyCounts(user.company_id))
      await fetchAnalytics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard')
    }
  }, [fetchAnalytics, user?.company_id])

  useEffect(() => {
    if (!user?.company_id) return

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getExactCompanyCounts(user.company_id), fetchAnalytics()])
      .then(([nextCounts]) => {
        if (!cancelled) setCounts(nextCounts)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const channel = supabase
      .channel(`dashboard-${user.company_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `company_id=eq.${user.company_id}` }, loadDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `company_id=eq.${user.company_id}` }, loadDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_memberships', filter: `company_id=eq.${user.company_id}` }, loadDashboard)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [fetchAnalytics, loadDashboard, user?.company_id])

  if (!user || loading || analyticsLoading) return <Loader />

  const resolved = counts.tickets_resolved + counts.tickets_closed
  const active = counts.tickets_open + counts.tickets_in_progress + counts.tickets_pending
  const recentTrend = ticketTrend.slice(-7)
  const maxTrend = Math.max(1, ...recentTrend.map(point => Math.max(point.created, point.resolved)))
  const canManageUsers = user.role === 'admin' || user.role === 'hr'

  const stats = [
    { label: 'Total tickets', value: counts.tickets_total, note: `${active} active`, icon: Ticket, href: '/app/tickets' },
    { label: 'Resolved', value: resolved, note: `${counts.tickets_total ? Math.round(resolved / counts.tickets_total * 100) : 0}% of all tickets`, icon: CheckCircle2, href: '/app/tickets' },
    { label: 'Assets', value: counts.assets_total, note: `${metrics.availableAssets} available`, icon: Package, href: '/app/assets' },
    { label: 'Team members', value: counts.users_total, note: `${counts.teams_total} teams`, icon: Users, href: canManageUsers ? '/app/users' : undefined },
  ]

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-1 text-xs font-medium text-muted-foreground">{company?.name || 'Workspace'}</p><h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">A concise view of your support operation.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => navigate('/app/notifications')} className="h-9 rounded-lg"><Bell className="mr-2 h-4 w-4"/>Notifications{counts.notifications_unread > 0 && <span className="ml-2 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{counts.notifications_unread}</span>}</Button><Button onClick={() => navigate('/app/tickets/new')} className="h-9 rounded-lg"><Plus className="mr-2 h-4 w-4"/>New ticket</Button></div>
    </section>

    {(error || analyticsError) && <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive shadow-none">{error || analyticsError}</Card>}

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map(({label,value,note,icon:Icon,href}) => <button key={label} onClick={() => href && navigate(href)} disabled={!href} className="text-left disabled:cursor-default"><Card className="border-border bg-card p-4 shadow-none transition-colors hover:bg-muted/30"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></div><span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4"/></span></div></Card></button>)}</section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_360px]">
      <Card className="overflow-hidden border-border bg-card shadow-none"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-semibold">Ticket activity</h2><p className="mt-0.5 text-xs text-muted-foreground">Created vs resolved over the last 7 recorded days</p></div><Activity className="h-4 w-4 text-muted-foreground"/></div><div className="p-5"><div className="flex h-56 items-end gap-2 sm:gap-4">{recentTrend.map(point => <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className="flex h-44 w-full items-end justify-center gap-1 rounded-md bg-muted/30 px-1"><div className="w-2.5 rounded-t bg-primary/25" style={{height:`${Math.max(4, point.created / maxTrend * 100)}%`}}/><div className="w-2.5 rounded-t bg-primary" style={{height:`${Math.max(4, point.resolved / maxTrend * 100)}%`}}/></div><span className="text-[10px] text-muted-foreground">{new Date(point.date).toLocaleDateString(undefined,{weekday:'short'})}</span></div>)}{!recentTrend.length && <div className="grid w-full place-items-center text-sm text-muted-foreground">No ticket activity yet.</div>}</div><div className="mt-4 flex gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-primary/25"/>Created</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-primary"/>Resolved</span></div></div></Card>
      <Card className="border-border bg-card shadow-none"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Operational snapshot</h2><p className="mt-0.5 text-xs text-muted-foreground">Current workload at a glance</p></div><div className="divide-y divide-border">{[['Open tickets',counts.tickets_open,'/app/tickets',Clock3],['In progress',counts.tickets_in_progress,'/app/tickets',Activity],['Active assignments',counts.ticket_assignments_active,'/app/tickets',Users],['Available assets',metrics.availableAssets,'/app/assets',Package]].map(([label,value,href,Icon]) => <button key={String(label)} onClick={()=>navigate(String(href))} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/40"><span className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-muted-foreground"/></span><span className="flex-1"><span className="block text-sm font-medium">{label}</span><span className="block text-[11px] text-muted-foreground">View details</span></span><span className="text-sm font-semibold">{value as number}</span><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground"/></button>)}</div></Card>
    </section>
  </div>
}
