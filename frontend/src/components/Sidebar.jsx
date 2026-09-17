import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { api } from '../services/api.js'
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

  return (
    <>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="menu">☰</button>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand" style={{ padding: '18px 18px 14px' }}>
          <Logo size={34} />
          <div className="brand-tag" style={{ marginTop: '8px' }}>
            Email Threat Scanner &amp; Security Guide
          </div>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <Icon d={l.icon} />
              {l.label}
              {l.isLive && imapActive && (
                <span style={{
                  marginLeft: 'auto',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
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
              className="btn btn-primary"
              style={{
                width: '100%',
                fontSize: '12px',
                padding: '7px 12px',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              🔒 Sign In / Sign Up
            </NavLink>
          )}
        </div>

        <div className="sidebar-foot">
          <div className="status-row">
            <span className={`status-dot ${online === false ? 'off' : ''}`} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 12 }}>
                Protection Engine
              </div>
              <div className="status-label">
                {online === null ? 'Connecting…'
                  : online ? (imapActive ? 'Live Ingestion Active' : 'Scanner Ready') : 'Backend Offline'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
