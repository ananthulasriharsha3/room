// Firebase Cloud Messaging notifications for duty reminders
import { requestFCMToken, onForegroundMessage } from './firebase'
import { getDutiesForDate, formatAssignments } from './notifications'
import { sendSystemNotification } from './pushNotification'
import { format, addDays } from 'date-fns'
import { supabase, TABLES } from './supabase'

// Store FCM token in database (optional - notifications work without it)
let tableMissing = false // Cache table missing status to avoid repeated 404s

// Store FCM token in database
export async function saveFCMToken(userId, token) {
  // Skip if we know table doesn't exist (to avoid repeated 404s)
  if (tableMissing) {
    return false
  }

  try {
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
      // If table doesn't exist, cache this to avoid future attempts
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        tableMissing = true
        console.log('ℹ️ user_fcm_tokens table not found - skipping token storage (notifications work via Service Worker)')
        console.log('💡 To create the table: Run frontend/migrations/create_user_fcm_tokens_table.sql in Supabase SQL editor')
        return false
      }
      console.error('Error saving FCM token:', error)
      return false
    }

    // Success - table exists
    tableMissing = false
    return true
  } catch (error) {
    console.error('Error saving FCM token:', error)
    return false
  }
}

// Get FCM token for a user
export async function getFCMToken(userId) {
  // Skip if we know table doesn't exist
  if (tableMissing) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If table doesn't exist, cache this to avoid future attempts
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        tableMissing = true
      }
      return null
    }

    if (!data) {
      return null
    }

    return data.fcm_token
  } catch (error) {
    return null
  }
}

// Initialize FCM and request token
export async function initializeFCM(userId) {
  try {
    const token = await requestFCMToken()
    
    if (token) {
      // Try to save token, but don't fail if table doesn't exist (notifications work without it)
      try {
        await saveFCMToken(userId, token)
      } catch (saveError) {
        // Token saving is optional - notifications work via Service Worker without stored tokens
        console.log('FCM token obtained, but not saved to database (table may not exist - this is OK)')
      }
      
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
    // Note: We use sendSystemNotification which works via Service Worker
    // FCM token is stored but not strictly required for browser notifications
    const token = await getFCMToken(userId)
    
    if (!token) {
      console.log('No FCM token for user:', userId, '- will still try to send notification via Service Worker')
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
    
    // Send notification via Service Worker (same as test notifications)
    const success = await sendSystemNotification(title, {
      body: body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `duty-${isToday ? 'today' : 'tomorrow'}-${format(date, 'yyyy-MM-dd')}`,
      requireInteraction: isToday,
      data: { 
        url: '/schedule',
        date: format(date, 'yyyy-MM-dd')
      },
    })
    
    if (success) {
      console.log('✅ Duty notification sent successfully')
    } else {
      console.error('❌ Failed to send duty notification')
    }
    
    return success
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

