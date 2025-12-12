import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function AnimatedButton({ 
  children, 
  className = '', 
  variant = 'primary',
  disabled = false,
  ...props 
}) {
  const prefersReducedMotion = useReducedMotion()

  const baseClasses = "btn-stranger inline-flex items-center justify-center rounded px-4 py-2 font-semibold letter-spacing: 0.05em focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

  const variants = {
    primary: "text-white hover:neon-red-strong focus-visible:ring-stranger-red",
    secondary: "border border-stranger-border text-white hover:border-stranger-red hover:neon-red focus-visible:ring-stranger-red",
    success: "text-white hover:neon-red-strong focus-visible:ring-stranger-red",
    danger: "text-white hover:neon-red-strong focus-visible:ring-stranger-red",
  }

  const hoverScale = prefersReducedMotion ? 1 : 1.05
  const tapScale = prefersReducedMotion ? 1 : 0.98

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: hoverScale }}
      whileTap={disabled ? {} : { scale: tapScale }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  )
}

