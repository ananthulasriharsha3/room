import { supabase, TABLES, parseTimestamp, getCurrentUserFromToken } from './supabase'

export async function listUsers() {
  const user = getCurrentUserFromToken()
  if (!user || !user.is_admin) {
    throw new Error('Admin access required.')
  }

  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('id, email, display_name, is_admin, has_access, created_at')

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return (data || []).map(record => ({
    id: String(record.id),
    email: String(record.email),
    display_name: String(record.display_name),
    is_admin: Boolean(record.is_admin || false),
    has_access: Boolean(record.has_access || false),
    created_at: parseTimestamp(record.created_at),
  }))
}

export async function updateUserAccess(userId, hasAccess) {
  const user = getCurrentUserFromToken()
  if (!user || !user.is_admin) {
    throw new Error('Admin access required.')
  }

  // Get user first
  const { data: userRecord } = await supabase
    .from(TABLES.USERS)
    .select('id')
    .eq('id', userId)
    .limit(1)
    .single()

  if (!userRecord) {
    throw new Error('User not found.')
  }

  // Update access
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .update({
      has_access: hasAccess,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update user access: ${error.message}`)
  }

  return {
    id: String(data.id),
    email: String(data.email),
    display_name: String(data.display_name),
    is_admin: Boolean(data.is_admin || false),
    has_access: Boolean(data.has_access || false),
    created_at: parseTimestamp(data.created_at),
  }
}

