import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useLocation } from 'react-router-dom'

export function AnimatedCard({ 
  children, 
  className = '', 
  delay = 0,
  ...props 
}) {
  const prefersReducedMotion = useReducedMotion()
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard'
  const isSchedule = location.pathname === '/schedule'
  const isExpenses = location.pathname === '/expenses'
  const hasGifBackground = isDashboard || isSchedule || isExpenses

  const initial = prefersReducedMotion 
    ? { opacity: 1 } 
    : { opacity: 0, y: 12 }
  
  const animate = prefersReducedMotion 
    ? {} 
    : { opacity: 1, y: 0 }
  
  const exit = prefersReducedMotion 
    ? {} 
    : { opacity: 0, y: -8 }

  const hoverEffect = prefersReducedMotion 
    ? {} 
    : { y: -4, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)" }

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
      whileHover={hoverEffect}
      className={`rounded-xl border shadow-sm p-4 transition-shadow hover:shadow-md ${
        hasGifBackground 
          ? 'bg-transparent/20 backdrop-blur-sm border-white/20' 
          : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border'
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

