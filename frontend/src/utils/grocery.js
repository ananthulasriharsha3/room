import { supabase, TABLES, parseTimestamp, getCurrentUserFromToken } from './supabase'

export async function listGroceryPurchases(limit = 100, offset = 0) {
  const { data, error } = await supabase
    .from(TABLES.GROCERY_PURCHASES)
    .select('id, name, price, quantity, unit, purchase_date, bill_image_url, is_from_bill, created_by, created_at, month_closed')
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch grocery purchases: ${error.message}`)
  }

  const result = []
  for (const record of data || []) {
    try {
      const purchaseDateValue = record.purchase_date
      if (!purchaseDateValue) {
        continue
      }

      let purchaseDate
      if (typeof purchaseDateValue === 'string') {
        purchaseDate = purchaseDateValue.split('T')[0]
      } else if (purchaseDateValue instanceof Date) {
        purchaseDate = purchaseDateValue.toISOString().split('T')[0]
      } else {
        purchaseDate = new Date(purchaseDateValue).toISOString().split('T')[0]
      }

      result.push({
        id: parseInt(record.id),
        name: record.name || '',
        price: parseFloat(record.price || 0),
        quantity: record.quantity || null,
        unit: record.unit || null,
        purchase_date: purchaseDate,
        bill_image_url: record.bill_image_url || null,
        is_from_bill: record.is_from_bill || false,
        created_by: record.created_by || '',
        created_at: parseTimestamp(record.created_at),
        month_closed: record.month_closed || null,
      })
    } catch (e) {
      console.error('Error processing grocery purchase record:', e)
      continue
    }
  }

  return result
}

export async function addGroceryPurchase(item) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  const { data, error } = await supabase
    .from(TABLES.GROCERY_PURCHASES)
    .insert({
      name: item.name.trim(),
      price: parseFloat(item.price),
      quantity: item.quantity || null,
      unit: item.unit || null,
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      is_from_bill: false,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add grocery purchase: ${error.message}`)
  }

  const purchaseDate = data.purchase_date ? data.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]

  return {
    id: parseInt(data.id),
    name: data.name,
    price: parseFloat(data.price),
    quantity: data.quantity || null,
    unit: data.unit || null,
    purchase_date: purchaseDate,
    bill_image_url: data.bill_image_url || null,
    is_from_bill: data.is_from_bill || false,
    created_by: data.created_by || '',
    created_at: parseTimestamp(data.created_at),
    month_closed: data.month_closed || null,
  }
}

export async function addGroceryPurchasesBatch(items) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  if (!items || items.length === 0) {
    throw new Error('No items provided')
  }

  const recordsToInsert = items.map(item => ({
    name: item.name.trim(),
    price: parseFloat(item.price),
    quantity: item.quantity || null,
    unit: item.unit || null,
    purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
    is_from_bill: true,
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from(TABLES.GROCERY_PURCHASES)
    .insert(recordsToInsert)
    .select()

  if (error) {
    throw new Error(`Failed to add grocery purchases: ${error.message}`)
  }

  return (data || []).map(record => {
    const purchaseDate = record.purchase_date ? record.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]
    return {
      id: parseInt(record.id),
      name: record.name,
      price: parseFloat(record.price),
      quantity: record.quantity || null,
      unit: record.unit || null,
      purchase_date: purchaseDate,
      bill_image_url: record.bill_image_url || null,
      is_from_bill: record.is_from_bill || false,
      created_by: record.created_by || '',
      created_at: parseTimestamp(record.created_at),
      month_closed: record.month_closed || null,
    }
  })
}

export async function deleteGroceryPurchase(itemId) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Get item first
  const { data: existing } = await supabase
    .from(TABLES.GROCERY_PURCHASES)
    .select('id, name, price, quantity, unit, purchase_date, bill_image_url, is_from_bill, created_by, created_at, month_closed')
    .eq('id', itemId)
    .limit(1)
    .single()

  if (!existing) {
    throw new Error('Grocery purchase not found.')
  }

  const creatorId = existing.created_by
  if (creatorId && creatorId !== user.id && creatorId !== user.display_name) {
    throw new Error('Only the creator can delete this item.')
  }

  // Delete item
  const { error } = await supabase
    .from(TABLES.GROCERY_PURCHASES)
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error(`Failed to delete grocery purchase: ${error.message}`)
  }

  const purchaseDate = existing.purchase_date ? existing.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]

  return {
    id: parseInt(existing.id),
    name: existing.name,
    price: parseFloat(existing.price),
    quantity: existing.quantity || null,
    unit: existing.unit || null,
    purchase_date: purchaseDate,
    bill_image_url: existing.bill_image_url || null,
    is_from_bill: existing.is_from_bill || false,
    created_by: creatorId || '',
    created_at: parseTimestamp(existing.created_at),
    month_closed: existing.month_closed || null,
  }
}

// Note: OCR bill scanning is not implemented in frontend as it requires server-side processing
// Users will need to manually enter grocery items or use a different service
export async function scanBill(file) {
  throw new Error('Bill scanning is not available in the frontend. Please use manual entry or implement a client-side OCR solution.')
}

