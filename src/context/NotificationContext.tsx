// src/context/NotificationContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useSound from 'use-sound'
import { Toast } from '@/components/ToastNotification'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
  link?: string
  entity_id?: string
  entity_type?: string
  sender_name?: string
  sender_avatar?: string
}

type NotificationContextType = {
  notifications: Notification[]
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [processedNotificationIds, setProcessedNotificationIds] = useState<Set<string>>(new Set())
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set())
  const initialLoadCompleteRef = useRef(false)
  const processedMessageIdsRef = useRef<Set<string>>(new Set())
  const processedNotificationIdsRef = useRef<Set<string>>(new Set())

  // Load notification sound
  const [playNotification] = useSound('/sounds/notification.mp3', {
    volume: 0.5,
  })

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()
          
          if (userError) {
            console.error('Error fetching user company_id:', userError)
            setCompanyId(null)
          } else {
            setCompanyId(userData?.company_id || null)
          }
        } else {
          setUserId(null)
          setCompanyId(null)
        }
      } catch (error) {
        console.error('Error getting user:', error)
        setUserId(null)
        setCompanyId(null)
      }
    }
    getUser()
  }, [])

  // ✅ Check if user is currently viewing the entity
  // Use window.location.hash directly since app uses HashRouter
  const shouldShowNotification = useCallback((notification: Notification): boolean => {
    // Get current path from hash (HashRouter stores route in hash)
    // Remove # from hash to get the actual path
    const hashPath = window.location.hash.replace('#', '') || window.location.pathname
    const pathname = hashPath || currentPath // Fallback to state if hash is empty
    const entityType = notification.entity_type
    const entityId = notification.entity_id

    console.log('🔍 Checking shouldShowNotification:', {
      pathname,
      hashPath,
      currentPathState: currentPath,
      windowHash: window.location.hash,
      windowPathname: window.location.pathname,
      entityType,
      entityId
    })

    // If no entity info, always show
    if (!entityType || !entityId) {
      console.log('✅ No entity info, showing notification')
      return true
    }

    switch (entityType) {
      case 'ticket':
        if (pathname === `/app/tickets/${entityId}` || pathname.startsWith(`/app/tickets/${entityId}/`)) {
          console.log('⏸️ User is viewing ticket, skipping notification')
          return false
        }
        break
      case 'team':
        // Don't show if user is in the team chat (route is /app/teams/:teamId)
        const teamPath = `/app/teams/${entityId}`
        if (pathname === teamPath || pathname.startsWith(`${teamPath}/`)) {
          console.log('⏸️ User is viewing team chat, skipping notification', {
            pathname,
            teamPath,
            matches: pathname === teamPath || pathname.startsWith(`${teamPath}/`)
          })
          return false
        }
        break
      case 'asset':
        if (pathname === `/app/assets/${entityId}` || pathname.startsWith(`/app/assets/${entityId}/`)) {
          console.log('⏸️ User is viewing asset, skipping notification')
          return false
        }
        break
      case 'department':
        if (pathname === `/app/departments/${entityId}` || pathname.startsWith(`/app/departments/${entityId}/`)) {
          console.log('⏸️ User is viewing department, skipping notification')
          return false
        }
        break
    }

    console.log('✅ User is not viewing entity, showing notification')
    return true
  }, [currentPath])

  // ✅ Create Instagram-style toast
  const createToast = (notification: Notification): Toast => {
    const typeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
      ticket_assigned: 'info',
      ticket_commented: 'success',
      ticket_status_changed: 'warning',
      team_message: 'info',
      asset_assigned: 'info',
      asset_updated: 'warning',
      department_ticket: 'info',
    }

    // Generate link if not provided based on entity type
    let link = notification.link
    if (!link && notification.entity_type && notification.entity_id) {
      switch (notification.entity_type) {
        case 'ticket':
          link = `/app/tickets/${notification.entity_id}`
          break
        case 'team':
          link = `/app/teams/${notification.entity_id}`
          break
        case 'asset':
          link = `/app/assets/${notification.entity_id}`
          break
        case 'department':
          link = `/app/departments/${notification.entity_id}`
          break
      }
    }

    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: typeMap[notification.type] || 'info',
      notificationType: notification.type,
      onClick: link ? () => {
        // Use window.location for navigation to ensure full page reload if needed
        window.location.href = link!
      } : undefined,
      duration: 5000
    }
  }

  // ✅ Show toast with sound - memoized to prevent infinite loops
  const showToast = useCallback((notification: Notification) => {
    if (!shouldShowNotification(notification)) {
      console.log('⏸️ Skipping notification - user is on that page')
      return
    }

    // Prevent duplicate toasts
    setToasts(prev => {
      // Check if toast with same ID already exists
      if (prev.some(t => t.id === notification.id)) {
        return prev
      }
      console.log('🔔 Showing notification toast:', notification.title)
      const toast = createToast(notification)
      return [...prev, toast]
    })
    
    try {
      playNotification()
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }, [shouldShowNotification, playNotification])

  // Refs to store latest function versions for use in useEffect without causing re-renders
  const shouldShowNotificationRef = useRef(shouldShowNotification)
  const showToastRef = useRef(showToast)
  
  // Keep refs updated with latest function versions
  useEffect(() => {
    shouldShowNotificationRef.current = shouldShowNotification
    showToastRef.current = showToast
  }, [shouldShowNotification, showToast])

  const fetchNotifications = async (): Promise<void> => {
    try {
      if (!userId) {
        setNotifications([])
        setLoading(false)
        setIsInitialLoad(false)
        return
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching notifications:', error)
        setNotifications([])
      } else {
        setNotifications(data || [])
        // Track processed notification IDs to prevent duplicates - only track existing ones
        if (data && data.length > 0) {
          const ids = new Set(data.map(n => n.id))
          setProcessedNotificationIds(ids)
          processedNotificationIdsRef.current = ids
        } else {
          setProcessedNotificationIds(new Set())
          processedNotificationIdsRef.current = new Set()
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
      setIsInitialLoad(false)
    }
  }

  // ✅ Real-time subscriptions
  useEffect(() => {
    if (!userId || !companyId) {
      // Reset state when user/company is not available
      setNotifications([])
      setToasts([])
      setProcessedNotificationIds(new Set())
      setProcessedMessageIds(new Set())
      processedNotificationIdsRef.current = new Set()
      processedMessageIdsRef.current = new Set()
      initialLoadCompleteRef.current = false
      setIsInitialLoad(true)
      setLoading(false) // ✅ Set loading to false when no user
      return
    }

    // Reset state when userId/companyId changes (e.g., on refresh or login)
    setProcessedNotificationIds(new Set())
    setProcessedMessageIds(new Set())
    processedNotificationIdsRef.current = new Set()
    processedMessageIdsRef.current = new Set()
    initialLoadCompleteRef.current = false
    setIsInitialLoad(true)
    setToasts([]) // Clear any existing toasts
    setLoading(true) // ✅ Set loading to true when starting to fetch

    const setupSubscriptions = async () => {
      try {
        // Add timeout fallback to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Notification fetch timeout - setting loading to false')
          setLoading(false)
          setIsInitialLoad(false)
        }, 10000) // 10 second timeout

        await fetchNotifications()
        
        clearTimeout(timeoutId)
        initialLoadCompleteRef.current = true
        console.log('✅ Initial load complete, subscriptions ready')
      } catch (error) {
        console.error('❌ Error setting up subscriptions:', error)
        setLoading(false) // ✅ Ensure loading is set to false on error
        setIsInitialLoad(false)
      }
    }

    setupSubscriptions()

    // Subscribe to notifications table
    const notificationsChannel = supabase
      .channel(`user-notifications-${userId}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📬 New notification received:', payload)
          const newNotification = payload.new as Notification
          
          // Prevent duplicate notifications - use ref for synchronous check
          if (processedNotificationIdsRef.current.has(newNotification.id)) {
            console.log('⏭️ Skipping duplicate notification:', newNotification.id)
            return
          }
          
          processedNotificationIdsRef.current.add(newNotification.id)
          setProcessedNotificationIds(prev => new Set([...prev, newNotification.id]))
          
          // Only add notification if user is not currently viewing that entity
          if (shouldShowNotificationRef.current(newNotification)) {
            setNotifications(prev => {
              // Double check in state as well
              if (prev.some(n => n.id === newNotification.id)) {
                return prev
              }
              return [newNotification, ...prev]
            })
            
            // Show toast only for real-time notifications (not initial load)
            if (initialLoadCompleteRef.current) {
              showToastRef.current(newNotification)
            }
          } else {
            console.log('⏸️ Skipping notification - user is viewing that entity')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev =>
            prev.filter(n => n.id !== payload.old.id)
          )
        }
      )
      .subscribe((status) => {
        console.log('📡 Notifications channel subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to notifications channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to notifications channel')
        }
      })

    // Subscribe to team_messages for faster team chat notifications
    // IMPORTANT: This subscription respects RLS policies, so all users in the company
    // should be able to receive events if they have SELECT permission on team_messages
    const teamMessagesChannel = supabase
      .channel(`team-messages-notifications-${userId}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `company_id=eq.${companyId}`
        },
        async (payload) => {
          console.log('📨 Team message received (userId:', userId, 'companyId:', companyId, '):', payload)
          const message = payload.new as any
          
          // Skip if this is our own message
          if (message.sender_id === userId) {
            console.log('⏭️ Skipping own message')
            return
          }

          // Prevent duplicate processing - use ref for synchronous check
          if (processedMessageIdsRef.current.has(message.id)) {
            console.log('⏭️ Skipping duplicate message:', message.id)
            return
          }
          
          processedMessageIdsRef.current.add(message.id)
          setProcessedMessageIds(prev => new Set([...prev, message.id]))

          try {
            console.log('🔍 Checking team membership for team:', message.team_id, 'userId:', userId)
            // Get team members to check if user is in the team
            const { data: teamMembers, error: membersError } = await supabase
              .from('team_members')
              .select('user_id, team:teams(id, name)')
              .eq('team_id', message.team_id)
              .eq('user_id', userId)
              .single()

            // User is not a member of this team, skip
            if (membersError || !teamMembers) {
              console.log('⏭️ User is not a team member or error:', {
                error: membersError?.message,
                code: membersError?.code,
                details: membersError?.details,
                hint: membersError?.hint
              })
              return
            }

            console.log('✅ User is team member, getting sender info')
            // Get sender info
            const { data: senderData, error: senderError } = await supabase
              .from('users')
              .select('full_name, email')
              .eq('id', message.sender_id)
              .single()

            if (senderError) {
              console.error('Error fetching sender:', senderError)
            }

            // Create notification immediately (don't wait for database trigger)
            const notification: Notification = {
              id: `temp-${message.id}-${Date.now()}`,
              title: `New message in ${teamMembers.team?.name || 'team'}`,
              message: `${senderData?.full_name || 'Someone'}: ${message.content?.substring(0, 50) || 'Sent a message'}`,
              type: 'team_message',
              read: false,
              created_at: new Date().toISOString(),
              link: `/app/teams/${message.team_id}`,
              entity_id: message.team_id,
              entity_type: 'team',
              sender_name: senderData?.full_name,
            }

            console.log('🔔 Creating notification:', notification.title)

            // Only add notification if user is not currently viewing that entity
            const shouldShow = shouldShowNotificationRef.current(notification)
            console.log('🔍 shouldShowNotification result:', shouldShow)
            
            if (shouldShow) {
              // Add to notifications immediately - check for duplicates in state
              setNotifications(prev => {
                // Check for duplicate within 2 seconds for same team
                const recentDuplicate = prev.some(n => 
                  n.entity_id === message.team_id && 
                  n.type === 'team_message' && 
                  Math.abs(new Date(n.created_at).getTime() - new Date(notification.created_at).getTime()) < 2000
                )
                
                if (recentDuplicate) {
                  console.log('⏭️ Duplicate notification prevented')
                  return prev
                }
                console.log('✅ Adding notification to state')
                return [notification, ...prev]
              })

              // Show toast immediately
              console.log('📬 Initial load complete?', initialLoadCompleteRef.current)
              if (initialLoadCompleteRef.current) {
                console.log('🔔 Showing toast notification')
                showToastRef.current(notification)
              } else {
                console.log('⏸️ Skipping toast - initial load not complete, will show after load')
                // Queue the toast to show after initial load
                setTimeout(() => {
                  if (initialLoadCompleteRef.current && shouldShowNotificationRef.current(notification)) {
                    console.log('🔔 Showing queued toast notification')
                    showToastRef.current(notification)
                  }
                }, 1000)
              }
            } else {
              console.log('⏸️ Skipping notification - user is viewing that team chat')
            }
          } catch (error) {
            console.error('❌ Error processing team message notification:', error)
            console.error('Error details:', {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            })
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Team messages channel subscription status:', status, 'userId:', userId)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to team messages channel for userId:', userId)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to team messages channel:', err)
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Team messages channel subscription timed out for userId:', userId)
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Team messages channel closed for userId:', userId)
        } else {
          console.warn('⚠️ Team messages channel status:', status, 'for userId:', userId)
        }
      })

    return () => {
      console.log('🧹 Cleaning up subscriptions for userId:', userId)
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(teamMessagesChannel)
    }
  }, [userId, companyId])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      if (!userId) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        )
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const deleteAllRead = async () => {
    try {
      if (!userId) return

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true)

      if (!error) {
        setNotifications(prev => prev.filter(n => !n.read))
      }
    } catch (error) {
      console.error('Failed to delete read notifications:', error)
    }
  }

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Calculate unread count - only count notifications that should be shown
  // This recalculates whenever currentPath or notifications change
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read && shouldShowNotification(n)).length
  }, [notifications, shouldShowNotification])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        toasts,
        currentPath,
        setCurrentPath,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllRead,
        refreshNotifications: fetchNotifications,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}