import { useEffect, useState } from 'react'
import api from '../utils/api'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { FaEdit, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa'

export default function AdminPanel() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    persons: [],
    tasks: [],
  })
  const [newPerson, setNewPerson] = useState('')
  const [newTask, setNewTask] = useState('')
  const [editingPerson, setEditingPerson] = useState(null)
  const [editingPersonValue, setEditingPersonValue] = useState('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [updatingUsers, setUpdatingUsers] = useState(new Set())

  if (!user?.is_admin) {
    return <Navigate to="/dashboard" />
  }

  useEffect(() => {
    fetchUsers()
    fetchSettings()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings')
      setSettings(response.data)
      setSettingsForm({
        persons: response.data.persons || [],
        tasks: response.data.tasks || [],
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleToggleAccess = async (userId, currentAccess) => {
    // Optimistic update: update UI immediately
    const newAccess = !currentAccess
    setUpdatingUsers(prev => new Set(prev).add(userId))
    
    // Update local state immediately for instant feedback
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === userId ? { ...u, has_access: newAccess } : u
      )
    )
    
    try {
      await api.post(`/admin/users/${userId}/access`, {
        has_access: newAccess
      })
      // Refresh to get server state (in case of any differences)
      fetchUsers()
    } catch (error) {
      console.error('Error toggling access:', error)
      // Revert optimistic update on error
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? { ...u, has_access: currentAccess } : u
        )
      )
      alert(error.response?.data?.detail || 'Failed to update user access')
    } finally {
      setUpdatingUsers(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleAddPerson = () => {
    if (newPerson.trim() && !settingsForm.persons.includes(newPerson.trim())) {
      setSettingsForm({
        ...settingsForm,
        persons: [...settingsForm.persons, newPerson.trim()],
      })
      setNewPerson('')
    }
  }

  const handleRemovePerson = (person) => {
    setSettingsForm({
      ...settingsForm,
      persons: settingsForm.persons.filter((p) => p !== person),
    })
  }

  const handleEditPerson = (person) => {
    setEditingPerson(person)
    setEditingPersonValue(person)
  }

  const handleSavePersonEdit = () => {
    if (editingPersonValue.trim() && editingPersonValue.trim() !== editingPerson) {
      setSettingsForm({
        ...settingsForm,
        persons: settingsForm.persons.map((p) => 
          p === editingPerson ? editingPersonValue.trim() : p
        ),
      })
    }
    setEditingPerson(null)
    setEditingPersonValue('')
  }

  const handleCancelPersonEdit = () => {
    setEditingPerson(null)
    setEditingPersonValue('')
  }

  const handleAddTask = () => {
    if (newTask.trim() && !settingsForm.tasks.includes(newTask.trim())) {
      setSettingsForm({
        ...settingsForm,
        tasks: [...settingsForm.tasks, newTask.trim()],
      })
      setNewTask('')
    }
  }

  const handleRemoveTask = (task) => {
    setSettingsForm({
      ...settingsForm,
      tasks: settingsForm.tasks.filter((t) => t !== task),
    })
  }

  const handleSaveSettings = async () => {
    try {
      await api.post('/settings', settingsForm)
      fetchSettings()
      setShowSettingsForm(false)
      setShowSuccessMessage(true)
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert(error.response?.data?.detail || 'Failed to save settings')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text-secondary light:text-light-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden box-border">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2 break-words">Admin Panel</h1>
        <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary break-words">Manage users and settings</p>
      </div>

      {/* User Management */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-3 sm:mb-4">User Management</h2>
        {users.length === 0 ? (
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-sm sm:text-base">No users found</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl w-full max-w-full overflow-x-hidden"
              >
                <div className="flex-1 min-w-0 max-w-full">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <p className="font-semibold text-sm sm:text-base dark:text-dark-text light:text-light-text break-words">{u.display_name}</p>
                    {u.is_admin && (
                      <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-accent-yellow to-accent-amber text-white rounded font-semibold whitespace-nowrap">
                        Admin
                      </span>
                    )}
                    {u.has_access && !u.is_admin && (
                      <span className="px-2 py-0.5 text-xs bg-green-900/20 text-green-200 border border-green-500 rounded whitespace-nowrap">
                        Active
                      </span>
                    )}
                    {!u.has_access && !u.is_admin && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-900/20 text-yellow-200 border border-yellow-500 rounded whitespace-nowrap">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary mt-1 break-words">{u.email}</p>
                  <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary mt-1">
                    Joined {format(new Date(u.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                {!u.is_admin && (
                  <button
                    onClick={() => handleToggleAccess(u.id, u.has_access)}
                    disabled={updatingUsers.has(u.id)}
                    className={`w-full sm:w-auto px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      u.has_access
                        ? 'bg-yellow-900/20 border border-yellow-500 text-yellow-200 hover:bg-yellow-900/30'
                        : 'bg-green-900/20 border border-green-500 text-green-200 hover:bg-green-900/30'
                    }`}
                  >
                    {updatingUsers.has(u.id) ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        {u.has_access ? 'Revoking...' : 'Granting...'}
                      </span>
                    ) : (
                      u.has_access ? 'Revoke Access' : 'Grant Access'
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="dark:bg-green-900/20 light:bg-green-100 border border-green-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-soft w-full max-w-full overflow-x-hidden">
          <p className="dark:text-green-200 light:text-green-800 font-medium text-sm sm:text-base break-words">
            ✅ Settings saved successfully! 
            <span className="block mt-2 text-xs sm:text-sm">
              Go to the Schedule page and click "Generate Year" to apply the new person names to the calendar.
            </span>
          </p>
        </div>
      )}

      {/* Settings Management */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0 max-w-full">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text break-words">Settings</h2>
            <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary mt-1 flex flex-wrap items-center gap-1 break-words">
              <FaInfoCircle className="w-3 h-3 flex-shrink-0" /> <span className="hidden sm:inline">Click</span><span className="sm:hidden">Tap</span> <FaEdit className="w-3 h-3 mx-1 flex-shrink-0" /> <span className="hidden sm:inline">to edit person names. Changes will apply to the calendar when you regenerate the schedule.</span>
            </p>
          </div>
          <button
            onClick={() => {
              setShowSettingsForm(!showSettingsForm)
              if (!showSettingsForm) {
                fetchSettings()
              }
            }}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base dark:bg-white dark:text-black light:bg-light-text light:text-light-surface font-semibold rounded-lg sm:rounded-xl hover:opacity-90 transition-opacity shadow-soft"
          >
            {showSettingsForm ? 'Cancel' : 'Edit Settings'}
          </button>
        </div>

        {!showSettingsForm ? (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">People</h3>
              <div className="flex flex-wrap gap-2">
                {settings?.persons?.map((person) => (
                  <span
                    key={person}
                    className="px-2 sm:px-3 py-1 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg dark:text-dark-text light:text-light-text text-xs sm:text-sm break-words"
                  >
                    {person}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">Tasks</h3>
              <div className="flex flex-wrap gap-2">
                {settings?.tasks?.map((task) => (
                  <span
                    key={task}
                    className="px-2 sm:px-3 py-1 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg dark:text-dark-text light:text-light-text text-xs sm:text-sm break-words"
                  >
                    {task}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-xs sm:text-sm font-medium dark:text-dark-text light:text-light-text mb-2 sm:mb-3 flex flex-wrap items-center gap-1 sm:gap-2">
                People - <span className="hidden sm:inline">Click</span><span className="sm:hidden">Tap</span> <FaEdit className="w-3 h-3 flex-shrink-0" /> to edit names
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {settingsForm.persons.length === 0 ? (
                  <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary italic">
                    No people added yet. Add a person below.
                  </p>
                ) : (
                  settingsForm.persons.map((person) => (
                    <div
                      key={person}
                      className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg text-xs sm:text-sm max-w-full"
                    >
                      {editingPerson === person ? (
                        <>
                          <input
                            type="text"
                            value={editingPersonValue}
                            onChange={(e) => setEditingPersonValue(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSavePersonEdit()
                              if (e.key === 'Escape') handleCancelPersonEdit()
                            }}
                            className="flex-1 min-w-0 px-2 py-1 text-xs sm:text-sm dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded dark:text-dark-text light:text-light-text focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            autoFocus
                            placeholder="Person name"
                          />
                          <button
                            onClick={handleSavePersonEdit}
                            className="px-1.5 sm:px-2 py-1 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors flex-shrink-0"
                            title="Save (Enter)"
                          >
                            <FaCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={handleCancelPersonEdit}
                            className="px-1.5 sm:px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                            title="Cancel (Esc)"
                          >
                            <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="dark:text-dark-text light:text-light-text font-medium break-words min-w-0">{person}</span>
                          <button
                            onClick={() => handleEditPerson(person)}
                            className="px-1.5 sm:px-2 py-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors flex-shrink-0"
                            title="Click to edit name"
                          >
                            <FaEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleRemovePerson(person)}
                            className="px-1.5 sm:px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                            title="Remove person"
                          >
                            <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  type="text"
                  value={newPerson}
                  onChange={(e) => setNewPerson(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                  placeholder="Add person name"
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-0"
                />
                <button
                  onClick={handleAddPerson}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-accent-emerald to-accent-teal text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-emerald/30 hover:scale-105 transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-medium dark:text-dark-text light:text-light-text mb-2 sm:mb-3">Tasks</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {settingsForm.tasks.map((task) => (
                  <span
                    key={task}
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg dark:text-dark-text light:text-light-text text-xs sm:text-sm"
                  >
                    <span className="break-words">{task}</span>
                    <button
                      onClick={() => handleRemoveTask(task)}
                      className="text-red-400 hover:text-red-300 flex-shrink-0"
                      title="Remove"
                    >
                      <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Add task"
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-0"
                />
                <button
                  onClick={handleAddTask}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-accent-emerald to-accent-teal text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-emerald/30 hover:scale-105 transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-indigo/30 hover:scale-105 transition-all"
            >
              Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
