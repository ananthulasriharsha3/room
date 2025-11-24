import { useEffect, useState } from 'react'
import api from '../utils/api'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa'

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  })

  // Define the three persons (case-insensitive matching)
  const persons = ['Dinesh', 'Harsha', 'Srinivas']
  const loggedInPerson = user?.display_name || ''
  // Case-insensitive check: find the matching person from the list
  const matchedPerson = persons.find(p => p.toLowerCase() === loggedInPerson.toLowerCase())
  const canEdit = !!matchedPerson
  // Use the matched person name (with correct capitalization) for consistency
  const loggedInPersonFormatted = matchedPerson || loggedInPerson

  useEffect(() => {
    fetchExpenses()
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit) {
      alert('You can only add expenses for your own account')
      return
    }
    
    try {
      if (editingExpense) {
        // For now, delete and recreate since there's no update endpoint
        await api.delete(`/expenses/${editingExpense.id}`)
      }
      
      await api.post('/expenses', {
        person: loggedInPersonFormatted,
        amount: parseFloat(formData.amount),
        description: formData.description,
      })
      setFormData({ amount: '', description: '' })
      setShowAddForm(false)
      setEditingExpense(null)
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert(error.response?.data?.detail || 'Failed to save expense')
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
    
    try {
      await api.delete(`/expenses/${id}`)
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert(error.response?.data?.detail || 'Failed to delete expense')
    }
  }

  const getExpensesForPerson = (person) => {
    return expenses.filter(e => e.person.toLowerCase() === person.toLowerCase())
  }

  const getTotalForPerson = (person) => {
    return getExpensesForPerson(person).reduce((sum, e) => sum + e.amount, 0)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text-secondary light:text-light-text-secondary">Loading...</div>
      </div>
    )
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingExpense(null)
    setFormData({ amount: '', description: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Expenses</h1>
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Track shared expenses</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditingExpense(null)
              setFormData({ amount: '', description: '' })
              setShowAddForm(!showAddForm)
            }}
            className="px-6 py-3 bg-gradient-to-r from-accent-emerald via-accent-teal to-accent-cyan text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-emerald/30 hover:scale-105 transition-all flex items-center gap-2"
          >
            <FaPlus /> {showAddForm ? 'Cancel' : 'Add Expense'}
          </button>
        )}
      </div>

      {showAddForm && canEdit && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
          <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-6">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'} - {loggedInPersonFormatted}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
                placeholder="Enter description (optional)"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-accent-lime via-accent-emerald to-accent-teal text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-lime/30 hover:scale-105 transition-all"
              >
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border dark:text-dark-text light:text-light-text font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Three Person Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {persons.map((person, index) => {
          const personExpenses = getExpensesForPerson(person)
          const personTotal = getTotalForPerson(person)
          const isLoggedInPerson = person.toLowerCase() === loggedInPerson.toLowerCase()
          
          // Assign different vibrant colors to each person
          const colorClasses = [
            'bg-gradient-to-br from-accent-indigo/40 via-accent-violet/40 to-accent-fuchsia/40 dark:from-accent-indigo/50 dark:via-accent-violet/50 dark:to-accent-fuchsia/50 border-4 border-accent-indigo/60',
            'bg-gradient-to-br from-accent-emerald/40 via-accent-teal/40 to-accent-cyan/40 dark:from-accent-emerald/50 dark:via-accent-teal/50 dark:to-accent-cyan/50 border-4 border-accent-emerald/60',
            'bg-gradient-to-br from-accent-rose/40 via-accent-pink/40 to-accent-fuchsia/40 dark:from-accent-rose/50 dark:via-accent-pink/50 dark:to-accent-fuchsia/50 border-4 border-accent-rose/60',
          ]
          const textGradients = [
            'from-accent-indigo via-accent-violet to-accent-fuchsia',
            'from-accent-emerald via-accent-teal to-accent-cyan',
            'from-accent-rose via-accent-pink to-accent-fuchsia',
          ]

          return (
            <div
              key={person}
              className={`${colorClasses[index]} dark:bg-gradient-to-br light:bg-gradient-to-br rounded-2xl p-6 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 ${
                isLoggedInPerson ? 'ring-4 ring-accent-yellow/50 shadow-accent-yellow/30' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-3xl font-extrabold bg-gradient-to-r ${textGradients[index]} bg-clip-text text-transparent`}>{person}</h2>
                {isLoggedInPerson && (
                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-accent-yellow via-accent-amber to-accent-orange text-white rounded-full font-extrabold shadow-lg">
                    You
                  </span>
                )}
              </div>
              
              <div className="mb-4 pb-4 border-b-2 dark:border-dark-border light:border-light-border">
                <p className="text-sm font-bold dark:text-dark-text-secondary light:text-light-text-secondary mb-1">Total</p>
                <p className={`text-4xl font-extrabold bg-gradient-to-r ${textGradients[index]} bg-clip-text text-transparent`}>₹{personTotal.toFixed(2)}</p>
              </div>

              {personExpenses.length === 0 ? (
                <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-8 text-sm font-semibold">
                  No expenses yet
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {personExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`p-4 dark:bg-gradient-to-r dark:from-dark-card dark:to-dark-surface light:bg-gradient-to-r light:from-light-card light:to-light-surface border-2 ${
                        index === 0 ? 'border-accent-indigo/40 dark:border-accent-indigo/50' :
                        index === 1 ? 'border-accent-emerald/40 dark:border-accent-emerald/50' :
                        'border-accent-rose/40 dark:border-accent-rose/50'
                      } rounded-xl shadow-md hover:shadow-xl transition-all`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-sm font-extrabold bg-gradient-to-r ${textGradients[index]} bg-clip-text text-transparent`}>
                              {expense.person}
                            </p>
                            <p className={`text-xl font-extrabold bg-gradient-to-r ${textGradients[index]} bg-clip-text text-transparent`}>
                              ₹{expense.amount.toFixed(2)}
                            </p>
                          </div>
                          {expense.description && (
                            <p className="text-sm font-semibold dark:text-dark-text-secondary light:text-light-text-secondary mt-1">
                              {expense.description}
                            </p>
                          )}
                          <p className="text-xs font-medium dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
                            {format(new Date(expense.timestamp), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        {isLoggedInPerson && (
                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={() => handleEdit(expense)}
                              className="p-2.5 bg-gradient-to-br from-accent-sky to-accent-cyan text-white rounded-lg hover:shadow-lg hover:shadow-accent-sky/30 hover:scale-110 transition-all"
                              title="Edit expense"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id, expense.person)}
                              className="p-2.5 bg-gradient-to-br from-accent-red to-accent-rose text-white rounded-lg hover:shadow-lg hover:shadow-accent-red/30 hover:scale-110 transition-all"
                              title="Delete expense"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Overall Total */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold dark:text-dark-text light:text-light-text">Grand Total</h2>
          <p className="text-3xl font-bold dark:text-dark-text light:text-light-text">₹{totalExpenses.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
