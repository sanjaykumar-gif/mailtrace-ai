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
  { to: '/live', label: 'Live Monitor', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', isLive: true },
  { to: '/dashboard', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { to: '/forensics', label: 'Forensics', icon: 'M12 2l9 4.9v9.9L12 22l-9-5.1V6.9L12 2zm0 5v6m0 3.5v.5' },
  { to: '/attack-dna', label: 'Campaigns', icon: 'M12 2v20M4 6c2.5 2.5 5.5 2.5 8 0s5.5-2.5 8 0M4 18c2.5-2.5 5.5-2.5 8 0s5.5 2.5 8 0M7 4v16M17 4v16', badge: true },
  { to: '/history', label: 'History', icon: 'M3 3h18M3 9h18M3 15h12M3 21h12' },
]

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const [online, setOnline] = useState(null)
  const [imapActive, setImapActive] = useState(false)
  const [campaigns, setCampaigns] = useState(0)
  const [open, setOpen] = useState(false)
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
    window.addEventListener('auth_change', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)
    return () => {
      window.removeEventListener('auth_change', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [])

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
          <div className="brand-tag" style={{ marginTop: '8px' }}>
            Threat Investigation &amp; Correlation
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                    background: user.isDemoMode ? 'linear-gradient(135deg, #38bdf8, #10b981)' : 'var(--accent)',
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

              {/* Mode Status Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: '6px',
                background: user.isDemoMode ? 'rgba(56, 189, 248, 0.1)' : 'var(--panel2)',
                border: user.isDemoMode ? '1px solid var(--accent-glow)' : '1px solid var(--border)',
                fontSize: '10.5px'
              }}>
                <span style={{ color: user.isDemoMode ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {user.isDemoMode ? '🧪 Demo Mode Active' : '🏢 Production Mode'}
                </span>
                <NavLink
                  to="/login"
                  style={{ color: 'var(--accent)', fontSize: '10px', textDecoration: 'underline' }}
                >
                  Switch
                </NavLink>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <NavLink
                to="/login"
                onClick={() => setOpen(false)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  fontSize: '12px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  background: 'linear-gradient(90deg, #38bdf8, #10b981)',
                  color: '#090d16',
                  fontWeight: 800,
                  border: 'none'
                }}
              >
                ⚡ 1-Click Demo Mode
              </NavLink>
              <NavLink
                to="/login"
                onClick={() => setOpen(false)}
                className="btn"
                style={{
                  width: '100%',
                  fontSize: '11px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  textAlign: 'center'
                }}
              >
                🔒 Sign In / Register
              </NavLink>
            </div>
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
