/**
 * Push Notification Deduplication Service
 * Location: src/services/pushDeduplicationService.ts
 * 
 * Purpose: Prevent showing the same notification as both toast AND push
 * Logic: If app is focused and window is active, skip push notification
 * 
 * This solves the problem of users seeing duplicate notifications
 */

export class PushDeduplicationService {
  private static windowFocused = true
  private static appVisibilityListener: (() => void) | null = null
  private static windowFocusListener: (() => void) | null = null
  private static windowBlurListener: (() => void) | null = null
  private static recentNotificationIds = new Set<string>()
  private static maxRecentNotifications = 100 // Keep last 100

  /**
   * Initialize deduplication service
   * Must be called once during app initialization
   */
  static initialize(): void {
    // Track window focus state
    this.windowFocusListener = () => {
      this.windowFocused = true
      console.log('[Dedup] Window focused')
    }

    this.windowBlurListener = () => {
      this.windowFocused = false
      console.log('[Dedup] Window blurred')
    }

    // Track document visibility
    this.appVisibilityListener = () => {
      const isVisible = document.visibilityState === 'visible'
      this.windowFocused = isVisible
      console.log('[Dedup] Visibility changed:', isVisible)
    }

    window.addEventListener('focus', this.windowFocusListener)
    window.addEventListener('blur', this.windowBlurListener)
    document.addEventListener('visibilitychange', this.appVisibilityListener)

    console.log('[Dedup] Service initialized')
  }

  /**
   * Check if we should show a push notification
   * Returns false if app is already showing this via toast
   */
  static shouldShowPushNotification(notificationId: string): boolean {
    // If window is focused, app is handling notifications as toasts
    // Skip push in this case
    if (this.windowFocused && document.visibilityState === 'visible') {
      console.log('[Dedup] App is focused, skipping push for notification:', notificationId)
      return false
    }

    // Check if we've recently sent this notification
    if (this.recentNotificationIds.has(notificationId)) {
      console.log('[Dedup] Notification already processed recently:', notificationId)
      return false
    }

    // Track this notification
    this.recentNotificationIds.add(notificationId)

    // Keep set size manageable
    if (this.recentNotificationIds.size > this.maxRecentNotifications) {
      const first = this.recentNotificationIds.values().next().value
      if (typeof first === 'string') {
        this.recentNotificationIds.delete(first)
      }
    }

    return true
  }

  /**
   * Mark a notification as shown via push
   * This prevents the real-time subscription from also showing it as a toast
   */
  static markAsShownViaPush(notificationId: string): void {
    this.recentNotificationIds.add(notificationId)
    console.log('[Dedup] Marked as shown via push:', notificationId)
  }

  /**
   * Mark a notification as shown via toast
   * This prevents push from being sent
   */
  static markAsShownViaToast(notificationId: string): void {
    this.recentNotificationIds.add(notificationId)
    console.log('[Dedup] Marked as shown via toast:', notificationId)
  }

  /**
   * Get current window focus state
   */
  static isWindowFocused(): boolean {
    return this.windowFocused && document.visibilityState === 'visible'
  }

  /**
   * Cleanup listeners
   */
  static cleanup(): void {
    if (this.windowFocusListener) {
      window.removeEventListener('focus', this.windowFocusListener)
    }
    if (this.windowBlurListener) {
      window.removeEventListener('blur', this.windowBlurListener)
    }
    if (this.appVisibilityListener) {
      document.removeEventListener('visibilitychange', this.appVisibilityListener)
    }

    this.recentNotificationIds.clear()
    console.log('[Dedup] Service cleaned up')
  }
}
