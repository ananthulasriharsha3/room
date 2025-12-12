import { supabase, TABLES, DEFAULT_PERSONS, DEFAULT_TASKS } from './supabase'
import { getSettings } from './settings'

// Reference start date: December 1, 2025
const REFERENCE_START_DATE = new Date(2025, 11, 1) // Month is 0-indexed

function generateMonthDates(year, month) {
  const days = []
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const current = new Date(start)
  
  while (current < end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

function generateYearDates(year) {
  const days = []
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const current = new Date(start)
  
  while (current < end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

function calculateWeekdayIndexFromReference(targetDate) {
  // Find the first weekday on or after Dec 1, 2025
  let firstWeekday = new Date(REFERENCE_START_DATE)
  while (firstWeekday.getDay() === 0 || firstWeekday.getDay() === 6) {
    firstWeekday.setDate(firstWeekday.getDate() + 1)
  }
  
  if (targetDate < firstWeekday) {
    // For dates before the first weekday, count backwards
    let weekdayCount = 0
    let current = new Date(firstWeekday)
    current.setDate(current.getDate() - 1)
    
    while (current >= targetDate) {
      const dayName = current.getDay()
      if (dayName !== 0 && dayName !== 6) {
        weekdayCount -= 1
      }
      current.setDate(current.getDate() - 1)
    }
    return weekdayCount
  } else if (targetDate.getTime() === firstWeekday.getTime()) {
    return 0
  } else {
    // For dates after the first weekday, count forwards
    let weekdayCount = 0
    let current = new Date(firstWeekday)
    
    while (current < targetDate) {
      current.setDate(current.getDate() + 1)
      const dayName = current.getDay()
      if (dayName !== 0 && dayName !== 6) {
        weekdayCount += 1
      }
    }
    return weekdayCount
  }
}

function rotateAssignments(persons, tasks, taskCounts, weekdayIndex) {
  const assignments = {}
  
  if (persons.length === 0 || tasks.length === 0) {
    return assignments
  }
  
  const cycleIndex = weekdayIndex % persons.length
  
  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
    const personIndex = (taskIndex + cycleIndex) % persons.length
    const person = persons[personIndex]
    assignments[tasks[taskIndex]] = person
    
    // Update the count
    if (!taskCounts[tasks[taskIndex]]) {
      taskCounts[tasks[taskIndex]] = {}
    }
    taskCounts[tasks[taskIndex]][person] = (taskCounts[tasks[taskIndex]][person] || 0) + 1
  }
  
  return assignments
}

function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

export async function createSchedule(year, month = null, persons = null, tasks = null) {
  // Get current settings
  let currentSettings
  try {
    currentSettings = await getSettings()
  } catch (e) {
    currentSettings = { persons: DEFAULT_PERSONS, tasks: DEFAULT_TASKS }
  }
  
  // Use provided persons/tasks or fall back to settings
  const finalPersons = persons || currentSettings.persons || DEFAULT_PERSONS
  const finalTasks = tasks || currentSettings.tasks || DEFAULT_TASKS
  
  if (finalPersons.length === 0) {
    throw new Error('At least one person is required.')
  }
  if (finalTasks.length === 0) {
    throw new Error('At least one task is required.')
  }
  
  // Generate dates
  const days = month ? generateMonthDates(year, month) : generateYearDates(year)
  
  // Fetch notes for all days
  const notesMap = {}
  try {
    const startDate = days[0].toISOString().split('T')[0]
    const endDate = days[days.length - 1].toISOString().split('T')[0]
    
    const { data: notes } = await supabase
      .from(TABLES.DAY_NOTES)
      .select('date, note')
      .gte('date', startDate)
      .lte('date', endDate)
    
    if (notes) {
      for (const note of notes) {
        notesMap[note.date] = note.note
      }
    }
  } catch (e) {
    // Continue without notes
  }
  
  const assignments = []
  const taskCounts = {}
  
  for (const day of days) {
    const dayStr = day.toISOString().split('T')[0]
    const dayName = getDayName(day)
    const note = notesMap[dayStr] || null
    
    // Skip weekends
    if (dayName === 'Saturday' || dayName === 'Sunday') {
      assignments.push({
        date: dayStr,
        day_name: dayName,
        assignments: {},
        note,
      })
    } else {
      // Weekday - assign duties
      const weekdayIndex = calculateWeekdayIndexFromReference(day)
      const dayAssignments = rotateAssignments(finalPersons, finalTasks, taskCounts, weekdayIndex)
      
      assignments.push({
        date: dayStr,
        day_name: dayName,
        assignments: dayAssignments,
        note,
      })
    }
  }
  
  // Save schedule to database
  try {
    const scheduleId = `${year}-${month || 'full'}`
    const scheduleData = {
      year,
      month,
      persons: finalPersons,
      tasks: finalTasks,
      days: assignments.map(day => ({
        date: day.date,
        day_name: day.day_name,
        assignments: day.assignments,
        note: day.note,
      })),
    }
    
    await supabase
      .from(TABLES.SCHEDULES)
      .upsert({
        id: scheduleId,
        year,
        month,
        schedule_data: scheduleData,
        updated_at: new Date().toISOString(),
      })
  } catch (e) {
    // Don't fail if saving fails
    console.error('Failed to save schedule:', e)
  }
  
  return {
    persons: finalPersons,
    tasks: finalTasks,
    days: assignments,
  }
}

export async function getSchedule(year, month = null) {
  const scheduleId = `${year}-${month || 'full'}`
  
  const { data, error } = await supabase
    .from(TABLES.SCHEDULES)
    .select('schedule_data')
    .eq('id', scheduleId)
    .limit(1)
    .single()
  
  if (error || !data) {
    throw new Error(`Schedule for year ${year}${month ? `, month ${month}` : ''} not found`)
  }
  
  const scheduleData = data.schedule_data
  if (!scheduleData) {
    throw new Error(`Schedule for year ${year}${month ? `, month ${month}` : ''} not found`)
  }
  
  return {
    persons: scheduleData.persons || [],
    tasks: scheduleData.tasks || [],
    days: scheduleData.days || [],
  }
}

