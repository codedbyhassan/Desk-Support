import { useEffect, useState } from 'react'
import { supabase, Asset } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Trash2, Eye, Filter, Package } from 'lucide-react'
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
import { useNavigate } from 'react-router-dom'

interface AssetsInventoryProps {
  fullView?: boolean
  noCard?: boolean
}

export default function AssetsInventory({ fullView = false, noCard = false }: AssetsInventoryProps) {
  const navigate = useNavigate()
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)

  useEffect(() => {
    fetchAssets()

    const channel = supabase
      .channel('assets_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'assets' },
        () => {
          fetchAssets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    filterAssets()
  }, [assets, searchTerm, statusFilter])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          assigned_user:assigned_to(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching assets:', error)
        setAssets([])
      } else {
        setAssets(data || [])
      }
    } catch (error) {
      console.error('Error in fetchAssets:', error)
      setAssets([])
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

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetToDelete.id)

    if (error) {
      console.error('Error deleting asset:', error)
      alert('Failed to delete asset. It may have associated tickets.')
    } else {
      setAssets(assets.filter(a => a.id !== assetToDelete.id))
    }

    setDeleteDialogOpen(false)
    setAssetToDelete(null)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'assigned':
        return 'bg-blue-100 text-blue-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'retired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const statusCounts = {
    available: assets.filter(a => a.status === 'available').length,
    assigned: assets.filter(a => a.status === 'assigned').length,
    maintenance: assets.filter(a => a.status === 'maintenance').length,
    retired: assets.filter(a => a.status === 'retired').length,
  }

  const content = (
    <>
      {!noCard && (
        <CardHeader>
          <div className="space-y-3 lg:space-y-4">
            <CardTitle className="text-lg lg:text-xl">Asset Inventory</CardTitle>
            {/* Mobile responsive status counts */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 text-xs lg:text-sm flex-wrap">
                <span className="px-2 lg:px-3 py-1.5 lg:py-2 bg-green-100 text-green-800 rounded-md font-medium whitespace-nowrap">
                  {statusCounts.available} Available
                </span>
                <span className="px-2 lg:px-3 py-1.5 lg:py-2 bg-blue-100 text-blue-800 rounded-md font-medium whitespace-nowrap">
                  {statusCounts.assigned} Assigned
                </span>
                <span className="px-2 lg:px-3 py-1.5 lg:py-2 bg-yellow-100 text-yellow-800 rounded-md font-medium whitespace-nowrap">
                  {statusCounts.maintenance} Maintenance
                </span>
                <span className="px-2 lg:px-3 py-1.5 lg:py-2 bg-gray-100 text-gray-800 rounded-md font-medium whitespace-nowrap">
                  {statusCounts.retired} Retired
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {/* Filters - Stack on mobile, row on desktop */}
        <div className="flex flex-col gap-3 lg:flex-row lg:gap-4 mb-4 lg:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[180px] text-sm">
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

        {/* Assets Grid */}
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Loading assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600">No assets found</p>
            {searchTerm && (
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search</p>
            )}
          </div>
        ) : (
          <div className={
            fullView 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4"
          }>
            {filteredAssets.slice(0, fullView ? undefined : 6).map(asset => (
              <div
                key={asset.id}
                className="bg-white border border-slate-200 rounded-lg lg:rounded-xl p-3 lg:p-4 hover:shadow-md transition-all"
              >
                {/* Asset header */}
                <div className="flex items-start justify-between mb-2 lg:mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 text-sm lg:text-base truncate">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {asset.serial_number || 'No serial number'}
                    </p>
                  </div>
                  <Badge className={`text-xs ${getStatusBadgeColor(asset.status)} ml-2 flex-shrink-0`}>
                    {asset.status}
                  </Badge>
                </div>

                {/* Asset details */}
                <div className="space-y-1.5 lg:space-y-2 mb-3 lg:mb-4">
                  <div className="flex items-center text-xs lg:text-sm">
                    <span className="text-slate-500 w-16 lg:w-20">Category:</span>
                    <span className="text-slate-900 truncate">
                      {asset.category || 'Uncategorized'}
                    </span>
                  </div>
                  <div className="flex items-center text-xs lg:text-sm">
                    <span className="text-slate-500 w-16 lg:w-20">Assigned:</span>
                    <span className="text-slate-900 truncate">
                      {asset.assigned_user?.full_name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2 lg:pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg h-8 lg:h-9"
                    onClick={() => navigate(`/app/assets/${asset.id}`)}
                  >
                    <Eye className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-1.5" />
                    <span className="text-xs lg:text-sm">View</span>
                  </Button>
                  {fullView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(asset)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 lg:h-9 w-8 lg:w-9 p-0"
                    >
                      <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </>
  )

  const dialog = (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg lg:text-xl">Delete Asset</AlertDialogTitle>
          <AlertDialogDescription className="text-sm lg:text-base">
            Are you sure you want to delete <strong>{assetToDelete?.name}</strong>? 
            This action cannot be undone and will remove all associated maintenance logs and tickets.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-lg lg:rounded-xl h-11 lg:h-10">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            className="bg-red-600 hover:bg-red-700 rounded-lg lg:rounded-xl h-11 lg:h-10"
          >
            Delete Asset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (noCard) {
    return (
      <>
        {content}
        {dialog}
      </>
    )
  }

  return (
    <>
      <Card className="border-slate-200">
        {content}
      </Card>
      {dialog}
    </>
  )
}