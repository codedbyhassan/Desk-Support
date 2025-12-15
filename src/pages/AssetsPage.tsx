import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/PageHeader'
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
  // Sparkles and Shield removed (hero section removed)
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
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'

interface AssetsPageProps {
  newAsset?: boolean
}

export default function AssetsPage({ newAsset = false }: AssetsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const PAGE_SIZE = 10

  const { toast } = useToast()

  const getInitialFormState = () => ({
    name: '',
    description: '',
    serial_number: '',
    category: '__none',
    purchase_date: '',
    purchase_price: '',
    warranty_expiry: '',
    warranty_months: '',
    status: 'available',
    assigned_to: '__none',
  })

  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
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
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          assigned_user:assigned_to(full_name, email, company_id)
        `)
        .eq('company_id', user?.company_id || '')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setAssets(data || [])
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

    // Non-admin users only see assets assigned to them
    if (user?.role !== 'admin') {
      filtered = filtered.filter(asset => asset.assigned_to === user?.id)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter)
    }

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase()
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
  }, [assets, debouncedSearchTerm, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter])

  // debounce searchTerm to reduce re-filters while typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

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
        toast({ title: 'Invalid file', description: 'Please select an image file.' })
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Image too large', description: 'Image size must be less than 5MB.' })
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
      toast({ title: 'Upload failed', description: 'Unable to upload photo. Company information is missing.' })
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
        toast({ title: 'Upload failed', description: uploadError.message })
        throw uploadError
      }

      const { data } = supabase.storage
        .from('asset-photos')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast({ title: 'Upload failed', description: 'An unexpected error occurred during upload.' })
      return null
    }
  }

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const categoryValue = formData.category === '__none' ? null : (formData.category || null)
      const assignedToValue = formData.assigned_to === '__none' ? null : (formData.assigned_to || null)

      const insertData: any = {
        name: formData.name,
        description: formData.description,
        serial_number: formData.serial_number || null,
        category: categoryValue,
        photo_url: 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image',
        status: (formData.status || 'available') as Asset['status'],
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        warranty_expiry: formData.warranty_expiry || null,
        warranty_months: formData.warranty_months ? Number(formData.warranty_months) : null,
        assigned_to: assignedToValue,
        assigned_at: assignedToValue ? new Date().toISOString() : null,
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
          company_id: user.company_id,
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
      
      // show success toast and navigate to created asset
      if (data?.id) {
        toast({ title: 'Asset created', description: `${data.name} created successfully.` })
        navigate(`/app/assets/${data.id}`)
      }
    } catch (error: any) {
      console.error('Error creating asset:', error)
      if (error.message?.includes('company_id')) {
        toast({ title: 'Create failed', description: 'Failed to create asset. Please ensure you are logged in correctly.' })
      } else {
        toast({ title: 'Create failed', description: 'Failed to create asset. Please check your permissions.' })
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
          company_id: user.company_id,
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
      toast({ title: 'Asset deleted', description: 'Asset removed successfully.' })
    } catch (err) {
      console.error('Error deleting asset:', err)
      toast({ title: 'Delete failed', description: 'Failed to delete asset: ' + (err instanceof Error ? err.message : 'Unknown error') })
    }
  }

  const exportAssetsToCSV = () => {
    const headers = ['Name', 'Serial', 'Category', 'Status', 'Assigned To', 'Purchase Date', 'Purchase Price', 'Warranty Expiry', 'Assigned At', 'Created At', 'Updated At', 'Photo URL', 'Description']
    const rows = filteredAssets.map(a => [
      a.name,
      a.serial_number || '',
      a.category || '',
      a.status,
      a.assigned_user?.full_name || '',
      a.purchase_date || '',
      a.purchase_price != null ? String(a.purchase_price) : '',
      a.warranty_expiry || '',
      (a as any).assigned_at || '',
      a.created_at || '',
      a.updated_at || '',
      a.photo_url || '',
      a.description || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assets-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({ title: 'Success', description: 'Assets exported as CSV' })
  }

  const exportAssetsToXLSX = () => {
    try {
      const data = filteredAssets.map(a => ({
        Name: a.name,
        Serial: a.serial_number || '',
        Category: a.category || '',
        Status: a.status,
        AssignedTo: a.assigned_user?.full_name || '',
        PurchaseDate: a.purchase_date || '',
        PurchasePrice: a.purchase_price != null ? a.purchase_price : '',
        WarrantyExpiry: a.warranty_expiry || '',
        AssignedAt: (a as any).assigned_at || '',
        CreatedAt: a.created_at || '',
        UpdatedAt: a.updated_at || '',
        PhotoURL: a.photo_url || '',
        Description: a.description || '',
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Assets')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `assets-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({ title: 'Success', description: 'Assets exported as Excel' })
    } catch (err) {
      console.error('XLSX export failed', err)
      toast({ title: 'Export failed', description: 'Could not create Excel file' })
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
      badge: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-0',
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

  // Keyboard shortcuts: / to focus search, Cmd/Ctrl+N to open new asset, Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        if (user?.role === 'admin') openCreateDialog()
      }

      if (e.key === 'Escape') {
        if (createDialogOpen) closeCreateDialog()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [createDialogOpen, user?.role])

  // Autofocus the first field when opening create dialog
  useEffect(() => {
    if (createDialogOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [createDialogOpen])

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Hero section removed to simplify UI and free space for actions */}

      <Card variant="glass">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Inventory</p>
            <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">Snapshot</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{totalAssets} assets • {assignedAssets.length} assigned • {availableAssets.length} available</p>
          </div>
          <Badge variant="secondary" className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-0">
            {totalAssets} tracked
          </Badge>
        </div>
      </Card>

      <Card variant="glass">
        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Search by name, serial, or category..."
                ref={searchInputRef}
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

          <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <p className="px-3 py-1 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {filteredAssets.length === 0
                ? 'No assets to display'
                : `Showing ${showingFrom} – ${showingTo} of ${filteredAssets.length}`}
            </p>
            <p className="capitalize">Filters: {statusFilter === 'all' ? 'All statuses' : statusFilter}</p>
          </div>
        </div>
        {filteredAssets.length > 0 && (
          <div className="border-t border-[hsl(var(--border))] px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
              <div className="flex flex-col gap-3 lg:gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Page {currentPage} of {totalPages}</p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAssetsToCSV}
                    disabled={filteredAssets.length === 0}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-10 sm:h-11"
                  >
                    <Download className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="hidden sm:inline">CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAssetsToXLSX}
                    disabled={filteredAssets.length === 0}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-10 sm:h-11"
                  >
                    <Download className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="hidden sm:inline">Excel</span>
                    <span className="sm:hidden">Excel</span>
                  </Button>

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
                            className={`text-xs sm:text-sm h-10 sm:h-11 ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
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
                                className="text-xs sm:text-sm h-10 sm:h-11"
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
                            className={`text-xs sm:text-sm h-10 sm:h-11 ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </div>
          </div>
        )}
      </Card>

      {user?.role === 'admin' && (
        <Button
          onClick={openCreateDialog}
          title="Add asset"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 sm:h-12 sm:w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-[hsl(var(--card-foreground))] shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95"
        >
          <Plus className="h-6 w-6 sm:h-5 sm:w-5" />
        </Button>
      )}

      <Dialog
        open={Boolean(createDialogOpen && user?.role === 'admin')}
        onOpenChange={(isOpen) => (isOpen ? openCreateDialog() : closeCreateDialog())}
      >
        <DialogContent className="max-w-6xl mx-4 my-8 max-h-[90vh] overflow-auto border-0 p-0 rounded-2xl lg:rounded-3xl">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0">
            <div className="relative bg-[hsl(var(--background))] text-[hsl(var(--card-foreground))] p-6 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[hsl(var(--card))]/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em]">
                  <Plus className="h-3.5 w-3.5" />
                  New Asset
                </div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold tracking-tight">Register asset</DialogTitle>
                  <DialogDescription className="text-sm text-[hsl(var(--card-foreground))]/70">
                    Capture every lifecycle detail so the profile page is complete on day one.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[hsl(var(--card))]/5 p-4 space-y-4">
                <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[hsl(var(--card-foreground))]/70">
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
                      className="absolute top-3 right-3 rounded-full bg-[hsl(var(--card))]/90 text-[hsl(var(--foreground))]"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-8 text-[hsl(var(--card-foreground))]/70">
                    <Upload className="h-10 w-10 text-[hsl(var(--card-foreground))]/60 mb-3" />
                    <p className="text-sm font-medium">Upload a hero shot</p>
                    <p className="text-xs text-[hsl(var(--card-foreground))]/50">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={submitting}
                  className="text-sm cursor-pointer bg-[hsl(var(--card))]/5 text-[hsl(var(--card-foreground))] placeholder:text-[hsl(var(--card-foreground))]/50 file:text-[hsl(var(--foreground))]"
                />
              </div>
              <div className="space-y-3 text-sm text-[hsl(var(--card-foreground))]/70">
                <p className="font-medium text-[hsl(var(--card-foreground))]">What gets captured?</p>
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
                      ref={nameInputRef}
                      disabled={submitting}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="MacBook Pro 16”"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial number</Label>
                    <Input
                      disabled={submitting}
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
                      disabled={submitting}
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="rounded-xl text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Uncategorized</SelectItem>
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
                      disabled={submitting}
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
                      disabled={submitting}
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase price</Label>
                    <Input
                      disabled={submitting}
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
                      disabled={submitting}
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
                      disabled={submitting}
                      type="date"
                      value={formData.warranty_expiry}
                      onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <Select
                    disabled={submitting}
                    value={formData.assigned_to}
                    onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                  >
                    <SelectTrigger className="rounded-xl text-sm">
                      <SelectValue placeholder="Keep unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unassigned</SelectItem>
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
                    disabled={submitting}
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
                  <Button type="submit" disabled={submitting} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))]">
                    {submitting ? 'Creating…' : 'Create asset'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card variant="glass">
        <div className="p-4 lg:p-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Inventory</p>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Asset catalog</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">High-fidelity cards for every asset</p>
            </div>
            <Badge variant="secondary" className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-0">
              {filteredAssets.length} assets
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-40 rounded-3xl bg-[hsl(var(--muted))] animate-pulse" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] p-10 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No assets match the current filters.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {paginatedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-2xl lg:rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-6 shadow-sm hover:shadow-lg transition"
                >
                  <div className="flex flex-col gap-3 lg:gap-4 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <img
                        src={asset.photo_url}
                        alt={asset.name}
                        className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-xl lg:rounded-2xl object-cover border border-[hsl(var(--border))] shadow-sm flex-shrink-0"
                      />
                      <div className="space-y-2 w-full min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] truncate">{asset.name}</p>
                            <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))] truncate">{asset.serial_number || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                            <Badge
                              className={`text-[10px] sm:text-xs ${assetStatusAccent[asset.status]?.badge ?? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-0'}`}
                            >
                              {asset.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-[10px] sm:text-xs">
                              {asset.category || 'Uncategorized'}
                            </Badge>
                          </div>
                        </div>
                        {asset.description && (
                          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">{asset.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                          {asset.assigned_user?.full_name ? (
                            <span className="flex items-center gap-1">
                              <Box className="h-3 w-3 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                              Assigned to {asset.assigned_user.full_name}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              Ready to assign
                            </span>
                          )}
                          <span>
                            Last updated {new Date(asset.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:w-[180px] w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="rounded-lg lg:rounded-2xl h-10 sm:h-11 text-xs sm:text-sm text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]"
                        onClick={() => navigate(`/app/assets/${asset.id}`)}
                      >
                        View details
                      </Button>
                      {user?.role === 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="rounded-lg lg:rounded-2xl h-10 sm:h-11 text-xs sm:text-sm border border-[hsl(var(--border))]">
                              More
                              <MoreVertical className="h-4 w-4 ml-2 flex-shrink-0" />
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
        <AlertDialogContent className="max-w-[90vw] sm:max-w-[500px] lg:max-w-lg rounded-2xl lg:rounded-3xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg lg:text-xl text-[hsl(var(--foreground))]">Delete Asset</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm lg:text-base text-[hsl(var(--muted-foreground))]">
              Are you sure you want to delete "{assetToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg lg:rounded-xl h-10 sm:h-11 text-xs sm:text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 rounded-lg lg:rounded-xl h-10 sm:h-11 text-xs sm:text-sm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}