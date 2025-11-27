import { memo } from 'react'
import { motion } from 'framer-motion'
import { FaStickyNote } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

function NoteFloatingWidget({ date, note, onClick }) {
  const navigate = useNavigate()

  const handleClick = (e) => {
    e.stopPropagation()
    if (onClick) {
      onClick(date)
    } else {
      navigate(`/notes?date=${date}`)
    }
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      className="absolute top-2 right-2 z-10 cursor-pointer"
      onClick={handleClick}
    >
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="bg-gradient-to-br from-accent-amber via-accent-yellow to-accent-orange rounded-full p-2 sm:p-2.5 shadow-lg hover:shadow-xl transition-shadow relative">
          <FaStickyNote className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        </div>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-gradient-to-br from-accent-amber via-accent-yellow to-accent-orange rounded-full blur-sm"
        />
      </motion.div>
    </motion.div>
  )
}

export default memo(NoteFloatingWidget)

