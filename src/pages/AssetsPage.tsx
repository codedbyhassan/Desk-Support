import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Archive, CalendarDays, CheckCircle2, Eye, ImagePlus, MapPin, Package, Plus, Search, ShieldCheck, Upload, UserRound, Wrench } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Asset, AssetCondition, AssetStatus } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

const ASSET_COLUMNS = 'id,company_id,asset_tag,name,description,category,manufacturer,model,serial_number,status,condition,purchase_date,purchase_cost,warranty_expires_at,location,notes,metadata,created_by,created_at,updated_at,archived_at'
const IMAGE_BUCKET = 'asset-images'
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const statuses: AssetStatus[] = ['active', 'assigned', 'maintenance', 'retired', 'lost']
const conditions: AssetCondition[] = ['new', 'good', 'fair', 'poor', 'damaged']

type FormState = {
  asset_tag: string
  name: string
  description: string
  category: string
  manufacturer: string
  model: string
  serial_number: string
  status: AssetStatus
  condition: AssetCondition
  purchase_date: string
  purchase_cost: string
  warranty_expires_at: string
  location: string
  notes: string
  assigned_to: string
  image: File | null
}

const emptyForm = (): FormState => ({
  asset_tag: '',
  name: '',
  description: '',
  category: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  status: 'active',
  condition: 'new',
  purchase_date: '',
  purchase_cost: '',
  warranty_expires_at: '',
  location: '',
  notes: '',
  assigned_to: 'none',
  image: null,
})

function label(value: string) {
  return value.replaceAll('_', ' ')
}

function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—'
}

function money(value: number | null) {
  return value == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(value)
}

function statusTone(value: AssetStatus) {
  const tones: Record<AssetStatus, string> = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    assigned: 'border-blue-200 bg-blue-50 text-blue-700',
    maintenance: 'border-amber-200 bg-amber-50 text-amber-700',
    retired: 'border-slate-200 bg-slate-100 text-slate-600',
    lost: 'border-red-200 bg-red-50 text-red-700',
  }
  return tones[value]
}

