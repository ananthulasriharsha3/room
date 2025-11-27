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

  const baseClasses = "inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"

  const variants = {
    primary: "bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white hover:from-accent-violet hover:via-accent-fuchsia hover:to-accent-indigo focus-visible:ring-accent-indigo",
    secondary: "dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border dark:text-dark-text light:text-light-text hover:opacity-90 focus-visible:ring-accent-violet",
    success: "bg-gradient-to-r from-accent-emerald via-accent-teal to-accent-cyan text-white hover:from-accent-teal hover:via-accent-cyan hover:to-accent-emerald focus-visible:ring-accent-emerald",
    danger: "bg-gradient-to-r from-accent-red to-accent-rose text-white hover:from-accent-rose hover:to-accent-red focus-visible:ring-accent-red",
  }

  const hoverScale = prefersReducedMotion ? 1 : 1.02
  const tapScale = prefersReducedMotion ? 1 : 0.97

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: hoverScale, boxShadow: "0 4px 12px rgba(94, 58, 255, 0.3)" }}
      whileTap={disabled ? {} : { scale: tapScale }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  )
}

