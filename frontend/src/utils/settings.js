import { supabase, TABLES, DEFAULT_SETTINGS_ID, DEFAULT_PERSONS, DEFAULT_TASKS } from './supabase'

export async function getSettings() {
  const { data, error } = await supabase
    .from(TABLES.SETTINGS)
    .select('persons, tasks')
    .eq('id', DEFAULT_SETTINGS_ID)
    .limit(1)
    .single()

  if (error) {
    // If not found, return defaults
    if (error.code === 'PGRST116') {
      return {
        persons: DEFAULT_PERSONS,
        tasks: DEFAULT_TASKS,
      }
    }
    throw new Error(`Failed to fetch settings: ${error.message}`)
  }

  if (!data) {
    return {
      persons: DEFAULT_PERSONS,
      tasks: DEFAULT_TASKS,
    }
  }

  return {
    persons: (data.persons || DEFAULT_PERSONS).map(p => String(p).trim()),
    tasks: (data.tasks || DEFAULT_TASKS).map(t => String(t).trim()),
  }
}

export async function saveSettings(payload) {
  const { error } = await supabase
    .from(TABLES.SETTINGS)
    .upsert({
      id: DEFAULT_SETTINGS_ID,
      persons: payload.persons,
      tasks: payload.tasks,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw new Error(`Failed to save settings: ${error.message}`)
  }

  return payload
}

