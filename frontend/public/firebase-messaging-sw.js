// Service Worker for Firebase Cloud Messaging
// This file must be in the public folder
// Handles BACKGROUND notifications that appear in Android notification panel

// Import Firebase scripts immediately
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase configuration - will be set by main app via postMessage
let firebaseConfig = null
let messaging = null
let firebaseInitialized = false

// Listen for config message from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config
    initializeFirebase()
  }
})

function initializeFirebase() {
  // Only initialize if config is provided and not already initialized
  if (firebaseInitialized || !firebaseConfig || !firebaseConfig.apiKey) {
    return
  }

  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig)
    firebaseInitialized = true

    // Retrieve an instance of Firebase Messaging
    messaging = firebase.messaging()

    // Handle background messages - CRITICAL for system notifications on mobile
    // This is called when app is in background or closed
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message:', payload)
      
      // Extract notification data - prefer notification object over data
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Room Duty Scheduler'
      const notificationBody = payload.notification?.body || payload.data?.body || ''
      
      // Create notification options for SYSTEM notification
      const notificationOptions = {
        body: notificationBody,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        image: payload.notification?.image || payload.data?.image || undefined,
        data: {
          ...payload.data,
          url: payload.data?.url || payload.fcmOptions?.link || '/',
        },
        tag: payload.data?.tag || payload.notification?.tag || 'duty-notification',
        requireInteraction: payload.data?.requireInteraction || payload.notification?.requireInteraction || false,
        silent: false,
        vibrate: payload.data?.vibrate || [200, 100, 200],
        timestamp: Date.now(),
        actions: payload.data?.actions || [],
        dir: 'ltr',
        lang: 'en',
      }

      // Show SYSTEM notification - appears in Android notification panel
      return self.registration.showNotification(notificationTitle, notificationOptions)
    })

    console.log('[firebase-messaging-sw.js] Firebase initialized successfully')
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Firebase initialization error:', error)
  }
}

// Handle notification clicks - open app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event.notification.tag)
  
  event.notification.close()
  
  // Get the URL to open (from notification data or default to home)
  const urlToOpen = event.notification.data?.url || '/'
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event.notification.tag)
})

// Also handle direct notification requests from main thread (for testing)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    self.registration.showNotification(title, {
      ...options,
      icon: options.icon || '/favicon.svg',
      badge: options.badge || '/favicon.svg',
    })
  }
})
