import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../utils/api'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { AnimatedModal } from '../components/ui/AnimatedModal'
import { ScrollReveal } from '../components/ui/ScrollReveal'
import { SkeletonLoader } from '../components/ui/SkeletonLoader'

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingIds, setDeletingIds] = useState(new Set())

  // Get persons from settings (fallback to empty array if not loaded yet)
  const persons = settings?.persons || []
  const loggedInPerson = user?.display_name || ''
  // Case-insensitive check: find the matching person from the list
  const matchedPerson = persons.find(p => p.toLowerCase() === loggedInPerson.toLowerCase())
  const canEdit = !!matchedPerson
  // Use the matched person name (with correct capitalization) for consistency
  const loggedInPersonFormatted = matchedPerson || loggedInPerson

  useEffect(() => {
    fetchExpenses()
    fetchSettings()
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses')
      setExpenses(response.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
    } catch (error) {
      console.error('Error fetching expenses:', error)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit || submitting) {
      if (!canEdit) alert('You can only add expenses for your own account')
      return
    }
    
    setSubmitting(true)
    const expenseData = {
      person: loggedInPersonFormatted,
      amount: parseFloat(formData.amount),
      description: formData.description,
    }
    
    // Optimistic update: add expense immediately
    let tempId = null
    if (!editingExpense) {
      tempId = Date.now()
      const optimisticExpense = {
        id: tempId,
        ...expenseData,
        timestamp: new Date().toISOString(),
      }
      setExpenses(prev => [optimisticExpense, ...prev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
    }
    
    try {
      if (editingExpense) {
        // For now, delete and recreate since there's no update endpoint
        await api.delete(`/expenses/${editingExpense.id}`)
      }
      
      const response = await api.post('/expenses', expenseData)
      
      // Replace optimistic update with real data
      if (!editingExpense && tempId) {
        setExpenses(prev => {
          const filtered = prev.filter(e => e.id !== tempId)
          return [response.data, ...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        })
      } else {
        fetchExpenses()
      }
      
      setFormData({ amount: '', description: '' })
      setShowAddForm(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Error saving expense:', error)
      // Revert optimistic update on error
      if (!editingExpense && tempId) {
        setExpenses(prev => prev.filter(e => e.id !== tempId))
      }
      alert(error.response?.data?.detail || 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (expense) => {
    if (expense.person.toLowerCase() !== loggedInPerson.toLowerCase()) {
      alert('You can only edit your own expenses')
      return
    }
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount.toString(),
      description: expense.description || '',
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id, person) => {
    if (person.toLowerCase() !== loggedInPerson.toLowerCase()) {
      alert('You can only delete your own expenses')
      return
    }
    
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    // Optimistic update: remove immediately
    const expenseToDelete = expenses.find(e => e.id === id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeletingIds(prev => new Set(prev).add(id))
    
    try {
      await api.delete(`/expenses/${id}`)
    } catch (error) {
      console.error('Error deleting expense:', error)
      // Revert optimistic update on error
      if (expenseToDelete) {
        setExpenses(prev => [...prev, expenseToDelete].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
      }
      alert(error.response?.data?.detail || 'Failed to delete expense')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const getExpensesForPerson = (person) => {
    return expenses.filter(e => e.person.toLowerCase() === person.toLowerCase())
  }

  const getTotalForPerson = (person) => {
    return getExpensesForPerson(person).reduce((sum, e) => sum + e.amount, 0)
  }

  // Get all unique person names from expenses and merge with settings persons
  const allPersons = useMemo(() => {
    const expensePersons = [...new Set(expenses.map(e => e.person))]
    const settingsPersons = persons || []
    // Merge and deduplicate (case-insensitive)
    const merged = [...new Set([...settingsPersons, ...expensePersons])]
    // Sort: settings persons first, then others
    return merged.sort((a, b) => {
      const aInSettings = settingsPersons.some(p => p.toLowerCase() === a.toLowerCase())
      const bInSettings = settingsPersons.some(p => p.toLowerCase() === b.toLowerCase())
      if (aInSettings && !bInSettings) return -1
      if (!aInSettings && bInSettings) return 1
      return a.localeCompare(b)
    })
  }, [expenses, persons])

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <div className="h-8 sm:h-10 bg-gradient-to-r from-transparent via-dark-border to-transparent dark:via-dark-border light:via-light-border rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gradient-to-r from-transparent via-dark-border to-transparent dark:via-dark-border light:via-light-border rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SkeletonLoader count={3} />
        </div>
      </div>
    )
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingExpense(null)
    setFormData({ amount: '', description: '' })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2">Expenses</h1>
            <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary">Track shared expenses</p>
          </div>
          {canEdit && (
            <AnimatedButton
              onClick={() => {
                setEditingExpense(null)
                setFormData({ amount: '', description: '' })
                setShowAddForm(!showAddForm)
              }}
              variant="success"
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <FaPlus /> {showAddForm ? 'Cancel' : 'Add Expense'}
            </AnimatedButton>
          )}
        </div>
      </ScrollReveal>

      <AnimatePresence>
        {showAddForm && canEdit && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft"
          >
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-4 sm:mb-6">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'} - {loggedInPersonFormatted}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Amount (₹)
              </label>
              <motion.input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(94, 58, 255, 0.2)" }}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Description
              </label>
              <motion.input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(94, 58, 255, 0.2)" }}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
                placeholder="Enter description (optional)"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <AnimatedButton
                type="submit"
                variant="success"
                disabled={submitting}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    {editingExpense ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  editingExpense ? 'Update Expense' : 'Add Expense'
                )}
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
              >
                Cancel
              </AnimatedButton>
            </div>
          </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Person Boxes */}
      <ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {allPersons.map((person, index) => {
          const personExpenses = getExpensesForPerson(person)
          const personTotal = getTotalForPerson(person)
          const isLoggedInPerson = person.toLowerCase() === loggedInPerson.toLowerCase()
          
          // Assign different vibrant colors to each person (cycle through colors if more than 3)
          const colorPalettes = [
            { bg: 'bg-gradient-to-br from-accent-indigo/40 via-accent-violet/40 to-accent-fuchsia/40 dark:from-accent-indigo/50 dark:via-accent-violet/50 dark:to-accent-fuchsia/50', border: 'border-2 sm:border-4 border-accent-indigo/60', text: 'from-accent-indigo via-accent-violet to-accent-fuchsia' },
            { bg: 'bg-gradient-to-br from-accent-emerald/40 via-accent-teal/40 to-accent-cyan/40 dark:from-accent-emerald/50 dark:via-accent-teal/50 dark:to-accent-cyan/50', border: 'border-2 sm:border-4 border-accent-emerald/60', text: 'from-accent-emerald via-accent-teal to-accent-cyan' },
            { bg: 'bg-gradient-to-br from-accent-rose/40 via-accent-pink/40 to-accent-fuchsia/40 dark:from-accent-rose/50 dark:via-accent-pink/50 dark:to-accent-fuchsia/50', border: 'border-2 sm:border-4 border-accent-rose/60', text: 'from-accent-rose via-accent-pink to-accent-fuchsia' },
            { bg: 'bg-gradient-to-br from-accent-sky/40 via-accent-blue/40 to-accent-indigo/40 dark:from-accent-sky/50 dark:via-accent-blue/50 dark:to-accent-indigo/50', border: 'border-2 sm:border-4 border-accent-sky/60', text: 'from-accent-sky via-accent-blue to-accent-indigo' },
            { bg: 'bg-gradient-to-br from-accent-yellow/40 via-accent-amber/40 to-accent-orange/40 dark:from-accent-yellow/50 dark:via-accent-amber/50 dark:to-accent-orange/50', border: 'border-2 sm:border-4 border-accent-yellow/60', text: 'from-accent-yellow via-accent-amber to-accent-orange' },
            { bg: 'bg-gradient-to-br from-accent-purple/40 via-accent-violet/40 to-accent-fuchsia/40 dark:from-accent-purple/50 dark:via-accent-violet/50 dark:to-accent-fuchsia/50', border: 'border-2 sm:border-4 border-accent-purple/60', text: 'from-accent-purple via-accent-violet to-accent-fuchsia' },
          ]
          const colorIndex = index % colorPalettes.length
          const colorClass = colorPalettes[colorIndex].bg
          const borderClass = colorPalettes[colorIndex].border
          const textGradient = colorPalettes[colorIndex].text

          return (
            <motion.div
              key={person}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, boxShadow: "0 12px 24px rgba(0, 0, 0, 0.2)" }}
              className={`${colorClass} ${borderClass} dark:bg-gradient-to-br light:bg-gradient-to-br rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl transition-all duration-300 ${
                isLoggedInPerson ? 'ring-2 sm:ring-4 ring-accent-yellow/50 shadow-accent-yellow/30' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r ${textGradient} bg-clip-text text-transparent`}>{person}</h2>
                {isLoggedInPerson && (
                  <span className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-accent-yellow via-accent-amber to-accent-orange text-white rounded-full font-extrabold shadow-lg">
                    You
                  </span>
                )}
              </div>
              
              <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b-2 dark:border-dark-border light:border-light-border">
                <p className="text-xs sm:text-sm font-bold dark:text-dark-text-secondary light:text-light-text-secondary mb-1">Total</p>
                <p className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r ${textGradient} bg-clip-text text-transparent`}>₹{personTotal.toFixed(2)}</p>
              </div>

              {personExpenses.length === 0 ? (
                <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-6 sm:py-8 text-xs sm:text-sm font-semibold">
                  No expenses yet
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {personExpenses.map((expense, expenseIdx) => (
                      <AnimatedCard
                        key={expense.id}
                        delay={expenseIdx * 0.03}
                        className={`p-3 sm:p-4 ${borderClass.replace('border-2 sm:border-4', 'border-2').replace('/60', '/40 dark:border-opacity-50')}`}
                      >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                            <p className={`text-xs sm:text-sm font-extrabold bg-gradient-to-r ${textGradient} bg-clip-text text-transparent`}>
                              {expense.person}
                            </p>
                            <p className={`text-lg sm:text-xl font-extrabold bg-gradient-to-r ${textGradient} bg-clip-text text-transparent`}>
                              ₹{expense.amount.toFixed(2)}
                            </p>
                          </div>
                          {expense.description && (
                            <p className="text-xs sm:text-sm font-semibold dark:text-dark-text-secondary light:text-light-text-secondary mt-1 break-words">
                              {expense.description}
                            </p>
                          )}
                          <p className="text-xs font-medium dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
                            {format(new Date(expense.timestamp), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        {isLoggedInPerson && (
                          <div className="flex gap-1 sm:gap-2 ml-2 flex-shrink-0">
                            <motion.button
                              onClick={() => handleEdit(expense)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-2 sm:p-2.5 bg-gradient-to-br from-accent-sky to-accent-cyan text-white rounded-lg shadow-lg shadow-accent-sky/30 transition-all"
                              title="Edit expense"
                            >
                              <FaEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDelete(expense.id, expense.person)}
                              disabled={deletingIds.has(expense.id)}
                              whileHover={{ scale: deletingIds.has(expense.id) ? 1 : 1.1 }}
                              whileTap={{ scale: deletingIds.has(expense.id) ? 1 : 0.95 }}
                              className="p-2 sm:p-2.5 bg-gradient-to-br from-accent-red to-accent-rose text-white rounded-lg shadow-lg shadow-accent-red/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete expense"
                            >
                              {deletingIds.has(expense.id) ? (
                                <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                              )}
                            </motion.button>
                          </div>
                        )}
                      </div>
                      </AnimatedCard>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )
        })}
        </div>
      </ScrollReveal>

      {/* Overall Total */}
      <ScrollReveal>
        <AnimatedCard className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold dark:text-dark-text light:text-light-text">Grand Total</h2>
          <p className="text-3xl font-bold dark:text-dark-text light:text-light-text">₹{totalExpenses.toFixed(2)}</p>
        </div>
        </AnimatedCard>
      </ScrollReveal>
    </div>
  )
}
