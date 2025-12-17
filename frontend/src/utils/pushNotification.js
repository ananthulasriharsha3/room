// Utility to send system-level push notifications via Service Worker
// This ensures notifications appear in Android notification panel, not as website alerts

/**
 * Send a system notification via Service Worker
 * This appears in the Android notification panel, not as a website alert
 */
export async function sendSystemNotification(title, options = {}) {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    // Send message to service worker to show notification
    // This ensures it appears as a SYSTEM notification, not a website alert
    registration.active?.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      options: {
        body: options.body || '',
        icon: options.icon || '/favicon.svg',
        badge: options.badge || '/favicon.svg',
        tag: options.tag || `notification-${Date.now()}`,
        requireInteraction: options.requireInteraction || false,
        data: options.data || {},
        vibrate: options.vibrate || [200, 100, 200],
        ...options,
      }
    })

    console.log('✅ System notification sent via Service Worker')
    return true
  } catch (error) {
    console.error('Error sending system notification:', error)
    return false
  }
}

/**
 * Request notification permission (only once)
 */
export async function requestNotificationPermissionOnce() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied')
    return false
  }

  // Request permission
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

