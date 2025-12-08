/**
 * Service Worker
 * Handles background push notifications and sync events
 */

// Listen for push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event)

  if (!event.data) {
    console.warn('[SW] Push event without data')
    return
  }

  try {
    const data = event.data.json()
    console.log('[SW] Push data:', data)

    // Prepare notification options
    const options = {
      body: data.body || data.message || data.description || '',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      tag: data.tag || data.type || 'notification',
      requireInteraction: data.requireInteraction || false,
      
      // Badge counter (if supported)
      badge: data.badge || undefined,
      
      // Actions (future enhancement)
      actions: data.actions || [],
      
      data: {
        url: data.link || '/app/dashboard',
        type: data.type,
        entityId: data.entity_id,
        entityType: data.entity_type,
        notificationId: data.notificationId,
        timestamp: data.timestamp,
        ...data,
      },
    }

    // Show notification
    event.waitUntil(
      self.registration.showNotification(data.title || 'Desk Support', options)
        .then(() => {
          console.log('[SW] Notification shown successfully')
          // Update badge counter
          updateBadgeCounter(1)
        })
        .catch((error) => {
          console.error('[SW] Error showing notification:', error)
        })
    )
  } catch (error) {
    console.error('[SW] Error handling push event:', error)
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Desk Support Notification', {
        body: 'New notification received',
        icon: '/favicon.svg',
      })
    )
  }
})

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)

  event.notification.close()

  const url = event.notification.data.url || '/app/dashboard'
  const notificationId = event.notification.data.notificationId

  // Track click in database (fire and forget)
  if (notificationId) {
    trackPushClick(notificationId, url)
  }

  // Update badge counter
  updateBadgeCounter(-1)

  // Find and focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if app is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url.includes('/app') && 'focus' in client) {
          // Focus existing client and navigate
          client.postMessage({
            type: 'NAVIGATE',
            url: url,
          })
          return client.focus()
        }
      }
      // App not open, open it
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Listen for notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag)
  // Update badge counter
  updateBadgeCounter(-1)
})

/**
 * Update badge counter on app icon
 * @param {number} delta - Amount to change badge by (1 or -1)
 */
async function updateBadgeCounter(delta) {
  try {
    // Get current badge count (estimated from localStorage)
    const currentBadge = parseInt(localStorage.getItem('push-badge-count') || '0', 10)
    const newBadge = Math.max(0, currentBadge + delta)
    localStorage.setItem('push-badge-count', newBadge.toString())

    // Set badge on app icon (if supported)
    if (navigator.setAppBadge) {
      if (newBadge > 0) {
        await navigator.setAppBadge(newBadge)
      } else {
        await navigator.clearAppBadge()
      }
      console.log('[SW] Badge updated:', newBadge)
    }

    // Notify all clients of badge change
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({
        type: 'BADGE_UPDATE',
        count: newBadge,
      })
    })
  } catch (error) {
    console.warn('[SW] Error updating badge:', error)
  }
}

/**
 * Track push notification click in database
 * @param {string} notificationId - Notification ID
 * @param {string} url - URL clicked
 */
async function trackPushClick(notificationId, url) {
  try {
    // Get all clients to find one with auth token
    const clients = await self.clients.matchAll()
    let authToken = null

    for (const client of clients) {
      if (client.type === 'window') {
        const response = await client.postMessage({
          type: 'GET_AUTH_TOKEN',
        })
        if (response) {
          authToken = response
          break
        }
      }
    }

    if (!authToken) {
      console.warn('[SW] No auth token available for tracking click')
      return
    }

    // Get Supabase URL (would need to pass this from client)
    const supabaseUrl = localStorage.getItem('supabase-url') || 'http://localhost:54321'

    const response = await fetch(`${supabaseUrl}/rest/v1/push_clicks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        notification_id: notificationId,
        navigation_url: url,
        clicked_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      console.warn('[SW] Failed to track click:', response.status)
    }
  } catch (error) {
    console.error('[SW] Error tracking click:', error)
    // Don't throw - click was successful even if tracking failed
  }
}

// Handle background sync (for offline notifications)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag)

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

// Sync notifications function
async function syncNotifications() {
  console.log('[SW] Syncing notifications...')
  try {
    // This would be called when the app comes online
    // In a real app, you'd fetch pending notifications from the server
    console.log('[SW] Notifications synced')
  } catch (error) {
    console.error('[SW] Error syncing notifications:', error)
    throw error
  }
}

// Handle periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag)

  if (event.tag === 'check-notifications') {
    event.waitUntil(checkNotifications())
  }
})

// Check notifications function
async function checkNotifications() {
  console.log('[SW] Checking for notifications...')
  try {
    // Fetch and process notifications
    console.log('[SW] Notification check complete')
  } catch (error) {
    console.error('[SW] Error checking notifications:', error)
    throw error
  }
}

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated')
  event.waitUntil(clients.claim())
})

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing')
  self.skipWaiting()
})

// Handle fetch events (for offline support)
self.addEventListener('fetch', (event) => {
  // Only log for non-GET requests or API calls
  if (event.request.method !== 'GET') {
    return
  }

  // You can add offline caching strategy here if needed
})

console.log('[SW] Service worker script loaded')
