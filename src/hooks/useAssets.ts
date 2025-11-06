import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import type {
  Asset,
  AssetFilters,
  AssetUpdate,
  AssetInsert,
  AssetWithRelations,
} from '@/types/database'
// Import transform function as regular import (not type import)
import { transformDbAsset } from '@/types/database'

// Import transform function as regular import (not type import)
import { transformDbAsset } from '@/types/database'

// Helper to transform database asset to application asset
const transformAsset = (dbAsset: AssetWithRelations): Asset => {
  return transformDbAsset(dbAsset)
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    if (!user?.company_id) {
      console.warn('useAssets: No company_id found for user')
      setLoading(false)
      return
    }

    console.log('📡 Setting up real-time subscription for company:', user.company_id)

    const channel = supabase
      .channel('assets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assets',
          filter: `company_id=eq.${user.company_id}`
        },
        async (payload) => {
          console.log('🔔 Asset change detected:', payload.eventType, payload)

          try {
            if (payload.eventType === 'INSERT') {
              // Fetch full asset with relations
              const { data, error } = await supabase
                .from('assets')
                .select(`
                  *,
                  assigned_user:users!assigned_to(id, full_name, email, company_id, role, avatar_url, phone, department_id, created_at, updated_at)
                `)
                .eq('id', payload.new.id)
                .single()

              if (!error && data) {
                const transformedAsset = transformDbAsset(data as AssetWithRelations)
                setAssets(prev => [transformedAsset, ...prev])
              }
            } else if (payload.eventType === 'DELETE') {
              setAssets(prev => prev.filter(asset => asset.id !== payload.old.id))
            } else if (payload.eventType === 'UPDATE') {
              // Fetch updated asset with relations
              const { data, error } = await supabase
                .from('assets')
                .select(`
                  *,
                  assigned_user:users!assigned_to(id, full_name, email, company_id, role, avatar_url, phone, department_id, created_at, updated_at)
                `)
                .eq('id', payload.new.id)
                .single()

              if (!error && data) {
                const transformedAsset = transformDbAsset(data as AssetWithRelations)
                setAssets(prev =>
                  prev.map(asset =>
                    asset.id === transformedAsset.id ? transformedAsset : asset
                  )
                )
              }
            }
          } catch (err) {
            console.error('Error handling real-time update:', err)
          }
        }
      )
      .subscribe()

    return () => {
      console.log('📡 Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [user?.company_id])

  // ============================================================================
  // FETCH ASSETS
  // ============================================================================

  const fetchAssets = useCallback(
    async (filters?: AssetFilters) => {
      if (!user?.company_id) {
        console.error('fetchAssets: No company_id found')
        setError('Company information is missing')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('📥 Fetching assets for company:', user.company_id)

        // Build query with company_id filter
        let query = supabase
          .from('assets')
          .select(`
            *,
            assigned_user:users!assigned_to(id, full_name, email, company_id, role, avatar_url, phone, department_id, created_at, updated_at)
          `)
          .eq('company_id', user.company_id)

        // Apply filters
        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.assignedTo) {
          query = query.eq('assigned_to', filters.assignedTo)
        }
        if (filters?.category) {
          query = query.eq('category', filters.category)
        }
        if (filters?.search) {
          const searchTerm = `%${filters.search}%`
          query = query.or(`name.ilike.${searchTerm},serial_number.ilike.${searchTerm}`)
        }

        const { data, error: err } = await query.order('created_at', { ascending: false })

        if (err) throw err

        // Transform and verify all assets
        const transformedAssets = (data || []).map(asset => transformDbAsset(asset as AssetWithRelations))
        
        // Security check: Verify all assets belong to user's company
        const invalidAssets = transformedAssets.filter(a => a.company_id !== user.company_id)
        if (invalidAssets.length > 0) {
          console.error('❌ Data leak detected in assets:', invalidAssets)
          throw new Error('Data integrity check failed')
        }

        setAssets(transformedAssets)
        setError(null)

        console.log('✅ Assets loaded:', {
          count: transformedAssets.length,
          company_id: user.company_id
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load assets'
        setError(message)
        toast({
          variant: 'destructive',
          title: 'Error loading assets',
          description: message,
        })
        console.error('❌ Error loading assets:', err)
      } finally {
        setLoading(false)
      }
    },
    [toast, user?.company_id]
  )

  // ============================================================================
  // GET ASSET BY ID
  // ============================================================================

  const getAssetById = useCallback(
    async (id: string): Promise<Asset | null> => {
      // Don't try to load if id is "new" (route parameter)
      if (!id || id === 'new') {
        console.log('getAssetById: Skipping load for route "new"')
        return null
      }

      if (!user?.company_id) {
        const error = new Error('Company information is missing')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to load asset. Company information is missing.',
        })
        throw error
      }

      try {
        console.log('📥 Fetching asset:', id)

        const { data, error: err } = await supabase
          .from('assets')
          .select(`
            *,
            assigned_user:users!assigned_to(id, full_name, email, company_id, role, avatar_url, phone, department_id, created_at, updated_at)
          `)
          .eq('id', id)
          .eq('company_id', user.company_id)
          .single()

        if (err) throw err

        // Transform and verify
        const transformedAsset = transformDbAsset(data as AssetWithRelations)
        
        if (transformedAsset.company_id !== user.company_id) {
          console.error('❌ Attempted to access asset from different company')
          throw new Error('Asset not found')
        }

        console.log('✅ Asset loaded:', {
          id: transformedAsset.id,
          name: transformedAsset.name,
          company_id: transformedAsset.company_id
        })

        return transformedAsset
      } catch (err: any) {
        const message = err.message || 'Failed to load asset'

        // Don't show toast for "not found" errors
        if (!message.includes('not found')) {
          toast({
            variant: 'destructive',
            title: 'Error loading asset',
            description: message,
          })
        }

        console.error('❌ Error loading asset:', message)
        throw err
      }
    },
    [toast, user?.company_id]
  )

  // ============================================================================
  // UPDATE ASSET
  // ============================================================================

  const updateAsset = useCallback(
    async (id: string, updates: AssetUpdate) => {
      if (!user?.company_id) {
        const error = new Error('Company information is missing')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to update asset. Company information is missing.',
        })
        throw error
      }

      try {
        console.log('🔄 Updating asset:', id, Object.keys(updates))

        const { error: err } = await supabase
          .from('assets')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('company_id', user.company_id)

        if (err) throw err

        // Create audit log
        if (user?.id) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'ASSET_UPDATED',
            target_type: 'asset',
            target_id: id,
            company_id: user.company_id,
            details: {
              updated_fields: Object.keys(updates)
            }
          })
        }

        toast({
          title: 'Asset updated',
          description: 'The asset has been successfully updated.',
        })

        console.log('✅ Asset updated:', {
          id,
          company_id: user.company_id,
          fields: Object.keys(updates)
        })
      } catch (err: any) {
        const message = err.message || 'Failed to update asset'
        toast({
          variant: 'destructive',
          title: 'Error updating asset',
          description: message,
        })
        console.error('❌ Error updating asset:', err)
        throw err
      }
    },
    [toast, user?.company_id, user?.id]
  )

  // ============================================================================
  // CREATE ASSET
  // ============================================================================

  const createAsset = useCallback(
    async (assetData: AssetInsert): Promise<Asset> => {
      if (!user?.company_id) {
        const error = new Error('Company information is missing')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to create asset. Company information is missing.',
        })
        throw error
      }

      try {
        console.log('➕ Creating asset:', assetData.name)

        // Ensure company_id is set
        const dataWithCompany: AssetInsert = {
          ...assetData,
          company_id: user.company_id,
        }

        const { data, error: err } = await supabase
          .from('assets')
          .insert(dataWithCompany)
          .select(`
            *,
            assigned_user:users!assigned_to(id, full_name, email, company_id, role, avatar_url, phone, department_id, created_at, updated_at)
          `)
          .single()

        if (err) throw err

        const transformedAsset = transformDbAsset(data as AssetWithRelations)

        // Create audit log
        if (user?.id) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'ASSET_CREATED',
            target_type: 'asset',
            target_id: transformedAsset.id,
            company_id: user.company_id,
            details: {
              asset_name: transformedAsset.name,
              serial_number: transformedAsset.serial_number
            }
          })
        }

        toast({
          title: 'Asset created',
          description: 'The asset has been successfully created.',
        })

        console.log('✅ Asset created:', {
          id: transformedAsset.id,
          name: transformedAsset.name,
          company_id: transformedAsset.company_id
        })

        return transformedAsset
      } catch (err: any) {
        const message = err.message || 'Failed to create asset'
        toast({
          variant: 'destructive',
          title: 'Error creating asset',
          description: message,
        })
        console.error('❌ Error creating asset:', err)
        throw err
      }
    },
    [toast, user?.company_id, user?.id]
  )

  // ============================================================================
  // DELETE ASSET
  // ============================================================================

  const deleteAsset = useCallback(
    async (id: string) => {
      if (!user?.company_id) {
        const error = new Error('Company information is missing')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to delete asset. Company information is missing.',
        })
        throw error
      }

      try {
        console.log('🗑️ Deleting asset:', id)

        // Get asset first for audit log
        const asset = await getAssetById(id)
        if (!asset) throw new Error('Asset not found')

        // Delete from database
        const { error: err } = await supabase
          .from('assets')
          .delete()
          .eq('id', id)
          .eq('company_id', user.company_id)

        if (err) throw err

        // Delete photo from storage if exists
        if (asset.photo_url && !asset.photo_url.includes('placehold.co')) {
          try {
            const photoPath = asset.photo_url.split('/asset-photos/')[1]
            if (photoPath) {
              await supabase.storage.from('asset-photos').remove([photoPath])
              console.log('✅ Photo deleted from storage')
            }
          } catch (photoErr) {
            console.warn('⚠️ Could not delete photo:', photoErr)
          }
        }

        // Create audit log
        if (user?.id) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'ASSET_DELETED',
            target_type: 'asset',
            target_id: id,
            company_id: user.company_id,
            details: {
              asset_name: asset.name,
              serial_number: asset.serial_number
            }
          })
        }

        toast({
          title: 'Asset deleted',
          description: 'The asset has been successfully deleted.',
        })

        console.log('✅ Asset deleted:', id)
      } catch (err: any) {
        const message = err.message || 'Failed to delete asset'
        toast({
          variant: 'destructive',
          title: 'Error deleting asset',
          description: message,
        })
        console.error('❌ Error deleting asset:', err)
        throw err
      }
    },
    [toast, user?.company_id, user?.id, getAssetById]
  )

  return {
    assets,
    loading,
    error,
    fetchAssets,
    getAssetById,
    updateAsset,
    createAsset,
    deleteAsset
  }
}