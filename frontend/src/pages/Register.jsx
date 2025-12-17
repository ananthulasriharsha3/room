import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { registerUser } from '../utils/auth'
export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  // Navigate to dashboard when user is set (after successful registration)
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
      const response = await registerUser(email, password, displayName)
      const { access_token, user } = response
      login(access_token, user)
      // Navigation will happen automatically via useEffect when user state updates
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  useEffect(() => {
    // Prevent body scrolling on register page and hide scrollbar
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Hide veins layer and other theme effects
    const veinsLayer = document.getElementById('veins-layer');
    if (veinsLayer) veinsLayer.style.display = 'none';
    const abyssBg = document.getElementById('abyss-bg');
    if (abyssBg) abyssBg.style.display = 'none';
    const spores = document.getElementById('spores-container');
    if (spores) spores.style.display = 'none';
    const ash = document.getElementById('ash-container');
    if (ash) ash.style.display = 'none';
    const fogs = document.querySelectorAll('.fog-layer');
    fogs.forEach(fog => fog.style.display = 'none');
    
    // Remove shake classes immediately and continuously
    const removeShakeClasses = () => {
      document.body.classList.remove('camera-shake', 'frame-jitter', 'rgb-shift');
      document.documentElement.classList.remove('camera-shake', 'frame-jitter', 'rgb-shift');
      document.body.style.transform = 'translate3d(0, 0, 0)';
      document.documentElement.style.transform = 'translate3d(0, 0, 0)';
    };
    removeShakeClasses();
    
    // Monitor and remove shake classes continuously
    const shakeMonitor = setInterval(removeShakeClasses, 100);
    
    // Hide scrollbar, prevent shaking, and hide body pseudo-elements for GIF background
    const style = document.createElement('style');
    style.textContent = `
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      body::-webkit-scrollbar { display: none !important; }
      body { -ms-overflow-style: none !important; scrollbar-width: none !important; background: transparent !important; overflow: hidden !important; }
      html::-webkit-scrollbar { display: none !important; }
      html { -ms-overflow-style: none !important; scrollbar-width: none !important; overflow: hidden !important; }
      #veins-layer, .veins-layer, .vein { display: none !important; visibility: hidden !important; }
      body, html { transform: translate3d(0, 0, 0) !important; animation: none !important; }
      body.camera-shake, body.frame-jitter, body.rgb-shift { transform: translate3d(0, 0, 0) !important; animation: none !important; }
      body::before, body::after { display: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      clearInterval(shakeMonitor);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      style.remove();
    };
  }, []);

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
          <h1 className="text-4xl font-bold text-white mb-2">Room Duty</h1>
          <p className="text-white/80">Create your account</p>
        </div>

        <div className="bg-transparent/10 backdrop-blur-sm border-2 border-white/15 rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-white/90 mb-2">
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
                autoComplete="name"
                className="w-full px-4 py-3 bg-transparent/10 backdrop-blur-sm border border-white/15 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-all"
                placeholder="Your name"
                style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
              />
            </div>

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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
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
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-transparent/10 backdrop-blur-sm border border-white/15 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-all"
                placeholder="••••••••"
                style={{ background: '#000000', borderColor: 'rgba(255, 255, 255, 0.15)' }}
              />
              <p className="mt-1 text-xs text-white/60">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-stranger w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
