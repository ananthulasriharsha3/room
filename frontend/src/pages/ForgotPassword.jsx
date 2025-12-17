import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestPasswordReset, resetPasswordWithToken } from '../utils/passwordReset'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResetToken('')
    setShowResetForm(false)
    setLoading(true)

    try {
      const result = await requestPasswordReset(email)
      
      // Get the reset token from the result
      if (result.resetToken) {
        setResetToken(result.resetToken)
        setShowResetForm(true)
        setSuccess('Email verified. Please enter your new password below.')
      } else {
        setError('Failed to generate reset token. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to verify email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!resetToken) {
      setError('Reset token is missing. Please start over.')
      setShowResetForm(false)
      return
    }

    setLoading(true)
    setError('') // Clear any previous errors

    try {
      console.log('Resetting password with token:', resetToken ? 'token exists' : 'no token')
      const result = await resetPasswordWithToken(resetToken, newPassword)
      console.log('Password reset result:', result)
      setSuccess('Password has been reset successfully! Redirecting to login...')
      setError('')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err.message || 'Failed to reset password. Please try again.')
      setSuccess('')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden flex items-center justify-center p-4 relative z-10" style={{ height: '100vh', width: '100vw' }}>
      {/* GIF Background */}
      <img 
        src="/stranger things netflix GIF.gif"
        alt=""
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -1,
          pointerEvents: 'none',
          display: 'block'
        }}
      />
      {/* Overlay for readability */}
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
      
      <div className="w-full max-w-md relative z-10 overflow-y-auto max-h-[calc(100vh-2rem)]" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Forgot Password</h1>
          <p className="text-white/80">
            {showResetForm ? 'Enter your new password' : 'Enter your email to reset password'}
          </p>
        </div>

        <div className="bg-transparent/10 backdrop-blur-sm border-2 border-white/15 rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
          {!showResetForm ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500 dark:text-green-300 light:text-green-600 px-4 py-3 rounded-xl text-sm">
                  {success}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-transparent/10 backdrop-blur-sm border border-white/15 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-all"
                  placeholder="you@example.com"
                  style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-stranger w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Verifying...' : 'Show Reset Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {success && !success.includes('Redirecting') && (
                <div className="bg-green-500/10 border border-green-500 dark:text-green-300 light:text-green-600 px-4 py-3 rounded-xl text-sm">
                  {success}
                </div>
              )}

              {success && success.includes('Redirecting') && (
                <div className="bg-green-500/10 border border-green-500 dark:text-green-300 light:text-green-600 px-4 py-3 rounded-xl text-sm">
                  {success}
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-white/90 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-transparent/10 backdrop-blur-sm border border-white/15 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-all"
                  placeholder="••••••••"
                  style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                />
                <p className="mt-1 text-xs text-white/60">Must be at least 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-transparent/10 backdrop-blur-sm border border-white/15 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-all"
                  placeholder="••••••••"
                  style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !resetToken}
                className="btn-stranger w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={(e) => {
                  if (!resetToken) {
                    e.preventDefault()
                    setError('Reset token is missing. Please start over.')
                    setShowResetForm(false)
                  }
                }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResetForm(false)
                  setResetToken('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setError('')
                  setSuccess('')
                }}
                className="w-full py-2 text-sm text-white/70 hover:text-white underline"
              >
                Use different email
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            <p className="text-white/80 text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-white font-semibold hover:underline">
                Sign in
              </Link>
            </p>
            <p className="text-white/80 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-white font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

