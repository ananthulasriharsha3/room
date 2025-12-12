import { useTheme } from '../contexts/ThemeContext'
import { FaMoon, FaSun } from 'react-icons/fa'

export function UpsideDownToggle() {
  const { upsideDown, toggleUpsideDown } = useTheme()

  return (
    <button
      onClick={toggleUpsideDown}
      className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-stranger-surface border border-stranger-border text-stranger-text hover:border-stranger-blue hover:neon-blue transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-stranger-blue focus:ring-offset-2 focus:ring-offset-stranger-bg"
      title={upsideDown ? "Exit Upside Down" : "Enter Upside Down"}
      aria-label={upsideDown ? "Exit Upside Down mode" : "Enter Upside Down mode"}
    >
      <div className="relative w-6 h-6">
        {upsideDown ? (
          <FaSun className="w-full h-full text-stranger-blue animate-pulse" />
        ) : (
          <FaMoon className="w-full h-full text-stranger-red" />
        )}
      </div>
      {upsideDown && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-stranger-blue rounded-full animate-ping"></span>
      )}
    </button>
  )
}

