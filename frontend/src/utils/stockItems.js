import { supabase, TABLES, parseTimestamp, getCurrentUserFromToken } from './supabase'

export async function listStockItems() {
  const { data, error } = await supabase
    .from(TABLES.STOCK_ITEMS)
    .select('id, name, start_date, end_date, is_active, created_by, created_at')
    .order('is_active', { ascending: false })
    .order('start_date', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch stock items: ${error.message}`)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (data || []).map(record => {
    const startDate = new Date(record.start_date)
    const endDate = record.end_date ? new Date(record.end_date) : null
    const isActive = record.is_active || false

    // Calculate days active
    let daysActive = 0
    if (isActive && !endDate) {
      daysActive = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
    } else if (endDate) {
      daysActive = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
    }

    return {
      id: parseInt(record.id),
      name: record.name,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      is_active: isActive,
      days_active: daysActive,
      created_by: record.created_by || '',
      created_at: parseTimestamp(record.created_at),
    }
  })
}

export async function addStockItem(name, startDate) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  const { data, error } = await supabase
    .from(TABLES.STOCK_ITEMS)
    .insert({
      name: name.trim(),
      start_date: startDate,
      is_active: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add stock item: ${error.message}`)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate)
  const daysActive = Math.floor((today - start) / (1000 * 60 * 60 * 24))

  return {
    id: parseInt(data.id),
    name: data.name,
    start_date: startDate,
    end_date: null,
    is_active: true,
    days_active: daysActive,
    created_by: data.created_by || '',
    created_at: parseTimestamp(data.created_at),
  }
}

export async function endStockItem(itemId) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Get item first
  const { data: existing } = await supabase
    .from(TABLES.STOCK_ITEMS)
    .select('id, name, start_date, end_date, is_active, created_by, created_at')
    .eq('id', itemId)
    .limit(1)
    .single()

  if (!existing) {
    throw new Error('Stock item not found.')
  }

  if (!existing.is_active) {
    throw new Error('Stock item is already ended.')
  }

  const today = new Date().toISOString().split('T')[0]

  // Update item
  const { data: updated, error } = await supabase
    .from(TABLES.STOCK_ITEMS)
    .update({
      is_active: false,
      end_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to end stock item: ${error.message}`)
  }

  const startDate = new Date(updated.start_date)
  const endDate = new Date(updated.end_date)
  const daysActive = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))

  return {
    id: parseInt(updated.id),
    name: updated.name,
    start_date: updated.start_date,
    end_date: updated.end_date,
    is_active: false,
    days_active: daysActive,
    created_by: updated.created_by || '',
    created_at: parseTimestamp(updated.created_at),
  }
}

export async function deleteStockItem(itemId) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Get item first
  const { data: existing } = await supabase
    .from(TABLES.STOCK_ITEMS)
    .select('id, name, start_date, end_date, is_active, created_by, created_at')
    .eq('id', itemId)
    .limit(1)
    .single()

  if (!existing) {
    throw new Error('Stock item not found.')
  }

  const creatorId = existing.created_by
  if (creatorId && creatorId !== user.id && creatorId !== user.display_name) {
    throw new Error('Only the creator can delete this item.')
  }

  // Delete item
  const { error } = await supabase
    .from(TABLES.STOCK_ITEMS)
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error(`Failed to delete stock item: ${error.message}`)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(existing.start_date)
  const endDate = existing.end_date ? new Date(existing.end_date) : null
  const isActive = existing.is_active || false

  let daysActive = 0
  if (isActive && !endDate) {
    daysActive = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
  } else if (endDate) {
    daysActive = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
  }

  return {
    id: parseInt(existing.id),
    name: existing.name,
    start_date: existing.start_date,
    end_date: existing.end_date,
    is_active: isActive,
    days_active: daysActive,
    created_by: creatorId || '',
    created_at: parseTimestamp(existing.created_at),
  }
}

