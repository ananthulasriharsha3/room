import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'
import bcrypt from 'bcryptjs'

// Supabase configuration (from backend)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rbkaydwtrhutrfyxidxo.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJia2F5ZHd0cmh1dHJmeXhpZHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDgzMDgsImV4cCI6MjA3ODA4NDMwOH0.DxySA23-6-9BinbqNkefKYxd8Nn2WPzQYA8-4g8Sttg'
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'change-this-secret'
const JWT_ALGORITHM = 'HS256'
const ACCESS_TOKEN_EXPIRE_MINUTES = 10080

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Table names
export const TABLES = {
  EXPENSES: 'expenses',
  SETTINGS: 'settings',
  SHOPPING_ITEMS: 'shopping_items',
  USERS: 'users',
  DAY_NOTES: 'day_notes',
  STOCK_ITEMS: 'stock_items',
  GROCERY_PURCHASES: 'grocery_purchases',
  SCHEDULES: 'schedules',
}

// Default values
export const DEFAULT_SETTINGS_ID = 'default'
export const DEFAULT_TASKS = ['Cooking', 'Dish Washing', 'Cutting & Rice']
export const DEFAULT_PERSONS = ['Dinesh', 'Harsha', 'Srinivas']

// Password hashing
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword)
}

// JWT token functions
function base64UrlEncode(str) {
  return str
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) {
    str += '='
  }
  return str
}

export function createAccessToken(data) {
  const header = {
    alg: JWT_ALGORITHM,
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const expire = now + ACCESS_TOKEN_EXPIRE_MINUTES * 60

  const payload = {
    ...data,
    exp: expire,
    iat: now,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  const signature = CryptoJS.HmacSHA256(
    `${encodedHeader}.${encodedPayload}`,
    JWT_SECRET
  )
  const encodedSignature = base64UrlEncode(signature.toString(CryptoJS.enc.Base64))

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

export function decodeToken(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts

    // Verify signature
    const signature = CryptoJS.HmacSHA256(
      `${encodedHeader}.${encodedPayload}`,
      JWT_SECRET
    )
    const expectedSignature = base64UrlEncode(signature.toString(CryptoJS.enc.Base64))

    if (encodedSignature !== expectedSignature) {
      throw new Error('Invalid token signature')
    }

    // Decode payload
    const payload = JSON.parse(
      CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(base64UrlDecode(encodedPayload)))
    )

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }

    return payload
  } catch (error) {
    throw new Error(`Token decode error: ${error.message}`)
  }
}

// Helper function to get current user from token or localStorage
export function getCurrentUserFromToken() {
  // First, try to get user from localStorage (more reliable and faster)
  const userData = localStorage.getItem('user')
  if (userData) {
    try {
      const user = JSON.parse(userData)
      // Validate user object has required fields
      if (user && user.id && user.display_name) {
        return user
      } else {
        console.warn('User data in localStorage is incomplete:', user)
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error)
    }
  }

  // Fallback: try to decode token if localStorage doesn't have user
  const token = localStorage.getItem('token')
  if (!token) {
    console.warn('No token found in localStorage')
    return null
  }

  try {
    const payload = decodeToken(token)
    const user = {
      id: payload.sub,
      email: payload.email,
      display_name: payload.display_name,
      is_admin: payload.is_admin || false,
      has_access: payload.has_access || false,
    }
    // Update localStorage with decoded user data for future use
    localStorage.setItem('user', JSON.stringify(user))
    return user
  } catch (error) {
    console.error('Error decoding token:', error)
    // Only remove token/user if token is expired or clearly invalid
    if (error.message && (error.message.includes('expired') || error.message.includes('Invalid token'))) {
      console.warn('Removing invalid/expired token')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return null
  }
}

// Helper function to parse timestamps
export function parseTimestamp(value) {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string') {
    try {
      return new Date(value)
    } catch (e) {
      // Try ISO format
      return new Date(value.replace('Z', '+00:00'))
    }
  }
  return new Date(value)
}

