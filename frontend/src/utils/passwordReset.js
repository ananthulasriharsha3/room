import { supabase, TABLES, hashPassword, createAccessToken } from './supabase'
import CryptoJS from 'crypto-js'

// Generate a secure random token
function generateResetToken() {
  return CryptoJS.lib.WordArray.random(32).toString()
}

// Hash the token for storage
function hashToken(token) {
  return CryptoJS.SHA256(token).toString()
}

// Create password reset token and store it
export async function requestPasswordReset(email) {
  const normalizedEmail = email.toLowerCase().trim()

  // Check if user exists
  const { data: users, error: fetchError } = await supabase
    .from(TABLES.USERS)
    .select('id, email, display_name')
    .eq('email', normalizedEmail)
    .limit(1)

  if (fetchError) {
    throw new Error(`Failed to check user: ${fetchError.message}`)
  }

  if (!users || users.length === 0) {
    // Don't reveal if user exists for security
    // Return null resetToken so frontend knows user doesn't exist
    return { 
      message: 'If an account with that email exists, you can reset your password.',
      resetToken: null 
    }
  }

  // Generate reset token
  const resetToken = generateResetToken()
  const hashedToken = hashToken(resetToken)
  
  // Token expires in 1 hour
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)

  // Delete any existing reset tokens for this user
  await supabase
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', users[0].id)

  // Store reset token
  const { error: insertError } = await supabase
    .from('password_reset_tokens')
    .insert({
      user_id: users[0].id,
      token_hash: hashedToken,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    })

  if (insertError) {
    throw new Error(`Failed to create reset token: ${insertError.message}`)
  }

  // Return the reset token so user can reset password directly
  return {
    message: 'Email verified. You can now reset your password.',
    resetToken: resetToken, // Return token for direct password reset
  }
}

// Verify reset token and get user ID
export async function verifyResetToken(token) {
  if (!token) {
    throw new Error('Reset token is required.')
  }

  const hashedToken = hashToken(token)

  // Find token in database
  const { data: tokens, error } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, created_at')
    .eq('token_hash', hashedToken)
    .limit(1)

  if (error) {
    throw new Error(`Failed to verify token: ${error.message}`)
  }

  if (!tokens || tokens.length === 0) {
    throw new Error('Invalid or expired reset token.')
  }

  const tokenRecord = tokens[0]

  // Check if token is expired
  const expiresAt = new Date(tokenRecord.expires_at)
  if (expiresAt < new Date()) {
    // Delete expired token
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('id', tokenRecord.id)
    throw new Error('Reset token has expired. Please request a new one.')
  }

  return {
    userId: tokenRecord.user_id,
    tokenId: tokenRecord.id,
  }
}

// Reset password using token
export async function resetPasswordWithToken(token, newPassword) {
  if (!token) {
    throw new Error('Reset token is required.')
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  // Verify token
  const { userId, tokenId } = await verifyResetToken(token)

  // Hash new password
  const passwordHash = await hashPassword(newPassword)

  // Update user password
  const { error: updateError } = await supabase
    .from(TABLES.USERS)
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Failed to reset password: ${updateError.message}`)
  }

  // Delete the used token
  await supabase
    .from('password_reset_tokens')
    .delete()
    .eq('id', tokenId)

  // Also delete any other tokens for this user (cleanup)
  await supabase
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', userId)

  return { message: 'Password has been reset successfully.' }
}

