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

const emptyStatus: PushNotificationStatus = { supported: false, registered: false, subscribed: false, permission: 'default' }

export function usePushNotifications() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<PushNotificationStatus>(emptyStatus)
  const [loading, setLoading] = useState(false)
  const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

  const refreshStatus = useCallback(async () => {
    const next = await PushNotificationService.getSubscriptionStatus(user?.id, user?.company_id)
    setStatus(next)
    return next
  }, [user?.company_id, user?.id])

  useEffect(() => { void refreshStatus() }, [refreshStatus])

  const initialize = useCallback(async () => {
    if (!user?.id || !user.company_id || !VAPID_KEY) {
      toast({ title: 'Push setup unavailable', description: 'Push notifications are not configured for this workspace.', variant: 'destructive' })
      return false
    }
    if (!PushNotificationService.isSupported()) {
      toast({ title: 'Not supported', description: 'Push notifications are not supported in this browser.', variant: 'destructive' })
      return false
    }
    setLoading(true)
    try {
      const success = await PushNotificationService.initialize(user.id, user.company_id, VAPID_KEY)
      const next = await refreshStatus()
      if (!success || !next.subscribed) {
        toast({ title: 'Push was not enabled', description: 'The browser or server did not confirm a registered push subscription.', variant: 'destructive' })
        return false
      }
      toast({ title: 'Push enabled', description: 'This browser is now registered for push notifications.' })
      return true
    } finally {
      setLoading(false)
    }
  }, [VAPID_KEY, refreshStatus, toast, user?.company_id, user?.id])

  const disable = useCallback(async () => {
    setLoading(true)
    try {
      const success = await PushNotificationService.unsubscribeFromPush(user?.id)
      const next = await refreshStatus()
      if (!success || next.subscribed) {
        toast({ title: 'Push is still enabled', description: 'The browser and server did not confirm revocation.', variant: 'destructive' })
        return false
      }
      toast({ title: 'Push disabled', description: 'This browser is no longer registered for push notifications.' })
      return true
    } finally {
      setLoading(false)
    }
  }, [refreshStatus, toast, user?.id])

  const cleanup = useCallback(async () => {
    await PushNotificationService.cleanup(user?.id)
    setStatus(emptyStatus)
  }, [user?.id])

  return { status, loading, initialize, disable, cleanup, refreshStatus, isSupported: PushNotificationService.isSupported() }
}
