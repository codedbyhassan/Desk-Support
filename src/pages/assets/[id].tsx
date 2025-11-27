import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Database } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  Package,
  RefreshCcw,
  Shield,
  Sparkles,
  Tag,
  User,
  Wrench,
} from 'lucide-react'

type AssetRow = Database['public']['Tables']['assets']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type AssetHistoryRow = Database['public']['Tables']['asset_history']['Row']

type AssetDetail = AssetRow & {
  assigned_user?: Pick<UserRow, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role'> | null
}

type HistoryEntry = AssetHistoryRow & {
  performer?: Pick<UserRow, 'id' | 'full_name' | 'avatar_url'> | null
  assignee?: Pick<UserRow, 'id' | 'full_name'> | null
}

const statusTokens: Record<
  AssetRow['status'],
  {
    label: string
    badge: string
    chip: string
  }
> = {
  available: {
    label: 'Available',
    badge: 'bg-emerald-50 text-emerald-700 border-0',
    chip: 'text-emerald-300 bg-emerald-500/10',
  },
  assigned: {
    label: 'Assigned',
    badge: 'bg-blue-50 text-blue-700 border-0',
    chip: 'text-blue-200 bg-blue-500/10',
  },
  maintenance: {
    label: 'In maintenance',
    badge: 'bg-amber-50 text-amber-700 border-0',
    chip: 'text-amber-200 bg-amber-500/10',
  },
  retired: {
    label: 'Retired',
    badge: 'bg-slate-100 text-slate-600 border-0',
    chip: 'text-slate-200 bg-slate-500/10',
  },
}

