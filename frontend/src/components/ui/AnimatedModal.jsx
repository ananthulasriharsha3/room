import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FaTimes } from 'react-icons/fa'

export function AnimatedModal({ isOpen, onClose, children, title, className = '' }) {
  const prefersReducedMotion = useReducedMotion()

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      // Prevent scrolling on body
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scrolling when modal closes
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[90vh] dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {title && (
                <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3 flex-shrink-0 border-b dark:border-dark-border light:border-light-border">
                  <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold dark:text-dark-text light:text-light-text pr-2">
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-1.5 sm:p-2 rounded-lg dark:bg-dark-card light:bg-light-card dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity flex-shrink-0"
                    aria-label="Close"
                  >
                    <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
              <div 
                className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 p-3 sm:p-4 lg:p-6"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  scrollbarWidth: 'thin'
                }}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

