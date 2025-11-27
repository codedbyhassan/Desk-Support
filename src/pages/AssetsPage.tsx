import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Package,
  Box,
  CheckCircle2,
  Wrench,
  Filter,
  Download,
  MoreVertical,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Shield,
  Activity,
  Tag,
  Calendar,
} from 'lucide-react'

type Asset = Database['public']['Tables']['assets']['Row'] & {
  assigned_user?: {
    full_name: string | null
    email: string | null
    company_id: string | null
  } | null
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

interface AssetsPageProps {
  newAsset?: boolean
}

export default function AssetsPage({ newAsset = false }: AssetsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const PAGE_SIZE = 10

  const getInitialFormState = () => ({
    name: '',
    description: '',
    serial_number: '',
    category: '',
    purchase_date: '',
    purchase_price: '',
    warranty_expiry: '',
    warranty_months: '',
    status: 'available',
    assigned_to: '',
  })

  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(newAsset || location.search.includes('new=true'))
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([])
  const [formData, setFormData] = useState(getInitialFormState())
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          assigned_user:assigned_to(full_name, email, company_id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      if (data && user?.company_id) {
        const validAssets = data.filter(asset => asset.company_id === user.company_id)
        if (validAssets.length !== data.length) {
          console.warn('RLS filtering mismatch detected')
        }
        setAssets(validAssets)
      } else {
        setAssets(data || [])
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyUsers = async () => {
    if (!user?.company_id) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('company_id', user.company_id)
        .order('full_name', { ascending: true })

      if (error) throw error
      setCompanyUsers(data || [])
    } catch (error) {
      console.error('Error fetching users for asset assignment:', error)
    }
  }

  const filterAssets = () => {
    let filtered = assets

    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(asset => 
        asset.name?.toLowerCase().includes(term) ||
        asset.serial_number?.toLowerCase().includes(term) ||
        asset.category?.toLowerCase().includes(term)
      )
    }

    setFilteredAssets(filtered)
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  useEffect(() => {
    fetchCompanyUsers()
  }, [user?.company_id])

  useEffect(() => {
    filterAssets()
  }, [assets, searchTerm, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(Math.max(filteredAssets.length, 1) / PAGE_SIZE))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredAssets.length, PAGE_SIZE, currentPage])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }

      setPhotoFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (assetId: string): Promise<string | null> => {
    if (!photoFile) return null

    if (!user?.company_id) {
      console.error('Cannot upload photo: company_id is missing')
      alert('Unable to upload photo. Company information is missing.')
      return null
    }

    try {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg'
      }
      
      const fileExt = mimeToExt[photoFile.type] || 'jpg'
      const fileName = `${assetId}-${Date.now()}.${fileExt}`
      const filePath = `${user.company_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('asset-photos')
        .upload(filePath, photoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: photoFile.type
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert(`Upload failed: ${uploadError.message}`)
        throw uploadError
      }

      const { data } = supabase.storage
        .from('asset-photos')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      return null
    }
  }

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const insertData: any = {
        name: formData.name,
        description: formData.description,
        serial_number: formData.serial_number || null,
        category: formData.category || null,
        photo_url: 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image',
        status: (formData.status || 'available') as Asset['status'],
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        warranty_expiry: formData.warranty_expiry || null,
        warranty_months: formData.warranty_months ? Number(formData.warranty_months) : null,
        assigned_to: formData.assigned_to || null,
        assigned_at: formData.assigned_to ? new Date().toISOString() : null,
      }

      if (user?.company_id) {
        insertData.company_id = user.company_id
      }

      const { data, error } = await supabase
        .from('assets')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      let photoUrl = insertData.photo_url
      if (photoFile && data) {
        const uploadedUrl = await uploadPhoto(data.id)
        if (uploadedUrl) {
          photoUrl = uploadedUrl
          await supabase
            .from('assets')
            .update({ photo_url: photoUrl })
            .eq('id', data.id)
        }
      }

      if (data && user?.id) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'ASSET_CREATED',
          target_type: 'asset',
          target_id: data.id,
          details: {
            asset_name: data.name,
            serial_number: data.serial_number,
          },
        })
      }

      closeCreateDialog()
      
      await fetchAssets()
      
      if (data?.id) {
        navigate(`/app/assets/${data.id}`)
      }
    } catch (error: any) {
      console.error('Error creating asset:', error)
      if (error.message?.includes('company_id')) {
        alert('Failed to create asset. Please ensure you are logged in correctly.')
      } else {
        alert('Failed to create asset. Please check your permissions.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openCreateDialog = () => {
    setCreateDialogOpen(true)
    navigate('/app/assets/new')
  }

  const closeCreateDialog = () => {
    setCreateDialogOpen(false)
    setPhotoFile(null)
    setPhotoPreview(null)
    setFormData(getInitialFormState())
    if (location.pathname === '/app/assets/new') {
      navigate('/app/assets', { replace: true })
    }
  }

  const toggleForm = () => {
    if (createDialogOpen) {
      closeCreateDialog()
    } else {
      openCreateDialog()
    }
  }

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset)
    setDeleteDialogOpen(true)
  }

  const goToPage = (page: number) => {
    const clampedPage = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(clampedPage)
  }

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetToDelete.id)
        .eq('company_id', user?.company_id)

      if (error) throw error
      
      if (user?.id) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'ASSET_DELETED',
          target_type: 'asset',
          target_id: assetToDelete.id,
          details: {
            asset_name: assetToDelete.name,
            serial_number: assetToDelete.serial_number,
          },
        })
      }
      
      await fetchAssets()
      setDeleteDialogOpen(false)
      setAssetToDelete(null)
    } catch (err) {
      console.error('Error deleting asset:', err)
      alert('Failed to delete asset: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const assetStatusAccent: Record<
    string,
    {
      badge: string
    }
  > = {
    available: {
      badge: 'bg-emerald-50 text-emerald-700 border-0',
    },
    assigned: {
      badge: 'bg-blue-50 text-blue-700 border-0',
    },
    maintenance: {
      badge: 'bg-amber-50 text-amber-700 border-0',
    },
    retired: {
      badge: 'bg-slate-50 text-slate-600 border-0',
    },
  }

  const activeAssets = assets.filter(a => a.status !== 'retired')
  const availableAssets = activeAssets.filter(a => a.status === 'available')
  const assignedAssets = activeAssets.filter(a => a.status === 'assigned')
  const maintenanceAssets = activeAssets.filter(a => a.status === 'maintenance')

  const totalAssets = assets.length
  const utilizationRate = totalAssets ? Math.round((assignedAssets.length / totalAssets) * 100) : 0
  const availabilityRate = totalAssets ? Math.round((availableAssets.length / totalAssets) * 100) : 0
  const maintenanceRate = totalAssets ? Math.round((maintenanceAssets.length / totalAssets) * 100) : 0

  const heroMetrics = useMemo(
    () => [
      {
        label: 'Active Assets',
        value: activeAssets.length,
        hint: `${utilizationRate}% utilization`,
      },
      {
        label: 'Ready Inventory',
        value: availableAssets.length,
        hint: `${availabilityRate}% deployable`,
      },
      {
        label: 'Service Queue',
        value: maintenanceAssets.length,
        hint: `${maintenanceRate}% in maintenance`,
      },
    ],
    [activeAssets.length, availabilityRate, availableAssets.length, maintenanceAssets.length, maintenanceRate, utilizationRate]
  )

  const totalPages = Math.max(1, Math.ceil(Math.max(filteredAssets.length, 1) / PAGE_SIZE))

  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredAssets.slice(start, start + PAGE_SIZE)
  }, [PAGE_SIZE, currentPage, filteredAssets])

  const showingFrom = filteredAssets.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredAssets.length)

  const paginationStructure = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1)
    }

    const pages: Array<number | string> = [1]
    if (currentPage > 3) {
      pages.push('left-ellipsis')
    }

    const windowStart = Math.max(2, currentPage - 1)
    const windowEnd = Math.min(totalPages - 1, currentPage + 1)

    for (let page = windowStart; page <= windowEnd; page += 1) {
      pages.push(page)
    }

    if (currentPage < totalPages - 2) {
      pages.push('right-ellipsis')
    }

    pages.push(totalPages)
    return pages
  }, [currentPage, totalPages])

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8 text-white shadow-lg shadow-slate-900/20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent)]" />
          <div className="absolute -top-24 -right-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-8 h-56 w-56 rounded-full bg-blue-500/20 blur-[120px]" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
              <Shield className="h-3.5 w-3.5" />
              Assets
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Asset Operations</h1>
              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Calm, premium-grade visibility across every hardware lifecycle. Monitor utilization,
                availability, and service posture in one focused view.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-[160px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-wide text-white/70">{metric.label}</p>
                  <p className="text-2xl font-semibold mt-1">{metric.value}</p>
                  <p className="text-xs text-white/60">{metric.hint}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="h-11 rounded-xl border border-white/20 bg-white/10 px-5 text-white hover:bg-white/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Snapshot
            </Button>
            {user?.role === 'admin' && (
              <Button
                onClick={toggleForm}
                className="h-11 rounded-xl bg-white px-6 text-slate-900 shadow-lg shadow-slate-900/20 hover:bg-slate-50"
              >
                <Sparkles className="mr-2 h-4 w-4 text-slate-600" />
                Add Asset
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-3xl border-0 bg-slate-950 text-white">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Portfolio overview</p>
                <h2 className="text-xl font-semibold">Executive snapshot</h2>
              </div>
              <Badge className="bg-white/10 text-white border-0">
                {totalAssets} tracked assets
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">{metric.label}</p>
                  <p className="text-3xl font-semibold mt-1">{metric.value}</p>
                  <p className="text-xs text-white/60">{metric.hint}</p>
                </div>
              ))}
            </div>
            <div className="text-sm text-white/70 leading-relaxed">
              Precision view across availability, utilization, and care load — tuned for premium fleet reviews.
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status mix</p>
                  <h3 className="text-base font-semibold text-slate-900">Distribution</h3>
                </div>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              {[
                { label: 'Available', value: availableAssets.length, percent: availabilityRate, color: 'bg-emerald-500' },
                { label: 'Assigned', value: assignedAssets.length, percent: utilizationRate, color: 'bg-blue-500' },
                { label: 'Maintenance', value: maintenanceAssets.length, percent: maintenanceRate, color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span className="font-medium">{item.label}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.value} assets</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Signals</p>
                  <h3 className="text-base font-semibold text-slate-900">Lifecycle notes</h3>
                </div>
                <Activity className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <p>• {utilizationRate}% of assets earning value in-field</p>
                <p>• {availabilityRate}% of hardware ready for immediate deploy</p>
                <p>• {maintenanceRate}% currently under service care</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, serial, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl text-sm h-11"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48 rounded-xl text-sm h-11">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <p className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {filteredAssets.length === 0
                ? 'No assets to display'
                : `Showing ${showingFrom} – ${showingTo} of ${filteredAssets.length}`}
            </p>
            <p className="capitalize">Filters: {statusFilter === 'all' ? 'All statuses' : statusFilter}</p>
          </div>
        </div>
        {filteredAssets.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              {totalPages > 1 && (
                <Pagination className="justify-start lg:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          goToPage(currentPage - 1)
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {paginationStructure.map((entry, idx) =>
                      typeof entry === 'string' ? (
                        <PaginationItem key={`${entry}-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={entry}>
                          <PaginationLink
                            href="#"
                            isActive={entry === currentPage}
                            onClick={(e) => {
                              e.preventDefault()
                              goToPage(entry)
                            }}
                          >
                            {entry}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          goToPage(currentPage + 1)
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        )}
      </Card>

      <Dialog
        open={Boolean(createDialogOpen && user?.role === 'admin')}
        onOpenChange={(isOpen) => (isOpen ? openCreateDialog() : closeCreateDialog())}
      >
        <DialogContent className="max-w-5xl border-0 p-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
            <div className="relative bg-slate-950 text-white p-6 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em]">
                  <Plus className="h-3.5 w-3.5" />
                  New Asset
                </div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold tracking-tight">Register asset</DialogTitle>
                  <DialogDescription className="text-sm text-white/70">
                    Capture every lifecycle detail so the profile page is complete on day one.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-4">
                <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                  <ImageIcon className="h-4 w-4" />
                  Asset photo
                </Label>
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-2xl border border-white/10"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute top-3 right-3 rounded-full bg-white/90 text-slate-900"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-8 text-white/70">
                    <Upload className="h-10 w-10 text-white/60 mb-3" />
                    <p className="text-sm font-medium">Upload a hero shot</p>
                    <p className="text-xs text-white/50">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="text-sm cursor-pointer bg-white/5 text-white placeholder:text-white/50 file:text-slate-900"
                />
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <p className="font-medium text-white">What gets captured?</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-emerald-300" />
                    Categorization & identifiers
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-300" />
                    Procurement & warranty data
                  </li>
                  <li className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-300" />
                    Assignment & status readiness
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateAsset} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset name *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="MacBook Pro 16”"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial number</Label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="SN123456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="rounded-xl text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Uncategorized</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="monitor">Monitor</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                        <SelectItem value="accessory">Accessory</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="rounded-xl text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Purchase date</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      placeholder="2500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warranty months</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.warranty_months}
                      onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                      placeholder="24"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warranty expiry</Label>
                    <Input
                      type="date"
                      value={formData.warranty_expiry}
                      onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                  >
                    <SelectTrigger className="rounded-xl text-sm">
                      <SelectValue placeholder="Keep unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {companyUsers.map((companyUser) => (
                        <SelectItem key={companyUser.id} value={companyUser.id}>
                          {companyUser.full_name || 'Unnamed'} {companyUser.email ? `(${companyUser.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Purpose, configuration, location, notable notes…"
                  />
                </div>

                <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={closeCreateDialog} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-slate-800">
                    {submitting ? 'Creating…' : 'Create asset'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <div className="p-4 lg:p-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Inventory</p>
              <h2 className="text-lg font-semibold text-slate-900">Asset catalog</h2>
              <p className="text-xs text-slate-500">High-fidelity cards for every asset</p>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
              {filteredAssets.length} assets
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-sm text-slate-500">No assets match the current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-3xl border border-slate-100 bg-white px-4 py-5 lg:p-6 shadow-sm hover:shadow-lg transition"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={asset.photo_url}
                        alt={asset.name}
                        className="h-20 w-20 lg:h-24 lg:w-24 rounded-2xl object-cover border border-slate-100 shadow-sm"
                      />
                      <div className="space-y-2 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold text-slate-900">{asset.name}</p>
                            <p className="text-xs text-slate-500">{asset.serial_number || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-[11px] ${assetStatusAccent[asset.status]?.badge ?? 'bg-slate-100 text-slate-600 border-0'}`}
                            >
                              {asset.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-[11px]">
                              {asset.category || 'Uncategorized'}
                            </Badge>
                          </div>
                        </div>
                        {asset.description && (
                          <p className="text-sm text-slate-500">{asset.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          {asset.assigned_user?.full_name ? (
                            <span className="flex items-center gap-1">
                              <Box className="h-3.5 w-3.5 text-slate-400" />
                              Assigned to {asset.assigned_user.full_name}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Ready to assign
                            </span>
                          )}
                          <span>
                            Last updated {new Date(asset.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:w-[180px]">
                      <Button
                        variant="outline"
                        className="rounded-2xl h-11 text-sm"
                        onClick={() => navigate(`/app/assets/${asset.id}`)}
                      >
                        View details
                      </Button>
                      {user?.role === 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="rounded-2xl h-11 text-sm border border-slate-200">
                              More
                              <MoreVertical className="h-4 w-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/app/assets/${asset.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Open Asset
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(asset)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] lg:max-w-lg rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg lg:text-xl text-slate-900">Delete Asset</AlertDialogTitle>
            <AlertDialogDescription className="text-sm lg:text-base text-slate-600">
              Are you sure you want to delete "{assetToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl h-11 lg:h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 rounded-xl h-11 lg:h-10"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}