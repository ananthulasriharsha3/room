import { supabase, TABLES, DEFAULT_PERSONS, parseTimestamp, getCurrentUserFromToken } from './supabase'
import { getSettings } from './settings'

function normalizeVotes(rawVotes) {
  const votes = {}
  if (typeof rawVotes === 'object' && rawVotes !== null) {
    for (const [key, value] of Object.entries(rawVotes)) {
      try {
        votes[String(key)] = parseInt(value)
      } catch (e) {
        // Skip invalid values
      }
    }
  }
  return votes
}

export async function listShoppingItems() {
  const { data, error } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .select('id, name, votes, created_at, created_by, is_completed')

  if (error) {
    throw new Error(`Failed to fetch shopping items: ${error.message}`)
  }

  // Get settings for persons
  let persons = DEFAULT_PERSONS
  try {
    const settings = await getSettings()
    persons = settings.persons
  } catch (e) {
    // Use defaults
  }

  // Get all users for creator names
  const { data: allUsers } = await supabase
    .from(TABLES.USERS)
    .select('id, display_name, email')

  const userMap = {}
  if (allUsers) {
    for (const u of allUsers) {
      userMap[u.id] = u.display_name || u.email || 'Unknown'
    }
  }

  const items = (data || []).map(record => {
    const votes = normalizeVotes(record.votes)
    // Ensure all persons have vote counts
    for (const person of persons) {
      if (!(person in votes)) {
        votes[person] = 0
      }
    }
    const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0)
    const createdBy = record.created_by || ''
    const creatorName = createdBy ? (userMap[createdBy] || null) : null

    return {
      id: parseInt(record.id),
      name: record.name,
      votes,
      total_votes: totalVotes,
      created_at: parseTimestamp(record.created_at),
      created_by: createdBy,
      is_completed: record.is_completed || false,
      creator_name: creatorName,
    }
  })

  // Sort by total votes (desc) then created_at (desc)
  items.sort((a, b) => {
    if (b.total_votes !== a.total_votes) {
      return b.total_votes - a.total_votes
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })

  return items
}

export async function addShoppingItem(name) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Get settings for persons
  let persons = DEFAULT_PERSONS
  try {
    const settings = await getSettings()
    persons = settings.persons
  } catch (e) {
    // Use defaults
  }

  const votesTemplate = {}
  for (const person of persons) {
    votesTemplate[person] = 0
  }

  const { data, error } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .insert({
      name: name.trim(),
      votes: votesTemplate,
      created_at: new Date().toISOString(),
      created_by: user.id,
      is_completed: false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add shopping item: ${error.message}`)
  }

  const votes = normalizeVotes(data.votes)
  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0)

  return {
    id: parseInt(data.id),
    name: data.name,
    votes,
    total_votes: totalVotes,
    created_at: parseTimestamp(data.created_at),
    created_by: data.created_by || '',
    is_completed: data.is_completed || false,
    creator_name: user.display_name,
  }
}

export async function voteShoppingItem(itemId, person) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  if (person && person.trim() !== user.display_name) {
    throw new Error('Cannot vote as another person.')
  }

  // Get settings
  const settings = await getSettings()
  if (!settings.persons.includes(user.display_name)) {
    throw new Error('You are not part of the current roster.')
  }

  const personName = user.display_name

  // Get item
  const { data: items } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .select('id, name, votes, created_at, created_by, is_completed')
    .eq('id', itemId)
    .limit(1)

  if (!items || items.length === 0) {
    throw new Error('Shopping item not found.')
  }

  const record = items[0]
  const votes = normalizeVotes(record.votes)

  if (votes[personName] >= 1) {
    throw new Error('You have already voted for this item.')
  }

  votes[personName] = (votes[personName] || 0) + 1

  // Update item
  const { data: updated, error } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .update({
      votes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to vote: ${error.message}`)
  }

  // Get all users for creator name
  const { data: allUsers } = await supabase
    .from(TABLES.USERS)
    .select('id, display_name, email')

  const userMap = {}
  if (allUsers) {
    for (const u of allUsers) {
      userMap[u.id] = u.display_name || u.email || 'Unknown'
    }
  }

  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0)
  const createdBy = updated.created_by || ''
  const creatorName = createdBy ? (userMap[createdBy] || null) : null

  return {
    id: parseInt(updated.id),
    name: updated.name,
    votes,
    total_votes: totalVotes,
    created_at: parseTimestamp(updated.created_at),
    created_by: createdBy,
    is_completed: updated.is_completed || false,
    creator_name: creatorName,
  }
}

