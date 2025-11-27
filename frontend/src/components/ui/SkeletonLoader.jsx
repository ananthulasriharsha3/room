import { motion } from 'framer-motion'

export function SkeletonLoader({ className = '', count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <>
      {items.map((index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`rounded-xl dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border p-4 ${className}`}
        >
          <div className="animate-pulse space-y-3">
            <div className="h-4 dark:bg-dark-border light:bg-light-border rounded w-3/4"></div>
            <div className="h-4 dark:bg-dark-border light:bg-light-border rounded w-1/2"></div>
            <div className="h-4 dark:bg-dark-border light:bg-light-border rounded w-5/6"></div>
          </div>
        </motion.div>
      ))}
    </>
  )
}

