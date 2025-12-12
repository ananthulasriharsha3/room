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
  FaBars,
  FaTimes
} from 'react-icons/fa'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
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

  const isDashboard = location.pathname === '/dashboard'
  const isSchedule = location.pathname === '/schedule'
  const isExpenses = location.pathname === '/expenses'
  const isShopping = location.pathname === '/shopping'
  const isNotes = location.pathname === '/notes'
  const isStock = location.pathname === '/stock'
  const isGrocery = location.pathname === '/grocery'
  const isAdmin = location.pathname === '/admin'
  const hasGifBackground = isDashboard || isSchedule || isExpenses || isShopping || isNotes || isStock || isGrocery || isAdmin
  
  useEffect(() => {
    if (hasGifBackground) {
      // Hide body pseudo-elements that might cover the background
      const style = document.createElement('style')
      style.id = 'gif-bg-override'
      style.textContent = `
        body::before,
        body::after {
          display: none !important;
        }
        body {
          background: transparent !important;
        }
      `
      document.head.appendChild(style)
      
      // Test if image loads
      let gifPath = '/Season 2 Netflix GIF.gif'
      if (isSchedule) {
        gifPath = '/Season 4 GIF by Stranger Things.gif'
      } else if (isExpenses) {
        gifPath = '/Running Away Stranger Things GIF by NETFLIX.gif'
      } else if (isShopping) {
        gifPath = '/download.gif'
      } else if (isNotes) {
        gifPath = '/Season 3 Netflix GIF by Stranger Things.gif'
      } else if (isStock || isGrocery || isAdmin) {
        gifPath = '/Season 2 Netflix GIF.gif'
      }
      const testImg = new Image()
      testImg.onload = () => console.log(`GIF loaded successfully: ${gifPath}`)
      testImg.onerror = () => console.error(`GIF failed to load from ${gifPath}`)
      testImg.src = gifPath
      
      return () => {
        const existingStyle = document.getElementById('gif-bg-override')
        if (existingStyle) {
          existingStyle.remove()
        }
      }
    }
  }, [hasGifBackground, isDashboard, isSchedule, isExpenses, isShopping, isNotes, isStock, isGrocery, isAdmin])
  
  return (
    <div 
      className={`h-screen flex flex-col w-full max-w-full overflow-x-hidden ${hasGifBackground ? '' : 'bg-stranger-bg'}`}
      style={hasGifBackground ? {} : {}}
    >
      {hasGifBackground && (
        <>
          {/* Fixed background GIF using img element */}
          <img 
            src={
              isDashboard ? "/Season 2 Netflix GIF.gif" 
              : isSchedule ? "/Season 4 GIF by Stranger Things.gif"
              : isExpenses ? "/Running Away Stranger Things GIF by NETFLIX.gif"
              : isShopping ? "/download.gif"
              : isNotes ? "/Season 3 Netflix GIF by Stranger Things.gif"
              : isStock || isGrocery || isAdmin ? "/Season 2 Netflix GIF.gif"
              : "/Season 2 Netflix GIF.gif"
            }
            alt=""
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              objectFit: 'cover',
              zIndex: -1,
              pointerEvents: 'none',
              display: 'block'
            }}
          />
          {/* Overlay for readability - very light */}
          <div 
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        </>
      )}
      {/* Top Navigation Bar */}
      <motion.nav 
        className={`w-full sticky top-0 z-[60] transition-all duration-300 shadow-lg py-3 sm:py-4 ${
          hasGifBackground 
            ? 'bg-transparent border-b border-transparent' 
            : 'bg-stranger-surface border-b border-stranger-border'
        }`}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden p-2 rounded-lg border text-stranger-text hover:border-stranger-red hover:neon-red transition-all z-[70] relative ${
                hasGifBackground 
                  ? 'bg-transparent/20 border-stranger-border/50 backdrop-blur-sm' 
                  : 'bg-stranger-surface border-stranger-border'
              }`}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold title-stranger">Room Duty</h1>
              <p className="text-xs text-stranger-text-secondary hidden sm:block">Scheduler</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className={`hidden sm:flex items-center space-x-3 px-3 sm:px-4 py-2 border rounded-xl card-stranger ${
              hasGifBackground 
                ? 'bg-transparent/10 border-white/15 backdrop-blur-sm' 
                : 'bg-stranger-surface border-stranger-border'
            }`}
            style={hasGifBackground ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-stranger-text">{user?.display_name}</p>
                <p className="text-xs text-stranger-text-secondary truncate max-w-[150px] lg:max-w-[200px]">{user?.email}</p>
              </div>
              {user?.is_admin && (
                <span className="px-2 py-1 text-xs bg-stranger-red text-white rounded-lg font-semibold whitespace-nowrap neon-red">
                  Admin
                </span>
              )}
            </div>
            
            {/* Mobile user info */}
            <div className="sm:hidden flex items-center space-x-2">
              {user?.is_admin && (
                <span className="px-2 py-1 text-xs bg-stranger-red text-white rounded-lg font-semibold neon-red">
                  Admin
                </span>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className="btn-stranger px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap min-w-fit"
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
            className="fixed inset-0 bg-black/60 z-[45] lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static left-0 z-[55]
          top-[80px] lg:top-0 h-[calc(100vh-80px)] lg:h-auto
          w-64 sm:w-64 ${hasGifBackground ? 'bg-transparent/20 backdrop-blur-sm' : 'bg-stranger-surface'}
          border-r border-stranger-border 
          flex flex-col shadow-2xl
          transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-0 lg:pt-0
          overflow-y-auto overflow-x-hidden
          -webkit-overflow-scrolling-touch
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
                    className={`flex items-center space-x-3 px-4 py-3 rounded transition-all duration-200 w-full ${
                      location.pathname === '/dashboard'
                        ? 'bg-stranger-red text-white font-semibold neon-red'
                        : 'bg-stranger-surface border border-stranger-border text-stranger-text hover:border-stranger-red hover:neon-red'
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
                    className={`flex items-center space-x-3 px-4 py-3 rounded transition-all duration-200 w-full ${
                      isActive
                        ? 'bg-stranger-red text-white font-semibold neon-red'
                        : 'text-stranger-text hover:bg-stranger-surface hover:border hover:border-stranger-red hover:neon-red hover:translate-x-1'
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 max-w-full min-h-0 relative" style={{ zIndex: 10 }}>
          <div className="p-4 sm:p-6 lg:p-8 mx-auto w-full box-border pb-8 relative" style={{ maxWidth: 'min(100%, 1280px)', zIndex: 10 }}>
            <Outlet />
          </div>
        </main>
      </div>
      <ScrollToTop />
    </div>
  )
}
