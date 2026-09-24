import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'

const PRESETS = {
  gmail: {
    host: 'imap.gmail.com',
    port: 993,
    ssl: true,
    label: 'Gmail',
    icon: '🔴',
    url: 'https://myaccount.google.com/apppasswords',
    hint: 'Requires a Google 16-character App Password (not your normal Gmail password)',
    steps: [
      {
        title: 'Step 1: Enable 2-Step Verification',
        desc: 'Go to your Google Account (myaccount.google.com) > Security and verify 2-Step Verification is ON.'
      },
      {
        title: 'Step 2: Generate App Password',
        desc: 'Search for "App passwords" in Google Account or visit myaccount.google.com/apppasswords.'
      },
      {
        title: 'Step 3: Name & Create Key',
        desc: 'Type app name "MailTrace AI", click Create, and copy the 16-letter code (e.g. abcd efgh ijkl mnop).'
      },
      {
        title: 'Step 4: Enable IMAP in Gmail Settings',
        desc: 'In Gmail web: Settings ⚙️ > See all settings > Forwarding and POP/IMAP > Enable IMAP > Save.'
      }
    ]
  },
  outlook: {
    host: 'outlook.office365.com',
    port: 993,
    ssl: true,
    label: 'Outlook / Office 365',
    icon: '🔷',
    url: 'https://account.microsoft.com/security',
    hint: 'Works with Microsoft 365 / Outlook.com accounts using an App Password',
    steps: [
      {
        title: 'Step 1: Open Microsoft Security',
        desc: 'Sign in to account.microsoft.com/security and select Advanced Security Options.'
      },
      {
        title: 'Step 2: Turn on Two-Step Verification',
        desc: 'Make sure Two-step verification is enabled for your Microsoft Account.'
      },
      {
        title: 'Step 3: Create App Password',
        desc: 'Under "App passwords", click "Create a new app password" and copy the generated key.'
      },
      {
        title: 'Enterprise M365 Tip',
        desc: 'For work/school accounts, ensure your IT admin has enabled IMAP4 in Exchange Online admin center.'
      }
    ]
  },
  yahoo: {
    host: 'imap.mail.yahoo.com',
    port: 993,
    ssl: true,
    label: 'Yahoo Mail',
    icon: '🟣',
    url: 'https://login.yahoo.com/account/security',
    hint: 'Generate an App Password in Yahoo Account Security settings',
    steps: [
      {
        title: 'Step 1: Open Yahoo Account Security',
        desc: 'Log in to Yahoo Mail and open Account Info > Account Security.'
      },
      {
        title: 'Step 2: Generate App Password',
        desc: 'Scroll down to "App Password" and click "Generate app password".'
      },
      {
        title: 'Step 3: Enter App Name',
        desc: 'Enter "MailTrace AI" as the application name and click "Generate".'
      },
      {
        title: 'Step 4: Copy Code',
        desc: 'Copy the generated 16-character code into the password field below.'
      }
    ]
  },
  custom: {
    host: '',
    port: 993,
    ssl: true,
    label: 'Custom IMAP Server',
    icon: '⚙️',
    hint: 'Connect to any private or corporate secure IMAP4 server',
    steps: [
      {
        title: 'Step 1: Host & Port',
        desc: 'Enter your company IMAP server (e.g. mail.company.com) on Port 993 with SSL enabled.'
      },
      {
        title: 'Step 2: Credentials',
        desc: 'Enter your mailbox username/email and either your mailbox password or dedicated service account token.'
      },
      {
        title: 'Step 3: Firewall Access',
        desc: 'Ensure outbound connection to port 993 is permitted on your network or VPN.'
      }
    ]
  },
}

