import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { format, startOfMonth, parseISO } from 'date-fns'
import { FaDollarSign, FaShoppingCart } from 'react-icons/fa'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

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

      // Color palette for persons - bold, trending colors
      const personColors = {
        'Dinesh': '#0066ff',    // Electric blue
        'Harsha': '#8b2eff',    // Electric violet
        'Srinivas': '#ff006e',  // Hot pink
      }

      // Create pie chart data with expenses by person + groceries
      const pieChartData = []
      
      // Add each person's expenses
      Object.entries(expensesByPerson).forEach(([person, amount]) => {
        if (amount > 0) {
          pieChartData.push({
            name: person,
            value: amount,
            color: personColors[person] || '#6b7280', // Default gray if person not in color map
          })
        }
      })

      // Add groceries
      if (groceriesTotal > 0) {
        pieChartData.push({
          name: 'Groceries',
          value: groceriesTotal,
          color: '#00ff88', // Neon green
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
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text-secondary light:text-light-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Dashboard</h1>
        <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Overview of your room duties and expenses</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-accent-indigo/40 via-accent-violet/40 to-accent-fuchsia/40 dark:bg-gradient-to-br dark:from-accent-indigo/50 dark:via-accent-violet/50 dark:to-accent-fuchsia/50 border-4 border-accent-indigo/60 dark:border-accent-indigo/70 rounded-2xl p-6 shadow-2xl hover:shadow-accent-indigo/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-accent-indigo dark:text-accent-violet text-base font-extrabold uppercase tracking-wide">Total Expenses</h3>
            <div className="p-4 bg-gradient-to-br from-accent-indigo via-accent-violet to-accent-fuchsia rounded-xl shadow-xl animate-pulse">
              <FaDollarSign className="text-3xl text-white" />
            </div>
          </div>
          <p className="text-5xl font-extrabold bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia bg-clip-text text-transparent mb-2 drop-shadow-lg">₹{stats.expenses.total.toFixed(2)}</p>
          <p className="text-sm font-bold dark:text-dark-text-secondary light:text-light-text-secondary">{stats.expenses.count} entries</p>
        </div>

        <div className="bg-gradient-to-br from-accent-emerald/40 via-accent-teal/40 to-accent-cyan/40 dark:bg-gradient-to-br dark:from-accent-emerald/50 dark:via-accent-teal/50 dark:to-accent-cyan/50 border-4 border-accent-emerald/60 dark:border-accent-emerald/70 rounded-2xl p-6 shadow-2xl hover:shadow-accent-emerald/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-accent-emerald dark:text-accent-teal text-base font-extrabold uppercase tracking-wide">Shopping Items</h3>
            <div className="p-4 bg-gradient-to-br from-accent-emerald via-accent-teal to-accent-cyan rounded-xl shadow-xl animate-pulse">
              <FaShoppingCart className="text-3xl text-white" />
            </div>
          </div>
          <p className="text-5xl font-extrabold bg-gradient-to-r from-accent-emerald via-accent-teal to-accent-cyan bg-clip-text text-transparent mb-2 drop-shadow-lg">{stats.shoppingItems.total}</p>
          <p className="text-sm font-bold dark:text-dark-text-secondary light:text-light-text-secondary">{stats.shoppingItems.pending} pending</p>
        </div>

        <div className="bg-gradient-to-br from-accent-rose/40 via-accent-pink/40 to-accent-fuchsia/40 dark:bg-gradient-to-br dark:from-accent-rose/50 dark:via-accent-pink/50 dark:to-accent-fuchsia/50 border-4 border-accent-rose/60 dark:border-accent-rose/70 rounded-2xl p-6 shadow-2xl hover:shadow-accent-rose/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-accent-rose dark:text-accent-pink text-base font-extrabold uppercase tracking-wide">Quick Actions</h3>
            <div className="p-4 bg-gradient-to-br from-accent-rose via-accent-pink to-accent-fuchsia rounded-xl shadow-xl animate-pulse">
              <span className="text-3xl">⚡</span>
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
        </div>
      </div>

      {/* Monthly Expenditure Pie Chart */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-2">
              Monthly Expenditure - {format(new Date(), 'MMMM yyyy')}
            </h2>
            <p className="text-sm dark:text-dark-text-secondary light:text-light-text-secondary">
              Breakdown of expenses and groceries for this month
            </p>
          </div>
          <button
            onClick={handleCloseMonth}
            disabled={closingMonth}
            className="px-4 py-2 bg-gradient-to-r from-accent-rose via-accent-pink to-accent-fuchsia text-white font-bold rounded-lg hover:from-accent-pink hover:via-accent-fuchsia hover:to-accent-rose transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {closingMonth ? 'Closing...' : 'Close Month'}
          </button>
        </div>
        {monthlyData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="w-full md:w-1/2 max-w-md overflow-visible">
              <ResponsiveContainer width="100%" height={400}>
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
                    paddingAngle={2}
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
            <div className="w-full md:w-1/2 space-y-4">
              {monthlyData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-6 h-6 rounded-full shadow-lg ring-2 ring-white/20"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-lg dark:text-dark-text light:text-light-text">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-accent-indigo to-accent-violet bg-clip-text text-transparent">
                    ₹{item.value.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t-2 border-accent-fuchsia/30">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold dark:text-dark-text light:text-light-text">
                    Total
                  </span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-accent-fuchsia via-accent-rose to-accent-pink bg-clip-text text-transparent">
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
      </div>

      {/* Historical Months */}
      {historicalMonths.length > 0 && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
          <div className="mb-6">
            <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-2">
              Historical Months
            </h2>
            <p className="text-sm dark:text-dark-text-secondary light:text-light-text-secondary">
              Closed months with expenses and groceries
            </p>
          </div>
          <div className="space-y-4">
            {historicalMonths.map((monthData) => {
              const monthDate = parseISO(`${monthData.month}-01`)
              const total = monthData.expensesTotal + monthData.groceriesTotal
              
              return (
                <div
                  key={monthData.month}
                  className="p-4 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold dark:text-dark-text light:text-light-text">
                      {format(monthDate, 'MMMM yyyy')}
                    </h3>
                    <span className="text-2xl font-bold bg-gradient-to-r from-accent-indigo to-accent-violet bg-clip-text text-transparent">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
        </div>
      )}

      {/* Recent Expenses */}
      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text">Recent Expenses</h2>
          <Link
            to="/expenses"
            className="text-sm dark:text-dark-text-secondary light:text-light-text-secondary hover:dark:text-dark-text hover:light:text-light-text transition-colors font-medium"
          >
            View all →
          </Link>
        </div>
        {stats.recentExpenses.length === 0 ? (
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-8">No expenses yet</p>
        ) : (
          <div className="space-y-3">
            {stats.recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl hover:shadow-soft transition-shadow"
              >
                <div className="flex-1">
                  <p className="font-semibold dark:text-dark-text light:text-light-text">{expense.person}</p>
                  <p className="text-sm dark:text-dark-text-secondary light:text-light-text-secondary mt-1">
                    {expense.description || 'No description'}
                  </p>
                  <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
                    {format(new Date(expense.timestamp), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <p className="text-xl font-bold dark:text-dark-text light:text-light-text ml-4">₹{expense.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
