import { getSchedule } from './schedule'
import { format, addDays } from 'date-fns'

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

// Send a browser notification
export function sendNotification(title, options = {}) {
  if (!areNotificationsEnabled()) {
    return null
  }

  const notification = new Notification(title, {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    ...options,
  })

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close()
  }, 5000)

  return notification
}

// Get duties for a specific date
export async function getDutiesForDate(date) {
  try {
    const year = date.getFullYear()
    const schedule = await getSchedule(year)
    
    if (!schedule || !schedule.days) {
      return null
    }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayData = schedule.days.find(day => day.date === dateStr)
    
    if (!dayData) {
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

// Check and send reminders for tomorrow
export async function checkTomorrowReminders(userDisplayName) {
  if (!areNotificationsEnabled()) {
    return
  }

  try {
    const tomorrow = addDays(new Date(), 1)
    const duties = await getDutiesForDate(tomorrow)
    
    if (!duties || !duties.assignments || Object.keys(duties.assignments).length === 0) {
      return // No duties tomorrow (might be weekend)
    }

    const userDuties = getUserDutiesForDate(duties, userDisplayName)
    
    if (userDuties.length === 0) {
      return // User has no duties tomorrow
    }

    const tasksList = userDuties.join(', ')
    const dayName = duties.dayName
    const noteText = duties.note ? `\n\nNote: ${duties.note}` : ''
    
    sendNotification(
      `📅 Reminder: Your Duties Tomorrow (${dayName})`,
      {
        body: `You have the following duties tomorrow:\n${tasksList}${noteText}`,
        tag: `duty-reminder-${format(tomorrow, 'yyyy-MM-dd')}`,
        requireInteraction: false,
      }
    )
  } catch (error) {
    console.error('Error checking tomorrow reminders:', error)
  }
}

// Check and send reminders for today
export async function checkTodayReminders(userDisplayName) {
  if (!areNotificationsEnabled()) {
    return
  }

  try {
    const today = new Date()
    const duties = await getDutiesForDate(today)
    
    if (!duties || !duties.assignments || Object.keys(duties.assignments).length === 0) {
      return // No duties today (might be weekend)
    }

    const userDuties = getUserDutiesForDate(duties, userDisplayName)
    
    if (userDuties.length === 0) {
      return // User has no duties today
    }

    const tasksList = userDuties.join(', ')
    const dayName = duties.dayName
    const noteText = duties.note ? `\n\nNote: ${duties.note}` : ''
    
    sendNotification(
      `⚡ Today's Duties (${dayName})`,
      {
        body: `Your duties for today:\n${tasksList}${noteText}`,
        tag: `duty-today-${format(today, 'yyyy-MM-dd')}`,
        requireInteraction: true, // Keep open longer for today's duties
      }
    )
  } catch (error) {
    console.error('Error checking today reminders:', error)
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
let todayCheckInterval = null

export function startReminderChecks(userDisplayName) {
  // Clear any existing intervals
  if (reminderInterval) {
    clearInterval(reminderInterval)
  }
  if (todayCheckInterval) {
    clearInterval(todayCheckInterval)
  }

  // Check immediately
  checkAllReminders(userDisplayName)

  // Check for tomorrow's duties every 6 hours (to catch evening reminders)
  reminderInterval = setInterval(() => {
    checkTomorrowReminders(userDisplayName)
  }, 6 * 60 * 60 * 1000) // 6 hours

  // Check for today's duties every 2 hours (more frequent for today)
  todayCheckInterval = setInterval(() => {
    checkTodayReminders(userDisplayName)
  }, 2 * 60 * 60 * 1000) // 2 hours
}

export function stopReminderChecks() {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
  if (todayCheckInterval) {
    clearInterval(todayCheckInterval)
    todayCheckInterval = null
  }
}

