import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listShoppingItems, addShoppingItem, voteShoppingItem, completeShoppingItem, deleteShoppingItem } from '../utils/shopping'
import { getSettings } from '../utils/settings'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

export default function ShoppingItems() {
  const { user } = useAuth()
  const location = useLocation()
  const isShopping = location.pathname === '/shopping'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [settings, setSettings] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [votingIds, setVotingIds] = useState(new Set())
  const [completingIds, setCompletingIds] = useState(new Set())
  const [deletingIds, setDeletingIds] = useState(new Set())

  useEffect(() => {
    fetchItems()
    fetchSettings()
  }, [])

  const fetchItems = async () => {
    try {
      const data = await listShoppingItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching shopping items:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItemName.trim() || submitting) return

    setSubmitting(true)
    const itemName = newItemName.trim()
    setNewItemName('')
    
    // Optimistic update
    const tempId = Date.now()
    const optimisticItem = {
      id: tempId,
      name: itemName,
      votes: {},
      total_votes: 0,
      is_completed: false,
      created_at: new Date().toISOString(),
      created_by: user?.display_name || '',
    }
    setItems(prev => [optimisticItem, ...prev])

    try {
      const response = await addShoppingItem(itemName)
      // Replace optimistic update with real data
      setItems(prev => {
        const filtered = prev.filter(item => item.id !== tempId)
        return [response, ...filtered]
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding item:', error)
      // Revert optimistic update
      setItems(prev => prev.filter(item => item.id !== tempId))
      setNewItemName(itemName)
      alert(error.message || 'Failed to add item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (itemId, person) => {
    if (votingIds.has(itemId)) return
    
    setVotingIds(prev => new Set(prev).add(itemId))
    
    // Optimistic update
    const item = items.find(i => i.id === itemId)
    if (item) {
      const hadVote = item.votes[person] || false
      setItems(prev => prev.map(i => 
        i.id === itemId 
          ? { 
              ...i, 
              votes: { ...i.votes, [person]: !hadVote },
              total_votes: hadVote ? i.total_votes - 1 : i.total_votes + 1
            }
          : i
      ))
    }

    try {
      await voteShoppingItem(itemId, person)
      fetchItems() // Refresh to get accurate state
    } catch (error) {
      console.error('Error voting:', error)
      // Revert optimistic update
      if (item) {
        setItems(prev => prev.map(i => 
          i.id === itemId ? item : i
        ))
      }
      alert(error.message || 'Failed to vote')
    } finally {
      setVotingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleComplete = async (itemId) => {
    if (completingIds.has(itemId)) return
    
    setCompletingIds(prev => new Set(prev).add(itemId))
    
    // Optimistic update
    const item = items.find(i => i.id === itemId)
    if (item) {
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, is_completed: !i.is_completed } : i
      ))
    }

    try {
      await completeShoppingItem(itemId)
      fetchItems() // Refresh to get accurate state
    } catch (error) {
      console.error('Error completing item:', error)
      // Revert optimistic update
      if (item) {
        setItems(prev => prev.map(i => 
          i.id === itemId ? item : i
        ))
      }
      alert(error.message || 'Failed to complete item')
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    // Optimistic update
    const itemToDelete = items.find(i => i.id === itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
    setDeletingIds(prev => new Set(prev).add(itemId))

    try {
      await deleteShoppingItem(itemId)
    } catch (error) {
      console.error('Error deleting item:', error)
      // Revert optimistic update
      if (itemToDelete) {
        setItems(prev => [...prev, itemToDelete].sort((a, b) => {
          if (b.total_votes !== a.total_votes) {
            return b.total_votes - a.total_votes
          }
          return new Date(b.created_at) - new Date(a.created_at)
        }))
      }
      alert(error.message || 'Failed to delete item')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  // Get priority level based on vote count
  const getPriority = (voteCount) => {
    if (voteCount >= 3) return { level: 'high', label: 'Important', color: 'red' }
    if (voteCount === 2) return { level: 'medium', label: 'Medium', color: 'orange' }
    if (voteCount === 1) return { level: 'low', label: 'Low', color: 'yellow' }
    return { level: 'new', label: 'New', color: 'blue' }
  }

  // Sort items by priority (vote count descending), then by created date
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
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden box-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full max-w-full">
        <div className="min-w-0 flex-1 max-w-full">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2 break-words">Shopping Items</h1>
          <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary break-words">Track items to buy with voting</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-stranger w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAddForm && (
        <div className={`${isShopping ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden`}
        style={isShopping ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
        >
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-3 sm:mb-4">Add New Item</h2>
          <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              required
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${isShopping ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text placeholder:dark:text-dark-text-tertiary placeholder:light:text-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-w-0`}
              style={isShopping ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-accent-violet via-accent-fuchsia to-accent-rose text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-violet/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  Adding...
                </span>
              ) : (
                'Add'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Pending Items */}
      <div className={`${isShopping ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden`}
      style={isShopping ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
      >
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-4 sm:mb-6">Pending Items ({pendingItems.length})</h2>
        {pendingItems.length === 0 ? (
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-6 sm:py-8 text-sm sm:text-base">No pending items</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className={`${isShopping ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl p-3 sm:p-5 hover:shadow-soft transition-shadow w-full max-w-full overflow-x-hidden`}
                style={isShopping ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0 max-w-full">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold dark:text-dark-text light:text-light-text text-base sm:text-lg lg:text-xl break-words">{item.name}</h3>
                      {(() => {
                        const priority = getPriority(item.total_votes)
                        const colorClasses = {
                          red: 'bg-red-500/20 border-red-500 text-red-300 dark:text-red-300 light:text-red-600',
                          orange: 'bg-orange-500/20 border-orange-500 text-orange-300 dark:text-orange-300 light:text-orange-600',
                          yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-300 dark:text-yellow-300 light:text-yellow-600',
                          blue: 'bg-blue-500/20 border-blue-500 text-blue-300 dark:text-blue-300 light:text-blue-600'
                        }
                        return (
                          <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold border ${colorClasses[priority.color]}`}>
                            {priority.label}
                          </span>
                        )
                      })()}
                    </div>
                    <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary break-words">
                      Created {format(new Date(item.created_at), 'MMM dd, yyyy')} by {item.creator_name || item.created_by || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-2xl sm:text-3xl font-bold dark:text-dark-text light:text-light-text">{item.total_votes}</p>
                    <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary">votes</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {settings?.persons?.map((person) => {
                      const voteCount = item.votes[person] || 0
                      return (
                        <button
                          key={person}
                          onClick={() => handleVote(item.id, person)}
                          disabled={votingIds.has(item.id)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleComplete(item.id)}
                      disabled={completingIds.has(item.id)}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 text-xs sm:text-sm bg-green-500/10 border border-green-500 dark:text-green-300 light:text-green-600 rounded-lg sm:rounded-xl hover:bg-green-500/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {completingIds.has(item.id) ? (
                        <span className="flex items-center gap-2 justify-center">
                          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          Updating...
                        </span>
                      ) : (
                        'Complete'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingIds.has(item.id)}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-lg sm:rounded-xl hover:bg-red-500/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingIds.has(item.id) ? (
                        <span className="flex items-center gap-2 justify-center">
                          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          Deleting...
                        </span>
                      ) : (
                        'Delete'
                      )}
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
        <div className={`${isShopping ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden`}
        style={isShopping ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
        >
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-4 sm:mb-6">Completed Items ({completedItems.length})</h2>
          <div className="space-y-2 sm:space-y-3">
            {completedItems.map((item) => (
              <div
                key={item.id}
                className={`${isShopping ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl p-3 sm:p-4 opacity-60 w-full max-w-full overflow-x-hidden`}
                style={isShopping ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0 max-w-full">
                    <h3 className="font-semibold text-sm sm:text-base dark:text-dark-text light:text-light-text line-through break-words">{item.name}</h3>
                    <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary mt-1">
                      {item.total_votes} votes
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingIds.has(item.id)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-lg sm:rounded-xl hover:bg-red-500/20 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingIds.has(item.id) ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        Deleting...
                      </span>
                    ) : (
                      'Delete'
                    )}
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

