import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPasswordWithToken, verifyResetToken } from '../utils/passwordReset'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Verify token on mount
    if (token) {
      verifyResetToken(token)
        .then(() => {
          setTokenValid(true)
        })
        .catch((err) => {
          setTokenValid(false)
          setError(err.message || 'Invalid or expired reset token.')
        })
    } else {
      setTokenValid(false)
      setError('Reset token is missing. Please request a new password reset.')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await resetPasswordWithToken(token, password)
      setSuccess('Password has been reset successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="fixed inset-0 h-screen w-screen overflow-hidden flex items-center justify-center p-4 relative z-10">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-4 text-sm text-white">Verifying reset token...</p>
        </div>
      </div>
    )
  }

  if (tokenValid === false) {
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
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-transparent/10 backdrop-blur-sm border-2 border-red-500/50 rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 0, 0, 0.5)' }}>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">Invalid Reset Link</h1>
              <p className="text-white/80 mb-6">{error || 'This reset link is invalid or has expired.'}</p>
              <Link 
                to="/forgot-password" 
                className="btn-stranger inline-block px-6 py-3"
              >
                Request New Reset Link
              </Link>
              <p className="mt-4 text-white/80 text-sm">
                <Link to="/login" className="text-white font-semibold hover:underline">
                  Back to Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-4xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-white/80">Enter your new password</p>
        </div>

        <div className="bg-transparent/10 backdrop-blur-sm border-2 border-white/15 rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading || success}
              className="btn-stranger w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Resetting...' : success ? 'Password Reset!' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              <Link to="/login" className="text-white font-semibold hover:underline">
                Back to Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