export default function AssetsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const fileRef = useRef<HTMLInputElement>(null)
  const canManage = ['admin', 'hr', 'manager'].includes(user?.role ?? '')

  const [assets, setAssets] = useState<Asset[]>([])
  const [images, setImages] = useState<Map<string, string>>(new Map())
  const [people, setPeople] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | AssetStatus>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Asset | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const load = useCallback(async (background = false) => {
    if (!user?.company_id) return
    if (background) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from('assets')
        .select(ASSET_COLUMNS)
        .eq('company_id', user.company_id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error

      const rows = (data ?? []) as unknown as Asset[]
      if (!rows.length) {
        setAssets([])
        setImages(new Map())
      } else {
        const ids = rows.map((asset) => asset.id)
        const [imageResult, assignmentResult] = await Promise.all([
          supabase.from('asset_images').select('asset_id,storage_path,is_primary,created_at').in('asset_id', ids).order('created_at', { ascending: false }),
          supabase.from('asset_assignments').select('asset_id,assigned_to,assigned_at').in('asset_id', ids).is('returned_at', null),
        ])
        if (imageResult.error) throw imageResult.error
        if (assignmentResult.error) throw assignmentResult.error

        const primaryPaths = new Map<string, string>()
        for (const image of imageResult.data ?? []) {
          if (!primaryPaths.has(image.asset_id) || image.is_primary) primaryPaths.set(image.asset_id, image.storage_path)
        }

        const paths = [...primaryPaths.values()]
        if (paths.length) {
          const signed = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 3600)
          if (signed.error) throw signed.error
          const pathToUrl = new Map(paths.map((path, index) => [path, signed.data?.[index]?.signedUrl ?? '']))
          setImages(new Map([...primaryPaths].map(([assetId, path]) => [assetId, pathToUrl.get(path) ?? ''])))
        } else {
          setImages(new Map())
        }

        const assignmentMap = new Map((assignmentResult.data ?? []).map((row) => [row.asset_id, row]))
        setAssets(rows.map((asset) => ({
          ...asset,
          assigned_to: assignmentMap.get(asset.id)?.assigned_to ?? null,
          assigned_at: assignmentMap.get(asset.id)?.assigned_at ?? null,
        })) as Asset[])
      }

      const membershipResult = await supabase
        .from('company_memberships')
        .select('user_id')
        .eq('company_id', user.company_id)
        .eq('is_active', true)
      if (membershipResult.error) throw membershipResult.error

      const memberIds = (membershipResult.data ?? []).map((row) => row.user_id)
      if (memberIds.length) {
        const profileResult = await supabase.from('profiles').select('id,full_name').in('id', memberIds).order('full_name')
        if (profileResult.error) throw profileResult.error
        setPeople((profileResult.data ?? []).map((profile) => ({ id: profile.id, name: profile.full_name })))
      } else {
        setPeople([])
      }
    } catch (error) {
      toast({ title: 'Assets unavailable', description: error instanceof Error ? error.message : 'Failed to load inventory.', variant: 'destructive' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast, user?.company_id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (location.pathname === '/app/assets/new' && canManage) {
      setForm(emptyForm())
      setOpen(true)
    }
  }, [canManage, location.pathname])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return assets.filter((asset) => {
      const matchesStatus = status === 'all' || asset.status === status
      const haystack = `${asset.name} ${asset.asset_tag} ${asset.serial_number ?? ''} ${asset.category ?? ''} ${asset.manufacturer ?? ''} ${asset.model ?? ''} ${asset.location ?? ''}`.toLowerCase()
      return matchesStatus && (!query || haystack.includes(query))
    })
  }, [assets, search, status])

  const counts = useMemo(() => ({
    total: assets.length,
    assigned: assets.filter((asset) => asset.status === 'assigned').length,
    available: assets.filter((asset) => asset.status === 'active').length,
    maintenance: assets.filter((asset) => asset.status === 'maintenance').length,
    lost: assets.filter((asset) => asset.status === 'lost').length,
    warranty: assets.filter((asset) => asset.warranty_expires_at && new Date(asset.warranty_expires_at) >= new Date() && new Date(asset.warranty_expires_at) <= new Date(Date.now() + 30 * 86400000)).length,
  }), [assets])

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((current) => ({ ...current, [field]: value }))

  const setImage = (file: File | null) => {
    if (!file) return updateField('image', null)
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast({ title: 'Unsupported image', description: 'Use JPG, PNG or WebP.', variant: 'destructive' })
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: 'Image too large', description: 'Images must be 10 MB or smaller.', variant: 'destructive' })
      return
    }
    updateField('image', file)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImage(event.target.files?.[0] ?? null)
    event.currentTarget.value = ''
  }

  const uploadImage = async (assetId: string, file: File) => {
    if (!user?.id) throw new Error('Not authenticated')
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/${assetId}/${crypto.randomUUID()}.${extension}`
    const upload = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
    if (upload.error) throw upload.error

    const dimensions = await new Promise<{ width: number | null; height: number | null }>((resolve) => {
      const preview = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(preview)
        resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null })
      }
      image.onerror = () => {
        URL.revokeObjectURL(preview)
        resolve({ width: null, height: null })
      }
      image.src = preview
    })

    const insert = await supabase.from('asset_images').insert({
      asset_id: assetId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
      uploaded_by: user.id,
      is_primary: true,
    })
    if (insert.error) {
      await supabase.storage.from(IMAGE_BUCKET).remove([path])
      throw insert.error
    }
    return path
  }

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.company_id || !user.id || !canManage) return

    const f = form
    const assetTag = f.asset_tag.trim()
    const name = f.name.trim()
    const cost = f.purchase_cost.trim() ? Number(f.purchase_cost) : null

    if (!assetTag || !name) {
      toast({ title: 'Required fields missing', description: 'Asset tag and name are required.', variant: 'destructive' })
      return
    }
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      toast({ title: 'Invalid cost', description: 'Purchase cost must be a valid non-negative amount.', variant: 'destructive' })
      return
    }
    if (f.purchase_date && f.warranty_expires_at && f.warranty_expires_at < f.purchase_date) {
      toast({ title: 'Invalid warranty date', description: 'Warranty expiry cannot be before purchase date.', variant: 'destructive' })
      return
    }

    setSaving(true)
    let assetId: string | undefined
    let uploadedPath: string | undefined
    try {
      // This object intentionally mirrors public.assets. The assignment and image
      // are separate records because both have their own relational history.
      const payload = {
        company_id: user.company_id,
        asset_tag: assetTag,
        name,
        description: f.description.trim() || null,
        category: f.category.trim() || null,
        manufacturer: f.manufacturer.trim() || null,
        model: f.model.trim() || null,
        serial_number: f.serial_number.trim() || null,
        status: f.assigned_to !== 'none' ? 'assigned' as AssetStatus : f.status,
        condition: f.condition,
        purchase_date: f.purchase_date || null,
        purchase_cost: cost,
        warranty_expires_at: f.warranty_expires_at || null,
        location: f.location.trim() || null,
        notes: f.notes.trim() || null,
        created_by: user.id,
        metadata: {},
      }

      const result = await supabase.from('assets').insert(payload).select(ASSET_COLUMNS).single()
      if (result.error) throw result.error
      assetId = result.data.id

      if (f.image) uploadedPath = await uploadImage(assetId, f.image)

      if (f.assigned_to !== 'none') {
        const assignment = await supabase.from('asset_assignments').insert({
          asset_id: assetId,
          assigned_to: f.assigned_to,
          assigned_by: user.id,
          condition_at_assignment: f.condition,
        })
        if (assignment.error) throw assignment.error
      }

      toast({ title: 'Asset created', description: `${result.data.name} was added to inventory.` })
      setOpen(false)
      setForm(emptyForm())
      if (location.pathname === '/app/assets/new') navigate('/app/assets', { replace: true })
      await load(true)
    } catch (error) {
      if (uploadedPath) await supabase.storage.from(IMAGE_BUCKET).remove([uploadedPath])
      if (assetId) await supabase.from('assets').delete().eq('id', assetId).eq('company_id', user.company_id)
      toast({ title: 'Create failed', description: error instanceof Error ? error.message : 'Unable to create asset.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!archiveTarget || !user?.company_id || !canManage) return
    try {
      const { error } = await supabase.from('assets').update({ archived_at: new Date().toISOString() }).eq('id', archiveTarget.id).eq('company_id', user.company_id)
      if (error) throw error
      setArchiveTarget(null)
      toast({ title: 'Asset archived', description: 'The asset was removed from active inventory.' })
      await load(true)
    } catch (error) {
      toast({ title: 'Archive failed', description: error instanceof Error ? error.message : 'Unable to archive asset.', variant: 'destructive' })
    }
  }

  const imagePreview = form.image ? URL.createObjectURL(form.image) : null
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{counts.total} asset{counts.total === 1 ? '' : 's'} in active inventory</p>
        </div>
        <Button disabled={!canManage} onClick={() => { setForm(emptyForm()); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add asset
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total', counts.total, Package],
          ['Available', counts.available, CheckCircle2],
          ['Assigned', counts.assigned, UserRound],
          ['Maintenance', counts.maintenance, Wrench],
          ['Lost', counts.lost, ShieldCheck],
          ['Warranty ≤30d', counts.warranty, CalendarDays],
        ].map(([title, value, Icon]) => {
          const IconComponent = Icon as typeof Package
          return (
            <Card key={String(title)} className="border-border bg-card p-4 shadow-none">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">{title}</p>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            </Card>
          )
        })}
      </div>

      <Card className="overflow-hidden border-border bg-card shadow-none">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-11 bg-background pl-9" placeholder="Search tag, name, serial, category, location…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger className="h-11 w-full bg-background lg:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((value) => <SelectItem key={value} value={value} className="capitalize">{label(value)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11" onClick={() => void load(true)} disabled={loading || refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((row) => <div key={row} className="h-20 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-14 text-center">
            <Package className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-medium">No assets found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or add your first asset.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((asset) => (
              <div key={asset.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between lg:p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                    {images.get(asset.id) ? <img src={images.get(asset.id)} alt={asset.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-6 w-6 text-muted-foreground" /></div>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{asset.name}</p>
                      <Badge variant="outline" className={`capitalize ${statusTone(asset.status)}`}>{label(asset.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{asset.asset_tag} · {asset.category || 'Uncategorized'}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{asset.serial_number || 'No serial number'}</span>
                      {asset.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{asset.location}</span>}
                      {asset.warranty_expires_at && <span>Warranty {date(asset.warranty_expires_at)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/app/assets/${asset.id}`)}><Eye className="mr-2 h-4 w-4" /> View</Button>
                  {canManage && <Button variant="ghost" size="icon" onClick={() => setArchiveTarget(asset)} aria-label={`Archive ${asset.name}`}><Archive className="h-4 w-4" /></Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) setOpen(nextOpen) }}>
        <DialogContent className="max-h-[94vh] max-w-4xl overflow-hidden bg-card p-0">
          <DialogHeader className="border-b border-border bg-card px-6 py-5 text-left sm:px-7">
            <DialogTitle className="text-xl font-semibold tracking-tight">Add asset</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">Create the complete inventory record. The photo is stored privately in Supabase Storage.</p>
          </DialogHeader>
          <form onSubmit={create} className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-card px-6 py-6 sm:px-7">
              <FormSection title="Identity" description="Core information used to identify and search this asset.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Asset tag" id="asset-tag" required><Input id="asset-tag" className="h-11 bg-background" required value={form.asset_tag} onChange={(event) => updateField('asset_tag', event.target.value)} placeholder="e.g. LAP-001" /></Field>
                  <Field label="Asset name" id="asset-name" required><Input id="asset-name" className="h-11 bg-background" required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Dell Latitude 5440" /></Field>
                  <Field label="Category" id="asset-category"><Input id="asset-category" className="h-11 bg-background" value={form.category} onChange={(event) => updateField('category', event.target.value)} placeholder="Laptop, Monitor, Vehicle…" /></Field>
                  <Field label="Serial number" id="asset-serial"><Input id="asset-serial" className="h-11 bg-background" value={form.serial_number} onChange={(event) => updateField('serial_number', event.target.value)} placeholder="Optional serial number" /></Field>
                  <Field label="Manufacturer" id="asset-manufacturer"><Input id="asset-manufacturer" className="h-11 bg-background" value={form.manufacturer} onChange={(event) => updateField('manufacturer', event.target.value)} placeholder="Dell, HP, Apple…" /></Field>
                  <Field label="Model" id="asset-model"><Input id="asset-model" className="h-11 bg-background" value={form.model} onChange={(event) => updateField('model', event.target.value)} placeholder="Model number" /></Field>
                </div>
              </FormSection>

              <FormSection title="Lifecycle & ownership" description="Control the asset's operational state and current owner.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Condition" id="asset-condition"><Select value={form.condition} onValueChange={(value) => updateField('condition', value as AssetCondition)}><SelectTrigger id="asset-condition" className="h-11 bg-background"><SelectValue /></SelectTrigger><SelectContent>{conditions.map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Status" id="asset-status"><Select value={form.status} onValueChange={(value) => updateField('status', value as AssetStatus)}><SelectTrigger id="asset-status" className="h-11 bg-background"><SelectValue /></SelectTrigger><SelectContent>{statuses.filter((value) => value !== 'assigned').map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Location" id="asset-location"><Input id="asset-location" className="h-11 bg-background" value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="Office, floor, room…" /></Field>
                  <Field label="Assign to" id="asset-assignee"><Select value={form.assigned_to} onValueChange={(value) => updateField('assigned_to', value)}><SelectTrigger id="asset-assignee" className="h-11 bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select></Field>
                </div>
                {form.assigned_to !== 'none' && <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">Assigning an owner will save the asset as <strong>assigned</strong> and create a separate assignment-history record.</p>}
              </FormSection>

              <FormSection title="Purchase & warranty" description="Optional financial and lifecycle information.">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Purchase date" id="purchase-date"><Input id="purchase-date" type="date" className="h-11 bg-background" value={form.purchase_date} onChange={(event) => updateField('purchase_date', event.target.value)} /></Field>
                  <Field label="Purchase cost" id="purchase-cost"><Input id="purchase-cost" type="number" min="0" step="0.01" inputMode="decimal" className="h-11 bg-background" value={form.purchase_cost} onChange={(event) => updateField('purchase_cost', event.target.value)} placeholder="0.00" /></Field>
                  <Field label="Warranty expiry" id="warranty-date"><Input id="warranty-date" type="date" className="h-11 bg-background" value={form.warranty_expires_at} onChange={(event) => updateField('warranty_expires_at', event.target.value)} /></Field>
                </div>
              </FormSection>

              <FormSection title="Asset photo" description="Use a clear photo of the equipment. Files are kept in the private asset-images bucket; no image URL is stored on the asset.">
                <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-4 sm:p-5">
                  {form.image && imagePreview ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <img src={imagePreview} alt="Selected asset" className="h-28 w-28 rounded-xl border border-border object-cover" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{form.image.name}</p><p className="mt-1 text-xs text-muted-foreground">{(form.image.size / 1024 / 1024).toFixed(2)} MB · {form.image.type}</p></div>
                      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>Replace</Button><Button type="button" variant="ghost" onClick={() => updateField('image', null)}>Remove</Button></div>
                    </div>
                  ) : (
                    <button type="button" className="flex w-full flex-col items-center justify-center rounded-xl px-4 py-8 text-center transition-colors hover:bg-muted/30" onClick={() => fileRef.current?.click()}>
                      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-background"><ImagePlus className="h-5 w-5 text-muted-foreground" /></span>
                      <span className="mt-3 text-sm font-semibold">Choose asset photo</span>
                      <span className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP · maximum 10 MB</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                </div>
              </FormSection>

              <FormSection title="Description & notes" description="Add useful context for the people who will manage or use this asset.">
                <div className="space-y-4">
                  <Field label="Description" id="asset-description"><Textarea id="asset-description" className="min-h-28 resize-y bg-background" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="What is this asset and what should staff know about it?" /></Field>
                  <Field label="Internal notes" id="asset-notes"><Textarea id="asset-notes" className="min-h-24 resize-y bg-background" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Purchase references, internal notes, identifiers, etc." /></Field>
                </div>
              </FormSection>
            </div>
            <DialogFooter className="shrink-0 border-t border-border bg-muted/20 px-6 py-4 sm:px-7">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || !canManage}>{saving ? 'Creating asset…' : 'Create asset'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(value) => { if (!value) setArchiveTarget(null) }}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader><AlertDialogTitle>Archive {archiveTarget?.name}?</AlertDialogTitle><p className="text-sm leading-6 text-muted-foreground">The asset will leave active inventory. Its assignments, maintenance records, ticket relationships and history remain preserved.</p></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void archive()}>Archive asset</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-border bg-muted/10 p-4 sm:p-5"><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{children}</section>
}

function Field({ label: fieldLabel, id, required, children }: { label: string; id: string; required?: boolean; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-sm font-medium">{fieldLabel}{required && <span className="ml-1 text-destructive">*</span>}</Label>{children}</div>
}
