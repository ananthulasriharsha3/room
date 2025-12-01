import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'
import { FaMoon, FaSun } from 'react-icons/fa'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Navigate to dashboard when user is set (after successful login)
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })
      
      const { access_token, user } = response.data
      login(access_token, user)
      // Navigation will happen automatically via useEffect when user state updates
      // Don't set loading to false here - let the redirect happen
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen dark:bg-dark-bg light:bg-light-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg dark:bg-dark-card light:bg-light-card dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
            </button>
          </div>
          <h1 className="text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Room Duty</h1>
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Sign in to your account</p>
        </div>

        <div className="dark:bg-gradient-to-br dark:from-dark-surface dark:via-dark-card dark:to-dark-surface light:bg-gradient-to-br light:from-light-surface light:via-light-card light:to-light-surface border-2 dark:border-accent-blue/30 light:border-accent-blue/20 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                data-theme={theme}
                className={`w-full px-4 py-3 border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text placeholder:dark:text-dark-text-tertiary placeholder:light:text-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50 transition-all ${theme === 'dark' ? 'email-dark-bg' : 'email-light-bg'}`}
                placeholder="you@example.com"
                style={{
                  backgroundColor: theme === 'dark' ? '#252550' : '#f8faff',
                  color: theme === 'dark' ? '#ffffff' : '#1e293b',
                  WebkitTextFillColor: theme === 'dark' ? '#ffffff' : '#1e293b',
                  borderColor: theme === 'dark' ? '#3a3a6a' : '#e0e7ff'
                }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text placeholder:dark:text-dark-text-tertiary placeholder:light:text-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50 transition-all"
                placeholder="••••••••"
                style={{
                  ...(theme === 'dark' && { backgroundColor: '#1F2937' }),
                  color: 'inherit',
                  WebkitTextFillColor: 'inherit'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-accent-sky via-accent-blue to-accent-indigo text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-sky/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="dark:text-dark-text light:text-light-text font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
