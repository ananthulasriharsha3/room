import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../utils/api'
import { format, startOfMonth, parseISO } from 'date-fns'
import { FaDollarSign, FaShoppingCart } from 'react-icons/fa'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { SkeletonLoader } from '../components/ui/SkeletonLoader'

export default function Dashboard() {
  const [stats, setStats] = useState({
    expenses: { total: 0, count: 0 },
    shoppingItems: { total: 0, pending: 0 },
    recentExpenses: [],
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [historicalMonths, setHistoricalMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [closingMonth, setClosingMonth] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    // Safety timeout - ensure loading doesn't stay true forever
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 10000) // 10 second timeout
    
    return () => clearTimeout(timeout)
  }, [])

  const handleCloseMonth = async () => {
    const currentMonthStr = format(startOfMonth(new Date()), 'yyyy-MM')
    if (!window.confirm(`Are you sure you want to close ${format(new Date(), 'MMMM yyyy')}? This will mark all expenses and groceries for this month as closed.`)) {
      return
    }
    
    setClosingMonth(true)
    try {
      await api.post('/months/close', { month: currentMonthStr })
      alert(`Successfully closed ${format(new Date(), 'MMMM yyyy')}!`)
      await fetchDashboardData()
    } catch (error) {
      console.error('Error closing month:', error)
      alert('Failed to close month. Please try again.')
    } finally {
      setClosingMonth(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      // Fetch data with individual error handling
      let expenses = []
      let shoppingItems = []
      let groceries = []
      
      try {
        const expensesRes = await api.get('/expenses')
        expenses = expensesRes.data || []
      } catch (error) {
        console.error('Error fetching expenses:', error)
        // Continue with empty array
      }
      
      try {
        const shoppingRes = await api.get('/shopping-items')
        shoppingItems = shoppingRes.data || []
      } catch (error) {
        console.error('Error fetching shopping items:', error)
        // Continue with empty array
      }
      
      try {
        const groceriesRes = await api.get('/grocery-purchases')
        groceries = groceriesRes.data || []
      } catch (error) {
        console.error('Error fetching grocery purchases:', error)
        console.error('Error details:', error.response?.data)
        // Continue with empty array
      }

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
      const pendingShopping = shoppingItems.filter((item) => !item.is_completed).length

      const recentExpenses = expenses
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5)

      // Calculate monthly expenditure breakdown
      const currentMonth = startOfMonth(new Date())
      const currentMonthStr = format(currentMonth, 'yyyy-MM')
      
      // Filter expenses for current month (only open/not closed expenses)
      const currentMonthExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.timestamp)
        const expenseMonth = format(startOfMonth(expenseDate), 'yyyy-MM')
        return expenseMonth === currentMonthStr && !expense.month_closed
      })
      
      // Filter groceries for current month (only open/not closed groceries)
      const currentMonthGroceries = groceries.filter((grocery) => {
        let groceryDate
        if (typeof grocery.purchase_date === 'string') {
          groceryDate = parseISO(grocery.purchase_date)
        } else if (grocery.purchase_date instanceof Date) {
          groceryDate = grocery.purchase_date
        } else {
          // Handle date object format
          groceryDate = new Date(grocery.purchase_date)
        }
        const groceryMonth = format(startOfMonth(groceryDate), 'yyyy-MM')
        return groceryMonth === currentMonthStr && !grocery.month_closed
      })
      
      // Group historical months data
      const historicalData = {}
      
      // Process closed expenses
      expenses.filter(e => e.month_closed).forEach((expense) => {
        const month = expense.month_closed
        if (!historicalData[month]) {
          historicalData[month] = { expenses: [], groceries: [] }
        }
        historicalData[month].expenses.push(expense)
      })
      
      // Process closed groceries
      groceries.filter(g => g.month_closed).forEach((grocery) => {
        const month = grocery.month_closed
        if (!historicalData[month]) {
          historicalData[month] = { expenses: [], groceries: [] }
        }
        historicalData[month].groceries.push(grocery)
      })
      
      // Convert to array and sort by month (newest first)
      const historicalMonthsArray = Object.entries(historicalData)
        .map(([month, data]) => ({
          month,
          expenses: data.expenses,
          groceries: data.groceries,
          expensesTotal: data.expenses.reduce((sum, e) => sum + e.amount, 0),
          groceriesTotal: data.groceries.reduce((sum, g) => sum + g.price, 0),
        }))
        .sort((a, b) => b.month.localeCompare(a.month))
      
      setHistoricalMonths(historicalMonthsArray)

      // Group expenses by person
      const expensesByPerson = currentMonthExpenses.reduce((acc, expense) => {
        const person = expense.person
        if (!acc[person]) {
          acc[person] = 0
        }
        acc[person] += expense.amount
        return acc
      }, {})

      const groceriesTotal = currentMonthGroceries.reduce((sum, g) => sum + g.price, 0)

      // Color palette for persons - vibrant, distinct colors
      // Use a function to match person names (case-insensitive, handles variations)
      const getPersonColor = (personName) => {
        const nameLower = personName.toLowerCase()
        
        // Color mapping with flexible matching
        if (nameLower.includes('dinesh')) {
          return '#0066ff'  // Electric blue
        } else if (nameLower.includes('harsha')) {
          return '#8b2eff'   // Electric violet
        } else if (nameLower.includes('srinivas')) {
          return '#00d4ff'   // Cyan
        }
        
        // Default: assign colors dynamically for any other persons
        return null
      }

      // Extended color palette for additional persons
      const additionalColors = [
        '#00ff88',  // Neon green
        '#ff6b00',  // Orange
        '#00d4ff',  // Cyan
        '#ffd700',  // Gold
        '#ff1493',  // Deep pink
        '#7b2cbf',  // Purple
        '#06ffa5',  // Mint green
        '#ff8c00',  // Dark orange
      ]

      // Create pie chart data with expenses by person + groceries
      const pieChartData = []
      let colorIndex = 0
      
      // Add each person's expenses
      Object.entries(expensesByPerson).forEach(([person, amount]) => {
        if (amount > 0) {
          let color = getPersonColor(person)
          
          // If no color found, assign from additional colors
          if (!color) {
            color = additionalColors[colorIndex % additionalColors.length]
            colorIndex++
          }
          
          pieChartData.push({
            name: person,
            value: amount,
            color: color,
          })
        }
      })

      // Add groceries (use a distinct color that won't conflict with person colors)
      if (groceriesTotal > 0) {
        pieChartData.push({
          name: 'Groceries',
          value: groceriesTotal,
          color: '#10b981', // Emerald green (distinct from person colors)
        })
      }

      setMonthlyData(pieChartData)
      
      // Calculate totals for current month only
      const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0) + 
                                currentMonthGroceries.reduce((sum, g) => sum + g.price, 0)
      
      setStats({
        expenses: { total: currentMonthTotal, count: currentMonthExpenses.length },
        shoppingItems: { total: shoppingItems.length, pending: pendingShopping },
        recentExpenses: currentMonthExpenses
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5),
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
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

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary">Overview of your room duties and expenses</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <motion.div 
            className="bg-gradient-to-br dark:bg-gradient-to-br dark:from-accent-indigo/50 dark:via-accent-violet/50 dark:to-accent-fuchsia/50 border-2 sm:border-4 dark:border-accent-indigo/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl"
            style={{ background: 'linear-gradient(to bottom right, rgba(255, 253, 250, 0.5), rgba(255, 245, 238, 0.5), rgba(255, 240, 245, 0.5))', borderColor: 'rgba(139, 69, 19, 0.4)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ scale: 1.02, boxShadow: "0 12px 24px rgba(139, 69, 19, 0.3)" }}
          >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="dark:text-accent-violet text-xs sm:text-sm lg:text-base font-extrabold uppercase tracking-wide" style={{ color: '#8B4513' }}>Total Expenses</h3>
            <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl shadow-xl animate-pulse" style={{ background: 'linear-gradient(to bottom right, #8B4513, #A0522D, #CD853F)' }}>
              <FaDollarSign className="text-xl sm:text-2xl lg:text-3xl text-white" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-clip-text text-transparent mb-2 drop-shadow-lg" style={{ backgroundImage: 'linear-gradient(to right, #8B4513, #A0522D, #CD853F)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>₹{stats.expenses.total.toFixed(2)}</p>
          <p className="text-xs sm:text-sm font-bold dark:text-dark-text-secondary light:text-light-text-secondary">{stats.expenses.count} entries</p>
          </motion.div>

          <motion.div 
            className="bg-gradient-to-br dark:bg-gradient-to-br dark:from-accent-emerald/50 dark:via-accent-teal/50 dark:to-accent-cyan/50 border-2 sm:border-4 dark:border-accent-emerald/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl"
            style={{ background: 'linear-gradient(to bottom right, rgba(255, 253, 250, 0.5), rgba(255, 248, 240, 0.5), rgba(255, 245, 238, 0.5))', borderColor: 'rgba(139, 69, 19, 0.4)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.02, boxShadow: "0 12px 24px rgba(139, 69, 19, 0.3)" }}
          >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="dark:text-accent-teal text-xs sm:text-sm lg:text-base font-extrabold uppercase tracking-wide" style={{ color: '#8B4513' }}>Shopping Items</h3>
            <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl shadow-xl animate-pulse" style={{ background: 'linear-gradient(to bottom right, #8B4513, #A0522D, #CD853F)' }}>
              <FaShoppingCart className="text-xl sm:text-2xl lg:text-3xl text-white" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-clip-text text-transparent mb-2 drop-shadow-lg" style={{ backgroundImage: 'linear-gradient(to right, #8B4513, #A0522D, #CD853F)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>{stats.shoppingItems.total}</p>
          <p className="text-xs sm:text-sm font-bold dark:text-dark-text-secondary light:text-light-text-secondary">{stats.shoppingItems.pending} pending</p>
          </motion.div>

          <motion.div 
            className="bg-gradient-to-br dark:bg-gradient-to-br dark:from-accent-rose/50 dark:via-accent-pink/50 dark:to-accent-fuchsia/50 border-2 sm:border-4 dark:border-accent-rose/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl sm:col-span-2 lg:col-span-1"
            style={{ background: 'linear-gradient(to bottom right, rgba(255, 240, 245, 0.5), rgba(255, 228, 230, 0.5), rgba(255, 218, 225, 0.5))', borderColor: 'rgba(251, 182, 206, 0.5)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ scale: 1.02, boxShadow: "0 12px 24px rgba(251, 182, 206, 0.3)" }}
          >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="dark:text-accent-pink text-xs sm:text-sm lg:text-base font-extrabold uppercase tracking-wide" style={{ color: '#F8BBD0' }}>Quick Actions</h3>
            <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl shadow-xl animate-pulse" style={{ background: 'linear-gradient(to bottom right, #F8BBD0, #F48FB1, #F06292)' }}>
              <span className="text-xl sm:text-2xl lg:text-3xl">⚡</span>
            </div>
          </div>
          <div className="flex flex-col space-y-3 mt-4">
            <Link
              to="/schedule"
              className="text-sm font-extrabold bg-gradient-to-r from-accent-sky via-accent-blue to-accent-indigo bg-clip-text text-transparent hover:from-accent-blue hover:via-accent-indigo hover:to-accent-violet transition-all flex items-center group"
            >
              View Schedule <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              to="/expenses"
              className="text-sm font-extrabold bg-gradient-to-r from-accent-lime via-accent-emerald to-accent-teal bg-clip-text text-transparent hover:from-accent-emerald hover:via-accent-teal hover:to-accent-cyan transition-all flex items-center group"
            >
              Add Expense <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          </motion.div>
        </div>

      {/* Monthly Expenditure Pie Chart */}
        <AnimatedCard className="p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2">
              Monthly Expenditure - {format(new Date(), 'MMMM yyyy')}
            </h2>
            <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary">
              Breakdown of expenses and groceries for this month
            </p>
          </div>
          <AnimatedButton
            onClick={handleCloseMonth}
            disabled={closingMonth}
            variant="danger"
            className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base"
          >
            {closingMonth ? 'Closing...' : 'Close Month'}
          </AnimatedButton>
        </div>
        {monthlyData.length > 0 ? (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8">
            <div className="w-full lg:w-1/2 max-w-md overflow-visible">
              <ResponsiveContainer width="100%" height={300} className="sm:h-[350px] lg:h-[400px]">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={monthlyData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => {
                      // Show label for all segments, but format it nicely
                      return `${name}\n${(percent * 100).toFixed(1)}%`
                    }}
                    outerRadius={100}
                    innerRadius={30}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={0}
                  >
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toFixed(2)}`}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span style={{ color: 'inherit' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-3 sm:space-y-4">
              {monthlyData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 sm:p-4 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div
                      className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full shadow-lg ring-2 ring-white/20 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-sm sm:text-base lg:text-lg dark:text-dark-text light:text-light-text">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-accent-indigo to-accent-violet bg-clip-text text-transparent">
                    ₹{item.value.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="pt-3 sm:pt-4 border-t-2 border-accent-fuchsia/30">
                <div className="flex items-center justify-between">
                  <span className="text-base sm:text-lg font-semibold dark:text-dark-text light:text-light-text">
                    Total
                  </span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-accent-fuchsia via-accent-rose to-accent-pink bg-clip-text text-transparent">
                    ₹{monthlyData.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg dark:text-dark-text-secondary light:text-light-text-secondary">
              No expenses or groceries for this month yet
            </p>
            <p className="text-sm dark:text-dark-text-tertiary light:text-light-text-tertiary mt-2">
              Add expenses or groceries to see the breakdown here
            </p>
          </div>
        )}
        </AnimatedCard>

      {/* Historical Months */}
      {historicalMonths.length > 0 && (
          <AnimatedCard className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2">
              Historical Months
            </h2>
            <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary">
              Closed months with expenses and groceries
            </p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {historicalMonths.map((monthData) => {
              const monthDate = parseISO(`${monthData.month}-01`)
              const total = monthData.expensesTotal + monthData.groceriesTotal
              
              return (
                <div
                  key={monthData.month}
                  className="p-3 sm:p-4 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold dark:text-dark-text light:text-light-text">
                      {format(monthDate, 'MMMM yyyy')}
                    </h3>
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-accent-indigo to-accent-violet bg-clip-text text-transparent">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="dark:text-dark-text-secondary light:text-light-text-secondary">Expenses: </span>
                      <span className="font-semibold dark:text-dark-text light:text-light-text">
                        ₹{monthData.expensesTotal.toFixed(2)} ({monthData.expenses.length} entries)
                      </span>
                    </div>
                    <div>
                      <span className="dark:text-dark-text-secondary light:text-light-text-secondary">Groceries: </span>
                      <span className="font-semibold dark:text-dark-text light:text-light-text">
                        ₹{monthData.groceriesTotal.toFixed(2)} ({monthData.groceries.length} items)
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </AnimatedCard>
      )}

      {/* Recent Expenses */}
        <AnimatedCard className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text">Recent Expenses</h2>
          <Link
            to="/expenses"
            className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary hover:dark:text-dark-text hover:light:text-light-text transition-colors font-medium"
          >
            View all →
          </Link>
        </div>
        {stats.recentExpenses.length === 0 ? (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-6 sm:py-8 text-sm sm:text-base"
          >
            No expenses yet
          </motion.p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {stats.recentExpenses.map((expense, idx) => (
              <AnimatedCard
                key={expense.id}
                delay={idx * 0.05}
                className="p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex-1 w-full sm:w-auto">
                  <p className="font-semibold text-sm sm:text-base dark:text-dark-text light:text-light-text">{expense.person}</p>
                  <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary mt-1">
                    {expense.description || 'No description'}
                  </p>
                  <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
                    {format(new Date(expense.timestamp), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <p className="text-lg sm:text-xl font-bold dark:text-dark-text light:text-light-text sm:ml-4">₹{expense.amount.toFixed(2)}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
        </AnimatedCard>
    </div>
  )
}
