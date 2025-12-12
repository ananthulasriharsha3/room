import { supabase, TABLES, hashPassword, verifyPassword, createAccessToken } from './supabase'

export async function registerUser(email, password, displayName) {
  const normalizedEmail = email.toLowerCase().trim()
  
  // Check if user exists
  const { data: existingUsers } = await supabase
    .from(TABLES.USERS)
    .select('id, email')
    .eq('email', normalizedEmail)
    .limit(1)

  if (existingUsers && existingUsers.length > 0) {
    throw new Error('User already exists.')
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Create user
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .insert({
      email: normalizedEmail,
      display_name: displayName.trim(),
      password_hash: passwordHash,
      is_admin: false,
      has_access: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Registration failed: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to create user.')
  }

  // Create token
  const user = {
    id: data.id,
    email: data.email,
    display_name: data.display_name,
    is_admin: data.is_admin || false,
    has_access: data.has_access || false,
  }

  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
    display_name: user.display_name,
    is_admin: user.is_admin,
    has_access: user.has_access,
  })

  return {
    access_token: accessToken,
    token_type: 'bearer',
    user,
  }
}

export async function loginUser(email, password) {
  const normalizedEmail = email.toLowerCase().trim()

  // Get user
  const { data: users, error: fetchError } = await supabase
    .from(TABLES.USERS)
    .select('id, email, display_name, password_hash, is_admin, has_access')
    .eq('email', normalizedEmail)
    .limit(1)

  if (fetchError) {
    throw new Error(`Login failed: ${fetchError.message}`)
  }

  if (!users || users.length === 0) {
    throw new Error('Invalid credentials.')
  }

  const userRecord = users[0]

  // Verify password
  const isValid = await verifyPassword(password, userRecord.password_hash)
  if (!isValid) {
    throw new Error('Invalid credentials.')
  }

  // Check access
  const hasAccess = userRecord.has_access || false
  const isAdmin = userRecord.is_admin || false
  if (!hasAccess && !isAdmin) {
    throw new Error('Your account is pending approval. Please wait for an admin to grant you access.')
  }

  // Create token
  const user = {
    id: userRecord.id,
    email: userRecord.email,
    display_name: userRecord.display_name,
    is_admin: isAdmin,
    has_access: hasAccess,
  }

  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
    display_name: user.display_name,
    is_admin: user.is_admin,
    has_access: user.has_access,
  })

  return {
    access_token: accessToken,
    token_type: 'bearer',
    user,
  }
}

export async function resetPassword(email, newPassword) {
  const normalizedEmail = email.toLowerCase().trim()

  // Get user
  const { data: users } = await supabase
    .from(TABLES.USERS)
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1)

  if (!users || users.length === 0) {
    throw new Error('User not found.')
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword)

  // Update password
  const { error } = await supabase
    .from(TABLES.USERS)
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('email', normalizedEmail)

  if (error) {
    throw new Error(`Password reset failed: ${error.message}`)
  }

  return { message: 'Password updated successfully.' }
}

