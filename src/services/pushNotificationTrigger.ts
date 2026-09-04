/**
 * Supabase Realtime Trigger Integration
 * Location: src/services/pushNotificationTrigger.ts
 * 
 * Purpose: Listens for new notifications and triggers push sending
 * Integration: Call this in NotificationContext when setting up subscriptions
 * 
 * This bridges the gap between the notification system and push notifications
 */

import { supabase } from '@/lib/supabase'

interface NotificationTrigger {
  id: string
  user_id: string
  company_id: string
  title: string
  message: string
  type: string
  link?: string
  entity_id?: string
  entity_type?: string
  read: boolean
}

export class PushNotificationTrigger {
  private static unsubscribe: (() => void) | null = null
  private static isInitialized = false

  /**
   * Initialize realtime listener for notifications
   * Call this in NotificationContext alongside the existing subscription
   */
  static initialize(userId: string): void {
    if (this.isInitialized) {
      console.log('[Push Trigger] Already initialized')
      return
    }

    this.isInitialized = true
    console.log('[Push Trigger] Initializing notification listener for user:', userId)

    // Subscribe to new notifications
    const subscription = (supabase
      .channel(`notifications:${userId}`) as any)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new?: NotificationTrigger }) => {
          console.log('[Push Trigger] New notification received:', payload)
          if (payload.new) {
            void this.handleNewNotification(payload.new)
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'CLOSED') {
          console.log('[Push Trigger] Subscription closed')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Push Trigger] Channel error')
        } else if (status === 'TIMED_OUT') {
          console.log('[Push Trigger] Connection timed out')
        } else {
          console.log('[Push Trigger] Status:', status)
        }
      })

    // Store unsubscribe function for cleanup
    this.unsubscribe = () => {
      supabase.removeChannel(subscription)
    }
  }

  /**
   * Handle new notification - trigger push send
   */
  private static async handleNewNotification(notification: NotificationTrigger): Promise<void> {
    try {
      console.log('[Push Trigger] Processing notification:', notification.id)

      // Only send push for relevant notification types
      const pushableTypes = ['ticket_assigned', 'ticket_updated', 'comment_added', 'mention', 'assignment']
      if (!pushableTypes.includes(notification.type)) {
        console.log(`[Push Trigger] Skipping push for type: ${notification.type}`)
        return
      }

      // Check notification settings for this user
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('enable_push_notifications, enable_push_for_type')
        .eq('user_id', notification.user_id)
        .single()

      if (!settings?.enable_push_notifications) {
        console.log('[Push Trigger] Push notifications disabled for user:', notification.user_id)
        return
      }

      // Check if user wants push for this notification type
      if (settings.enable_push_for_type && !settings.enable_push_for_type.includes(notification.type)) {
        console.log('[Push Trigger] User has disabled push for type:', notification.type)
        return
      }

      // Prepare push payload
      const pushPayload = {
        title: this.getPushTitle(notification.type),
        body: notification.message,
        link: notification.link || this.getLinkForNotification(notification),
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: notification.entity_type ? `${notification.entity_type}-${notification.entity_id}` : 'notification',
        timestamp: new Date().toISOString(),
      }

      // Call edge function to send push
      const response = await fetch(`${window.location.origin}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          notificationId: notification.id,
          userId: notification.user_id,
          companyId: notification.company_id,
          payload: pushPayload,
        }),
      })

      const result = await response.json()
      console.log('[Push Trigger] Push send result:', result)

      if (!result.success) {
        console.warn('[Push Trigger] Failed to send push for notification:', notification.id)
      }
    } catch (error) {
      console.error('[Push Trigger] Error handling notification:', error)
      // Don't throw - notification still succeeded even if push failed
    }
  }

  /**
   * Get appropriate push title based on notification type
   */
  private static getPushTitle(type: string): string {
    const titles: Record<string, string> = {
      ticket_assigned: '🎫 Ticket Assigned',
      ticket_updated: '📝 Ticket Updated',
      comment_added: '💬 New Comment',
      mention: '👤 You Were Mentioned',
      assignment: '✅ New Assignment',
    }
    return titles[type] || 'New Notification'
  }

  /**
   * Generate link for notification based on entity type
   */
  private static getLinkForNotification(notification: NotificationTrigger): string {
    if (notification.link) {
      return notification.link
    }

    switch (notification.entity_type) {
      case 'ticket':
        return `/tickets/${notification.entity_id}`
      case 'task':
        return `/tasks/${notification.entity_id}`
      case 'comment':
        return `/comments/${notification.entity_id}`
      case 'team':
        return `/teams/${notification.entity_id}`
      default:
        return '/'
    }
  }

  /**
   * Cleanup listener
   */
  static cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.isInitialized = false
    console.log('[Push Trigger] Cleaned up')
  }
}
