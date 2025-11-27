import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'

const variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

const reducedVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
}

export function PageTransition({ children }) {
  const prefersReducedMotion = useReducedMotion()
  const motionVariants = prefersReducedMotion ? reducedVariants : variants

  return (
    <motion.main
      variants={motionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="h-full w-full"
    >
      {children}
    </motion.main>
  )
}

