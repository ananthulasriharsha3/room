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
  navigator.serviceWorker.ready.then((registration) => {
    // Send Firebase config to service worker
    if (registration.active) {
      registration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig
      })
    } else if (registration.installing) {
      registration.installing.addEventListener('statechange', function() {
        if (this.state === 'activated' && registration.active) {
          registration.active.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig
          })
        }
      })
    }
  }).catch((error) => {
    console.error('Service Worker ready failed:', error)
  })

  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('✅ Service Worker registered:', registration.scope)
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
    // VAPID key from environment or Firebase Console
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
    
    if (!vapidKey) {
      console.warn('VAPID key not configured. Get it from Firebase Console → Project Settings → Cloud Messaging')
      return null
    }

    const currentToken = await getToken(messaging, { vapidKey })
    
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

