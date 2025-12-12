import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listStockItems, addStockItem, endStockItem, deleteStockItem } from '../utils/stockItems'
import { format, differenceInDays } from 'date-fns'
import { motion } from 'framer-motion'

export default function StockItems() {
  const location = useLocation()
  const isStock = location.pathname === '/stock'
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
      const data = await listStockItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching stock items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await addStockItem(formData.name, formData.start_date)
      setFormData({ name: '', start_date: format(new Date(), 'yyyy-MM-dd') })
      setShowAddForm(false)
      fetchItems()
    } catch (error) {
      console.error('Error adding stock item:', error)
      alert(error.message || 'Failed to add stock item')
    }
  }

  const handleEndItem = async (itemId) => {
    try {
      await endStockItem(itemId)
      fetchItems()
    } catch (error) {
      console.error('Error ending stock item:', error)
      alert(error.message || 'Failed to end stock item')
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this stock item?')) return

    try {
      await deleteStockItem(itemId)
      fetchItems()
    } catch (error) {
      console.error('Error deleting stock item:', error)
      alert(error.message || 'Failed to delete stock item')
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
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden box-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full max-w-full">
        <div className="min-w-0 flex-1 max-w-full">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2 break-words">Stock Items</h1>
          <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary break-words">Track household stock items</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-accent-yellow via-accent-amber to-accent-orange text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-yellow/30 hover:scale-105 transition-all"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAddForm && (
        <div className={`${isStock ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden`}
        style={isStock ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
        >
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-3 sm:mb-4">Add New Stock Item</h2>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Item Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                maxLength={200}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${isStock ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                style={isStock ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                placeholder="e.g., Rice, Oil, etc."
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${isStock ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                style={isStock ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
              />
            </div>
            <button
              type="submit"
              className="btn-stranger w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
            >
              Add Item
            </button>
          </form>
        </div>
      )}

      {/* Active Items */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-3 sm:mb-4">Active Items ({activeItems.length})</h2>
        {activeItems.length === 0 ? (
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-6 sm:py-8 text-sm sm:text-base">No active stock items</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {activeItems.map((item) => {
              const daysActive = differenceInDays(new Date(), new Date(item.start_date))
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative ${isStock ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card'} rounded-lg sm:rounded-xl p-3 sm:p-4 w-full max-w-full overflow-x-hidden`}
                  style={isStock ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                >
                  {/* Blinking border animation */}
                  <motion.div
                    className="absolute inset-0 rounded-lg sm:rounded-xl pointer-events-none"
                    animate={{
                      borderColor: [
                        'rgba(34, 197, 94, 0.5)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(34, 197, 94, 0.5)',
                      ],
                      boxShadow: [
                        '0 0 0 0 rgba(34, 197, 94, 0)',
                        '0 0 0 4px rgba(34, 197, 94, 0.3)',
                        '0 0 0 0 rgba(34, 197, 94, 0)',
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{
                      border: '2px solid',
                      borderRadius: 'inherit',
                    }}
                  />
                  
                  {/* Active indicator dot */}
                  <motion.div
                    className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full z-20"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
                    <div className="flex-1 min-w-0 max-w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold dark:text-dark-text light:text-light-text text-base sm:text-lg break-words">{item.name}</h3>
                        <motion.span
                          className="text-xs sm:text-sm font-semibold text-green-500 dark:text-green-400"
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        >
                          ● LIVE
                        </motion.span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm gap-1 sm:gap-0">
                        <p className="dark:text-dark-text-tertiary light:text-light-text-tertiary break-words">
                          Started: {format(new Date(item.start_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="dark:text-dark-text light:text-light-text font-medium">
                          Active for {daysActive} day{daysActive !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEndItem(item.id)}
                        className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-500/10 border border-yellow-500 dark:text-yellow-300 light:text-yellow-600 rounded-lg sm:rounded-xl hover:bg-yellow-500/20 transition-colors text-xs sm:text-sm font-medium"
                      >
                        End
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-lg sm:rounded-xl hover:bg-red-500/20 transition-colors text-xs sm:text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Inactive Items */}
      {inactiveItems.length > 0 && (
        <div className={`${isStock ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden`}
        style={isStock ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
        >
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-3 sm:mb-4">Inactive Items ({inactiveItems.length})</h2>
          <div className="space-y-2 sm:space-y-3">
            {inactiveItems.map((item) => {
              const daysActive = item.end_date
                ? differenceInDays(new Date(item.end_date), new Date(item.start_date))
                : 0
              return (
                <div
                  key={item.id}
                  className={`${isStock ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl p-3 sm:p-4 opacity-60 w-full max-w-full overflow-x-hidden`}
                  style={isStock ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0 max-w-full">
                      <h3 className="font-semibold text-sm sm:text-base dark:text-dark-text light:text-light-text break-words">{item.name}</h3>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm gap-1 sm:gap-0">
                        <p className="dark:text-dark-text-tertiary light:text-light-text-tertiary break-words">
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
                      className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-lg sm:rounded-xl hover:bg-red-500/20 transition-colors text-xs sm:text-sm font-medium"
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
