import { supabase, TABLES, parseTimestamp, getCurrentUserFromToken } from './supabase'

export async function listExpenses() {
  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`)
  }

  return (data || []).map(record => ({
    id: parseInt(record.id),
    person: record.person,
    amount: parseFloat(record.amount),
    description: record.description || '',
    timestamp: parseTimestamp(record.timestamp),
    month_closed: record.month_closed || null,
  }))
}

export async function addExpense(expense) {
  const user = getCurrentUserFromToken()
  if (!user) {
    console.error('No user found. Token:', localStorage.getItem('token'), 'User data:', localStorage.getItem('user'))
    throw new Error('Authentication required. Please log in again.')
  }

  if (!user.display_name) {
    console.error('User missing display_name:', user)
    throw new Error('User display name is required. Please log in again.')
  }

  if (!expense.amount || isNaN(expense.amount) || expense.amount <= 0) {
    throw new Error('Valid amount is required')
  }

  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .insert({
      person: user.display_name,
      amount: parseFloat(expense.amount),
      description: expense.description || '',
      timestamp: expense.timestamp ? new Date(expense.timestamp).toISOString() : new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase error:', error)
    // Provide more detailed error message
    if (error.code === '23505') {
      throw new Error('This expense already exists')
    } else if (error.code === '42501') {
      throw new Error('Permission denied. Please check your database permissions.')
    } else if (error.message) {
      throw new Error(`Failed to add expense: ${error.message}`)
    } else {
      throw new Error('Failed to add expense. Please try again.')
    }
  }

  if (!data) {
    throw new Error('Failed to add expense: No data returned')
  }

  return {
    id: parseInt(data.id),
    person: data.person,
    amount: parseFloat(data.amount),
    description: data.description || '',
    timestamp: parseTimestamp(data.timestamp),
    month_closed: data.month_closed || null,
  }
}

export async function deleteExpense(expenseId) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Get expense first
  const { data: existing } = await supabase
    .from(TABLES.EXPENSES)
    .select('*')
    .eq('id', expenseId)
    .single()

  if (!existing) {
    throw new Error('Expense not found')
  }

  if (existing.person !== user.display_name) {
    throw new Error('Not allowed to delete this expense.')
  }

  const { error } = await supabase
    .from(TABLES.EXPENSES)
    .delete()
    .eq('id', expenseId)

  if (error) {
    throw new Error(`Failed to delete expense: ${error.message}`)
  }

  return {
    id: parseInt(existing.id),
    person: existing.person,
    amount: parseFloat(existing.amount),
    description: existing.description || '',
    timestamp: parseTimestamp(existing.timestamp),
    month_closed: existing.month_closed || null,
  }
}

export async function closeMonth(month) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Validate month format (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Month must be in format YYYY-MM (e.g., 2024-01)')
  }

  const [year, monthNum] = month.split('-').map(Number)
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1))
  const monthEnd = new Date(Date.UTC(year, monthNum, 1))

  // Get expenses to close
  const { data: expenses } = await supabase
    .from(TABLES.EXPENSES)
    .select('id')
    .gte('timestamp', monthStart.toISOString())
    .lt('timestamp', monthEnd.toISOString())
    .is('month_closed', null)

  const expenseIds = (expenses || []).map(e => e.id)
  const expensesClosed = expenseIds.length

  // Update expenses
  if (expenseIds.length > 0) {
    for (const expenseId of expenseIds) {
      await supabase
        .from(TABLES.EXPENSES)
        .update({ month_closed: month })
        .eq('id', expenseId)
    }
  }

  // Get groceries to close
  const { data: groceries } = await supabase
    .from(TABLES.GROCERY_PURCHASES)
    .select('id')
    .gte('purchase_date', monthStart.toISOString().split('T')[0])
    .lt('purchase_date', monthEnd.toISOString().split('T')[0])
    .is('month_closed', null)

  const groceryIds = (groceries || []).map(g => g.id)
  const groceriesClosed = groceryIds.length

  // Update groceries
  if (groceryIds.length > 0) {
    for (const groceryId of groceryIds) {
      await supabase
        .from(TABLES.GROCERY_PURCHASES)
        .update({ month_closed: month })
        .eq('id', groceryId)
    }
  }

  return {
    month,
    expenses_closed: expensesClosed,
    groceries_closed: groceriesClosed,
    message: `Successfully closed ${month}. ${expensesClosed} expenses and ${groceriesClosed} grocery purchases marked as closed.`,
  }
}

