import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

export default function Auth() {
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState(initialMode) // 'login' | 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'SOC Analyst',
    password: '',
    confirmPassword: '',
    remember: true
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const completeAuth = (user) => {
    localStorage.setItem('mailtrace_user', JSON.stringify(user))
    window.dispatchEvent(new Event('auth_change'))
    setSuccessMsg(`Welcome back, ${user.name}! Redirecting...`)
    setTimeout(() => {
      navigate('/')
    }, 900)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (mode === 'signup') {
      if (!formData.name.trim()) {
        setError('Please enter your full name.')
        return
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      completeAuth({
        name: formData.name || formData.email.split('@')[0],
        email: formData.email,
        role: formData.role || 'Security Investigator',
        avatar: (formData.name || formData.email)[0].toUpperCase(),
        provider: 'email',
        loginTime: new Date().toISOString()
      })
    }, 600)
  }

  const handleGoogleLogin = () => {
    setError(null)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      completeAuth({
        name: 'Gowsikan Security Lead',
        email: 'gowsikan.sec@gmail.com',
        role: 'Chief Security Officer',
        avatar: 'G',
        provider: 'google',
        loginTime: new Date().toISOString()
      })
    }, 700)
  }

  const handleDemoLogin = (roleName, demoEmail) => {
    setError(null)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      completeAuth({
        name: roleName,
        email: demoEmail,
        role: roleName,
        avatar: roleName[0],
        provider: 'demo',
        loginTime: new Date().toISOString()
      })
    }, 400)
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '1.5rem auto 3rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.85rem' }}>
          <Logo size={46} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
          {mode === 'login' ? 'Welcome to MailTrace AI' : 'Create Security Account'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {mode === 'login'
            ? 'Sign in to access real-time email threat monitoring & forensics'
            : 'Join the automated email threat investigation network'}
        </p>
      </div>

      {/* Main Form Card */}
      <div className="card" style={{ width: '100%', padding: '2rem', borderRadius: 'var(--card-radius)' }}>
        {/* Toggle Mode Pills */}
        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null) }}
          >
            🔒 Sign In
          </button>
          <button
            type="button"
            className={`tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null) }}
          >
            ✨ Sign Up
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: '#ffe4e6',
            border: '1px solid rgba(225, 29, 72, 0.3)',
            borderRadius: '8px',
            color: 'var(--critical)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            background: '#d1fae5',
            border: '1px solid rgba(5, 150, 105, 0.3)',
            borderRadius: '8px',
            color: 'var(--safe)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Alex Henderson"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel2)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
              Work Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@company.com"
              required
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--panel2)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
                Organization Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel2)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="SOC Analyst">SOC Security Analyst</option>
                <option value="Incident Responder">Incident Responder / Forensics</option>
                <option value="Security Admin">IT / Security Administrator</option>
                <option value="End User">Enterprise Staff / General User</option>
              </select>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                Password
              </label>
              {mode === 'login' && (
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to registered email in demo mode.') }} style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                  Forgot password?
                </a>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel2)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-faint)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '4px'
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel2)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {mode === 'login' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
              <input
                type="checkbox"
                id="remember"
                name="remember"
                checked={formData.remember}
                onChange={handleInputChange}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Keep me signed in on this workstation
              </label>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '0.8rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              width: '100%',
              marginTop: '0.4rem',
              borderRadius: '8px'
            }}
          >
            {loading ? 'Authenticating…' : (mode === 'login' ? 'Sign In to MailTrace AI' : 'Create Free Account')}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          margin: '1.5rem 0 1.25rem',
          color: 'var(--text-faint)',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn"
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1' }}
        >
          {/* Official Google Vector Multi-Color Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* 1-Click Quick Demo Access */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.5px', marginBottom: '0.65rem', textAlign: 'center' }}>
            ⚡ 1-Click Demo Evaluation Profiles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleDemoLogin('SOC Analyst', 'soc.analyst@cyberdefense.in')}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--panel2)',
                color: 'var(--text)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🛡️ SOC Analyst
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('Security Admin', 'admin@mailtrace.ai')}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--panel2)',
                color: 'var(--text)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              👑 Security Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
