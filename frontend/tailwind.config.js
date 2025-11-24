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
        // Dark mode colors - Rich, deep colors
        'dark-bg': '#0f0f23',
        'dark-surface': '#1a1a3a',
        'dark-card': '#252550',
        'dark-border': '#3a3a6a',
        'dark-text': '#ffffff',
        'dark-text-secondary': '#b8b8d8',
        'dark-text-tertiary': '#8888a8',
        'dark-primary': '#5e3aff', // Deep indigo
        'dark-accent': '#8b2eff', // Electric violet
        
        // Light mode colors - Bright, vibrant colors
        'light-bg': '#f0f4ff',
        'light-surface': '#ffffff',
        'light-card': '#f8faff',
        'light-border': '#e0e7ff',
        'light-text': '#1e293b',
        'light-text-secondary': '#475569',
        'light-text-tertiary': '#94a3b8',
        'light-primary': '#0066ff', // Electric blue
        'light-accent': '#8b2eff', // Electric violet
        
        // Accent colors - Bold, trending, attractive palette
        'accent-blue': '#0066ff',        // Electric blue
        'accent-purple': '#9333ea',      // Vibrant purple
        'accent-pink': '#ff006e',        // Hot pink
        'accent-cyan': '#00d4ff',       // Bright cyan
        'accent-green': '#00ff88',       // Neon green
        'accent-amber': '#ffb800',       // Bold amber
        'accent-orange': '#ff6b35',      // Vibrant orange
        'accent-red': '#ff1744',         // Bold red
        'accent-indigo': '#5e3aff',      // Deep indigo
        'accent-violet': '#8b2eff',      // Electric violet
        'accent-rose': '#ff006e',        // Bold rose
        'accent-teal': '#00ffcc',        // Bright teal
        'accent-emerald': '#00ff88',     // Neon emerald
        'accent-lime': '#aaff00',        // Electric lime
        'accent-yellow': '#ffd700',      // Gold yellow
        'accent-sky': '#00b8ff',         // Bright sky
        'accent-fuchsia': '#ff00ff',     // Magenta fuchsia
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

