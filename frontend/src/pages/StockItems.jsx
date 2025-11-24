import { useEffect, useState } from 'react'
import api from '../utils/api'
import { format, differenceInDays } from 'date-fns'

export default function StockItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await api.get('/stock-items')
      setItems(response.data)
    } catch (error) {
      console.error('Error fetching stock items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/stock-items', {
        ...formData,
        start_date: formData.start_date,
      })
      setFormData({ name: '', start_date: format(new Date(), 'yyyy-MM-dd') })
      setShowAddForm(false)
      fetchItems()
    } catch (error) {
      console.error('Error adding stock item:', error)
      alert(error.response?.data?.detail || 'Failed to add stock item')
    }
  }

  const handleEndItem = async (itemId) => {
    try {
      await api.post(`/stock-items/${itemId}/end`)
      fetchItems()
    } catch (error) {
      console.error('Error ending stock item:', error)
      alert(error.response?.data?.detail || 'Failed to end stock item')
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this stock item?')) return

    try {
      await api.delete(`/stock-items/${itemId}`)
      fetchItems()
    } catch (error) {
      console.error('Error deleting stock item:', error)
      alert(error.response?.data?.detail || 'Failed to delete stock item')
    }
  }

  const activeItems = items.filter((item) => item.is_active)
  const inactiveItems = items.filter((item) => !item.is_active)

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
          <h1 className="text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Stock Items</h1>
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Track household stock items</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-6 py-3 bg-gradient-to-r from-accent-yellow via-accent-amber to-accent-orange text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-yellow/30 hover:scale-105 transition-all"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAddForm && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
          <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-4">Add New Stock Item</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Item Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                maxLength={200}
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
                placeholder="e.g., Rice, Oil, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-accent-yellow via-accent-amber to-accent-orange text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-yellow/30 hover:scale-105 transition-all"
            >
              Add Item
            </button>
          </form>
        </div>
      )}

      {/* Active Items */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
        <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-4">Active Items ({activeItems.length})</h2>
        {activeItems.length === 0 ? (
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-8">No active stock items</p>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => {
              const daysActive = differenceInDays(new Date(), new Date(item.start_date))
              return (
                <div
                  key={item.id}
                  className="dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold dark:text-dark-text light:text-light-text text-lg">{item.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <p className="dark:text-dark-text-tertiary light:text-light-text-tertiary">
                          Started: {format(new Date(item.start_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="dark:text-dark-text light:text-light-text font-medium">
                          Active for {daysActive} day{daysActive !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEndItem(item.id)}
                        className="px-4 py-2 bg-yellow-500/10 border border-yellow-500 dark:text-yellow-300 light:text-yellow-600 rounded-xl hover:bg-yellow-500/20 transition-colors text-sm font-medium"
                      >
                        End
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
              )
            })}
          </div>
        )}
      </div>

      {/* Inactive Items */}
      {inactiveItems.length > 0 && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
          <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-4">Inactive Items ({inactiveItems.length})</h2>
          <div className="space-y-3">
            {inactiveItems.map((item) => {
              const daysActive = item.end_date
                ? differenceInDays(new Date(item.end_date), new Date(item.start_date))
                : 0
              return (
                <div
                  key={item.id}
                  className="dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl p-4 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold dark:text-dark-text light:text-light-text">{item.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <p className="dark:text-dark-text-tertiary light:text-light-text-tertiary">
                          {format(new Date(item.start_date), 'MMM dd, yyyy')} -{' '}
                          {item.end_date ? format(new Date(item.end_date), 'MMM dd, yyyy') : 'N/A'}
                        </p>
                        <p className="dark:text-dark-text-tertiary light:text-light-text-tertiary">
                          Lasted {daysActive} day{daysActive !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-4 py-2 bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
