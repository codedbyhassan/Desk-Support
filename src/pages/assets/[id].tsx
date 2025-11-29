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
  Sparkles,
  Tag,
  User,
  Wrench,
} from 'lucide-react'
import * as XLSX from 'xlsx'

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
  const [companyUsers, setCompanyUsers] = useState<UserRow[]>([])
  const [assignmentUpdating, setAssignmentUpdating] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    loadAsset()
    if (user?.role === 'admin') {
      loadCompanyUsers()
    }
  }, [id, user?.company_id, user?.role])

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

  const loadCompanyUsers = async () => {
    if (!user?.company_id) return
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', user.company_id)
        .order('full_name')
      if (error) throw error
      setCompanyUsers((data as UserRow[]) || [])
    } catch (err) {
      console.error('Failed to load company users', err)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleAssignmentChange = async (userId: string | null) => {
    if (!asset) return
    setAssignmentUpdating(true)
    try {
      const { error } = await supabase
        .from('assets')
        .update({ assigned_to: userId })
        .eq('id', asset.id)
      if (error) throw error
      
      const userName = userId ? (companyUsers.find(u => u.id === userId)?.full_name || 'Unknown user') : 'Unassigned'
      setAsset({ ...asset, assigned_to: userId })
      toast({
        title: userId ? 'Asset reassigned' : 'Asset unassigned',
        description: userId ? `Asset assigned to ${userName}.` : 'Asset is now available for assignment.',
      })
    } catch (err) {
      console.error('Failed to assign asset', err)
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setAssignmentUpdating(false)
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

  const exportAssetToXLSX = () => {
    try {
      const obj: Record<string, any> = {
        ID: asset.id,
        Name: asset.name,
        Description: asset.description || '',
        Serial: asset.serial_number || '',
        Category: asset.category || '',
        Status: asset.status,
        AssignedTo: asset.assigned_user?.full_name || '',
        PurchaseDate: asset.purchase_date || '',
        PurchasePrice: asset.purchase_price != null ? asset.purchase_price : '',
        WarrantyExpiry: asset.warranty_expiry || '',
        CreatedAt: asset.created_at || '',
        UpdatedAt: asset.updated_at || '',
        PhotoURL: asset.photo_url || '',
      }

      const ws = XLSX.utils.json_to_sheet([obj])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Asset')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asset-${asset.id}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({ title: 'Success', description: 'Asset exported as Excel' })
    } catch (err) {
      console.error('Asset XLSX export failed', err)
      toast({ title: 'Export failed', description: 'Could not create Excel file' })
    }
  }

  const exportAssetToPDF = async () => {
    try {
      const node = document.getElementById('asset-detail-export')
      if (!node) throw new Error('Export element not found')

      const html2canvasMod = await import('html2canvas')
      const jspdfMod = await import('jspdf')
      const html2canvas = (html2canvasMod as any).default || html2canvasMod
      const { jsPDF } = jspdfMod as any

      const canvas = await html2canvas(node, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()

      const imgWidth = pageWidth - 20 // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      pdf.save(`asset-${asset.id}.pdf`)

      toast({ title: 'Success', description: 'Asset exported as PDF' })
    } catch (err) {
      console.error('PDF export failed', err)
      toast({ title: 'Export failed', description: 'Could not create PDF' })
    }
  }

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

      <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20 overflow-hidden">
        <div id="asset-detail-export" className="relative px-4 py-6 lg:px-8 lg:py-8 grid gap-6 lg:grid-cols-[1fr_420px] items-start">
          {/* Left: large image panel */}
          <div className="w-full">
            <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5">
              <img
                src={assetImage}
                alt={`${asset.name} photo`}
                className="w-full h-[520px] sm:h-[440px] md:h-[520px] lg:h-[640px] object-cover"
              />
            </div>
          </div>

          {/* Right: compact info/actions */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
              Asset Profile
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`text-xs ${statusTokens[asset.status].badge} capitalize`}>{statusTokens[asset.status].label}</Badge>
                <span className="text-white/60 text-sm">ID: {asset.id.slice(0, 8)}</span>
              </div>
              {assetAge && <div className="text-xs text-white/60 mt-1">{assetAge}</div>}
              {asset.description && <p className="text-sm text-white/80 mt-3">{asset.description}</p>}
            </div>

            <div className="grid gap-3">
              {heroMetrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </div>
                  <div className="font-semibold">{m.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-2xl h-10 px-4" onClick={exportAssetToPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" className="rounded-2xl h-10 px-4" onClick={exportAssetToXLSX}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={() => {}} className="bg-white text-slate-900 rounded-2xl h-10 px-4">
                  <Sparkles className="h-4 w-4 mr-2 text-slate-600" />
                  Action
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Asset insights</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Operational snapshot</h2>
              </div>
              <Badge variant="outline" className="rounded-full text-xs capitalize">
                {asset.category || 'Uncategorized'}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Serial Number</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">{asset.serial_number || '—'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Tracked identifier for compliance.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Lifecycle</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                  {asset.purchase_date ? formatDate(asset.purchase_date) : 'Not recorded'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Warranty {asset.warranty_expiry ? `until ${formatDate(asset.warranty_expiry)}` : 'not configured'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${statusTokens[asset.status].badge}`}>{statusTokens[asset.status].label}</Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusTokens[asset.status].chip}`}>
                    Updated {formatDate(asset.updated_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
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
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Investment</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                  {asset.purchase_price ? `$${asset.purchase_price.toLocaleString()}` : 'Not provided'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Capex reference for finance teams.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Ownership</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assignment</h2>
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
            {user?.role === 'admin' ? (
              <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-800 dark:text-white">Assign to team member</p>
                <Select
                  value={asset.assigned_to || '__none'}
                  onValueChange={(value) => handleAssignmentChange(value === '__none' ? null : value)}
                  disabled={assignmentUpdating || usersLoading}
                >
                  <SelectTrigger className="w-full rounded-2xl">
                    <SelectValue placeholder={usersLoading ? 'Loading users...' : 'Select user'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {companyUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : asset.assigned_user ? (
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
              </div>
            )}
            <Separator />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Quick actions</p>
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
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Lifecycle</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Activity timeline</h2>
              </div>
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-0">
                {timeline.length} events
              </Badge>
            </div>
            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <Activity className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-500" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">No recorded events yet.</p>
              </div>
            ) : (
              <ol className="space-y-4">
                {timeline.map((entry) => (
                  <li key={entry.id} className="relative pl-6">
                    <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-slate-300" />
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                        {entry.action.replace(/_/g, ' ')}
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-400">{formatDate(entry.created_at, true)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      by {entry.performer?.full_name || 'System'}
                      {entry.assignee?.full_name ? ` • assignee: ${entry.assignee.full_name}` : ''}
                    </p>
                    {entry.notes && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{entry.notes}</p>}
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
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Readiness</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Health & compliance</h2>
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Security posture</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Maintenance cadence</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Warranty status</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
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

