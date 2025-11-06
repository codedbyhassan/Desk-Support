import { useEffect, useState } from 'react'
import { Asset } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Trash2, Eye, Package, Box, CheckCircle2, Wrench, Filter, Download, MoreVertical, Upload, Image as ImageIcon, X } from 'lucide-react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(newAsset || location.search.includes('new=true'))
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serial_number: null as string | null,
    category: null as string | null,
  })
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
    filterAssets()
  }, [assets, searchTerm, statusFilter])

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

      const { data: uploadData, error: uploadError } = await supabase.storage
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
        status: 'available',
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

      setFormData({
        name: '',
        description: '',
        serial_number: null,
        category: null,
      })
      setPhotoFile(null)
      setPhotoPreview(null)
      setCreateDialogOpen(false)
      
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

  const toggleForm = () => {
    if (createDialogOpen) {
      setCreateDialogOpen(false)
      setPhotoFile(null)
      setPhotoPreview(null)
      if (location.pathname === '/app/assets/new') {
        navigate('/app/assets')
      }
    } else {
      setCreateDialogOpen(true)
      navigate('/app/assets/new')
    }
  }

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset)
    setDeleteDialogOpen(true)
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-50 text-emerald-700 border-0'
      case 'maintenance':
        return 'bg-amber-50 text-amber-700 border-0'
      case 'retired':
        return 'bg-slate-50 text-slate-600 border-0'
      default:
        return 'bg-blue-50 text-blue-700 border-0'
    }
  }

  const activeAssets = assets.filter(a => a.status !== 'retired')
  const availableAssets = activeAssets.filter(a => a.status === 'available')
  const assignedAssets = activeAssets.filter(a => a.status === 'assigned')
  const maintenanceAssets = activeAssets.filter(a => a.status === 'maintenance')

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 lg:space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Assets</h1>
          <p className="text-sm lg:text-base text-slate-500">Manage and track company assets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg lg:rounded-xl h-11 lg:h-10">
            <Download className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Export</span>
          </Button>
          {user?.role === 'admin' && (
            <Button
              onClick={toggleForm}
              className="bg-slate-900 hover:bg-slate-800 rounded-lg lg:rounded-xl h-11 lg:h-10"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden sm:inline">New Asset</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Tabs */}
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg lg:rounded-xl h-auto">
          <TabsTrigger 
            value="available" 
            className="flex flex-col items-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-slate-600 data-[state=active]:text-emerald-600" />
            <span className="text-[10px] lg:text-xs font-medium">Available</span>
          </TabsTrigger>
          <TabsTrigger 
            value="assigned" 
            className="flex flex-col items-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            <Box className="h-4 w-4 lg:h-5 lg:w-5 text-slate-600 data-[state=active]:text-blue-600" />
            <span className="text-[10px] lg:text-xs font-medium">Assigned</span>
          </TabsTrigger>
          <TabsTrigger 
            value="maintenance" 
            className="flex flex-col items-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            <Wrench className="h-4 w-4 lg:h-5 lg:w-5 text-slate-600 data-[state=active]:text-amber-600" />
            <span className="text-[10px] lg:text-xs font-medium">Service</span>
          </TabsTrigger>
          <TabsTrigger 
            value="total" 
            className="flex flex-col items-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            <Package className="h-4 w-4 lg:h-5 lg:w-5 text-slate-600 data-[state=active]:text-slate-900" />
            <span className="text-[10px] lg:text-xs font-medium">Total</span>
          </TabsTrigger>
        </TabsList>

        {/* Available Tab */}
        <TabsContent value="available" className="mt-4">
          <Card className="border-slate-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm lg:text-base font-medium text-slate-500">Available Assets</p>
                    <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                      Ready
                    </Badge>
                  </div>
                  <h3 className="text-2xl lg:text-4xl font-bold text-slate-900 mb-2">{availableAssets.length}</h3>
                  <p className="text-xs lg:text-sm text-slate-600">Ready for assignment</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Assigned Tab */}
        <TabsContent value="assigned" className="mt-4">
          <Card className="border-slate-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Box className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm lg:text-base font-medium text-slate-500">Assigned Assets</p>
                    <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">
                      Active
                    </Badge>
                  </div>
                  <h3 className="text-2xl lg:text-4xl font-bold text-slate-900 mb-2">{assignedAssets.length}</h3>
                  <p className="text-xs lg:text-sm text-slate-600">Currently in use</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="mt-4">
          <Card className="border-slate-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Wrench className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm lg:text-base font-medium text-slate-500">Maintenance</p>
                    <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">
                      Service
                    </Badge>
                  </div>
                  <h3 className="text-2xl lg:text-4xl font-bold text-slate-900 mb-2">{maintenanceAssets.length}</h3>
                  <p className="text-xs lg:text-sm text-slate-600">Under maintenance</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Total Tab */}
        <TabsContent value="total" className="mt-4">
          <Card className="border-slate-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                  <Package className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm lg:text-base font-medium text-slate-500">All Assets</p>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Total
                    </Badge>
                  </div>
                  <h3 className="text-2xl lg:text-4xl font-bold text-slate-900 mb-2">{activeAssets.length}</h3>
                  <p className="text-xs lg:text-sm text-slate-600">Total active assets</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Asset Form */}
      {createDialogOpen && user?.role === 'admin' && (
        <Card className="border-slate-200 shadow-lg">
          <div className="p-4 lg:p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg lg:text-xl font-semibold text-slate-900">Create New Asset</h2>
                  <p className="text-sm text-slate-500 truncate">Add a new asset to inventory</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleForm}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            <form onSubmit={handleCreateAsset} className="space-y-4 lg:space-y-5">
              {/* Photo Upload Section */}
              <div className="border-2 border-dashed border-slate-200 rounded-lg lg:rounded-xl p-4 lg:p-6 bg-slate-50">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                  <ImageIcon className="h-4 w-4" />
                  Asset Photo
                </label>
                
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-48 lg:h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-8"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 lg:py-8">
                    <Upload className="h-8 w-8 lg:h-12 lg:w-12 text-slate-400 mb-2 lg:mb-3" />
                    <p className="text-xs lg:text-sm text-slate-600 mb-1 lg:mb-2 text-center">Click to upload or drag and drop</p>
                    <p className="text-[10px] lg:text-xs text-slate-500 text-center">PNG, JPG up to 5MB</p>
                  </div>
                )}
                
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="mt-3 lg:mt-4 text-sm"
                />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Asset Name *
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="MacBook Pro 2023"
                    className="rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Serial Number
                  </label>
                  <Input
                    value={formData.serial_number || ''}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value || null })}
                    placeholder="SN123456"
                    className="rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Category
                </label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => setFormData({ ...formData, category: value || null })}
                >
                  <SelectTrigger className="rounded-lg text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
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
                <label className="block text-sm font-medium text-slate-700">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the asset..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 lg:gap-3 pt-3 lg:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleForm}
                  disabled={submitting}
                  className="rounded-lg h-11 lg:h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10"
                >
                  {submitting ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Assets Table - Desktop */}
      <div className="hidden lg:block">
        <Card className="border-slate-200">
          <div className="p-4 lg:p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-lg text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 rounded-lg text-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
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
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Asset</TableHead>
                <TableHead className="text-sm">Serial Number</TableHead>
                <TableHead className="text-sm">Category</TableHead>
                <TableHead className="text-sm">Status</TableHead>
                <TableHead className="text-sm">Assigned To</TableHead>
                <TableHead className="text-right text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                    Loading assets...
                  </TableCell>
                </TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                    No assets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={asset.photo_url}
                          alt={asset.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{asset.name}</p>
                          <p className="text-xs text-slate-500 truncate">{asset.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {asset.serial_number || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {asset.category || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getStatusBadgeColor(asset.status)}`}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {asset.assigned_user?.full_name || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem onClick={() => navigate(`/app/assets/${asset.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {user?.role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(asset)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Assets List */}
      <div className="lg:hidden">
        <Card className="border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-lg text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-lg text-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
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
          </div>

          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Loading assets...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No assets found
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div 
                  key={asset.id}
                  className="p-3 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0"
                  onClick={() => navigate(`/app/assets/${asset.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {/* Image */}
                    <img
                      src={asset.photo_url}
                      alt={asset.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm"
                    />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 text-sm truncate mb-0.5">
                            {asset.name}
                          </h3>
                          {asset.description && (
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              {asset.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-sm">
                            <DropdownMenuItem onClick={() => navigate(`/app/assets/${asset.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {user?.role === 'admin' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(asset)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Metadata - Horizontal compact */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${getStatusBadgeColor(asset.status)}`}>
                          {asset.status}
                        </Badge>
                        
                        {asset.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 capitalize">
                            {asset.category}
                          </Badge>
                        )}
                        
                        {asset.serial_number && (
                          <span className="text-[10px] text-slate-500">
                            SN: {asset.serial_number}
                          </span>
                        )}
                        
                        {asset.assigned_user?.full_name && (
                          <span className="text-[10px] text-slate-600">
                            → {asset.assigned_user.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg lg:text-xl">Delete Asset</AlertDialogTitle>
            <AlertDialogDescription className="text-sm lg:text-base">
              Are you sure you want to delete "{assetToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg lg:rounded-xl h-11 lg:h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 rounded-lg lg:rounded-xl h-11 lg:h-10"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}