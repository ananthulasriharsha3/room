import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <div className="h-screen dark:bg-dark-bg light:bg-light-bg flex flex-col w-full max-w-full overflow-x-hidden overflow-y-hidden">
      {/* Top Navigation Bar */}
      <motion.nav 
        className={`w-full dark:bg-gradient-to-r dark:from-dark-surface dark:to-dark-card light:bg-gradient-to-r light:from-light-surface light:to-light-card border-b dark:border-dark-border light:border-light-border sticky top-0 z-[60] transition-all duration-300 ${
          scrolled ? 'shadow-xl backdrop-blur-md py-2 sm:py-3' : 'shadow-lg py-3 sm:py-4'
        }`}
        initial={false}
        animate={{
          boxShadow: scrolled ? '0 8px 24px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg dark:bg-dark-card/90 dark:backdrop-blur-sm light:bg-light-card dark:text-white light:text-light-text hover:opacity-80 transition-opacity border dark:border-dark-border/50 light:border-light-border shadow-md"
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

      <div className="flex flex-1 relative w-full max-w-full overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 dark:bg-black/60 light:bg-black/70 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static left-0 z-50
          top-0 lg:top-0 bottom-0
          w-64 dark:bg-dark-surface light:bg-light-surface 
          border-r dark:border-dark-border light:border-light-border 
          flex flex-col shadow-medium
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-16 lg:pt-0
        `}>
          <nav className="flex-1 p-4 space-y-2 overflow-y-visible">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.path
              const IconComponent = item.icon
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold shadow-lg shadow-accent-indigo/30'
                        : 'dark:text-dark-text-secondary light:text-light-text-secondary dark:hover:bg-dark-card light:hover:bg-light-card hover:translate-x-1 hover:dark:bg-gradient-to-r hover:dark:from-dark-card hover:dark:to-dark-surface hover:light:bg-gradient-to-r hover:light:from-light-card hover:light:to-light-surface'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">{item.name}</span>
                  </Link>
                </motion.div>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 max-w-full">
          <div className="p-4 sm:p-6 lg:p-8 mx-auto w-full box-border" style={{ maxWidth: 'min(100%, 1280px)' }}>
            <div className="w-full overflow-x-hidden box-border" style={{ maxWidth: '100%' }}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <ScrollToTop />
    </div>
  )
}
