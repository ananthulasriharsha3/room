import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  requestNotificationPermission, 
  startReminderChecks, 
  stopReminderChecks,
  checkAllReminders 
} from '../utils/notifications'

export default function NotificationManager() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !user.display_name) {
      return
    }

    // Request notification permission and set up reminders
    const setupNotifications = async () => {
      const hasPermission = await requestNotificationPermission()
      
      if (hasPermission) {
        // Check reminders immediately
        await checkAllReminders(user.display_name)
        
        // Set up periodic checks (every hour)
        startReminderChecks(user.display_name)
      } else {
        console.log('Notification permission not granted')
      }
    }

    setupNotifications()

    // Cleanup on unmount
    return () => {
      stopReminderChecks()
    }
  }, [user])

  // This component doesn't render anything
  return null
}

