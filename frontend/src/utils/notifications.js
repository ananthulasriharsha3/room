import { getSchedule } from './schedule'
import { format, addDays } from 'date-fns'

// Global callback for in-app notifications (fallback when browser notifications are blocked)
let inAppNotificationCallback = null

export function setInAppNotificationCallback(callback) {
  inAppNotificationCallback = callback
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Check if notifications are enabled
export function areNotificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted'
}

// Send a system notification via Service Worker (for mobile compatibility)
// This ensures notifications appear in Android notification panel
export async function sendNotification(title, options = {}) {
  // Check permission status
  if (!('Notification' in window)) {
    console.error('❌ This browser does not support notifications')
    return null
  }

  const permission = Notification.permission
  console.log('📋 Notification permission status:', permission)

  if (permission !== 'granted') {
    console.error('❌ Notification permission not granted. Current status:', permission)
    console.log('💡 Please enable notifications in your browser settings')
    return null
  }

  try {
    // Use Service Worker for system notifications (works on mobile)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      
      // Send to service worker - this creates SYSTEM notifications on mobile
      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          body: options.body || '',
          icon: options.icon || '/favicon.svg',
          badge: options.badge || '/favicon.svg',
          tag: options.tag || `notification-${Date.now()}`,
          requireInteraction: options.requireInteraction || false,
          data: options.data || { url: '/' },
          vibrate: options.vibrate || [200, 100, 200],
          ...options,
        }
      })

      console.log('✅ System notification sent via Service Worker')
      console.log('📍 Check your Android notification panel')
      
      // Also show in-app notification as fallback
      if (inAppNotificationCallback) {
        try {
          inAppNotificationCallback(title, options.body || '')
        } catch (error) {
          console.warn('Failed to show in-app notification:', error)
        }
      }
      
      return { success: true }
    }

    // Fallback to browser Notification API (desktop)
    console.log('🔔 Creating browser notification:', { title, options })
    
    const notification = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    })

    console.log('✅ Notification created successfully:', notification)

    // Add event listeners
    notification.onclick = () => {
      console.log('👆 Notification clicked')
      window.focus()
      notification.close()
    }

    notification.onshow = () => {
      console.log('👁️ Notification is now visible')
    }

    notification.onerror = (error) => {
      console.error('❌ Notification error:', error)
    }

    notification.onclose = () => {
      console.log('🔒 Notification closed')
    }

    // Auto-close after 5 seconds (unless requireInteraction is true)
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close()
      }, 5000)
    } else {
      setTimeout(() => {
        notification.close()
      }, 10000)
    }

    return notification
  } catch (error) {
    console.error('❌ Error creating notification:', error)
    
    // Show in-app notification as fallback
    if (inAppNotificationCallback) {
      try {
        inAppNotificationCallback(title, options.body || '')
        console.log('✅ Showing in-app notification as fallback')
      } catch (fallbackError) {
        console.warn('Failed to show in-app notification fallback:', fallbackError)
      }
    }
    
    return null
  }
}

// Get duties for a specific date
export async function getDutiesForDate(date) {
  try {
    const year = date.getFullYear()
    const schedule = await getSchedule(year)
    
    if (!schedule || !schedule.days) {
      console.log('No schedule found for year:', year)
      return null
    }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayData = schedule.days.find(day => day.date === dateStr)
    
    if (!dayData) {
      console.log('No duties found for date:', dateStr)
      return null
    }

    return {
      date: dateStr,
      dayName: dayData.day_name,
      assignments: dayData.assignments || {},
      note: dayData.note || null,
    }
  } catch (error) {
    // Schedule might not exist yet - that's okay
    if (error.message && error.message.includes('not found')) {
      console.log('Schedule not found for date:', format(date, 'yyyy-MM-dd'))
      return null
    }
    console.error('Error fetching duties for date:', error)
    return null
  }
}

// Get current user's duties for a date
export function getUserDutiesForDate(duties, userDisplayName) {
  if (!duties || !duties.assignments) {
    return []
  }

  const userDuties = []
  for (const [task, person] of Object.entries(duties.assignments)) {
    if (person === userDisplayName) {
      userDuties.push(task)
    }
  }

  return userDuties
}

// Format assignments for notification
export function formatAssignments(assignments) {
  if (!assignments || Object.keys(assignments).length === 0) {
    return ''
  }
  
  return Object.entries(assignments)
    .map(([task, person]) => `${task}: ${person}`)
    .join('\n')
}