export async function completeShoppingItem(itemId) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Get item
  const { data: items } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .select('id, name, votes, created_at, created_by, is_completed')
    .eq('id', itemId)
    .limit(1)

  if (!items || items.length === 0) {
    throw new Error('Shopping item not found.')
  }

  const record = items[0]
  const currentCompleted = record.is_completed || false
  const newCompleted = !currentCompleted

  // Update item
  const { data: updated, error } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .update({
      is_completed: newCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update item: ${error.message}`)
  }

  // Get settings for persons
  let persons = DEFAULT_PERSONS
  try {
    const settings = await getSettings()
    persons = settings.persons
  } catch (e) {
    // Use defaults
  }

  // Get all users for creator name
  const { data: allUsers } = await supabase
    .from(TABLES.USERS)
    .select('id, display_name, email')

  const userMap = {}
  if (allUsers) {
    for (const u of allUsers) {
      userMap[u.id] = u.display_name || u.email || 'Unknown'
    }
  }

  const votes = normalizeVotes(updated.votes)
  for (const person of persons) {
    if (!(person in votes)) {
      votes[person] = 0
    }
  }
  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0)
  const createdBy = updated.created_by || ''
  const creatorName = createdBy ? (userMap[createdBy] || null) : null

  return {
    id: parseInt(updated.id),
    name: updated.name,
    votes,
    total_votes: totalVotes,
    created_at: parseTimestamp(updated.created_at),
    created_by: createdBy,
    is_completed: newCompleted,
    creator_name: creatorName,
  }
}

export async function deleteShoppingItem(itemId) {
  const user = getCurrentUserFromToken()
  if (!user) {
    throw new Error('Authentication required')
  }

  // Get item
  const { data: items } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .select('id, name, votes, created_at, created_by, is_completed')
    .eq('id', itemId)
    .limit(1)

  if (!items || items.length === 0) {
    throw new Error('Shopping item not found.')
  }

  const record = items[0]
  const creatorId = record.created_by

  if (creatorId && creatorId !== user.id && creatorId !== user.display_name) {
    throw new Error('Only the creator can delete this item.')
  }

  // Delete item
  const { error } = await supabase
    .from(TABLES.SHOPPING_ITEMS)
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error(`Failed to delete item: ${error.message}`)
  }

  // Get settings for persons
  let persons = DEFAULT_PERSONS
  try {
    const settings = await getSettings()
    persons = settings.persons
  } catch (e) {
    // Use defaults
  }

  // Get all users for creator name
  const { data: allUsers } = await supabase
    .from(TABLES.USERS)
    .select('id, display_name, email')

  const userMap = {}
  if (allUsers) {
    for (const u of allUsers) {
      userMap[u.id] = u.display_name || u.email || 'Unknown'
    }
  }

  const votes = normalizeVotes(record.votes)
  for (const person of persons) {
    if (!(person in votes)) {
      votes[person] = 0
    }
  }
  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0)
  const creatorName = creatorId ? (userMap[creatorId] || null) : null

  return {
    id: parseInt(record.id),
    name: record.name,
    votes,
    total_votes: totalVotes,
    created_at: parseTimestamp(record.created_at),
    created_by: creatorId || '',
    is_completed: record.is_completed || false,
    creator_name: creatorName,
  }
}

