import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge, StatCard } from '../components/Bits.jsx'
import ThreatChart from '../components/ThreatChart.jsx'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [isLiveActive, setIsLiveActive] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const [s, a, c] = await Promise.all([api.stats(), api.analyses(), api.campaigns()])
      setStats(s)
      setRecent(a.analyses.slice(0, 8))
      setCampaigns(c.campaigns)
      setIsLiveActive(Boolean(s.imap_active))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh stats and recent analyses every 5 seconds for live real-time monitoring
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  const loadSamples = async () => {
    setBusy('samples')
    setNotice(null)
    try {
      const r = await api.loadSamples()
      setNotice(`Loaded ${r.loaded} test emails — including a 3-email coordinated campaign. Open Attack DNA to see the correlation.`)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const resetAll = async () => {
    if (!window.confirm('Clear all analyses and campaigns?')) return
    setBusy('reset')
    try {
      await api.reset()
      setNotice('Workspace cleared.')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  if (loading) return <Loading text="Loading dashboard…" />

  return (
    <div>
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1>Security Dashboard</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: isLiveActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: isLiveActive ? '#22c55e' : '#60a5fa',
              border: `1px solid ${isLiveActive ? '#22c55e44' : '#60a5fa44'}`,
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLiveActive ? '#22c55e' : '#60a5fa',
                boxShadow: isLiveActive ? '0 0 6px #22c55e' : 'none',
                display: 'inline-block'
              }} />
              {isLiveActive ? 'LIVE MONITOR ACTIVE' : 'MONITOR READY'}
            </span>
          </div>
          <div className="sub">Real-time overview of scanned emails and threat campaigns.</div>
        </div>
        <div className="spacer" />
        <Link to="/live" className="btn" style={{ background: isLiveActive ? '#059669' : '#1f2937', color: '#fff' }}>
          ⚡ Live Monitor
        </Link>
        <button className="btn" onClick={resetAll} disabled={!!busy}>
          {busy === 'reset' ? 'Clearing…' : 'Clear Data'}
        </button>
        <button className="btn" onClick={loadSamples} disabled={!!busy}>
          {busy === 'samples' ? 'Loading…' : 'Load Samples'}
        </button>
        <Link to="/analyze" className="btn btn-primary">+ Scan Email</Link>
      </div>

      <ErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner banner-ok">{notice}</div>}

      <div className="grid grid-4">
        <StatCard label="SCANNED" value={stats?.total ?? 0} color="#22d3ee" sub="total emails" />
        <StatCard label="CRITICAL" value={stats?.critical ?? 0} color="#ff4d5e" sub="score 81–100" />
        <StatCard label="HIGH RISK" value={stats?.high ?? 0} color="#ff8a3d" sub="score 61–80" />
        <StatCard label="CAMPAIGNS" value={stats?.campaigns ?? 0} color="#f6c945" sub="linked threats" />
      </div>

      <div className="section-gap grid grid-3" style={{ gridTemplateColumns: '1.9fr 1fr' }}>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recent Scans</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
              Auto-refreshes
            </span>
          </div>
          {recent.length === 0 ? (
            <Empty title="No emails scanned yet"
              text="Drop an email to scan, connect your inbox, or load sample tests.">
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Link to="/live" className="btn btn-primary">
                  Connect Mailbox
                </Link>
                <button className="btn" onClick={loadSamples} disabled={!!busy}>
                  Load Samples
                </button>
              </div>
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Email</th><th>Risk</th><th>Status</th><th>Campaign</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/result/${r.id}`)}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.subject}</div>
                        <div className="mono faint">
                          {r.sender?.address || '—'}
                          {r.source?.startsWith('live:imap') && (
                            <span style={{ marginLeft: 6, fontSize: 10, background: '#065f46', color: '#6ee7b7', padding: '1px 5px', borderRadius: 4 }}>
                              LIVE IMAP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="mono" style={{ fontWeight: 800, fontSize: 15 }}>{r.risk_score}</td>
                      <td><RiskBadge value={r.classification} /></td>
                      <td>{r.campaign_id ? <span className="pill" style={{ color: 'var(--medium)' }}>{r.campaign_id}</span> : <span className="faint">—</span>}</td>
                      <td className="muted">{fmtDate(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Threat Breakdown</div>
          {stats?.total
            ? <ThreatChart distribution={stats.distribution} />
            : <Empty title="No data" text="Threat levels appear after your first scan." />}
          {campaigns.length > 0 && (
            <div className="mt">
              <div className="card-title" style={{ marginBottom: 8 }}>Connected Campaigns</div>
              {campaigns.slice(0, 3).map((c) => (
                <Link to={`/attack-dna/${c.id}`} key={c.id} style={{ textDecoration: 'none' }}>
                  <div className="campaign-banner mb" style={{ padding: '10px 12px' }}>
                    <span className="cb-icon" style={{ fontSize: 18 }}>⚠</span>
                    <div>
                      <div className="cb-title" style={{ fontSize: 13 }}>{c.id} — {c.title}</div>
                      <div className="cb-sub">{c.member_count} emails · {c.confidence}% confidence</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
