import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  requestNotificationPermission, 
  startReminderChecks, 
  stopReminderChecks,
  checkAllReminders 
} from '../utils/notifications'
import { initializeFCM, checkDutyRemindersFCM } from '../utils/fcmNotifications'

export default function NotificationManager() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !user.display_name || !user.id) {
      return
    }

    let fcmInterval = null

    // Request notification permission and set up reminders
    const setupNotifications = async () => {
      try {
        // First, try to set up Firebase Cloud Messaging
        const fcmToken = await initializeFCM(user.id)
        
        if (fcmToken) {
          console.log('✅ FCM initialized successfully')
          // Use FCM for notifications - check immediately (both today and tomorrow)
          await checkDutyRemindersFCM(user.id)
          
          // Set up periodic checks every 3 hours
          fcmInterval = setInterval(() => {
            checkDutyRemindersFCM(user.id)
          }, 3 * 60 * 60 * 1000) // 3 hours
          
          console.log('✅ FCM reminders scheduled: Every 3 hours')
          console.log('📅 Schedule: Today\'s duties during day, Tomorrow\'s duties from 8 PM to midnight')
        } else {
          console.log('FCM not available, falling back to browser notifications')
          
          // Fallback to browser notifications
          const hasPermission = await requestNotificationPermission()
          
          if (hasPermission) {
            console.log('✅ Browser notification permission granted')
            // Small delay to ensure permission is fully registered
            setTimeout(async () => {
              // Check reminders immediately
              await checkAllReminders(user.display_name)
              
              // Set up periodic checks
              startReminderChecks(user.display_name)
            }, 500)
          } else {
            console.log('❌ Notification permission not granted')
          }
        }
      } catch (error) {
        console.error('Error setting up notifications:', error)
        
        // Fallback to browser notifications on error
        try {
          const hasPermission = await requestNotificationPermission()
          if (hasPermission) {
            await checkAllReminders(user.display_name)
            startReminderChecks(user.display_name)
          }
        } catch (fallbackError) {
          console.error('Fallback notification setup failed:', fallbackError)
        }
      }
    }

    setupNotifications()

    // Cleanup on unmount
    return () => {
      stopReminderChecks()
      if (fcmInterval) {
        clearInterval(fcmInterval)
      }
    }
  }, [user])

  // This component doesn't render anything
  return null
}
