import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function AnimatedCard({ 
  children, 
  className = '', 
  delay = 0,
  ...props 
}) {
  const prefersReducedMotion = useReducedMotion()

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
      className={`rounded-xl dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border shadow-sm p-4 transition-shadow hover:shadow-md ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

