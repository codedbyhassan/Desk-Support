import { supabase } from '@/lib/supabase'

type PushSubscriptionJSON = { endpoint: string; keys: { auth: string; p256dh: string } }
type DeviceRow = { id: string; user_id: string; platform: string; token: string; last_seen_at: string; created_at: string; updated_at: string }

export class PushNotificationService {
  static isSupported(): boolean { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window }
  static getPermissionStatus(): NotificationPermission { return Notification.permission }

  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission === 'denied') return false
    if (Notification.permission === 'granted') return true
    try { return await Notification.requestPermission() === 'granted' } catch { return false }
  }

  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    try { return await navigator.serviceWorker.register('/service-worker.js', { scope: '/' }) }
    catch (error) { console.error('[Push] Service worker registration failed:', error); return null }
  }

  static async getBrowserSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null
    const registration = await navigator.serviceWorker.getRegistration() ?? await this.registerServiceWorker()
    return registration ? registration.pushManager.getSubscription() : null
  }

  static async subscribeToPush(vapidKey: string): Promise<PushSubscriptionJSON | null> {
    if (!this.isSupported() || Notification.permission !== 'granted') return null
    try {
      const registration = await navigator.serviceWorker.getRegistration() ?? await this.registerServiceWorker()
      if (!registration) throw new Error('Failed to register service worker')
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.urlBase64ToUint8Array(vapidKey) })
      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.auth || !json.keys?.p256dh) throw new Error('Push subscription is missing required endpoints')
      return { endpoint: json.endpoint, keys: { auth: json.keys.auth, p256dh: json.keys.p256dh } }
    } catch (error) { console.error('[Push] Subscription failed:', error); return null }
  }

  static async saveSubscriptionToDatabase(userId: string, subscription: PushSubscriptionJSON): Promise<DeviceRow | null> {
    const { data, error } = await supabase.from('notification_devices').upsert({
      user_id: userId,
      platform: 'web',
      token: JSON.stringify(subscription),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'platform,token' }).select().single()
    if (error) { console.error('[Push] Device registration failed:', error); return null }
    return data as DeviceRow
  }

  static async removeSubscriptionFromDatabase(userId: string, endpoint: string): Promise<boolean> {
    const { data, error } = await supabase.from('notification_devices').select('id,token').eq('user_id', userId).eq('platform', 'web')
    if (error) { console.error('[Push] Device lookup failed:', error); return false }
    const ids = ((data ?? []) as Array<Pick<DeviceRow, 'id' | 'token'>>).filter(row => {
      try { return (JSON.parse(row.token) as PushSubscriptionJSON).endpoint === endpoint } catch { return false }
    }).map(row => row.id)
    if (!ids.length) return true
    const { error: deleteError } = await supabase.from('notification_devices').delete().in('id', ids).eq('user_id', userId)
    if (deleteError) { console.error('[Push] Device revocation failed:', deleteError); return false }
    return true
  }

  static async initialize(userId: string, _companyId: string, vapidKey: string): Promise<boolean> {
    if (!userId || !vapidKey || !this.isSupported() || !(await this.requestPermission())) return false
    const subscription = await this.subscribeToPush(vapidKey)
    if (!subscription) return false
    const saved = await this.saveSubscriptionToDatabase(userId, subscription)
    if (!saved) {
      try { await (await this.getBrowserSubscription())?.unsubscribe() } catch { /* keep server as source of truth */ }
      return false
    }
    return true
  }

  static async unsubscribeFromPush(userId?: string): Promise<boolean> {
    if (!this.isSupported() || !userId) return false
    try {
      const subscription = await this.getBrowserSubscription()
      if (!subscription) return true
      if (!(await this.removeSubscriptionFromDatabase(userId, subscription.endpoint))) return false
      return await subscription.unsubscribe()
    } catch (error) { console.error('[Push] Unsubscribe failed:', error); return false }
  }

  static async cleanup(userId?: string): Promise<void> { if (userId) await this.unsubscribeFromPush(userId) }

  static async getSubscriptionStatus(userId?: string, _companyId?: string): Promise<{ supported: boolean; registered: boolean; subscribed: boolean; permission: NotificationPermission }> {
    const supported = this.isSupported()
    const permission = this.getPermissionStatus()
    if (!supported) return { supported: false, registered: false, subscribed: false, permission }
    const registration = await navigator.serviceWorker.getRegistration()
    const registered = !!registration
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription || !userId) return { supported, registered, subscribed: false, permission }
    const { data, error } = await supabase.from('notification_devices').select('id,token').eq('user_id', userId).eq('platform', 'web')
    const subscribed = !error && ((data ?? []) as Array<Pick<DeviceRow, 'id' | 'token'>>).some(row => {
      try { return (JSON.parse(row.token) as PushSubscriptionJSON).endpoint === subscription.endpoint }
      catch { return false }
    })
    return { supported, registered, subscribed, permission }
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const rawData = window.atob((base64String + padding).replace(/-/g, '+').replace(/_/g, '/'))
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }
}