export default function LiveMonitor() {
  const { showToast } = useToast()
  const [provider, setProvider] = useState('gmail')
  const [host, setHost] = useState(PRESETS.gmail.host)
  const [port, setPort] = useState(993)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [folder, setFolder] = useState('INBOX')
  const [pollInterval, setPollInterval] = useState(15)
  const [onlyUnread, setOnlyUnread] = useState(true)
  const [showGuideModal, setShowGuideModal] = useState(false)

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState(null)

  // Live DNS Inspector State
  const [testDomain, setTestDomain] = useState('paypal.com')
  const [testIp, setTestIp] = useState('185.220.101.47')
  const [dnsResult, setDnsResult] = useState(null)
  const [dnsLoading, setDnsLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 4000)
    return () => clearInterval(timer)
  }, [])

  const fetchStatus = async () => {
    try {
      const s = await api.imapStatus()
      setStatus(s)
      if (s?.username && s?.is_running && !username) {
        setUsername(s.username)
      }
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  const handlePresetChange = (pKey) => {
    setProvider(pKey)
    const p = PRESETS[pKey]
    if (p) {
      setHost(p.host)
      setPort(p.port)
    }
  }

  const handleConnect = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.imapConnect({
        host,
        port: parseInt(port, 10),
        username,
        password: password.replace(/\s+/g, ''), // Strip any accidental spaces from copy-paste
        use_ssl: true,
        folder,
        poll_interval: parseInt(pollInterval, 10),
        only_unread: onlyUnread,
      })
      showToast(res.message || 'Connected to live mailbox!', 'success')
      fetchStatus()
    } catch (err) {
      setError(err.message)
      showToast(err.message || 'Connection failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDisconnect = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await api.imapDisconnect()
      showToast('Live monitoring disconnected successfully.', 'info')
      fetchStatus()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await api.imapSync()
      showToast(`Sync complete: ${res.count || 0} new emails processed.`, 'success')
      fetchStatus()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSimulateLiveAttack = async () => {
    setSimulating(true)
    setError(null)
    try {
      const res = await api.analyzeSample('5_campaign_support.eml')
      showToast('⚡ Phishing attack simulated and intercepted!', 'warning')
      fetchStatus()
      setTimeout(() => {
        navigate(`/result/${res.id}`)
      }, 900)
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setSimulating(false)
    }
  }

  const handleDnsLookup = async (e) => {
    e.preventDefault()
    setDnsLoading(true)
    setDnsResult(null)
    try {
      const res = await api.dnsLookup(testDomain, testIp)
      setDnsResult(res)
      showToast('DNS & Threat telemetry retrieved', 'success')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setDnsLoading(false)
    }
  }

  const isLive = Boolean(status?.is_connected || status?.is_running)
  const currentPreset = PRESETS[provider] || PRESETS.gmail

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.4rem' }} className="fade-in">
      {/* Header Banner */}
      <div className="card" style={{
        padding: '1.4rem 1.6rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: isLive
          ? 'radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.15), var(--panel) 70%)'
          : 'radial-gradient(ellipse at top left, rgba(56, 189, 248, 0.12), var(--panel) 70%)',
        borderColor: isLive ? 'rgba(16, 185, 129, 0.4)' : 'var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.3rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Live Mailbox Sentinel
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.6px',
              background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: isLive ? '#34d399' : '#fda4af',
              border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isLive ? '#10b981' : '#f43f5e',
                boxShadow: isLive ? '0 0 10px #10b981' : '0 0 10px #f43f5e',
                display: 'inline-block'
              }} />
              {isLive ? 'INGESTION ACTIVE' : 'DISCONNECTED'}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.4 }}>
            Continuous zero-trust background ingestion. Dissects and evaluates incoming emails in real-time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowGuideModal(true)}
            className="btn"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-glow)', fontWeight: 700 }}
          >
            📖 App Password Guide
          </button>

          <button
            onClick={handleSimulateLiveAttack}
            disabled={simulating}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)'
            }}
          >
            {simulating ? 'Ingesting…' : '⚡ Ingest Live Attack'}
          </button>

          {isLive && (
            <>
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="btn btn-primary"
              >
                {syncing ? 'Scanning…' : '🔄 Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={submitting}
                className="btn"
                style={{
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: '#fda4af',
                  borderColor: 'rgba(244, 63, 94, 0.3)'
                }}
              >
                🛑 Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--inner-radius)',
          color: '#fda4af',
          fontSize: '0.88rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>⚠️ Authentication / Connection Error</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
          <div style={{ color: 'var(--text)', fontSize: '0.84rem' }}>{error}</div>
          <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#fde047' }}>
            💡 <strong>Quick Fix:</strong> Email services require an <strong>App Password</strong> instead of your normal account password. Click the <strong>"App Password Guide"</strong> button above for step-by-step instructions.
          </div>
        </div>
      )}

      {/* Grid: Connect Mailbox + Live Stream Console */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.4rem' }}>
        {/* Mailbox Setup Form */}
        <div className="card" style={{ padding: '1.6rem' }}>
          <div className="card-title">
            <span>📬 Configure Live Ingestion Mailbox</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '-0.35rem', marginBottom: '1.2rem' }}>
            Select your email provider and enter your dedicated App Password.
          </p>

          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-faint)', marginBottom: '0.4rem' }}>
                Email Service Provider
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handlePresetChange(k)}
                    style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: provider === k ? 800 : 600,
                      background: provider === k ? 'var(--accent-dim)' : 'var(--panel2)',
                      border: `1px solid ${provider === k ? 'var(--accent)' : 'var(--border)'}`,
                      color: provider === k ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-faint)', marginBottom: '0.35rem' }}>
                  IMAP Host Server
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="imap.gmail.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-faint)', marginBottom: '0.35rem' }}>
                  SSL Port
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-faint)' }}>
                  Account Email Address
                </label>
                {username && (
                  <button
                    type="button"
                    onClick={() => { setUsername(''); setPassword(''); }}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                  >
                    ✕ Clear / Change Email
                  </button>
                )}
              </div>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.email@gmail.com"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-faint)' }}>
                  App Password (16 Characters)
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                >
                  ❓ How to get App Password?
                </button>
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="abcd efgh ijkl mnop"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  letterSpacing: '1px',
                  outline: 'none'
                }}
              />

              <div style={{
                background: 'var(--panel2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginTop: '0.6rem',
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <span>💡</span>
                <div>
                  <strong>{currentPreset.label} Requirement:</strong> {currentPreset.hint}
                  {currentPreset.url && (
                    <div style={{ marginTop: '3px' }}>
                      <a href={currentPreset.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>
                        Open {currentPreset.label} Security Portal ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 800
                }}
              >
                {submitting ? 'Connecting...' : isLive ? 'Update Active Mailbox' : '🚀 Start Live Monitoring'}
              </button>
              {isLive && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={submitting}
                  className="btn"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '10px',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🛑 Disconnect Mailbox
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Live Metrics & Logs Stream */}
        <div className="card" style={{ padding: '1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🛰️ Live Telemetry Terminal</span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>
              AUTO-POLL {pollInterval}S
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'var(--panel2)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)' }}>MONITORED INBOX</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', wordBreak: 'break-all', marginTop: '2px' }}>
                  {status?.username || 'None configured'}
                </div>
              </div>
              {isLive && (
                <button
                  onClick={handleDisconnect}
                  disabled={submitting}
                  title="Disconnect Live Mailbox"
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    flexShrink: 0
                  }}
                >
                  🛑 Disconnect
                </button>
              )}
            </div>
            <div style={{ background: 'var(--panel2)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)' }}>EMAILS PROCESSED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: '2px' }}>
                {status?.synced_count || 0}
              </div>
            </div>
          </div>

          {/* MacOS/Linux Style Terminal Console */}
          <div style={{
            flex: 1,
            minHeight: '220px',
            background: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Terminal Window Header */}
            <div style={{
              background: '#111827',
              padding: '7px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: '#64748b', marginLeft: 'auto' }}>
                sentinel_stream.log
              </span>
            </div>

            {/* Terminal Log Body */}
            <div style={{
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: '#38bdf8',
              lineHeight: 1.5,
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              {status?.activity_log && status.activity_log.length > 0 ? (
                status.activity_log.map((log, idx) => (
                  <div key={idx} style={{
                    color: log.level === 'ERROR' ? '#f87171' : log.level === 'SUCCESS' ? '#34d399' : '#94a3b8'
                  }}>
                    <span style={{ color: '#475569' }}>[{fmtDate(log.timestamp).split(' ')[1] || ''}]</span>{' '}
                    <span style={{
                      fontWeight: 800,
                      background: log.level === 'ERROR' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}>
                      {log.level}
                    </span>{' '}
                    <span>{log.message}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
                  ⚡ Engine ready. Ingest threat stream or connect mailbox to start live log stream.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Guidance Modal / Drawer */}
      {showGuideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="card fade-in"
            style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.8rem',
              background: 'var(--panel-solid)',
              border: '1px solid var(--accent)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 4px', color: 'var(--text)' }}>
                  🔑 How to Get Your App Password
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Email providers require dedicated App Passwords to keep your main password secure.
                </p>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="btn btn-sm"
                style={{ padding: '4px 10px', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Provider Tabs inside Modal */}
            <div className="tabs" style={{ marginBottom: '1.25rem' }}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <button
                  key={k}
                  onClick={() => handlePresetChange(k)}
                  className={`tab ${provider === k ? 'active' : ''}`}
                  style={{ fontSize: '12px' }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            {/* Selected Provider Step Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {currentPreset.steps.map((s, idx) => (
                <div key={idx} style={{
                  background: 'var(--panel2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '12px'
                }}>
                  <span style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '12px',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text)', marginBottom: '2px' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {currentPreset.url && (
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <a
                  href={currentPreset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.6rem', fontSize: '0.88rem', display: 'inline-flex' }}
                >
                  🚀 Go to {currentPreset.label} Security Settings ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live DNS & Threat Intelligence Query */}
      <div className="card" style={{ padding: '1.6rem' }}>
        <div className="card-title">
          <span>🌐 Real-Time DNS &amp; Threat Intelligence Lookup</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '-0.35rem', marginBottom: '1.1rem' }}>
          Inspect live MX records, active SPF validation, DMARC security policies, and GeoIP ASN threat data.
        </p>

        <form onSubmit={handleDnsLookup} style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-faint)', marginBottom: '0.35rem' }}>
              Target Domain
            </label>
            <input
              type="text"
              value={testDomain}
              onChange={(e) => setTestDomain(e.target.value)}
              placeholder="e.g. paypal-security.example"
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-faint)', marginBottom: '0.35rem' }}>
              Origin IP Address (Optional)
            </label>
            <input
              type="text"
              value={testIp}
              onChange={(e) => setTestIp(e.target.value)}
              placeholder="e.g. 185.220.101.47"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={dnsLoading}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.6rem', fontSize: '0.88rem', borderRadius: '8px' }}
          >
            {dnsLoading ? 'Querying DNS…' : '🔍 Inspect Threat Intel'}
          </button>
        </form>

        {dnsResult && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            background: 'var(--panel2)',
            padding: '1.25rem',
            borderRadius: '10px',
            border: '1px solid var(--border)'
          }} className="fade-in">
            <div>
              <div style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                Domain Infrastructure: {dnsResult.domain_intel.domain}
              </div>
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>MX Status: <strong style={{ color: dnsResult.domain_intel.has_mx ? '#34d399' : '#f87171' }}>{dnsResult.domain_intel.has_mx ? '✓ Active Server' : '✕ No MX'}</strong></div>
                <div>SPF Record: <code style={{ color: '#cbd5e1', background: 'var(--panel)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.76rem' }}>{dnsResult.domain_intel.spf_record || 'None detected'}</code></div>
                <div>DMARC Policy: <strong style={{ color: '#fbbf24' }}>{dnsResult.domain_intel.dmarc_policy}</strong></div>
              </div>
            </div>
            {dnsResult.ip_intel && (
              <div>
                <div style={{ fontWeight: 800, color: '#a78bfa', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                  Origin GeoIP &amp; ASN: {dnsResult.ip_intel.ip}
                </div>
                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>Geolocation: <strong>{dnsResult.ip_intel.city ? `${dnsResult.ip_intel.city}, ` : ''}{dnsResult.ip_intel.country}</strong></div>
                  <div>ISP / Network: <span>{dnsResult.ip_intel.isp || dnsResult.ip_intel.org}</span></div>
                  <div>Autonomous System: <span style={{ fontFamily: 'var(--font-mono)' }}>{dnsResult.ip_intel.asn || 'N/A'}</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
