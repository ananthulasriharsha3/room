import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function InAppNotification({ title, body, onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      className="fixed top-4 right-4 z-50 max-w-sm w-full"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 border-2 border-red-600 rounded-lg shadow-2xl p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
            <p className="text-white/90 text-sm whitespace-pre-line">{body}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-white/70 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function useInAppNotifications() {
  const [notifications, setNotifications] = useState([])

  const showNotification = (title, body, duration = 10000) => {
    const id = Date.now()
    const notification = { id, title, body, duration }
    
    setNotifications(prev => [...prev, notification])
    
    return () => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return {
    notifications,
    showNotification,
    removeNotification,
  }
}

