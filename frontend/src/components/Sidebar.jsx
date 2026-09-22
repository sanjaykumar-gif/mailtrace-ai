import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { api } from '../services/api.js'
import { useTheme } from '../context/ThemeContext.jsx'
import Logo from './Logo.jsx'

const Icon = ({ d }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const links = [
  { to: '/', label: 'Scan Email', icon: 'M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z' },
  { to: '/dashboard', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { to: '/geotrace', label: 'Origin GeoTrace', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.93V18a2 2 0 0 0-2-2h-1v-2h4a1 1 0 0 0 1-1V9.5A1.5 1.5 0 0 0 13.5 8h-3a1.5 1.5 0 0 0-1.5 1.5V11H7v-2a1 1 0 0 1 1-1h1.5a1.5 1.5 0 0 0 1.5-1.5V5.07A8 8 0 0 1 13 19.93z' },
  { to: '/incidents', label: 'Policies & Incidents', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { to: '/attack-dna', label: 'Campaigns (DNA)', icon: 'M12 2v20M4 6c2.5 2.5 5.5 2.5 8 0s5.5-2.5 8 0M4 18c2.5-2.5 5.5-2.5 8 0s5.5 2.5 8 0M7 4v16M17 4v16', badge: true },
  { to: '/forensics', label: 'Email Forensics', icon: 'M12 2l9 4.9v9.9L12 22l-9-5.1V6.9L12 2zm0 5v6m0 3.5v.5' },
  { to: '/live', label: 'Live Monitor', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', isLive: true },
  { to: '/ledger', label: 'Forensic Ledger', icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  { to: '/history', label: 'Audit History', icon: 'M3 3h18M3 9h18M3 15h12M3 21h12' },
]

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const [online, setOnline] = useState(null)
  const [imapActive, setImapActive] = useState(false)
  const [campaigns, setCampaigns] = useState(0)
  const [open, setOpen] = useState(false)
  const [demoMode, setDemoMode] = useState(() => {
    const saved = localStorage.getItem('mailtrace_demo_mode')
    return saved === null ? true : saved === 'true'
  })
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mailtrace_user'))
    } catch {
      return null
    }
  })
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('mailtrace_user')))
      } catch {
        setUser(null)
      }
    }
    const handleDemoModeChange = () => {
      const saved = localStorage.getItem('mailtrace_demo_mode')
      setDemoMode(saved === null ? true : saved === 'true')
    }
    window.addEventListener('auth_change', handleAuthChange)
    window.addEventListener('demo_mode_change', handleDemoModeChange)
    window.addEventListener('storage', handleAuthChange)
    window.addEventListener('storage', handleDemoModeChange)
    return () => {
      window.removeEventListener('auth_change', handleAuthChange)
      window.removeEventListener('demo_mode_change', handleDemoModeChange)
      window.removeEventListener('storage', handleAuthChange)
      window.removeEventListener('storage', handleDemoModeChange)
    }
  }, [])

  const toggleDemoMode = (e) => {
    e.stopPropagation()
    const next = !demoMode
    setDemoMode(next)
    localStorage.setItem('mailtrace_demo_mode', String(next))
    window.dispatchEvent(new Event('demo_mode_change'))
  }

  const logout = () => {
    localStorage.removeItem('mailtrace_user')
    setUser(null)
    window.dispatchEvent(new Event('auth_change'))
  }

  const check = async () => {
    try {
      const h = await api.health()
      setOnline(true)
      setImapActive(Boolean(h.imap_active))
      const c = await api.campaigns().catch(() => null)
      setCampaigns(c ? c.count : 0)
    } catch {
      setOnline(false)
      setImapActive(false)
    }
  }

  useEffect(() => {
    check()
    const t = setInterval(check, 6000)
    return () => clearInterval(t)
  }, [])

  const handleDisconnectLive = async () => {
    try {
      await api.imapDisconnect()
      setImapActive(false)
      check()
    } catch (e) {
      console.error('Failed to disconnect live IMAP:', e)
    }
  }

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <Logo size={26} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={toggleDemoMode}
            title={demoMode ? "Demo Mode is ON: Click to switch to Live Original Prototype" : "Original Prototype is ON: Click to switch to Instant Demo Sandbox"}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '20px',
              border: demoMode ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
              background: demoMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: demoMode ? '#a78bfa' : '#34d399',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{demoMode ? '🧪 DEMO' : '⚡ ORIGINAL'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Backdrop for Mobile Drawer */}
      <div
        className={`sidebar-backdrop ${open ? 'active' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand" style={{ padding: '18px 18px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Logo size={32} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={toggleTheme}
                className="theme-toggle-btn desktop-only"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="sidebar-close-btn mobile-only"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="brand-tag">
              Threat Investigation
            </div>
            
            {/* Mode Switcher Pill */}
            <button
              onClick={toggleDemoMode}
              title={demoMode ? "Demo Sandbox Active (Instant sample scans & profiles). Click to switch to Live Original Prototype." : "Live Prototype Active (Connecting to live Python backend). Click to switch to Demo Sandbox."}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '12px',
                border: demoMode ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                background: demoMode ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: demoMode ? '#c4b5fd' : '#6ee7b7',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: demoMode ? '#a78bfa' : '#34d399',
                boxShadow: demoMode ? '0 0 6px #a78bfa' : '0 0 6px #34d399'
              }} />
              {demoMode ? 'DEMO: ON' : 'ORIGINAL'}
            </button>
          </div>
        </div>

        <nav className="nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <Icon d={l.icon} />
              {l.label}
              {l.isLive && imapActive && (
                <span style={{
                  marginLeft: 'auto',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px #22c55e',
                  display: 'inline-block'
                }} />
              )}
              {l.badge && campaigns > 0 && (
                <span className="nav-count">{campaigns}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Account / Auth Section */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          {user ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--panel2)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {user.avatar || 'U'}
                </div>
                <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                    {user.role}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-faint)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px'
                }}
              >
                ⏻
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              onClick={() => setOpen(false)}
              className="btn btn-primary"
              style={{
                width: '100%',
                fontSize: '12px',
                padding: '7px 12px',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              🔒 Sign In / Access SOC
            </NavLink>
          )}
        </div>

        <div className="sidebar-foot">
          <div className="status-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-dot ${online === false ? 'off' : ''}`} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>
                  Protection Engine
                </div>
                <div className="status-label">
                  {online === null ? 'Connecting…'
                    : online ? (imapActive ? 'Live Ingestion Active' : 'SOC Engine Ready') : 'Backend Offline'}
                </div>
              </div>
            </div>

            {imapActive && (
              <button
                onClick={handleDisconnectLive}
                title="Disconnect Live Mailbox"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '3px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🛑 Disconnect
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
