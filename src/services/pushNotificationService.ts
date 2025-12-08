/**
 * Push Notification Service
 * Handles browser push notifications, subscriptions, and VAPID key management
 */

import { supabase } from '@/lib/supabase'

interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    auth: string
    p256dh: string
  }
}

interface DeviceSubscription {
  id: string
  user_id: string
  company_id: string
  endpoint: string
  auth_key: string
  p256dh_key: string
  browser_name?: string
  device_type?: string
  last_used_at: string
  created_at: string
}

export class PushNotificationService {
  /**
   * Check if push notifications are supported in this browser
   */
  static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  }

  /**
   * Get current notification permission status
   */
  static getPermissionStatus(): NotificationPermission {
    return Notification.permission
  }

  /**
   * Request user permission for notifications
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[Push] Push notifications not supported in this browser')
      return false
    }

    if (Notification.permission === 'granted') {
      console.log('[Push] Notification permission already granted')
      return true
    }

    if (Notification.permission === 'denied') {
      console.warn('[Push] Notification permission denied by user')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      console.log('[Push] Permission request result:', permission)
      return permission === 'granted'
    } catch (error) {
      console.error('[Push] Error requesting permission:', error)
      return false
    }
  }

  /**
   * Register service worker
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service workers not supported')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      })
      console.log('[Push] ✅ Service worker registered:', registration)
      return registration
    } catch (error) {
      console.error('[Push] Error registering service worker:', error)
      return null
    }
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribeToPush(vapidKey: string): Promise<PushSubscriptionJSON | null> {
    if (!this.isSupported()) {
      console.warn('[Push] Push notifications not supported')
      return null
    }

    if (Notification.permission !== 'granted') {
      console.warn('[Push] Notification permission not granted')
      return null
    }

    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        registration = await this.registerServiceWorker()
      }

      if (!registration) {
        throw new Error('Failed to register service worker')
      }

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // Subscribe to push
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey),
        })
        console.log('[Push] ✅ Subscribed to push notifications')
      } else {
        console.log('[Push] Already subscribed to push notifications')
      }

      return subscription.toJSON()
    } catch (error) {
      console.error('[Push] Error subscribing to push:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribeFromPush(): Promise<boolean> {
    if (!this.isSupported()) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return true

      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        console.log('[Push] ✅ Unsubscribed from push notifications')
      }
      return true
    } catch (error) {
      console.error('[Push] Error unsubscribing:', error)
      return false
    }
  }

  /**
   * Save subscription to database
   */
  static async saveSubscriptionToDatabase(
    userId: string,
    companyId: string,
    subscription: PushSubscriptionJSON
  ): Promise<DeviceSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('device_subscriptions')
        .upsert(
          {
            user_id: userId,
            company_id: companyId,
            endpoint: subscription.endpoint,
            auth_key: subscription.keys.auth,
            p256dh_key: subscription.keys.p256dh,
            browser_name: this.getBrowserName(),
            device_type: this.getDeviceType(),
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: 'endpoint',
          }
        )
        .select()
        .single()

      if (error) {
        console.error('[Push] Error saving subscription:', error)
        return null
      }

      console.log('[Push] ✅ Subscription saved to database')
      return data
    } catch (error) {
      console.error('[Push] Error saving subscription:', error)
      return null
    }
  }

  /**
   * Remove subscription from database
   */
  static async removeSubscriptionFromDatabase(endpoint: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('device_subscriptions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('endpoint', endpoint)

      if (error) {
        console.error('[Push] Error removing subscription:', error)
        return false
      }

      console.log('[Push] ✅ Subscription removed from database')
      return true
    } catch (error) {
      console.error('[Push] Error removing subscription:', error)
      return false
    }
  }

  /**
   * Initialize push notifications (request permission and subscribe)
   */
  static async initialize(userId: string, companyId: string, vapidKey: string): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[Push] Push notifications not supported')
      return false
    }

    try {
      // Request permission
      const hasPermission = await this.requestPermission()
      if (!hasPermission) {
        console.warn('[Push] User denied notification permission')
        return false
      }

      // Subscribe to push
      const subscription = await this.subscribeToPush(vapidKey)
      if (!subscription) {
        console.warn('[Push] Failed to subscribe to push')
        return false
      }

      // Save to database
      await this.saveSubscriptionToDatabase(userId, companyId, subscription)

      console.log('[Push] ✅ Push notifications initialized')
      return true
    } catch (error) {
      console.error('[Push] Error initializing push notifications:', error)
      return false
    }
  }

  /**
   * Cleanup subscriptions on logout
   */
  static async cleanup(): Promise<void> {
    try {
      await this.unsubscribeFromPush()
      console.log('[Push] ✅ Push notifications cleaned up')
    } catch (error) {
      console.error('[Push] Error cleaning up push notifications:', error)
    }
  }

  /**
   * Helper: Convert VAPID key from base64 to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Helper: Get browser name
   */
  private static getBrowserName(): string {
    const ua = navigator.userAgent
    if (ua.indexOf('Firefox') > -1) return 'Firefox'
    if (ua.indexOf('Chrome') > -1) return 'Chrome'
    if (ua.indexOf('Safari') > -1) return 'Safari'
    if (ua.indexOf('Edge') > -1) return 'Edge'
    return 'Unknown'
  }

  /**
   * Helper: Get device type
   */
  private static getDeviceType(): string {
    const ua = navigator.userAgent
    if (/android/i.test(ua)) return 'Android'
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
    if (/windows/i.test(ua)) return 'Windows'
    if (/macintosh/i.test(ua)) return 'macOS'
    if (/linux/i.test(ua)) return 'Linux'
    return 'Unknown'
  }

  /**
   * Get subscription status
   */
  static async getSubscriptionStatus(): Promise<{
    supported: boolean
    registered: boolean
    subscribed: boolean
    permission: NotificationPermission
  }> {
    const supported = this.isSupported()
    const permission = this.getPermissionStatus()

    let registered = false
    let subscribed = false

    if (supported) {
      const registration = await navigator.serviceWorker.getRegistration()
      registered = !!registration

      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        subscribed = !!subscription
      }
    }

    return {
      supported,
      registered,
      subscribed,
      permission,
    }
  }
}
