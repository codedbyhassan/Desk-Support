import { supabase } from '@/lib/supabase'

interface PushSubscriptionJSON {
  endpoint: string
  keys: { auth: string; p256dh: string }
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
  static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  }

  static getPermissionStatus(): NotificationPermission {
    return Notification.permission
  }

  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission === 'denied') return false
    if (Notification.permission === 'granted') return true
    try { return await Notification.requestPermission() === 'granted' } catch { return false }
  }

  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    try {
      return await navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    } catch (error) {
      console.error('[Push] Service worker registration failed:', error)
      return null
    }
  }

  static async subscribeToPush(vapidKey: string): Promise<PushSubscriptionJSON | null> {
    if (!this.isSupported() || Notification.permission !== 'granted') return null
    try {
      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) registration = await this.registerServiceWorker()
      if (!registration) throw new Error('Failed to register service worker')
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.urlBase64ToUint8Array(vapidKey) })
      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.auth || !json.keys?.p256dh) throw new Error('Push subscription is missing required endpoints')
      return { endpoint: json.endpoint, keys: { auth: json.keys.auth, p256dh: json.keys.p256dh } }
    } catch (error) {
      console.error('[Push] Subscription failed:', error)
      return null
    }
  }

  static async saveSubscriptionToDatabase(userId: string, companyId: string, subscription: PushSubscriptionJSON): Promise<DeviceSubscription | null> {
    const { data, error } = await supabase.from('device_subscriptions').upsert({
      user_id: userId,
      company_id: companyId,
      endpoint: subscription.endpoint,
      auth_key: subscription.keys.auth,
      p256dh_key: subscription.keys.p256dh,
      browser_name: this.getBrowserName(),
      device_type: this.getDeviceType(),
      last_used_at: new Date().toISOString(),
      deleted_at: null,
    }, { onConflict: 'endpoint' }).select().single()
    if (error) {
      console.error('[Push] Database registration failed:', error)
      return null
    }
    return data as DeviceSubscription
  }

  static async removeSubscriptionFromDatabase(endpoint: string): Promise<boolean> {
    const { error } = await supabase.from('device_subscriptions').update({ deleted_at: new Date().toISOString() }).eq('endpoint', endpoint).is('deleted_at', null)
    if (error) {
      console.error('[Push] Database revocation failed:', error)
      return false
    }
    return true
  }

  static async initialize(userId: string, companyId: string, vapidKey: string): Promise<boolean> {
    if (!userId || !companyId || !vapidKey || !this.isSupported()) return false
    if (!(await this.requestPermission())) return false
    const subscription = await this.subscribeToPush(vapidKey)
    if (!subscription) return false
    const saved = await this.saveSubscriptionToDatabase(userId, companyId, subscription)
    if (!saved) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        await registration?.pushManager.getSubscription().then(current => current?.unsubscribe())
      } catch { /* database remains the source of truth */ }
      return false
    }
    return true
  }

  static async unsubscribeFromPush(userId?: string): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription) return true
      const endpoint = subscription.endpoint
      const databaseRevoked = await this.removeSubscriptionFromDatabase(endpoint)
      if (!databaseRevoked) return false
      const browserRevoked = await subscription.unsubscribe()
      if (!browserRevoked) return false
      return true
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error)
      return false
    }
  }

  static async cleanup(userId?: string): Promise<void> {
    await this.unsubscribeFromPush(userId)
  }

  static async getSubscriptionStatus(userId?: string, companyId?: string): Promise<{ supported: boolean; registered: boolean; subscribed: boolean; permission: NotificationPermission }> {
    const supported = this.isSupported()
    const permission = this.getPermissionStatus()
    if (!supported) return { supported: false, registered: false, subscribed: false, permission }

    const registration = await navigator.serviceWorker.getRegistration()
    const registered = !!registration
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return { supported, registered, subscribed: false, permission }

    if (!userId || !companyId) return { supported, registered, subscribed: false, permission }
    const { data, error } = await supabase.from('device_subscriptions').select('id').eq('user_id', userId).eq('company_id', companyId).eq('endpoint', subscription.endpoint).is('deleted_at', null).limit(1)
    return { supported, registered, subscribed: !error && (data?.length ?? 0) > 0, permission }
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const rawData = window.atob((base64String + padding).replace(/-/g, '+').replace(/_/g, '/'))
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  private static getBrowserName(): string {
    const ua = navigator.userAgent
    if (/edg/i.test(ua)) return 'Edge'
    if (/firefox/i.test(ua)) return 'Firefox'
    if (/chrome/i.test(ua)) return 'Chrome'
    if (/safari/i.test(ua)) return 'Safari'
    return 'Unknown'
  }

  private static getDeviceType(): string {
    const ua = navigator.userAgent
    if (/android/i.test(ua)) return 'Android'
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
    if (/windows/i.test(ua)) return 'Windows'
    if (/macintosh/i.test(ua)) return 'macOS'
    if (/linux/i.test(ua)) return 'Linux'
    return 'Unknown'
  }
}
