import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ScrollToTop } from './ui/ScrollToTop'
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
  FaSun,
  FaBars,
  FaTimes
} from 'react-icons/fa'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  // Ensure Dashboard is always first - force it to be included
  const dashboardItem = navigation.find(item => item.path === '/dashboard') || { name: 'Dashboard', path: '/dashboard', icon: FaChartBar }
  const sortedNavigation = [
    dashboardItem,
    ...navigation.filter(item => item.path !== '/dashboard')
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen dark:bg-dark-bg light:bg-light-bg flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Top Navigation Bar */}
      <motion.nav 
        className="w-full dark:bg-gradient-to-r dark:from-dark-surface dark:to-dark-card light:bg-gradient-to-r light:from-light-surface light:to-light-card border-b dark:border-dark-border light:border-light-border sticky top-0 z-[60] transition-all duration-300 shadow-lg py-3 sm:py-4"
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg dark:bg-dark-card/90 dark:backdrop-blur-sm light:bg-light-card dark:text-white light:text-light-text hover:opacity-80 transition-opacity border dark:border-dark-border/50 light:border-light-border shadow-md z-[70] relative"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold dark:text-white light:text-light-text drop-shadow-sm">Room Duty</h1>
              <p className="text-xs dark:text-white/70 light:text-light-text-secondary hidden sm:block">Scheduler</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden sm:flex items-center space-x-3 px-3 sm:px-4 py-2 dark:bg-dark-card light:bg-light-card rounded-xl">
              <div className="text-right">
                <p className="text-sm font-semibold dark:text-dark-text light:text-light-text">{user?.display_name}</p>
                <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary truncate max-w-[150px] lg:max-w-[200px]">{user?.email}</p>
              </div>
              {user?.is_admin && (
                <span className="px-2 py-1 text-xs dark:bg-white dark:text-black light:bg-light-text light:text-light-surface rounded-lg font-semibold whitespace-nowrap">
                  Admin
                </span>
              )}
            </div>
            
            {/* Mobile user info */}
            <div className="sm:hidden flex items-center space-x-2">
              {user?.is_admin && (
                <span className="px-2 py-1 text-xs dark:bg-white dark:text-black light:bg-light-text light:text-light-surface rounded-lg font-semibold">
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
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-accent-red to-accent-orange text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-accent-red/30 transition-all text-xs sm:text-sm whitespace-nowrap min-w-fit"
            >
              Logout
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="flex flex-1 relative w-full max-w-full min-h-0">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 dark:bg-black/60 light:bg-black/70 z-[45] lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static left-0 z-[55]
          top-[80px] lg:top-0 h-[calc(100vh-80px)] lg:h-auto
          w-64 sm:w-64 dark:bg-dark-surface light:bg-light-surface 
          border-r dark:border-dark-border light:border-light-border 
          flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-0 lg:pt-0
          overflow-y-auto overflow-x-hidden
          -webkit-overflow-scrolling-touch
          will-change-transform
        `}
        style={{
          visibility: 'visible',
          display: 'flex'
        }}
        >
          <nav className="flex-1 p-4 space-y-2 min-h-0 overflow-y-auto pb-20 pt-6 lg:pt-2">
            {/* Force Dashboard to always be first and visible */}
            <div
              key="dashboard-forced"
              className="flex-shrink-0 w-full mb-2"
              style={{ 
                display: 'block', 
                visibility: 'visible',
                opacity: 1,
                position: 'relative',
                zIndex: 10,
                marginTop: '0px'
              }}
            >
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 w-full ${
                  location.pathname === '/dashboard'
                    ? 'bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold shadow-lg shadow-accent-indigo/30'
                    : 'bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold shadow-lg shadow-accent-indigo/30'
                }`}
                style={{ 
                  display: 'flex', 
                  visibility: 'visible',
                  opacity: 1,
                  color: 'white'
                }}
              >
                <FaChartBar className="w-5 h-5 flex-shrink-0" style={{ opacity: 1 }} />
                <span className="text-sm sm:text-base whitespace-nowrap font-bold">Dashboard</span>
              </Link>
            </div>
            
            {sortedNavigation.length === 0 && (
              <div className="text-red-500 p-4">No navigation items found!</div>
            )}
            {sortedNavigation.filter(item => item.path !== '/dashboard').map((item, index) => {
              const isActive = location.pathname === item.path
              const IconComponent = item.icon
              
              return (
                <div
                  key={item.path}
                  className="flex-shrink-0 w-full"
                  style={{ 
                    display: 'block', 
                    visibility: 'visible',
                    opacity: 1
                  }}
                >
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 w-full ${
                      isActive
                        ? 'bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold shadow-lg shadow-accent-indigo/30'
                        : 'dark:text-white light:text-light-text dark:hover:bg-dark-card light:hover:bg-light-card hover:translate-x-1 hover:dark:bg-gradient-to-r hover:dark:from-dark-card hover:dark:to-dark-surface hover:light:bg-gradient-to-r hover:light:from-light-card hover:light:to-light-surface'
                    }`}
                    style={{ 
                      display: 'flex', 
                      visibility: 'visible',
                      opacity: 1,
                      color: isActive ? 'white' : undefined
                    }}
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" style={{ opacity: 1 }} />
                    <span className="text-sm sm:text-base whitespace-nowrap font-medium">{item.name}</span>
                  </Link>
                </div>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 max-w-full min-h-0 relative z-10">
          <div className="p-4 sm:p-6 lg:p-8 mx-auto w-full box-border pb-8" style={{ maxWidth: 'min(100%, 1280px)' }}>
            <Outlet />
          </div>
        </main>
      </div>
      <ScrollToTop />
    </div>
  )
}
