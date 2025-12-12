/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Stranger Things Dark Horror + Neon Red Theme
        'dark-bg': '#0B0B0D',           // Background
        'dark-surface': '#131316',     // Panels / Cards
        'dark-card': '#131316',        // Cards
        'dark-border': '#2A2A2A',      // Borders / Outline
        'dark-text': '#E4E4E4',        // Text Primary
        'dark-text-secondary': '#A0A0A0', // Text Secondary
        'dark-text-tertiary': '#707070',
        'dark-primary': '#E50914',     // Primary Red (Stranger Things)
        'dark-accent': '#B1060F',      // Deep Blood Red
        
        // Light mode - Keep dark theme for Stranger Things vibe
        'light-bg': '#0B0B0D',         // Same as dark
        'light-surface': '#131316',    // Same as dark
        'light-card': '#131316',       // Same as dark
        'light-border': '#2A2A2A',    // Same as dark
        'light-text': '#E4E4E4',       // Same as dark
        'light-text-secondary': '#A0A0A0', // Same as dark
        'light-text-tertiary': '#707070',
        'light-primary': '#E50914',    // Primary Red
        'light-accent': '#B1060F',     // Deep Blood Red
        
        // Stranger Things Accent Colors
        'accent-indigo': 'var(--theme-primary, #E50914)',      // Primary Red
        'accent-violet': 'var(--theme-secondary, #B1060F)',   // Deep Blood Red
        'accent-fuchsia': 'var(--theme-accent, #3A8DFF)',     // Accent Neon Blue
        // Stranger Things Static Accent Colors
        'accent-blue': '#3A8DFF',        // Accent Neon Blue (upside-down glow)
        'accent-purple': '#B1060F',      // Deep Blood Red
        'accent-pink': '#E50914',        // Primary Red
        'accent-cyan': '#3A8DFF',       // Neon Blue
        'accent-green': '#E50914',       // Use red for success
        'accent-amber': '#E50914',       // Use red for warning
        'accent-orange': '#E50914',      // Use red
        'accent-red': '#E50914',         // Primary Red
        'accent-rose': '#B1060F',        // Deep Blood Red
        'accent-teal': '#3A8DFF',        // Neon Blue
        'accent-emerald': '#E50914',     // Use red
        'accent-lime': '#E50914',        // Use red
        'accent-yellow': '#E50914',      // Use red
        'accent-sky': '#3A8DFF',         // Neon Blue
        'stranger-red': '#E50914',       // Primary Red (Stranger Things)
        'stranger-blood': '#B1060F',     // Deep Blood Red
        'stranger-blue': '#3A8DFF',      // Accent Neon Blue
        'success': '#E50914',            // Use red
        'warning': '#E50914',            // Use red
        'error': '#E50914',              // Use red
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'soft-dark': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'medium-dark': '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

