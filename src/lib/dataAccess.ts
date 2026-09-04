import { supabase } from '@/lib/supabase'

/** Central limits for bounded Supabase/PostgREST reads. */
export const DATA_ACCESS = {
  pageSize: 1_000,
  maxFetchRows: 500_000,
  concurrency: 6,
  defaultRenderLimit: 250,
} as const

export type ExactCompanyCounts = {
  users_total: number
  users_unique: number
  departments_total: number
  teams_total: number
  ticket_categories_total: number
  tickets_total: number
  tickets_open: number
  tickets_in_progress: number
  tickets_pending: number
  tickets_resolved: number
  tickets_closed: number
  tickets_unresolved: number
  tickets_overdue: number
  assets_total: number
  asset_assignments_active: number
  ticket_assignments_active: number
  ticket_comments_total: number
  ticket_attachments_total: number
  workspace_folders_total: number
  workspace_files_total: number
  notifications_unread: number
  attendance_today: number
  qr_codes_active: number
  qr_scans_today: number
  video_calls_total: number
  video_calls_active: number
  subscriptions_total: number
  payments_total: number
  audit_logs_total: number
}

export type PageResult<T> = { data: T[]; page: number; pageSize: number; from: number; to: number; hasMore: boolean }
export type PageFetcher<T> = (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>

type SupabaseQuery = { select: (columns: string) => SupabaseQuery; order: (column: string, options: { ascending: boolean }) => SupabaseQuery; range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }> }
type QueryFilter = (query: SupabaseQuery) => SupabaseQuery

export async function getExactCompanyCounts(companyId: string): Promise<ExactCompanyCounts> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: { p_company_id: string }) => Promise<{ data: ExactCompanyCounts | null; error: { message: string } | null }>)('get_company_counts', { p_company_id: companyId })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No company counts were returned.')
  return data
}

export async function fetchSupabasePage<T = Record<string, unknown>>(
  table: string,
  page: number,
  options: { pageSize?: number; columns?: string; orderBy?: string; ascending?: boolean; filter?: QueryFilter } = {},
): Promise<PageResult<T>> {
  const pageSize = Math.min(Math.max(1, options.pageSize ?? DATA_ACCESS.pageSize), DATA_ACCESS.pageSize)
  const safePage = Math.max(0, page)
  const from = safePage * pageSize
  const to = from + pageSize - 1
  if (from >= DATA_ACCESS.maxFetchRows) return { data: [], page: safePage, pageSize, from, to, hasMore: false }

  const boundedTo = Math.min(to, DATA_ACCESS.maxFetchRows - 1)
  let query = (supabase.from as unknown as (table: string) => SupabaseQuery)(table).select(options.columns ?? '*')
  if (options.filter) query = options.filter(query)
  if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false })
  const { data, error } = await query.range(from, boundedTo)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as T[]
  return { data: rows, page: safePage, pageSize, from, to: boundedTo, hasMore: rows.length === pageSize && boundedTo < DATA_ACCESS.maxFetchRows - 1 }
}

export async function fetchAllSupabasePages<T = Record<string, unknown>>(
  fetchPage: PageFetcher<T>,
  options: { maxRows?: number; pageSize?: number; concurrency?: number; onPage?: (result: PageResult<T>) => void } = {},
): Promise<T[]> {
  const maxRows = Math.min(Math.max(1, options.maxRows ?? DATA_ACCESS.maxFetchRows), DATA_ACCESS.maxFetchRows)
  const pageSize = Math.min(Math.max(1, options.pageSize ?? DATA_ACCESS.pageSize), DATA_ACCESS.pageSize)
  const concurrency = Math.max(1, Math.min(options.concurrency ?? DATA_ACCESS.concurrency, DATA_ACCESS.concurrency))
  const totalPages = Math.ceil(maxRows / pageSize)
  const output: T[] = []

  for (let batchStart = 0; batchStart < totalPages; batchStart += concurrency) {
    const pages = Array.from({ length: Math.min(concurrency, totalPages - batchStart) }, (_, index) => batchStart + index)
    const results = await Promise.all(pages.map(async page => {
      const from = page * pageSize
      const to = Math.min(from + pageSize - 1, maxRows - 1)
      const response = await fetchPage(from, to)
      if (response.error) throw new Error(response.error.message)
      const result: PageResult<T> = { data: response.data ?? [], page, pageSize, from, to, hasMore: (response.data?.length ?? 0) === pageSize && to < maxRows - 1 }
      options.onPage?.(result)
      return result
    }))
    for (const result of results.sort((a, b) => a.page - b.page)) {
      output.push(...result.data)
      if (output.length >= maxRows || result.data.length < pageSize) return output.slice(0, maxRows)
    }
  }
  return output.slice(0, maxRows)
}
