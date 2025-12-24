import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { listExpenses, addExpense, deleteExpense } from '../utils/expenses'
import { getSettings } from '../utils/settings'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { FaEdit, FaTrash, FaPlus, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { AnimatedModal } from '../components/ui/AnimatedModal'
import { ScrollReveal } from '../components/ui/ScrollReveal'
import { SkeletonLoader } from '../components/ui/SkeletonLoader'

export default function Expenses() {
  const { user } = useAuth()
  const location = useLocation()
  const isExpenses = location.pathname === '/expenses'
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
  const [expandedPersons, setExpandedPersons] = useState(new Set())

  // Get persons from settings (fallback to empty array if not loaded yet)
  const persons = settings?.persons || []
  const loggedInPerson = user?.display_name || ''
  // Case-insensitive check: find the matching person from the list
  const matchedPerson = persons.find(p => p.toLowerCase() === loggedInPerson.toLowerCase())
  // Allow any logged-in user with access to add expenses (backend uses their display_name)
  const canEdit = !!user && user.has_access
  // Use the matched person name (with correct capitalization) for consistency, or fallback to display_name
  const loggedInPersonFormatted = matchedPerson || loggedInPerson

  useEffect(() => {
    fetchExpenses()
    fetchSettings()
  }, [])

  const fetchExpenses = async () => {
    try {
      const data = await listExpenses()
      setExpenses(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
    } catch (error) {
      console.error('Error fetching expenses:', error)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit || submitting) {
      if (!canEdit) alert('You need access to add expenses. Please contact an admin.')
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
        await deleteExpense(editingExpense.id)
      }
      
      const response = await addExpense(expenseData)
      
      // Replace optimistic update with real data
      if (!editingExpense && tempId) {
        setExpenses(prev => {
          const filtered = prev.filter(e => e.id !== tempId)
          return [response, ...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        })
      } else if (editingExpense) {
        setExpenses(prev => {
          const filtered = prev.filter(e => e.id !== editingExpense.id)
          return [response, ...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
      alert(error.message || 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (expense) => {
    if (!canEdit) {
      alert('You need access to edit expenses. Please contact an admin.')
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
    if (!canEdit) {
      alert('You need access to delete expenses. Please contact an admin.')
      return
    }
    
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    // Optimistic update: remove immediately
    const expenseToDelete = expenses.find(e => e.id === id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeletingIds(prev => new Set(prev).add(id))
    
    try {
      await deleteExpense(id)
    } catch (error) {
      console.error('Error deleting expense:', error)
      // Revert optimistic update on error
      if (expenseToDelete) {
        setExpenses(prev => [...prev, expenseToDelete].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
      }
      alert(error.message || 'Failed to delete expense')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // Helper function to check if two names represent the same person (handles partial matches)
  const isSamePersonName = (name1, name2) => {
    if (!name1 || !name2) return false
    const norm1 = name1.toLowerCase().trim().replace(/\s+/g, '')
    const norm2 = name2.toLowerCase().trim().replace(/\s+/g, '')
    if (norm1 === norm2) return true
    // Check if one starts with the other (for "Dinesh" vs "Dinesh Nampally")
    if (norm1.length >= 3 && norm2.length >= 3) {
      return norm1.startsWith(norm2) || norm2.startsWith(norm1)
    }
    return false
  }

  const getExpensesForPerson = (person) => {
    // Include expenses that match the person name exactly or partially
    return expenses.filter(e => isSamePersonName(e.person, person))
  }

  const getTotalForPerson = (person) => {
    return getExpensesForPerson(person).reduce((sum, e) => sum + e.amount, 0)
  }

  // Get all unique person names from expenses and merge with settings persons
  // Normalize to avoid duplicates (case-insensitive) and handle partial matches
  const allPersons = useMemo(() => {
    const settingsPersons = Array.isArray(persons) ? persons.filter(p => p && typeof p === 'string').map(p => p.trim()) : []
    const expensePersons = Array.isArray(expenses) ? expenses.map(e => e.person).filter(p => p && typeof p === 'string').map(p => p.trim()) : []
    
    // Normalize function - remove all whitespace and convert to lowercase
    const normalize = (name) => {
      if (!name || typeof name !== 'string') return ''
      return name.toLowerCase().trim().replace(/\s+/g, ' ')
    }
    
    // Check if two names are the same person (handles partial matches)
    const isSamePerson = (name1, name2) => {
      const norm1 = normalize(name1)
      const norm2 = normalize(name2)
      if (norm1 === norm2) return true
      // Check if one is a substring of another (for "Dinesh" vs "Dinesh Nampally")
      if (norm1.length > 0 && norm2.length > 0) {
        // Remove spaces for comparison to handle "Dinesh" vs "Dinesh Nampally"
        const norm1NoSpaces = norm1.replace(/\s+/g, '')
        const norm2NoSpaces = norm2.replace(/\s+/g, '')
        // Check if one starts with the other (and the shorter one is at least 3 chars)
        if (norm1NoSpaces.length >= 3 && norm2NoSpaces.length >= 3) {
          if (norm1NoSpaces.startsWith(norm2NoSpaces) || norm2NoSpaces.startsWith(norm1NoSpaces)) {
            return true
          }
        }
      }
      return false
    }
    
    // Find the best canonical name for a person
    const findCanonicalName = (name, allNames) => {
      // First, check if it matches a settings person exactly or partially
      const matchingSettingsPerson = settingsPersons.find(p => isSamePerson(p, name))
      if (matchingSettingsPerson) return matchingSettingsPerson
      
      // Then, check if it matches any other name we've seen (prefer longer/more complete names)
      const matchingName = allNames.find(p => isSamePerson(p, name) && p.length > name.length)
      if (matchingName) return matchingName
      
      // Otherwise, use the name itself
      return name
    }
    
    // Map to store: normalized -> canonical name
    const personMap = new Map()
    const allNamesList = [...settingsPersons, ...expensePersons]
    
    // Process all names and merge duplicates
    allNamesList.forEach(person => {
      if (!person || typeof person !== 'string') return
      
      const normalized = normalize(person)
      if (!normalized) return
      
      // Find the canonical name for this person
      const canonicalName = findCanonicalName(person, Array.from(personMap.values()))
      
      // Check if we already have this person (by checking all existing entries)
      let found = false
      for (const [existingNorm, existingCanonical] of personMap.entries()) {
        if (isSamePerson(existingCanonical, canonicalName)) {
          found = true
          // Update to use the better canonical name (prefer settings name, then longer name)
          const betterName = settingsPersons.find(p => isSamePerson(p, canonicalName)) || 
                           (canonicalName.length > existingCanonical.length ? canonicalName : existingCanonical)
          personMap.set(existingNorm, betterName)
          break
        }
      }
      
      if (!found) {
        personMap.set(normalized, canonicalName)
      }
    })
    
    // Final deduplication: merge any remaining duplicates
    const finalMap = new Map()
    const processed = new Set()
    
    personMap.forEach((canonicalName, normalized) => {
      // Skip if we've already processed this person
      if (processed.has(normalized)) return
      
      // Find all entries that represent the same person
      const samePersonEntries = []
      personMap.forEach((otherName, otherNorm) => {
        if (isSamePerson(canonicalName, otherName)) {
          samePersonEntries.push({ norm: otherNorm, name: otherName })
        }
      })
      
      // Choose the best canonical name (prefer settings, then longer name)
      let bestName = canonicalName
      for (const entry of samePersonEntries) {
        const settingsMatch = settingsPersons.find(p => isSamePerson(p, entry.name))
        if (settingsMatch) {
          bestName = settingsMatch
          break
        }
        if (entry.name.length > bestName.length) {
          bestName = entry.name
        }
      }
      
      // Use a consistent normalized key for the same person
      const consistentNorm = normalize(bestName)
      if (!finalMap.has(consistentNorm)) {
        finalMap.set(consistentNorm, bestName)
      }
      
      // Mark all same person entries as processed
      samePersonEntries.forEach(entry => processed.add(entry.norm))
    })
    
    const finalResult = Array.from(finalMap.values())
    
    // Sort: settings persons first, then others alphabetically
    const settingsNormalized = new Set(settingsPersons.map(normalize))
    const sorted = finalResult.sort((a, b) => {
      const aNorm = normalize(a)
      const bNorm = normalize(b)
      const aInSettings = settingsNormalized.has(aNorm)
      const bInSettings = settingsNormalized.has(bNorm)
      if (aInSettings && !bInSettings) return -1
      if (!aInSettings && bInSettings) return 1
      return a.localeCompare(b)
    })
    
    // Debug: log if we find duplicates
    const normalizedInResult = sorted.map(normalize)
    const uniqueNormalized = new Set(normalizedInResult)
    if (normalizedInResult.length !== uniqueNormalized.size) {
      console.warn('Duplicate persons detected after deduplication:', sorted)
    }
    
    return sorted
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
            className={`border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft backdrop-blur-sm ${
              isExpenses ? '' : 'dark:bg-dark-surface light:bg-light-surface dark:border-dark-border light:border-light-border'
            }`}
            style={isExpenses ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
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
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all ${
                  isExpenses ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border'
                }`}
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
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all ${
                  isExpenses ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border'
                }`}
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
          {allPersons
            .filter((person, index, self) => {
              // Additional safety filter to remove any duplicates at render time
              const normalized = person.toLowerCase().trim()
              return self.findIndex(p => p.toLowerCase().trim() === normalized) === index
            })
            .map((person, index) => {
              const personExpenses = getExpensesForPerson(person)
              const personTotal = getTotalForPerson(person)
              const isLoggedInPerson = person.toLowerCase() === loggedInPerson.toLowerCase()
              
              // Normalize person name for key to ensure uniqueness
              const normalizedPersonKey = person.toLowerCase().trim()
              
              // Assign different vibrant colors to each person (cycle through colors if more than 3)
              const opacity = isExpenses ? '20' : '40'
              const darkOpacity = isExpenses ? '30' : '50'
              const borderOpacity = isExpenses ? '40' : '60'
              const colorPalettes = [
                { bg: `bg-gradient-to-br from-accent-indigo/${opacity} via-accent-violet/${opacity} to-accent-fuchsia/${opacity} dark:from-accent-indigo/${darkOpacity} dark:via-accent-violet/${darkOpacity} dark:to-accent-fuchsia/${darkOpacity}`, border: `border-2 sm:border-4 border-accent-indigo/${borderOpacity}`, text: 'from-accent-indigo via-accent-violet to-accent-fuchsia' },
                { bg: `bg-gradient-to-br from-accent-emerald/${opacity} via-accent-teal/${opacity} to-accent-cyan/${opacity} dark:from-accent-emerald/${darkOpacity} dark:via-accent-teal/${darkOpacity} dark:to-accent-cyan/${darkOpacity}`, border: `border-2 sm:border-4 border-accent-emerald/${borderOpacity}`, text: 'from-accent-emerald via-accent-teal to-accent-cyan' },
                { bg: `bg-gradient-to-br from-accent-rose/${opacity} via-accent-pink/${opacity} to-accent-fuchsia/${opacity} dark:from-accent-rose/${darkOpacity} dark:via-accent-pink/${darkOpacity} dark:to-accent-fuchsia/${darkOpacity}`, border: `border-2 sm:border-4 border-accent-rose/${borderOpacity}`, text: 'from-accent-rose via-accent-pink to-accent-fuchsia' },
                { bg: `bg-gradient-to-br from-accent-sky/${opacity} via-accent-blue/${opacity} to-accent-indigo/${opacity} dark:from-accent-sky/${darkOpacity} dark:via-accent-blue/${darkOpacity} dark:to-accent-indigo/${darkOpacity}`, border: `border-2 sm:border-4 border-accent-sky/${borderOpacity}`, text: 'from-accent-sky via-accent-blue to-accent-indigo' },
                { bg: `bg-gradient-to-br from-accent-yellow/${opacity} via-accent-amber/${opacity} to-accent-orange/${opacity} dark:from-accent-yellow/${darkOpacity} dark:via-accent-amber/${darkOpacity} dark:to-accent-orange/${darkOpacity}`, border: `border-2 sm:border-4 border-accent-yellow/${borderOpacity}`, text: 'from-accent-yellow via-accent-amber to-accent-orange' },
                { bg: `bg-gradient-to-br from-accent-purple/${opacity} via-accent-violet/${opacity} to-accent-fuchsia/${opacity} dark:from-accent-purple/${darkOpacity} dark:via-accent-violet/${darkOpacity} dark:to-accent-fuchsia/${darkOpacity}`, border: `border-2 sm:border-4 border-accent-purple/${borderOpacity}`, text: 'from-accent-purple via-accent-violet to-accent-fuchsia' },
              ]
              const colorIndex = index % colorPalettes.length
              const colorClass = colorPalettes[colorIndex].bg
              const borderClass = colorPalettes[colorIndex].border
              const textGradient = colorPalettes[colorIndex].text
              // For expenses page, use consistent border styling
              const borderClassFinal = isExpenses ? 'border-2 sm:border-4 border-white/15' : borderClass
              
              return (
            <motion.div
              key={`person-${normalizedPersonKey}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, boxShadow: "0 12px 24px rgba(0, 0, 0, 0.2)" }}
              className={`${isExpenses ? '' : colorClass} ${borderClassFinal} ${isExpenses ? 'bg-transparent/10' : 'dark:bg-gradient-to-br light:bg-gradient-to-br'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl transition-all duration-300 backdrop-blur-sm ${
                isLoggedInPerson ? 'ring-2 sm:ring-4 ring-accent-yellow/50 shadow-accent-yellow/30' : ''
              }`}
              style={isExpenses ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
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
                <div className="space-y-2 sm:space-y-3">
                  <AnimatePresence>
                    {(expandedPersons.has(normalizedPersonKey) ? personExpenses : personExpenses.slice(0, 1)).map((expense, expenseIdx) => (
                      <AnimatedCard
                        key={expense.id}
                        delay={expenseIdx * 0.03}
                        className={`p-3 sm:p-4 ${isExpenses ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : ''} ${borderClass.replace('border-2 sm:border-4', 'border-2').replace('/60', '/40 dark:border-opacity-50')}`}
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
                        {canEdit && (
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
                  {personExpenses.length > 1 && (
                    <motion.button
                      onClick={() => {
                        const newExpanded = new Set(expandedPersons)
                        if (newExpanded.has(normalizedPersonKey)) {
                          newExpanded.delete(normalizedPersonKey)
                        } else {
                          newExpanded.add(normalizedPersonKey)
                        }
                        setExpandedPersons(newExpanded)
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-full py-2 sm:py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                        isExpenses 
                          ? 'bg-transparent/10 backdrop-blur-sm border border-white/15 text-white hover:bg-transparent/20' 
                          : 'bg-gradient-to-r from-accent-indigo to-accent-purple text-white hover:from-accent-purple hover:to-accent-indigo'
                      }`}
                    >
                      {expandedPersons.has(normalizedPersonKey) ? (
                        <>
                          <span>Show Less</span>
                          <FaChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>See All ({personExpenses.length - 1} more)</span>
                          <FaChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </motion.button>
                  )}
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
