// Service Worker for Firebase Cloud Messaging
// This file must be in the public folder
// Firebase config will be injected by the main app

let messaging = null
let firebaseInitialized = false

// Listen for config message from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    initializeFirebase(event.data.config)
  }
})

function initializeFirebase(firebaseConfig) {
  // Only initialize if config is provided and not already initialized
  if (firebaseInitialized || !firebaseConfig || !firebaseConfig.apiKey) {
    return
  }

  try {
    // Import Firebase scripts
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig)
    firebaseInitialized = true

    // Retrieve an instance of Firebase Messaging
    messaging = firebase.messaging()

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload)
      
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Room Duty Scheduler'
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: payload.data || {},
        tag: payload.data?.tag || 'duty-notification',
        requireInteraction: payload.data?.requireInteraction || false,
      }

      return self.registration.showNotification(notificationTitle, notificationOptions)
    })

    console.log('[firebase-messaging-sw.js] Firebase initialized successfully')
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Firebase initialization error:', error)
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.')
  
  event.notification.close()
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  )
})
