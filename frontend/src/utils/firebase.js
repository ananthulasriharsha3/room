// Firebase configuration and initialization
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Register service worker and send config
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Register service worker first
  navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/'
  })
    .then((registration) => {
      console.log('✅ Service Worker registered:', registration.scope)
      
      // Wait for service worker to be ready
      return navigator.serviceWorker.ready
    })
    .then((registration) => {
      // Send Firebase config to service worker
      const sendConfig = () => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig
          })
          console.log('✅ Firebase config sent to service worker')
        } else if (registration.installing) {
          registration.installing.addEventListener('statechange', function() {
            if (this.state === 'activated' && registration.active) {
              registration.active.postMessage({
                type: 'FIREBASE_CONFIG',
                config: firebaseConfig
              })
              console.log('✅ Firebase config sent to service worker (after activation)')
            }
          })
        } else if (registration.waiting) {
          registration.waiting.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig
          })
          console.log('✅ Firebase config sent to waiting service worker')
        }
      }
      
      // Try to send config immediately
      sendConfig()
      
      // Also listen for service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && registration.active) {
              sendConfig()
            }
          })
        }
      })
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error)
    })
}

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging = null

// Check if browser supports FCM
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app)
  } catch (error) {
    console.error('Firebase messaging initialization error:', error)
  }
}

// Request FCM token
export async function requestFCMToken() {
  if (!messaging) {
    console.warn('Firebase messaging not available')
    return null
  }

  try {
    // Ensure service worker is ready
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready
    }

    // VAPID key from environment or Firebase Console
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
    
    if (!vapidKey) {
      console.warn('VAPID key not configured. Get it from Firebase Console → Project Settings → Cloud Messaging')
      return null
    }

    // Request notification permission first (required for FCM token)
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('Notification permission not granted')
        return null
      }
    }

    const currentToken = await getToken(messaging, { 
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready
    })
    
    if (currentToken) {
      console.log('✅ FCM Token:', currentToken)
      return currentToken
    } else {
      console.log('No registration token available. Request permission to generate one.')
      return null
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error)
    return null
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback) {
  if (!messaging) {
    return null
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload)
    if (callback) {
      callback(payload)
    }
  })
}

// Send notification using FCM (for testing or admin use)
export async function sendFCMNotification(token, title, body, data = {}) {
  // This would typically be done from a backend server
  // For now, we'll just log it
  console.log('FCM Notification would be sent:', { token, title, body, data })
  
  // In production, you'd call your backend API which uses Firebase Admin SDK
  // Example: await fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ token, title, body, data }) })
  
  return { success: true }
}

export { messaging, app }

