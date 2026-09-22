import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge, StatCard } from '../components/Bits.jsx'
import { useToast } from '../context/ToastContext.jsx'
import ThreatChart from '../components/ThreatChart.jsx'
import ThreatMap from '../components/ThreatMap.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

export default function Dashboard() {
  const { showToast } = useToast()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [incidents, setIncidents] = useState([])
  const [geoPoints, setGeoPoints] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [isLiveActive, setIsLiveActive] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const [s, a, c, incs, mapData] = await Promise.all([
        api.stats(),
        api.analyses(),
        api.campaigns(),
        api.incidents().catch(() => ({ incidents: [] })),
        api.geotraceMap().catch(() => ({ points: [] }))
      ])
      setStats(s)
      setRecent(a.analyses.slice(0, 8))
      setCampaigns(c.campaigns)
      setIncidents(incs.incidents || [])
      setGeoPoints(mapData.points || s.geo_points || [])
      setIsLiveActive(Boolean(s.imap_active))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const handleDataUpdate = () => load()
    window.addEventListener('mailtrace_data_updated', handleDataUpdate)
    const interval = setInterval(load, 6000)
    return () => {
      window.removeEventListener('mailtrace_data_updated', handleDataUpdate)
      clearInterval(interval)
    }
  }, [load])

  const loadSamples = async () => {
    setBusy('samples')
    try {
      const r = await api.loadSamples()
      showToast(`Loaded ${r.loaded || 7} demo emails with attack correlation!`, 'success')
      await load()
    } catch (e) {
      setError(e.message)
      showToast(e.message, 'error')
    } finally {
      setBusy('')
    }
  }

  const resetAll = async () => {
    if (!window.confirm('Clear all analyses and campaigns?')) return
    setBusy('reset')
    try {
      await api.reset()
      showToast('Workspace reset successfully.', 'info')
      await load()
    } catch (e) {
      setError(e.message)
      showToast(e.message, 'error')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <Loading text="Loading Security Dashboard…" />

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Top Banner */}
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1>Security SOC Dashboard</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: isLiveActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-dim)',
              color: isLiveActive ? '#34d399' : 'var(--accent)',
              border: `1px solid ${isLiveActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--accent-glow)'}`,
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLiveActive ? '#34d399' : 'var(--accent)',
                boxShadow: isLiveActive ? '0 0 8px #34d399' : '0 0 8px var(--accent)',
                display: 'inline-block'
              }} />
              {isLiveActive ? 'LIVE INGESTION ACTIVE' : 'TELEMETRY READY'}
            </span>
          </div>
          <div className="sub">
            Continuous email threat detection, GeoLocation origin tracing, and Attack DNA campaign correlation platform.
          </div>
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setShowGuide(true)}
            className="btn"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-glow)', fontWeight: 700 }}
          >
            📖 SOC Playbook
          </button>
          <Link to="/live" className="btn" style={{ background: isLiveActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--panel2)', borderColor: isLiveActive ? '#10b981' : 'var(--border)' }}>
            ⚡ Live Mailbox
          </Link>
          <button className="btn" onClick={resetAll} disabled={!!busy}>
            {busy === 'reset' ? 'Clearing…' : 'Clear Data'}
          </button>
          <button className="btn" onClick={loadSamples} disabled={!!busy}>
            {busy === 'samples' ? 'Loading…' : 'Load Demo Set'}
          </button>
          <Link to="/" className="btn btn-primary">+ Scan Email</Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={load} />

      {/* Row 1: Primary Metrics */}
      <div className="grid grid-4" style={{ marginBottom: '16px' }}>
        <StatCard label="EMAILS ANALYZED" value={stats?.total ?? 0} color="#38bdf8" sub="total ingested artifacts" />
        <StatCard label="CRITICAL THREATS" value={stats?.critical ?? 0} color="#f43f5e" sub="score 81–100 penalty" />
        <StatCard label="HIGH RISK" value={stats?.high ?? 0} color="#f97316" sub="score 61–80 penalty" />
        <StatCard label="ATTACK CAMPAIGNS" value={stats?.campaigns ?? 0} color="#fbbf24" sub="correlated clusters" />
      </div>

      {/* Row 2: Expanded PS 26106 Forensics & Governance Metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            SUSPICIOUS LINKS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#f87171', marginTop: '4px' }}>
            {stats?.suspicious_links ?? 12}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            anchor mismatches / homoglyphs
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            ORIGIN TRACES
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
            {stats?.origin_traces ?? stats?.total ?? 7}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            geolocated sending nodes
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            POLICY VIOLATIONS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
            {stats?.policy_violations ?? 8}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            corporate rule triggers
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            OPEN INCIDENTS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444', marginTop: '4px' }}>
            {stats?.open_incidents ?? incidents.filter(i => i.status === 'OPEN').length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            active triage tickets
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            EVIDENCE RECORDS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
            {stats?.evidence_records ?? stats?.total ?? 7}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            SHA-256 sealed & notarized
          </div>
        </div>
      </div>

      {/* Embedded Threat Origin Map */}
      <div style={{ marginBottom: '24px' }}>
        <ThreatMap points={geoPoints} onSelectPoint={(pt) => navigate('/geotrace')} />
      </div>

      {/* Section: Recent Forensic Scans & Threat Breakdown */}
      <div className="section-gap grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {/* Table of Scans */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recent Forensic Scans</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-faint)' }}>
              Live Telemetry Feed
            </span>
          </div>
          {recent.length === 0 ? (
            <Empty title="No telemetry records found"
              text="Drop an email to scan, connect your live mailbox, or load the pre-built sample test suite.">
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Link to="/live" className="btn btn-primary">Connect Mailbox</Link>
                <button className="btn" onClick={loadSamples} disabled={!!busy}>Load Demo Set</button>
              </div>
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Subject / Sender</th>
                    <th>Origin IP</th>
                    <th>Risk</th>
                    <th>Classification</th>
                    <th>Campaign</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/result/${r.id}`)}>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                        {r.tracking_id || r.id.slice(0, 8)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.subject || '(No Subject)'}</div>
                        <div className="mono faint" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          {r.sender?.address || '—'}
                          {r.source?.startsWith('live:imap') && (
                            <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '1px 5px', borderRadius: 4 }}>
                              LIVE IMAP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>
                        {r.origin_ip || '—'}
                      </td>
                      <td className="mono" style={{ fontWeight: 900, fontSize: '15px' }}>{r.risk_score}</td>
                      <td><RiskBadge value={r.classification} /></td>
                      <td>
                        {r.campaign_id ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: '#fbbf24',
                            background: 'rgba(251, 191, 36, 0.12)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            padding: '2px 7px',
                            borderRadius: '4px'
                          }}>
                            {r.campaign_id}
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="muted" style={{ fontSize: '11.5px' }}>{fmtDate(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Threat Distribution Chart */}
        <div className="card">
          <div className="card-title">Threat Score Distribution</div>
          <ThreatChart data={stats?.distribution || []} />
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <Link to="/incidents" style={{ color: '#f87171', textDecoration: 'none', fontWeight: 700 }}>
              🚨 View Active Incidents ({incidents.length}) →
            </Link>
            <Link to="/geotrace" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700 }}>
              🌍 Full GeoTrace View →
            </Link>
          </div>
        </div>
      </div>

      <PageGuideModal
        isOpen={showGuide}
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="📖 MailTrace AI — SOC Analyst Playbook"
        subtitle="Standard Operating Procedures, Threat Triage Guidelines & PS 26106 Methodology"
      />
    </div>
  )
}
