import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, CLASS_COLORS, fmtDate } from '../services/api'

const PRESETS = {
  gmail: { host: 'imap.gmail.com', port: 993, ssl: true, label: 'Gmail' },
  outlook: { host: 'outlook.office365.com', port: 993, ssl: true, label: 'Outlook / Office 365' },
  yahoo: { host: 'imap.mail.yahoo.com', port: 993, ssl: true, label: 'Yahoo Mail' },
  custom: { host: '', port: 993, ssl: true, label: 'Custom IMAP' },
}

export default function LiveMonitor() {
  const [provider, setProvider] = useState('gmail')
  const [host, setHost] = useState(PRESETS.gmail.host)
  const [port, setPort] = useState(993)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [folder, setFolder] = useState('INBOX')
  const [pollInterval, setPollInterval] = useState(15)
  const [onlyUnread, setOnlyUnread] = useState(true)

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

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
      setLoading(false)
    } catch (e) {
      setError(e.message)
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
    setSuccessMsg(null)
    try {
      const res = await api.imapConnect({
        host,
        port: parseInt(port, 10),
        username,
        password,
        use_ssl: true,
        folder,
        poll_interval: parseInt(pollInterval, 10),
        only_unread: onlyUnread,
      })
      setSuccessMsg(res.message || 'Connected to live mailbox!')
      fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDisconnect = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await api.imapDisconnect()
      setSuccessMsg('Live monitoring stopped.')
      fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await api.imapSync()
      setSuccessMsg(`Sync complete: ${res.count || 0} new emails processed.`)
      fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleSimulateLiveAttack = async () => {
    setSimulating(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await api.analyzeSample('5_campaign_support.eml')
      setSuccessMsg('⚡ Threat intercepted! Email analyzed and linked to campaign.')
      fetchStatus()
      setTimeout(() => {
        navigate(`/result/${res.id}`)
      }, 1000)
    } catch (err) {
      setError(err.message)
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
    } catch (err) {
      setError(err.message)
    } finally {
      setDnsLoading(false)
    }
  }

  const isLive = status?.is_running && status?.is_connected

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--card-bg, #111827)',
        border: '1px solid var(--border-color, #1f2937)',
        borderRadius: '12px',
        padding: '1.1rem 1.4rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, color: '#f9fafb' }}>
              Live Inbox Monitor
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: isLive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isLive ? '#22c55e' : '#ef4444',
              border: `1px solid ${isLive ? '#22c55e44' : '#ef444444'}`,
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLive ? '#22c55e' : '#ef4444',
                boxShadow: isLive ? '0 0 6px #22c55e' : 'none',
                display: 'inline-block',
                animation: isLive ? 'pulse 2s infinite' : 'none'
              }} />
              {isLive ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.84rem' }}>
            Automatically scans incoming emails in real-time as they arrive.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button
            onClick={handleSimulateLiveAttack}
            disabled={simulating}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem'
            }}
          >
            {simulating ? 'Simulating...' : '⚡ Test Attack'}
          </button>

          {status?.is_running && (
            <>
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.82rem'
                }}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={submitting}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '6px',
                  background: '#374151',
                  color: '#f87171',
                  border: '1px solid #4b5563',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.82rem'
                }}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#f87171',
          fontSize: '0.85rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          color: '#4ade80',
          fontSize: '0.85rem'
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Grid: Connect Mailbox + Live Stream Console */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Mailbox Setup */}
        <div style={{
          background: 'var(--card-bg, #111827)',
          border: '1px solid var(--border-color, #1f2937)',
          borderRadius: '12px',
          padding: '1.25rem',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f3f4f6', marginTop: 0, marginBottom: '0.35rem' }}>
            📬 Connect Mailbox
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.78rem', marginTop: 0, marginBottom: '0.85rem' }}>
            Select your provider to monitor new emails automatically.
          </p>

          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.3rem' }}>
                Provider
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handlePresetChange(k)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: provider === k ? 'bold' : 'normal',
                      background: provider === k ? 'rgba(59, 130, 246, 0.2)' : '#1f2937',
                      border: `1px solid ${provider === k ? '#3b82f6' : '#374151'}`,
                      color: provider === k ? '#60a5fa' : '#d1d5db',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>
                  IMAP Server
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="imap.gmail.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>
                  Port
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>
                Email Address
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>
                Password or App Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password or App Password"
                required
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.2rem', display: 'block' }}>
                * For Gmail: use an App Password from Google Account &gt; Security &gt; 2-Step Verification.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '0.25rem',
                padding: '0.65rem',
                borderRadius: '8px',
                background: '#10b981',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.86rem'
              }}
            >
              {submitting ? 'Connecting...' : status?.is_running ? 'Update Connection' : '🚀 Start Monitoring'}
            </button>
          </form>
        </div>

        {/* Live Metrics & Logs Stream */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          background: 'var(--card-bg, #111827)',
          border: '1px solid var(--border-color, #1f2937)',
          borderRadius: '12px',
          padding: '1.25rem',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f3f4f6', marginTop: 0, marginBottom: '0.35rem' }}>
            🛰️ Monitor Status
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div style={{ background: '#1f2937', padding: '0.65rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>ACCOUNT</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>
                {status?.username || 'Not connected'}
              </div>
            </div>
            <div style={{ background: '#1f2937', padding: '0.65rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>SCANNED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8' }}>
                {status?.synced_count || 0}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#9ca3af', marginBottom: 0, marginTop: '0.2rem' }}>
            Activity Log
          </h3>
          <div style={{
            flex: 1,
            minHeight: '170px',
            maxHeight: '210px',
            overflowY: 'auto',
            background: '#090d16',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            padding: '0.65rem',
            fontFamily: 'monospace',
            fontSize: '0.73rem',
            color: '#a7f3d0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem'
          }}>
            {status?.activity_log && status.activity_log.length > 0 ? (
              status.activity_log.map((log, idx) => (
                <div key={idx} style={{
                  color: log.level === 'ERROR' ? '#f87171' : log.level === 'SUCCESS' ? '#4ade80' : '#cbd5e1'
                }}>
                  <span style={{ color: '#64748b' }}>[{fmtDate(log.timestamp).split(' ')[1] || ''}]</span>{' '}
                  <span style={{ fontWeight: 'bold' }}>[{log.level}]</span> {log.message}
                </div>
              ))
            ) : (
              <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                Ready. Click "Test Attack" or connect a mailbox to view logs.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live DNS & Threat Intelligence Query */}
      <div style={{
        background: 'var(--card-bg, #111827)',
        border: '1px solid var(--border-color, #1f2937)',
        borderRadius: '12px',
        padding: '1.25rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f3f4f6', marginTop: 0, marginBottom: '0.2rem' }}>
          🌐 DNS &amp; Threat Lookup
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.78rem', marginTop: 0, marginBottom: '0.85rem' }}>
          Check MX, SPF, DMARC, and location for any domain or IP address.
        </p>

        <form onSubmit={handleDnsLookup} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.85rem' }}>
          <div style={{ flex: 1, minWidth: '190px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>
              Domain
            </label>
            <input
              type="text"
              value={testDomain}
              onChange={(e) => setTestDomain(e.target.value)}
              placeholder="e.g. paypal.com"
              required
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.82rem'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '170px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>
              IP Address (Optional)
            </label>
            <input
              type="text"
              value={testIp}
              onChange={(e) => setTestIp(e.target.value)}
              placeholder="e.g. 185.220.101.47"
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.82rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={dnsLoading}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '6px',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem'
            }}
          >
            {dnsLoading ? 'Checking...' : '🔍 Lookup'}
          </button>
        </form>

        {dnsResult && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.85rem',
            background: '#0d131f',
            padding: '0.85rem',
            borderRadius: '8px',
            border: '1px solid #1e293b'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
                Domain: {dnsResult.domain_intel.domain}
              </div>
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div>MX: <strong style={{ color: dnsResult.domain_intel.has_mx ? '#4ade80' : '#f87171' }}>{dnsResult.domain_intel.has_mx ? 'Active Mail Server' : 'No MX Records'}</strong></div>
                <div>Live SPF: <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{dnsResult.domain_intel.spf_record || 'None'}</span></div>
                <div>DMARC Policy: <strong style={{ color: '#f59e0b' }}>{dnsResult.domain_intel.dmarc_policy}</strong></div>
              </div>
            </div>
            {dnsResult.ip_intel && (
              <div>
                <div style={{ fontWeight: 'bold', color: '#a78bfa', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
                  IP: {dnsResult.ip_intel.ip}
                </div>
                <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div>Location: <strong>{dnsResult.ip_intel.city ? `${dnsResult.ip_intel.city}, ` : ''}{dnsResult.ip_intel.country}</strong></div>
                  <div>ISP/Host: <span>{dnsResult.ip_intel.isp || dnsResult.ip_intel.org}</span></div>
                  <div>ASN: <span style={{ fontFamily: 'monospace' }}>{dnsResult.ip_intel.asn || 'N/A'}</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
