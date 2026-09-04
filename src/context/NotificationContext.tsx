import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { fetchSupabasePage } from '@/lib/dataAccess'
import type { Toast } from '@/components/ToastNotification'

export interface AppNotification {
  id: string
  company_id: string
  recipient_id: string
  title: string
  body: string
  message: string
  type: string
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  link?: string
  metadata: Record<string, unknown>
  read_at: string | null
  read: boolean
  created_at: string
}
interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  toasts: Toast[]
  currentPath: string
  setCurrentPath: (path: string) => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  deleteAllRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  dismissToast: (id: string) => void
  fetchError: string | null
}
const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const NOTIFICATION_COLUMNS = 'id,company_id,recipient_id,title,body,type,entity_type,entity_id,action_url,metadata,read_at,created_at'
function routeFor(n: AppNotification) {
  if (n.action_url) return n.action_url
  if (!n.entity_type || !n.entity_id) return undefined
  const map: Record<string, string> = { ticket: '/app/tickets', team: '/app/teams', asset: '/app/assets', department: '/app/departments' }
  return map[n.entity_type] ? `${map[n.entity_type]}/${n.entity_id}` : undefined
}
function isCurrentEntity(path: string, n: AppNotification) {
  const route = routeFor(n)
  return !!route && (path === route || path.startsWith(`${route}/`))
}
function normalizeNotification(row: Record<string, unknown>): AppNotification {
  const body = typeof row.body === 'string' ? row.body : ''
  const actionUrl = typeof row.action_url === 'string' ? row.action_url : null
  const readAt = typeof row.read_at === 'string' ? row.read_at : null
  return {
    ...(row as Omit<AppNotification, 'message' | 'read' | 'link'>),
    body,
    message: body,
    action_url: actionUrl,
    link: actionUrl ?? undefined,
    read_at: readAt,
    read: !!readAt,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {},
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState(() => window.location.hash.replace(/^#/, '') || window.location.pathname)
  const loaded = useRef(false)
  const seen = useRef(new Set<string>())

  const refreshNotifications = useCallback(async () => {
    if (!user?.id || !user.company_id) {
      setNotifications([]); setLoading(false); return
    }
    setLoading(true); setFetchError(null)
    try {
      const page = await fetchSupabasePage<AppNotification>('notifications', 0, {
        pageSize: 250,
        columns: NOTIFICATION_COLUMNS,
        orderBy: 'created_at',
        ascending: false,
        filter: (query) => query.eq('company_id', user.company_id).eq('recipient_id', user.id),
      })
      const rows = page.data.map(row => normalizeNotification(row as unknown as Record<string, unknown>))
      setNotifications(rows); seen.current = new Set(rows.map((n) => n.id)); loaded.current = true
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load notifications.')
      setNotifications([])
    } finally { setLoading(false) }
  }, [user?.company_id, user?.id])

  useEffect(() => {
    const onRoute = () => setCurrentPath(window.location.hash.replace(/^#/, '') || window.location.pathname)
    window.addEventListener('hashchange', onRoute); window.addEventListener('popstate', onRoute)
    return () => { window.removeEventListener('hashchange', onRoute); window.removeEventListener('popstate', onRoute) }
  }, [])

  useEffect(() => {
    loaded.current = false; seen.current.clear(); setToasts([]); void refreshNotifications()
    if (!user?.id || !user.company_id) return
    const channel = supabase.channel(`notifications:${user.company_id}:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, (payload) => {
        const n = normalizeNotification(payload.new as Record<string, unknown>)
        if (n.company_id !== user.company_id || seen.current.has(n.id)) return
        seen.current.add(n.id); setNotifications((prev) => [n, ...prev])
        if (!loaded.current || isCurrentEntity(currentPath, n)) return
        const route = routeFor(n)
        setToasts((prev) => prev.some((t) => t.id === n.id) ? prev : [...prev, { id: n.id, title: n.title, message: n.body, type: n.type.includes('error') ? 'error' : n.type.includes('success') ? 'success' : n.type.includes('status') ? 'warning' : 'info', notificationType: n.type, onClick: route ? () => { window.location.hash = route } : undefined, duration: 5000 }])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, (payload) => {
        const n = normalizeNotification(payload.new as Record<string, unknown>)
        if (n.company_id !== user.company_id) return
        setNotifications((prev) => prev.map((item) => item.id === n.id ? n : item))
      }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [currentPath, refreshNotifications, user?.company_id, user?.id])

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id || !user.company_id) return
    const now = new Date().toISOString()
    const { error } = await supabase.from('notifications').update({ read_at: now }).eq('id', id).eq('company_id', user.company_id).eq('recipient_id', user.id)
    if (error) throw error
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: now, read: true } : n))
  }, [user?.company_id, user?.id])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || !user.company_id) return
    const now = new Date().toISOString()
    const { error } = await supabase.from('notifications').update({ read_at: now }).eq('company_id', user.company_id).eq('recipient_id', user.id).is('read_at', null)
    if (error) throw error
    setNotifications((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: now, read: true }))
  }, [user?.company_id, user?.id])

  const deleteNotification = useCallback(async (id: string) => {
    if (!user?.id || !user.company_id) return
    const { error } = await supabase.from('notifications').delete().eq('id', id).eq('company_id', user.company_id).eq('recipient_id', user.id)
    if (error) throw error
    setNotifications((prev) => prev.filter((n) => n.id !== id)); setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [user?.company_id, user?.id])

  const deleteAllRead = useCallback(async () => {
    if (!user?.id || !user.company_id) return
    const { error } = await supabase.from('notifications').delete().eq('company_id', user.company_id).eq('recipient_id', user.id).not('read_at', 'is', null)
    if (error) throw error
    setNotifications((prev) => prev.filter((n) => !n.read_at))
  }, [user?.company_id, user?.id])

  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])
  const unreadCount = useMemo(() => notifications.reduce((count, n) => count + (n.read ? 0 : 1), 0), [notifications])

  return <NotificationContext.Provider value={{ notifications, unreadCount, loading, toasts, currentPath, setCurrentPath, markAsRead, markAllAsRead, deleteNotification, deleteAllRead, refreshNotifications, dismissToast, fetchError }}>{children}</NotificationContext.Provider>
}
export function useNotifications() { const value = useContext(NotificationContext); if (!value) throw new Error('useNotifications must be used within NotificationProvider'); return value }
