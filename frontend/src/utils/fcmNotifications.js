// Firebase Cloud Messaging notifications for duty reminders
import { requestFCMToken, onForegroundMessage, sendFCMNotification } from './firebase'
import { getDutiesForDate, formatAssignments } from './notifications'
import { format, addDays } from 'date-fns'
import { supabase, TABLES } from './supabase'

// Store FCM token in database
export async function saveFCMToken(userId, token) {
  try {
    // You can store tokens in a separate table or in user preferences
    // For now, we'll store it in a user_tokens table (create this if needed)
    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert({
        user_id: userId,
        fcm_token: token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving FCM token:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving FCM token:', error)
    return false
  }
}

// Get FCM token for a user
export async function getFCMToken(userId) {
  try {
    const { data, error } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data.fcm_token
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

// Initialize FCM and request token
export async function initializeFCM(userId) {
  try {
    const token = await requestFCMToken()
    
    if (token) {
      await saveFCMToken(userId, token)
      
      // Set up foreground message listener
      onForegroundMessage((payload) => {
        console.log('Foreground message received:', payload)
        // You can show a custom notification UI here if needed
      })
      
      return token
    }
    
    return null
  } catch (error) {
    console.error('Error initializing FCM:', error)
    return null
  }
}

// Send duty reminder notification via FCM
export async function sendDutyNotification(userId, date, duties) {
  try {
    const token = await getFCMToken(userId)
    
    if (!token) {
      console.log('No FCM token for user:', userId)
      return false
    }

    const dateStr = format(date, 'EEE d MMM')
    const dayName = duties.dayName
    const assignmentsText = formatAssignments(duties.assignments)
    const noteText = duties.note ? `\n\nNote: ${duties.note}` : ''
    
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    const title = isToday 
      ? `⚡ Today's Schedule (${dayName})`
      : `📅 Tomorrow's Schedule (${dayName})`
    
    const body = `${dateStr}\n\n${assignmentsText}${noteText}`
    
    // In production, this would be sent from your backend
    // For now, we'll use the browser notification as fallback
    await sendFCMNotification(token, title, body, {
      date: format(date, 'yyyy-MM-dd'),
      tag: `duty-${isToday ? 'today' : 'tomorrow'}-${format(date, 'yyyy-MM-dd')}`,
      requireInteraction: isToday,
    })
    
    return true
  } catch (error) {
    console.error('Error sending duty notification:', error)
    return false
  }
}

// Check if current time is between 8 PM and midnight
function isEveningTime() {
  const now = new Date()
  const hour = now.getHours()
  // Between 8 PM (20:00) and midnight (23:59) - hours 20, 21, 22, 23
  return hour >= 20
}

// Check and send reminders using FCM with smart scheduling
export async function checkDutyRemindersFCM(userId) {
  try {
    if (isEveningTime()) {
      // Between 8 PM and midnight - show tomorrow's schedule
      console.log('🌙 Evening time (8 PM - midnight): Showing tomorrow\'s schedule via FCM')
      const tomorrow = addDays(new Date(), 1)
      const tomorrowDuties = await getDutiesForDate(tomorrow)
      if (tomorrowDuties && tomorrowDuties.assignments && Object.keys(tomorrowDuties.assignments).length > 0) {
        await sendDutyNotification(userId, tomorrow, tomorrowDuties)
      }
    } else {
      // During the day - show today's schedule
      console.log('☀️ Day time: Showing today\'s schedule via FCM')
      const today = new Date()
      const todayDuties = await getDutiesForDate(today)
      if (todayDuties && todayDuties.assignments && Object.keys(todayDuties.assignments).length > 0) {
        await sendDutyNotification(userId, today, todayDuties)
      }
    }
  } catch (error) {
    console.error('Error checking duty reminders:', error)
  }
}

