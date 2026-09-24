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
      showToast(`Loaded ${r.loaded || 7} threat email scenarios with attack correlation!`, 'success')
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

  const hasData = Boolean(stats?.total && stats.total > 0)

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
              background: isLiveActive ? 'rgba(16, 185, 129, 0.15)' : (hasData ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.12)'),
              color: isLiveActive ? '#34d399' : (hasData ? '#38bdf8' : 'var(--text-faint)'),
              border: `1px solid ${isLiveActive ? 'rgba(16, 185, 129, 0.3)' : (hasData ? 'rgba(56, 189, 248, 0.3)' : 'var(--border)')}`,
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLiveActive ? '#34d399' : (hasData ? '#38bdf8' : '#94a3b8'),
                boxShadow: isLiveActive ? '0 0 8px #34d399' : (hasData ? '0 0 8px #38bdf8' : 'none'),
                display: 'inline-block'
              }} />
              {isLiveActive ? 'LIVE INGESTION ACTIVE' : (hasData ? `TELEMETRY ARCHIVE (${stats.total} SCANS)` : 'STANDBY (NO MAILBOX CONNECTED)')}
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
            {busy === 'samples' ? 'Ingesting…' : 'Ingest Threat Samples'}
          </button>
          <Link to="/" className="btn btn-primary">+ Scan Email</Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={load} />

      {/* Standby Workflow Banner when 0 emails exist and live monitor is inactive */}
      {!hasData && !isLiveActive && (
        <div className="card" style={{
          padding: '22px 24px',
          marginBottom: '24px',
          background: 'radial-gradient(ellipse at top left, rgba(56, 189, 248, 0.1), var(--panel) 75%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>🛰️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                  SOC SENTINEL STANDBY — SELECT TELEMETRY INGRESS WORKFLOW
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-faint)' }}>
                  No active telemetry in session. Connect live mailbox feeds, analyze custom emails, or ingest reference threat scenarios.
                </p>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              ⚡ 3 Verification Pathways
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Pathway 1: Live Mailbox */}
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📬</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>1. Live IMAP Mailbox</strong>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-faint)', lineHeight: 1.4, margin: '0 0 12px' }}>
                  Stream incoming emails directly from Gmail, Outlook, or corporate IMAP. Evaluates new messages in real-time.
                </p>
              </div>
              <Link to="/live" className="btn" style={{ width: '100%', textAlign: 'center', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)', fontWeight: 700, fontSize: '12px' }}>
                Connect Live Mailbox →
              </Link>
            </div>

            {/* Pathway 2: Manual Scan */}
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🔍</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>2. Forensic File Scanner</strong>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-faint)', lineHeight: 1.4, margin: '0 0 12px' }}>
                  Drop an <code>.eml</code>, <code>.msg</code>, or paste raw headers for instant SPF/DKIM verification and URL deobfuscation.
                </p>
              </div>
              <Link to="/" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', fontSize: '12px' }}>
                Scan Custom Email →
              </Link>
            </div>

            {/* Pathway 3: Ingest Samples */}
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>⚡</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>3. Threat Test Suite</strong>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-faint)', lineHeight: 1.4, margin: '0 0 12px' }}>
                  Load 7 forensic threat scenarios (Safe notice, PayPal Phish, BEC Fraud, 3-Node Campaign Cluster).
                </p>
              </div>
              <button onClick={loadSamples} disabled={!!busy} className="btn" style={{ width: '100%', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', fontWeight: 700, fontSize: '12px' }}>
                {busy === 'samples' ? 'Ingesting…' : 'Ingest Threat Samples →'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {stats?.suspicious_links ?? 0}
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
            {stats?.origin_traces ?? stats?.total ?? 0}
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
            {stats?.policy_violations ?? 0}
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
            {stats?.evidence_records ?? stats?.total ?? 0}
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
                <button className="btn" onClick={loadSamples} disabled={!!busy}>Ingest Threat Samples</button>
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
                    <th>Action</th>
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
                      <td className="mono" style={{ fontSize: '11.5px' }}>
                        {r.origin_ip ? (
                          <span
                            onClick={(e) => { e.stopPropagation(); navigate('/geotrace') }}
                            title="Inspect IP Geolocation"
                            style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {r.origin_ip}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>
                      <td className="mono" style={{ fontWeight: 900, fontSize: '15px' }}>{r.risk_score}</td>
                      <td><RiskBadge value={r.classification} /></td>
                      <td>
                        {r.campaign_id ? (
                          <span
                            onClick={(e) => { e.stopPropagation(); navigate(`/attack-dna/${r.campaign_id}`) }}
                            title="View Attack DNA Cluster"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: '#fbbf24',
                              background: 'rgba(251, 191, 36, 0.12)',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            {r.campaign_id} ↗
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="muted" style={{ fontSize: '11.5px' }}>{fmtDate(r.timestamp)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => { e.stopPropagation(); navigate(`/result/${r.id}`) }}
                          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 800 }}
                        >
                          Inspect 🔍
                        </button>
                      </td>
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
