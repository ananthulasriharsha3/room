import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

// Color scheme definitions
export const colorSchemes = {
  default: {
    name: 'Stranger Things',
    primary: '#E50914',      // Primary Red (Stranger Things)
    secondary: '#B1060F',    // Deep Blood Red
    accent: '#3A8DFF',       // Accent Neon Blue (upside-down glow)
    gradient: 'from-accent-indigo via-accent-violet to-accent-fuchsia',
  },
  ocean: {
    name: 'Ocean',
    primary: '#0066ff',      // Electric blue
    secondary: '#00d4ff',    // Cyan
    accent: '#00ffcc',       // Bright teal
    gradient: 'from-accent-blue via-accent-cyan to-accent-teal',
  },
  sunset: {
    name: 'Sunset',
    primary: '#ff6b35',      // Vibrant orange
    secondary: '#ffb800',    // Bold amber
    accent: '#ff1744',       // Bold red
    gradient: 'from-accent-orange via-accent-amber to-accent-red',
  },
  forest: {
    name: 'Forest',
    primary: '#00ff88',      // Neon green
    secondary: '#00ffcc',    // Bright teal
    accent: '#06ffa5',       // Mint green
    gradient: 'from-accent-green via-accent-emerald to-accent-teal',
  },
}

export function ThemeProvider({ children }) {
  // Always use dark mode - no theme switching
  const [theme, setTheme] = useState('dark')

  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem('colorScheme')
    return saved || 'default'
  })

  const [upsideDown, setUpsideDown] = useState(() => {
    const saved = localStorage.getItem('upsideDown')
    return saved === 'true'
  })

  useEffect(() => {
    // Force dark mode always
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
  }, [theme])

  useEffect(() => {
    localStorage.setItem('upsideDown', upsideDown.toString())
    if (upsideDown) {
      document.documentElement.classList.add('upside-down')
    } else {
      document.documentElement.classList.remove('upside-down')
    }
  }, [upsideDown])

  const toggleUpsideDown = () => {
    setUpsideDown(prev => !prev)
  }

  // Function to apply color scheme to CSS variables
  const applyColorSchemeToCSS = (scheme) => {
    const root = document.documentElement
    
    // Method 1: Set on root element directly
    root.style.setProperty('--theme-primary', scheme.primary)
    root.style.setProperty('--theme-secondary', scheme.secondary)
    root.style.setProperty('--theme-accent', scheme.accent)
    
    // Method 2: Also set via style tag for better compatibility and override Tailwind classes
    let styleTag = document.getElementById('theme-variables')
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = 'theme-variables'
      document.head.appendChild(styleTag)
    }
    
    // Helper function to convert hex to rgba
    const hexToRgba = (hex, alpha = 1) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      if (!result) return hex
      const r = parseInt(result[1], 16)
      const g = parseInt(result[2], 16)
      const b = parseInt(result[3], 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    
    styleTag.textContent = `
      :root {
        --theme-primary: ${scheme.primary};
        --theme-secondary: ${scheme.secondary};
        --theme-accent: ${scheme.accent};
      }
      html {
        --theme-primary: ${scheme.primary};
        --theme-secondary: ${scheme.secondary};
        --theme-accent: ${scheme.accent};
      }
      
      /* ===== COMPREHENSIVE GRADIENT OVERRIDES ===== */
      /* Override ALL gradient combinations - any direction with accent colors */
      [class*="from-accent-indigo"][class*="via-accent-violet"][class*="to-accent-fuchsia"],
      [class*="from-accent-indigo"][class*="to-accent-fuchsia"] {
        --tw-gradient-from: ${scheme.primary} !important;
        --tw-gradient-to: ${scheme.accent} !important;
        --tw-gradient-stops: var(--tw-gradient-from), ${scheme.secondary}, var(--tw-gradient-to) !important;
      }
      
      /* Specific gradient directions */
      [class*="bg-gradient-to-r"][class*="from-accent-indigo"][class*="via-accent-violet"][class*="to-accent-fuchsia"],
      [class*="bg-gradient-to-r"][class*="from-accent-indigo"][class*="to-accent-fuchsia"] {
        background-image: linear-gradient(to right, ${scheme.primary}, ${scheme.secondary}, ${scheme.accent}) !important;
      }
      [class*="bg-gradient-to-br"][class*="from-accent-indigo"][class*="via-accent-violet"][class*="to-accent-fuchsia"],
      [class*="bg-gradient-to-br"][class*="from-accent-indigo"][class*="to-accent-fuchsia"] {
        background-image: linear-gradient(to bottom right, ${scheme.primary}, ${scheme.secondary}, ${scheme.accent}) !important;
      }
      [class*="bg-gradient-to-b"][class*="from-accent-indigo"][class*="via-accent-violet"][class*="to-accent-fuchsia"],
      [class*="bg-gradient-to-b"][class*="from-accent-indigo"][class*="to-accent-fuchsia"] {
        background-image: linear-gradient(to bottom, ${scheme.primary}, ${scheme.secondary}, ${scheme.accent}) !important;
      }
      [class*="bg-gradient-to-l"][class*="from-accent-indigo"][class*="via-accent-violet"][class*="to-accent-fuchsia"],
      [class*="bg-gradient-to-l"][class*="from-accent-indigo"][class*="to-accent-fuchsia"] {
        background-image: linear-gradient(to left, ${scheme.primary}, ${scheme.secondary}, ${scheme.accent}) !important;
      }
      [class*="bg-gradient-to-t"][class*="from-accent-indigo"][class*="via-accent-violet"][class*="to-accent-fuchsia"],
      [class*="bg-gradient-to-t"][class*="from-accent-indigo"][class*="to-accent-fuchsia"] {
        background-image: linear-gradient(to top, ${scheme.primary}, ${scheme.secondary}, ${scheme.accent}) !important;
      }
      
      /* Individual gradient color overrides */
      [class*="from-accent-indigo"] {
        --tw-gradient-from: ${scheme.primary} !important;
      }
      [class*="via-accent-violet"] {
        --tw-gradient-stops: var(--tw-gradient-from), ${scheme.secondary}, var(--tw-gradient-to) !important;
      }
      [class*="to-accent-fuchsia"] {
        --tw-gradient-to: ${scheme.accent} !important;
      }
      
      /* ===== BACKGROUND COLORS ===== */
      [class*="bg-accent-indigo"],
      [class*="bg-accent-indigo"]:hover {
        background-color: ${scheme.primary} !important;
      }
      [class*="bg-accent-violet"],
      [class*="bg-accent-violet"]:hover {
        background-color: ${scheme.secondary} !important;
      }
      [class*="bg-accent-fuchsia"],
      [class*="bg-accent-fuchsia"]:hover {
        background-color: ${scheme.accent} !important;
      }
      
      /* Background with opacity variants */
      [class*="bg-accent-indigo\\/40"],
      [class*="bg-accent-indigo\\/50"],
      [class*="bg-accent-indigo\\/60"],
      [class*="bg-accent-indigo\\/70"] {
        background-color: ${hexToRgba(scheme.primary, 0.4)} !important;
      }
      [class*="bg-accent-violet\\/40"],
      [class*="bg-accent-violet\\/50"],
      [class*="bg-accent-violet\\/60"],
      [class*="bg-accent-violet\\/70"] {
        background-color: ${hexToRgba(scheme.secondary, 0.4)} !important;
      }
      [class*="bg-accent-fuchsia\\/40"],
      [class*="bg-accent-fuchsia\\/50"],
      [class*="bg-accent-fuchsia\\/60"],
      [class*="bg-accent-fuchsia\\/70"] {
        background-color: ${hexToRgba(scheme.accent, 0.4)} !important;
      }
      
      /* ===== TEXT COLORS ===== */
      [class*="text-accent-indigo"],
      [class*="text-accent-indigo"]:hover {
        color: ${scheme.primary} !important;
      }
      [class*="text-accent-violet"],
      [class*="text-accent-violet"]:hover {
        color: ${scheme.secondary} !important;
      }
      [class*="text-accent-fuchsia"],
      [class*="text-accent-fuchsia"]:hover {
        color: ${scheme.accent} !important;
      }
      
      /* Text gradients (bg-clip-text) */
      [class*="bg-clip-text"][class*="from-accent-indigo"][class*="to-accent-violet"],
      [class*="bg-clip-text"][class*="from-accent-indigo"][class*="via-accent-violet"][class*="to-accent-fuchsia"] {
        background-image: linear-gradient(to right, ${scheme.primary}, ${scheme.secondary}, ${scheme.accent}) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }
      
      /* ===== BORDER COLORS ===== */
      [class*="border-accent-indigo"],
      [class*="border-accent-indigo"]:hover {
        border-color: ${scheme.primary} !important;
      }
      [class*="border-accent-violet"],
      [class*="border-accent-violet"]:hover {
        border-color: ${scheme.secondary} !important;
      }
      [class*="border-accent-fuchsia"],
      [class*="border-accent-fuchsia"]:hover {
        border-color: ${scheme.accent} !important;
      }
      
      /* Border with opacity */
      [class*="border-accent-indigo\\/60"],
      [class*="border-accent-indigo\\/70"] {
        border-color: ${hexToRgba(scheme.primary, 0.6)} !important;
      }
      [class*="border-accent-violet\\/60"],
      [class*="border-accent-violet\\/70"] {
        border-color: ${hexToRgba(scheme.secondary, 0.6)} !important;
      }
      [class*="border-accent-fuchsia\\/60"],
      [class*="border-accent-fuchsia\\/70"] {
        border-color: ${hexToRgba(scheme.accent, 0.6)} !important;
      }
      
      /* ===== SHADOW COLORS ===== */
      [class*="shadow-accent-indigo"],
      [class*="shadow-accent-indigo\\/30"] {
        --tw-shadow-color: ${hexToRgba(scheme.primary, 0.3)} !important;
        --tw-shadow: var(--tw-shadow-colored) !important;
        box-shadow: var(--tw-shadow) !important;
      }
      [class*="shadow-accent-violet"],
      [class*="shadow-accent-violet\\/30"] {
        --tw-shadow-color: ${hexToRgba(scheme.secondary, 0.3)} !important;
        --tw-shadow: var(--tw-shadow-colored) !important;
        box-shadow: var(--tw-shadow) !important;
      }
      [class*="shadow-accent-fuchsia"],
      [class*="shadow-accent-fuchsia\\/30"] {
        --tw-shadow-color: ${hexToRgba(scheme.accent, 0.3)} !important;
        --tw-shadow: var(--tw-shadow-colored) !important;
        box-shadow: var(--tw-shadow) !important;
      }
      
      /* ===== RING COLORS (focus rings) ===== */
      [class*="ring-accent-indigo"],
      [class*="ring-accent-indigo"]:focus {
        --tw-ring-color: ${scheme.primary} !important;
      }
      [class*="ring-accent-violet"],
      [class*="ring-accent-violet"]:focus {
        --tw-ring-color: ${scheme.secondary} !important;
      }
      [class*="ring-accent-fuchsia"],
      [class*="ring-accent-fuchsia"]:focus {
        --tw-ring-color: ${scheme.accent} !important;
      }
      
      /* ===== HOVER STATES ===== */
      [class*="hover:from-accent-indigo"],
      [class*="hover:from-accent-violet"],
      [class*="hover:from-accent-fuchsia"] {
        --tw-gradient-from: ${scheme.primary} !important;
      }
      [class*="hover:via-accent-violet"] {
        --tw-gradient-stops: var(--tw-gradient-from), ${scheme.secondary}, var(--tw-gradient-to) !important;
      }
      [class*="hover:to-accent-fuchsia"] {
        --tw-gradient-to: ${scheme.accent} !important;
      }
    `
    
    // Add data attribute to track theme changes and force re-render
    const timestamp = Date.now()
    root.setAttribute('data-theme-colors', `${scheme.primary}-${scheme.secondary}-${scheme.accent}`)
    root.setAttribute('data-theme-updated', timestamp.toString())
    
    // Force style recalculation by toggling a class
    root.classList.add('theme-updating')
    requestAnimationFrame(() => {
      root.classList.remove('theme-updating')
    })
    
    // Debug: Log the applied colors and verify
    const computedPrimary = getComputedStyle(root).getPropertyValue('--theme-primary').trim()
    const computedSecondary = getComputedStyle(root).getPropertyValue('--theme-secondary').trim()
    const computedAccent = getComputedStyle(root).getPropertyValue('--theme-accent').trim()
    
    console.log('Theme applied:', {
      primary: scheme.primary,
      secondary: scheme.secondary,
      accent: scheme.accent,
      cssVars: {
        primary: computedPrimary,
        secondary: computedSecondary,
        accent: computedAccent
      },
      verified: computedPrimary === scheme.primary && computedSecondary === scheme.secondary && computedAccent === scheme.accent
    })
    
    // Verify by checking a test element
    setTimeout(() => {
      const testElement = document.querySelector('[class*="from-accent-indigo"]')
      if (testElement) {
        const computedBg = window.getComputedStyle(testElement).backgroundImage
        console.log('Gradient verification:', {
          element: testElement,
          backgroundImage: computedBg,
          hasCustomGradient: computedBg.includes(scheme.primary) || computedBg.includes('linear-gradient')
        })
      }
    }, 100)
  }

  const toggleTheme = () => {
    // Theme toggle disabled - always dark mode
    // setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const applyColorScheme = (schemeName) => {
    setColorScheme(schemeName)
  }

  const applyCustomTheme = (themeData) => {
    // Store custom theme data
    localStorage.setItem('customTheme', JSON.stringify(themeData))
    localStorage.setItem('colorScheme', 'custom')
    
    // Apply immediately
    applyColorSchemeToCSS(themeData)
    
    // Update state to trigger re-render
    setColorScheme('custom')
  }

  // Force dark mode on mount
  useEffect(() => {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  }, [])

  // Initialize and apply color scheme on mount and when colorScheme changes
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const applyTheme = () => {
      if (colorScheme === 'custom') {
        const customTheme = localStorage.getItem('customTheme')
        if (customTheme) {
          try {
            const themeData = JSON.parse(customTheme)
            applyColorSchemeToCSS(themeData)
          } catch (error) {
            console.error('Error loading custom theme:', error)
            // Fallback to default
            applyColorSchemeToCSS(colorSchemes.default)
          }
        } else {
          // No custom theme found, use default
          applyColorSchemeToCSS(colorSchemes.default)
        }
      } else {
        // Apply predefined scheme
        const scheme = colorSchemes[colorScheme] || colorSchemes.default
        applyColorSchemeToCSS(scheme)
      }
    }

    // Apply immediately
    applyTheme()
    
    // Also apply on next frame to ensure it takes effect
    requestAnimationFrame(() => {
      applyTheme()
    })
  }, [colorScheme])

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      colorScheme, 
      applyColorScheme,
      applyCustomTheme,
      colorSchemes,
      upsideDown,
      toggleUpsideDown
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

