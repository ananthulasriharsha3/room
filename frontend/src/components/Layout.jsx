import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { 
  FaChartBar, 
  FaCalendarAlt, 
  FaDollarSign, 
  FaShoppingCart, 
  FaStickyNote, 
  FaBox, 
  FaLeaf, 
  FaCog,
  FaMoon,
  FaSun
} from 'react-icons/fa'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: FaChartBar },
    { name: 'Schedule', path: '/schedule', icon: FaCalendarAlt },
    { name: 'Expenses', path: '/expenses', icon: FaDollarSign },
    { name: 'Shopping', path: '/shopping', icon: FaShoppingCart },
    { name: 'Day Notes', path: '/notes', icon: FaStickyNote },
    { name: 'Stock Items', path: '/stock', icon: FaBox },
    { name: 'Grocery', path: '/grocery', icon: FaLeaf },
  ]

  if (user?.is_admin) {
    navigation.push({ name: 'Admin', path: '/admin', icon: FaCog })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen dark:bg-dark-bg light:bg-light-bg flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="w-full dark:bg-gradient-to-r dark:from-dark-surface dark:to-dark-card light:bg-gradient-to-r light:from-light-surface light:to-light-card border-b dark:border-dark-border light:border-light-border shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-2xl font-bold dark:text-dark-text light:text-light-text">Room Duty</h1>
              <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary">Scheduler</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-4 py-2 dark:bg-dark-card light:bg-light-card rounded-xl">
              <div className="text-right">
                <p className="text-sm font-semibold dark:text-dark-text light:text-light-text">{user?.display_name}</p>
                <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary truncate max-w-[200px]">{user?.email}</p>
              </div>
              {user?.is_admin && (
                <span className="px-2 py-1 text-xs dark:bg-white dark:text-black light:bg-light-text light:text-light-surface rounded-lg font-semibold whitespace-nowrap">
                  Admin
                </span>
              )}
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg dark:bg-dark-card light:bg-light-card dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gradient-to-r from-accent-red to-accent-orange text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-accent-red/30 transition-all text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 dark:bg-dark-surface light:bg-light-surface border-r dark:border-dark-border light:border-light-border flex flex-col shadow-medium">
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path
              const IconComponent = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold shadow-lg shadow-accent-indigo/30'
                      : 'dark:text-dark-text-secondary light:text-light-text-secondary dark:hover:bg-dark-card light:hover:bg-light-card hover:translate-x-1 hover:dark:bg-gradient-to-r hover:dark:from-dark-card hover:dark:to-dark-surface hover:light:bg-gradient-to-r hover:light:from-light-card hover:light:to-light-surface'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
