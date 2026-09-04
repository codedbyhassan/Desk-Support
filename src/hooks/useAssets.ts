import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { fetchSupabasePage } from '@/lib/dataAccess'

export type AssetStatus = 'active' | 'assigned' | 'maintenance' | 'retired' | 'lost'
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged'

/** UI-facing asset shape. Legacy display names are adapters; persistence uses
 * the canonical assets table columns. */
export interface Asset {
  id: string
  company_id: string
  asset_tag: string
  name: string
  description: string | null
  category: string | null
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  status: AssetStatus
  condition: AssetCondition
  purchase_date: string | null
  purchase_cost: number | null
  warranty_expires_at: string | null
  location: string | null
  notes: string | null
  photo_url: string | null
  assigned_to: string | null
  assigned_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

export type AssetFilters = {
  status?: AssetStatus
  assignedTo?: string
  category?: string
  search?: string
}
export type AssetInsert = Omit<Partial<Asset>, 'id' | 'created_at' | 'updated_at'> & { name: string; asset_tag: string }
export type AssetUpdate = Partial<Omit<Asset, 'id' | 'company_id' | 'created_at' | 'updated_at'>>

const ASSET_COLUMNS = `id,company_id,asset_tag,name,description,category,manufacturer,model,serial_number,status,condition,purchase_date,purchase_cost,warranty_expires_at,location,notes,metadata,created_by,created_at,updated_at`

async function withActiveAssignment(companyId: string, rows: any[]): Promise<Asset[]> {
  if (!rows.length) return []
  const ids = rows.map((row) => row.id)
  const { data: assignments, error } = await supabase.from('asset_assignments')
    .select('asset_id,assigned_to,assigned_at,returned_at')
    .in('asset_id', ids)
    .is('returned_at', null)
  if (error) throw error

  const active = new Map<string, any>()
  for (const assignment of assignments ?? []) active.set(assignment.asset_id, assignment)

  return rows.map((row) => {
    const assignment = active.get(row.id)
    return {
      ...row,
      company_id: companyId,
      photo_url: (row.metadata?.photo_url as string | null) ?? null,
      assigned_to: assignment?.assigned_to ?? null,
      assigned_at: assignment?.assigned_at ?? null,
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    }
  })
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchAssets = useCallback(async (filters?: AssetFilters) => {
    if (!user?.company_id) {
      setAssets([])
      setLoading(false)
      setError('No company associated with the authenticated user.')
      return
    }
    try {
      setLoading(true)
      const result = await fetchSupabasePage<any>('assets', 0, {
        pageSize: 250,
        columns: ASSET_COLUMNS,
        orderBy: 'created_at',
        ascending: false,
        filter: (query) => {
          let next = query.eq('company_id', user.company_id)
          if (filters?.status) next = next.eq('status', filters.status)
          if (filters?.category) next = next.eq('category', filters.category)
          if (filters?.search) {
            const term = filters.search.replace(/[%_,]/g, ' ')
            next = next.or(`name.ilike.%${term}%,serial_number.ilike.%${term}%,asset_tag.ilike.%${term}%`)
          }
          return next
        },
      })
      let normalized = await withActiveAssignment(user.company_id, result.data)
      if (filters?.assignedTo) normalized = normalized.filter((asset) => asset.assigned_to === filters.assignedTo)
      setAssets(normalized)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load assets'
      setError(message)
      toast({ title: 'Error loading assets', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, user?.company_id])

  const getAssetById = useCallback(async (id: string): Promise<Asset | null> => {
    if (!id || id === 'new') return null
    if (!user?.company_id) throw new Error('No company associated with the authenticated user.')
    const { data, error: queryError } = await supabase.from('assets').select(ASSET_COLUMNS)
      .eq('id', id).eq('company_id', user.company_id).single()
    if (queryError) throw queryError
    const result = await withActiveAssignment(user.company_id, [data])
    return result[0] ?? null
  }, [user?.company_id])

  const createAsset = useCallback(async (input: AssetInsert): Promise<Asset> => {
    if (!user?.id || !user.company_id) throw new Error('User is not authenticated or has no company.')
    const payload: Record<string, unknown> = {
      company_id: user.company_id,
      asset_tag: input.asset_tag,
      name: input.name.trim(),
      description: input.description ?? null,
      category: input.category ?? null,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      serial_number: input.serial_number ?? null,
      status: input.status ?? 'active',
      condition: input.condition ?? 'good',
      purchase_date: input.purchase_date ?? null,
      purchase_cost: input.purchase_cost ?? null,
      warranty_expires_at: input.warranty_expires_at ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      metadata: { ...(input.metadata ?? {}), ...(input.photo_url ? { photo_url: input.photo_url } : {}) },
      created_by: user.id,
    }
    const { data, error: insertError } = await supabase.from('assets').insert(payload).select(ASSET_COLUMNS).single()
    if (insertError) throw insertError
    const created = (await withActiveAssignment(user.company_id, [data]))[0]
    await fetchAssets()
    toast({ title: 'Asset created', description: 'The asset was created successfully.' })
    return created
  }, [fetchAssets, toast, user?.company_id, user?.id])

  const updateAsset = useCallback(async (id: string, updates: AssetUpdate) => {
    if (!user?.company_id) throw new Error('No company associated with the authenticated user.')
    const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
    delete payload.company_id
    delete payload.photo_url
    if (updates.photo_url !== undefined) payload.metadata = { ...(updates.metadata ?? {}), photo_url: updates.photo_url }
    const { error: updateError } = await supabase.from('assets').update(payload).eq('id', id).eq('company_id', user.company_id)
    if (updateError) throw updateError
    await fetchAssets()
    toast({ title: 'Asset updated', description: 'The asset was updated successfully.' })
  }, [fetchAssets, toast, user?.company_id])

  const deleteAsset = useCallback(async (id: string) => {
    if (!user?.company_id) throw new Error('No company associated with the authenticated user.')
    const { data: asset, error: readError } = await supabase.from('assets').select('metadata').eq('id', id).eq('company_id', user.company_id).single()
    if (readError) throw readError
    const { error: deleteError } = await supabase.from('assets').delete().eq('id', id).eq('company_id', user.company_id)
    if (deleteError) throw deleteError
    const photoUrl = asset?.metadata && typeof asset.metadata === 'object' ? (asset.metadata as any).photo_url : null
    if (typeof photoUrl === 'string' && photoUrl.includes('/asset-photos/')) {
      const path = photoUrl.split('/asset-photos/')[1]
      if (path) await supabase.storage.from('asset-photos').remove([path])
    }
    setAssets((current) => current.filter((item) => item.id !== id))
    toast({ title: 'Asset deleted', description: 'The asset was deleted successfully.' })
  }, [toast, user?.company_id])

  useEffect(() => {
    if (!user?.company_id) return
    void fetchAssets()
    const channel = supabase.channel(`assets:${user.company_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `company_id=eq.${user.company_id}` }, () => void fetchAssets())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [fetchAssets, user?.company_id])

  return { assets, loading, error, fetchAssets, getAssetById, createAsset, updateAsset, deleteAsset }
}