// Check and send reminders for tomorrow
export async function checkTomorrowReminders(userDisplayName) {
  if (!areNotificationsEnabled()) {
    console.log('Notifications not enabled, skipping tomorrow reminder')
    return
  }

  try {
    const tomorrow = addDays(new Date(), 1)
    const duties = await getDutiesForDate(tomorrow)
    
    if (!duties || !duties.assignments || Object.keys(duties.assignments).length === 0) {
      console.log('No duties tomorrow')
      return // No duties tomorrow (might be weekend)
    }

    // Format date: "Wed 17 Dec"
    const dateStr = format(tomorrow, 'EEE d MMM')
    const dayName = duties.dayName
    const assignmentsText = formatAssignments(duties.assignments)
    const noteText = duties.note ? `\n\nNote: ${duties.note}` : ''
    
    console.log('Sending tomorrow reminder:', dateStr, assignmentsText)
    await sendNotification(
      `📅 Tomorrow's Schedule (${dayName})`,
      {
        body: `${dateStr}\n\n${assignmentsText}${noteText}`,
        tag: `duty-reminder-${format(tomorrow, 'yyyy-MM-dd')}`,
        requireInteraction: false,
        data: { url: '/schedule' },
      }
    )
  } catch (error) {
    console.error('Error checking tomorrow reminders:', error)
  }
}

// Check and send reminders for today
export async function checkTodayReminders(userDisplayName) {
  if (!areNotificationsEnabled()) {
    console.log('Notifications not enabled, skipping today reminder')
    return
  }

  try {
    const today = new Date()
    const duties = await getDutiesForDate(today)
    
    if (!duties || !duties.assignments || Object.keys(duties.assignments).length === 0) {
      console.log('No duties today')
      return // No duties today (might be weekend)
    }

    // Format date: "Wed 17 Dec"
    const dateStr = format(today, 'EEE d MMM')
    const dayName = duties.dayName
    const assignmentsText = formatAssignments(duties.assignments)
    const noteText = duties.note ? `\n\nNote: ${duties.note}` : ''
    
    console.log('Sending today reminder:', dateStr, assignmentsText)
    await sendNotification(
      `⚡ Today's Schedule (${dayName})`,
      {
        body: `${dateStr}\n\n${assignmentsText}${noteText}`,
        tag: `duty-today-${format(today, 'yyyy-MM-dd')}`,
        requireInteraction: true, // Keep open longer for today's duties
        data: { url: '/schedule' },
      }
    )
  } catch (error) {
    console.error('Error checking today reminders:', error)
  }
}

// Check if current time is between 8 PM and midnight
function isEveningTime() {
  const now = new Date()
  const hour = now.getHours()
  // Between 8 PM (20:00) and midnight (23:59) - hours 20, 21, 22, 23
  return hour >= 20
}

// Check and send appropriate reminder based on time
export async function checkScheduledReminders(userDisplayName) {
  if (!areNotificationsEnabled()) {
    return
  }

  try {
    if (isEveningTime()) {
      // Between 8 PM and midnight - show tomorrow's schedule
      console.log('🌙 Evening time (8 PM - midnight): Showing tomorrow\'s schedule')
      await checkTomorrowReminders(userDisplayName)
    } else {
      // During the day - show today's schedule
      console.log('☀️ Day time: Showing today\'s schedule')
      await checkTodayReminders(userDisplayName)
    }
  } catch (error) {
    console.error('Error checking scheduled reminders:', error)
  }
}

// Check reminders on app load
export async function checkAllReminders(userDisplayName) {
  // Check today's duties
  await checkTodayReminders(userDisplayName)
  
  // Check tomorrow's duties
  await checkTomorrowReminders(userDisplayName)
}

// Set up periodic reminder checks
let reminderInterval = null

export function startReminderChecks(userDisplayName) {
  // Stop any existing intervals
  stopReminderChecks()

  // Check immediately on app load (both today and tomorrow)
  checkAllReminders(userDisplayName)

  // Check every 3 hours with smart scheduling
  // This will show today's schedule during the day, and tomorrow's schedule from 8 PM to midnight
  reminderInterval = setInterval(() => {
    checkScheduledReminders(userDisplayName)
  }, 3 * 60 * 60 * 1000) // 3 hours in milliseconds
  
  console.log('✅ Reminder checks started: Every 3 hours')
  console.log('📅 Schedule: Today\'s duties during day, Tomorrow\'s duties from 8 PM to midnight')
}

export function stopReminderChecks() {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
    console.log('🛑 Reminder checks stopped')
  }
}