const statusOptions: { value: AssetRow['status']; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
]

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [timeline, setTimeline] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    loadAsset()
  }, [id, user?.company_id])

  const loadAsset = async () => {
    if (!id || !user?.company_id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(
          `
          *,
          assigned_user:assigned_to(full_name, email, avatar_url, role)
        `
        )
        .eq('id', id)
        .eq('company_id', user.company_id)
        .single()

      if (error) throw error
      setAsset(data as AssetDetail)

      const { data: historyData, error: historyError } = await supabase
        .from('asset_history')
        .select(
          `
          *,
          performer:users!asset_history_performed_by_fkey(id, full_name, avatar_url),
          assignee:users!asset_history_assigned_to_fkey(id, full_name)
        `
        )
        .eq('asset_id', id)
        .order('created_at', { ascending: false })

      if (historyError) throw historyError
      setTimeline(historyData || [])
    } catch (err) {
      console.error('Failed to load asset detail', err)
      toast({
        variant: 'destructive',
        title: 'Unable to load asset',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (nextStatus: AssetRow['status']) => {
    if (!asset || asset.status === nextStatus) return
    setStatusUpdating(true)
    try {
      const { error } = await supabase.from('assets').update({ status: nextStatus }).eq('id', asset.id)
      if (error) throw error
      setAsset({ ...asset, status: nextStatus })
      toast({
        title: 'Status updated',
        description: `${asset.name} is now ${statusTokens[nextStatus].label.toLowerCase()}.`,
      })
      await loadAsset()
    } catch (err) {
      console.error('Failed to update status', err)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setStatusUpdating(false)
    }
  }

  const heroMetrics = useMemo(() => {
    if (!asset) return []

    return [
      {
        label: 'Category',
        value: asset.category || 'Uncategorized',
        icon: Tag,
      },
      {
        label: 'Serial',
        value: asset.serial_number || '–',
        icon: Package,
      },
      {
        label: 'Purchased',
        value: asset.purchase_date ? formatDate(asset.purchase_date) : 'Not recorded',
        icon: Calendar,
      },
    ]
  }, [asset])

  const assetAge = useMemo(() => {
    if (!asset?.purchase_date) return null
    const purchase = new Date(asset.purchase_date)
    const diffYears = (Date.now() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365)
    return diffYears < 1 ? 'Under 1 year old' : `${diffYears.toFixed(1)} yrs in service`
  }, [asset?.purchase_date])

  if (loading) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-60 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="space-y-6 text-center py-20">
        <p className="text-lg font-semibold text-slate-800">Asset not found</p>
        <p className="text-sm text-slate-500">The requested asset could not be located.</p>
        <Button onClick={() => navigate('/app/assets')} className="rounded-2xl">
          Return to inventory
        </Button>
      </div>
    )
  }

  const assetImage = asset.photo_url || 'https://placehold.co/600x400/f1f5f9/94a3b8?text=Asset+Photo'

  return (
    <div className="space-y-6 lg:space-y-8">
      <Button
        variant="ghost"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        onClick={() => navigate('/app/assets')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inventory
      </Button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent)]" />
          <div className="absolute -top-20 -right-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-500/20 blur-[140px]" />
        </div>
        <div className="relative px-6 py-8 lg:px-10 lg:py-12 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-5 w-full">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
              <Shield className="h-3.5 w-3.5" />
              Asset Profile
            </div>
            <div className="w-full">
              <div className="relative rounded-[28px] overflow-hidden border border-white/10 bg-white/5">
                <img
                  src={assetImage}
                  alt={`${asset.name} photo`}
                  className="h-56 w-full object-cover"
                />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-900/50 to-transparent" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">{asset.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                <Badge className={`text-xs ${statusTokens[asset.status].badge} capitalize`}>
                  {statusTokens[asset.status].label}
                </Badge>
                <span className="text-white/60">ID: {asset.id.slice(0, 8)}</span>
                {assetAge && <span className="text-white/60">{assetAge}</span>}
              </div>
              {asset.description && <p className="text-sm text-white/80 max-w-2xl">{asset.description}</p>}
            </div>
            <div className="flex flex-wrap gap-4">
              {heroMetrics.map((metric) => {
                const Icon = metric.icon
                return (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 min-w-[150px] backdrop-blur"
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
                      <Icon className="h-3.5 w-3.5" />
                      {metric.label}
                    </div>
                    <p className="text-lg font-semibold mt-1">{metric.value}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <Button variant="secondary" className="bg-white/10 text-white border border-white/20 rounded-2xl h-11 px-6">
              <Download className="h-4 w-4 mr-2" />
              Export dossier
            </Button>
            <Button className="bg-white text-slate-900 rounded-2xl shadow-lg shadow-slate-900/20 h-11 px-6">
              <Sparkles className="h-4 w-4 mr-2 text-slate-600" />
              New service action
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Asset insights</p>
                <h2 className="text-lg font-semibold text-slate-900">Operational snapshot</h2>
              </div>
              <Badge variant="outline" className="rounded-full text-xs capitalize">
                {asset.category || 'Uncategorized'}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Serial Number</p>
                <p className="text-base font-semibold text-slate-900 mt-1">{asset.serial_number || '—'}</p>
                <p className="text-xs text-slate-500 mt-1">Tracked identifier for compliance.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Lifecycle</p>
                <p className="text-base font-semibold text-slate-900 mt-1">
                  {asset.purchase_date ? formatDate(asset.purchase_date) : 'Not recorded'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Warranty {asset.warranty_expiry ? `until ${formatDate(asset.warranty_expiry)}` : 'not configured'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${statusTokens[asset.status].badge}`}>{statusTokens[asset.status].label}</Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusTokens[asset.status].chip}`}>
                    Updated {formatDate(asset.updated_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {asset.status === 'available'
                    ? 'Ready for immediate assignment.'
                    : asset.status === 'assigned'
                    ? 'Currently in the field.'
                    : asset.status === 'maintenance'
                    ? 'Service team engaged.'
                    : 'Archived and no longer in rotation.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Investment</p>
                <p className="text-base font-semibold text-slate-900 mt-1">
                  {asset.purchase_price ? `$${asset.purchase_price.toLocaleString()}` : 'Not provided'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Capex reference for finance teams.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Ownership</p>
                <h2 className="text-lg font-semibold text-slate-900">Assignment</h2>
              </div>
              {user?.role === 'admin' && (
                <Select
                  value={asset.status}
                  onValueChange={(value) => handleStatusChange(value as AssetRow['status'])}
                  disabled={statusUpdating}
                >
                  <SelectTrigger className="w-36 rounded-2xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {asset.assigned_user ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={asset.assigned_user.avatar_url || undefined} />
                  <AvatarFallback className="bg-slate-900 text-white">
                    {asset.assigned_user.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{asset.assigned_user.full_name}</p>
                  <p className="text-xs text-slate-500">{asset.assigned_user.email}</p>
                  <Badge variant="secondary" className="mt-2 text-xs capitalize">
                    {asset.assigned_user.role}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                <p className="text-sm font-medium text-slate-800">Unassigned asset</p>
                <p className="text-xs text-slate-500">Perfect candidate for upcoming onboardings.</p>
                <Button
                  variant="outline"
                  className="mt-3 rounded-2xl text-sm"
                  onClick={() => navigate('/app/users')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Assign to user
                </Button>
              </div>
            )}
            <Separator />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Quick actions</p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full rounded-2xl justify-between">
                  Open service ticket
                  <Wrench className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full rounded-2xl justify-between">
                  Refresh compliance
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Lifecycle</p>
                <h2 className="text-lg font-semibold text-slate-900">Activity timeline</h2>
              </div>
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-0">
                {timeline.length} events
              </Badge>
            </div>
            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <Activity className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No recorded events yet.</p>
              </div>
            ) : (
              <ol className="space-y-4">
                {timeline.map((entry) => (
                  <li key={entry.id} className="relative pl-6">
                    <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-slate-300" />
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-900 capitalize">
                        {entry.action.replace(/_/g, ' ')}
                      </p>
                      <span className="text-xs text-slate-400">{formatDate(entry.created_at, true)}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      by {entry.performer?.full_name || 'System'}
                      {entry.assignee?.full_name ? ` • assignee: ${entry.assignee.full_name}` : ''}
                    </p>
                    {entry.notes && <p className="text-sm text-slate-600 mt-1">{entry.notes}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Readiness</p>
                <h2 className="text-lg font-semibold text-slate-900">Health & compliance</h2>
              </div>
              <Badge variant="outline" className="rounded-full text-xs">
                Monitored
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Security posture</p>
                  <p className="text-xs text-slate-500">
                    {asset.status === 'retired'
                      ? 'Archived from compliance scope.'
                      : 'Asset meets baseline hardening controls.'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Maintenance cadence</p>
                  <p className="text-xs text-slate-500">
                    {asset.status === 'maintenance'
                      ? 'Currently undergoing service.'
                      : 'No open service orders.'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Warranty status</p>
                  <p className="text-xs text-slate-500">
                    {asset.warranty_expiry ? `Coverage until ${formatDate(asset.warranty_expiry)}` : 'Warranty not tracked'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function formatDate(value: string, withTime = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

