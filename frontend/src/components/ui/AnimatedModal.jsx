import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FaTimes } from 'react-icons/fa'

export function AnimatedModal({ isOpen, onClose, children, title, className = '' }) {
  const prefersReducedMotion = useReducedMotion()

  const backdropVariants = prefersReducedMotion
    ? { opacity: 1 }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }

  const modalVariants = prefersReducedMotion
    ? { scale: 1, opacity: 1 }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 dark:bg-black/60 light:bg-black/70 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg dark:bg-dark-card light:bg-light-card dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity"
                  aria-label="Close"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

