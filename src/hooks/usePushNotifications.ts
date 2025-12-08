/**
 * usePushNotifications Hook
 * Manages push notification initialization and status
 */

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { PushNotificationService } from '@/services/pushNotificationService'
import { useToast } from './use-toast'

interface PushNotificationStatus {
  supported: boolean
  registered: boolean
  subscribed: boolean
  permission: NotificationPermission
}

export function usePushNotifications() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<PushNotificationStatus>({
    supported: false,
    registered: false,
    subscribed: false,
    permission: 'default',
  })
  const [loading, setLoading] = useState(false)

  // Get VAPID key from environment
  const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

  // Check status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const newStatus = await PushNotificationService.getSubscriptionStatus()
      setStatus(newStatus)
      console.log('[Push Hook] Status:', newStatus)
    }

    checkStatus()
  }, [])

  // Initialize push notifications
  const initialize = useCallback(async () => {
    if (!user?.id || !VAPID_KEY) {
      console.warn('[Push Hook] Missing user or VAPID key')
      return false
    }

    if (!PushNotificationService.isSupported()) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in your browser',
        variant: 'destructive',
      })
      return false
    }

    setLoading(true)
    try {
      const success = await PushNotificationService.initialize(user.id, user.company_id || '', VAPID_KEY)

      if (success) {
        const newStatus = await PushNotificationService.getSubscriptionStatus()
        setStatus(newStatus)
        toast({
          title: 'Enabled',
          description: 'Push notifications have been enabled',
        })
        return true
      } else {
        toast({
          title: 'Error',
          description: 'Failed to enable push notifications',
          variant: 'destructive',
        })
        return false
      }
    } catch (error) {
      console.error('[Push Hook] Error initializing:', error)
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive',
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.company_id, VAPID_KEY, toast])

  // Disable push notifications
  const disable = useCallback(async () => {
    setLoading(true)
    try {
      const success = await PushNotificationService.unsubscribeFromPush()

      if (success) {
        const newStatus = await PushNotificationService.getSubscriptionStatus()
        setStatus(newStatus)
        toast({
          title: 'Disabled',
          description: 'Push notifications have been disabled',
        })
        return true
      } else {
        toast({
          title: 'Error',
          description: 'Failed to disable push notifications',
          variant: 'destructive',
        })
        return false
      }
    } catch (error) {
      console.error('[Push Hook] Error disabling:', error)
      toast({
        title: 'Error',
        description: 'Failed to disable push notifications',
        variant: 'destructive',
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Cleanup on logout
  const cleanup = useCallback(async () => {
    await PushNotificationService.cleanup()
    setStatus({
      supported: false,
      registered: false,
      subscribed: false,
      permission: 'default',
    })
  }, [])

  return {
    status,
    loading,
    initialize,
    disable,
    cleanup,
    isSupported: PushNotificationService.isSupported(),
  }
}
