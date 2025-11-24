import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'
import { FaMoon, FaSun } from 'react-icons/fa'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        display_name: displayName,
      })
      
      const { access_token, user } = response.data
      login(access_token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
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
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Create your account</p>
        </div>

        <div className="dark:bg-gradient-to-br dark:from-dark-surface dark:via-dark-card dark:to-dark-surface light:bg-gradient-to-br light:from-light-surface light:via-light-card light:to-light-surface border-2 dark:border-accent-purple/30 light:border-accent-purple/20 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={1}
                maxLength={100}
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text placeholder:dark:text-dark-text-tertiary placeholder:light:text-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple/50 transition-all"
                placeholder="Your name"
              />
            </div>

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
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text placeholder:dark:text-dark-text-tertiary placeholder:light:text-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple/50 transition-all"
                placeholder="you@example.com"
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
                minLength={6}
                maxLength={128}
                className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text placeholder:dark:text-dark-text-tertiary placeholder:light:text-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple/50 transition-all"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-accent-violet via-accent-fuchsia to-accent-rose text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-violet/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-sm">
              Already have an account?{' '}
              <Link to="/login" className="dark:text-dark-text light:text-light-text font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
