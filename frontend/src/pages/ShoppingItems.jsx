import { useEffect, useState } from 'react'
import api from '../utils/api'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

export default function ShoppingItems() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    fetchItems()
    fetchSettings()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await api.get('/shopping-items')
      setItems(response.data)
    } catch (error) {
      console.error('Error fetching shopping items:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings')
      setSettings(response.data)
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    try {
      await api.post('/shopping-items', { name: newItemName.trim() })
      setNewItemName('')
      setShowAddForm(false)
      fetchItems()
    } catch (error) {
      console.error('Error adding item:', error)
      alert(error.response?.data?.detail || 'Failed to add item')
    }
  }

  const handleVote = async (itemId, person) => {
    try {
      await api.post(`/shopping-items/${itemId}/vote`, { person })
      fetchItems()
    } catch (error) {
      console.error('Error voting:', error)
      alert(error.response?.data?.detail || 'Failed to vote')
    }
  }

  const handleComplete = async (itemId) => {
    try {
      await api.post(`/shopping-items/${itemId}/complete`)
      fetchItems()
    } catch (error) {
      console.error('Error completing item:', error)
      alert(error.response?.data?.detail || 'Failed to complete item')
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await api.delete(`/shopping-items/${itemId}`)
      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert(error.response?.data?.detail || 'Failed to delete item')
    }
  }

  // Sort items by total votes (descending), then by created date
  const sortedItems = [...items].sort((a, b) => {
    if (b.total_votes !== a.total_votes) {
      return b.total_votes - a.total_votes
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const pendingItems = sortedItems.filter((item) => !item.is_completed)
  const completedItems = sortedItems.filter((item) => item.is_completed)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text-secondary light:text-light-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Shopping Items</h1>
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Track items to buy with voting</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-6 py-3 bg-gradient-to-r from-accent-violet via-accent-fuchsia to-accent-rose text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-violet/30 hover:scale-105 transition-all"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAddForm && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
          <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-4">Add New Item</h2>
          <form onSubmit={handleAddItem} className="flex space-x-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              required
              className="flex-1 px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text placeholder:dark:text-dark-text-tertiary placeholder:light:text-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-accent-violet via-accent-fuchsia to-accent-rose text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-violet/30 hover:scale-105 transition-all"
            >
              Add
            </button>
          </form>
        </div>
      )}

      {/* Pending Items */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
        <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-6">Pending Items ({pendingItems.length})</h2>
        {pendingItems.length === 0 ? (
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-8">No pending items</p>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl p-5 hover:shadow-soft transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold dark:text-dark-text light:text-light-text text-xl mb-1">{item.name}</h3>
                    <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary">
                      Created {format(new Date(item.created_at), 'MMM dd, yyyy')} by {item.created_by || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-3xl font-bold dark:text-dark-text light:text-light-text">{item.total_votes}</p>
                    <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary">votes</p>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex flex-wrap gap-2">
                    {settings?.persons?.map((person) => {
                      const voteCount = item.votes[person] || 0
                      return (
                        <button
                          key={person}
                          onClick={() => handleVote(item.id, person)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            voteCount > 0
                              ? 'dark:bg-white dark:text-black light:bg-light-text light:text-light-surface shadow-soft'
                              : 'dark:bg-dark-surface light:bg-light-surface dark:text-dark-text-secondary light:text-light-text-secondary hover:dark:bg-white hover:dark:text-black hover:light:bg-light-text hover:light:text-light-surface'
                          }`}
                        >
                          {person} ({voteCount})
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleComplete(item.id)}
                      className="px-4 py-2 bg-green-500/10 border border-green-500 dark:text-green-300 light:text-green-600 rounded-xl hover:bg-green-500/20 transition-colors text-sm font-medium"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-4 py-2 bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
          <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-6">Completed Items ({completedItems.length})</h2>
          <div className="space-y-3">
            {completedItems.map((item) => (
              <div
                key={item.id}
                className="dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl p-4 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold dark:text-dark-text light:text-light-text line-through">{item.name}</h3>
                    <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary mt-1">
                      {item.total_votes} votes
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-4 py-2 bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

