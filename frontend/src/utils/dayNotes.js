import { supabase, TABLES, getCurrentUserFromToken } from './supabase'

export async function getDayNote(dateStr) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD.')
  }

  const { data, error } = await supabase
    .from(TABLES.DAY_NOTES)
    .select('date, note, created_by')
    .eq('date', dateStr)
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Day note not found for this date.')
    }
    throw new Error(`Failed to fetch day note: ${error.message}`)
  }

  if (!data) {
    throw new Error('Day note not found for this date.')
  }

  // Get creator name
  let creatorName = null
  if (data.created_by) {
    const { data: users } = await supabase
      .from('users')
      .select('display_name, email')
      .eq('id', data.created_by)
      .limit(1)
      .single()

    if (users) {
      creatorName = users.display_name || users.email || 'Unknown'
    }
  }

  return {
    date: data.date,
    note: data.note,
    created_by: data.created_by || null,
    creator_name: creatorName,
  }
}

export async function setDayNote(dateStr, note) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD.')
  }

  if (!note || note.trim().length === 0) {
    throw new Error('Note cannot be empty.')
  }

  if (note.length > 500) {
    throw new Error('Note must be at most 500 characters.')
  }

  const { data, error } = await supabase
    .from(TABLES.DAY_NOTES)
    .upsert({
      date: dateStr,
      note: note.trim(),
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save day note: ${error.message}`)
  }

  return {
    date: data.date,
    note: data.note,
    created_by: user.id,
    creator_name: user.display_name || user.email,
  }
}

export async function deleteDayNote(dateStr) {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD.')
  }

  const { error } = await supabase
    .from(TABLES.DAY_NOTES)
    .delete()
    .eq('date', dateStr)

  if (error) {
    throw new Error(`Failed to delete day note: ${error.message}`)
  }

  return { message: 'Day note deleted successfully.' }
}

