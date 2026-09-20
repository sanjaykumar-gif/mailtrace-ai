import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge, StatCard } from '../components/Bits.jsx'
import { useToast } from '../context/ToastContext.jsx'
import ThreatChart from '../components/ThreatChart.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

export default function Dashboard() {
  const { showToast } = useToast()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [isLiveActive, setIsLiveActive] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
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
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  const loadSamples = async () => {
    setBusy('samples')
    try {
      const r = await api.loadSamples()
      showToast(`Loaded ${r.loaded} demo emails with attack correlation!`, 'success')
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
    <div className="fade-in">
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
          <div className="sub">Continuous email telemetry, rule evaluation, and attack campaign mapping.</div>
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

      <div className="grid grid-4">
        <StatCard label="ANALYZED" value={stats?.total ?? 0} color="#38bdf8" sub="total emails scanned" />
        <StatCard label="CRITICAL" value={stats?.critical ?? 0} color="#f43f5e" sub="score 81–100" />
        <StatCard label="HIGH RISK" value={stats?.high ?? 0} color="#f97316" sub="score 61–80" />
        <StatCard label="CAMPAIGNS" value={stats?.campaigns ?? 0} color="#fbbf24" sub="linked threat clusters" />
      </div>

      <div className="section-gap grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
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
                <Link to="/live" className="btn btn-primary">
                  Connect Mailbox
                </Link>
                <button className="btn" onClick={loadSamples} disabled={!!busy}>
                  Load Demo Set
                </button>
              </div>
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Subject / Sender</th><th>Risk</th><th>Classification</th><th>Campaign</th><th>Timestamp</th></tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/result/${r.id}`)}>
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

        <div className="card">
          <div className="card-title">Threat Matrix Distribution</div>
          {stats?.total
            ? <ThreatChart distribution={stats.distribution} />
            : <Empty title="No data recorded" text="Threat breakdowns will visualize after the first analysis." />}
          {campaigns.length > 0 && (
            <div className="mt" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div className="card-title" style={{ marginBottom: 10 }}>Active Threat Campaigns</div>
              {campaigns.slice(0, 3).map((c) => (
                <Link to={`/attack-dna/${c.id}`} key={c.id} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: 'var(--inner-radius)',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    marginBottom: '8px',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '18px' }}>⚠</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>{c.id} — {c.title}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{c.member_count} emails · {c.confidence}% correlation confidence</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SOC Playbook Guide Modal */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="📊 SOC Incident & Threat Matrix Guide"
        subtitle="Operational reference for triaging email attacks, evaluating scores, and correlating campaigns"
        tabs={[
          {
            id: 'scoring',
            label: 'Risk Score Matrix',
            icon: '🎯',
            overview: 'MailTrace AI employs deterministic, evidence-based threat scoring from 0 to 100.',
            steps: [
              { title: '0–20 SAFE', desc: 'Valid SPF, DKIM, and DMARC alignment. Sender reputation is clean with zero phishing keywords or masked links.' },
              { title: '21–40 LOW', desc: 'Informational notice or minor marketing irregularities. Low risk of credential harvesting.' },
              { title: '41–60 MEDIUM', desc: 'Suspicious sender identity, look-alike domain flags, or urgency pressure triggers.' },
              { title: '61–80 HIGH', desc: 'Failed DMARC/SPF authentication, executive impersonation (BEC), or risky attachments.' },
              { title: '81–100 CRITICAL', desc: 'Active phishing attack! Zero-width character obfuscation, disguised URLs, and credential theft payloads.' }
            ]
          },
          {
            id: 'campaigns',
            label: 'Attack Campaign Correlation',
            icon: '⚡',
            overview: 'The Attack DNA engine links isolated threats into coherent, multi-target adversary campaigns.',
            steps: [
              { title: 'Shared Origin Infrastructure', desc: 'Detects multiple emails originating from the same ASN, IP subnet, or rogue mail server.' },
              { title: 'Look-Alike Domain Swarms', desc: 'Correlates typosquatted domains (e.g. paypa1-verify.example, paypa1-security.example).' },
              { title: 'Confidence Scoring', desc: 'Calculates 0–100% campaign confidence using graph connectivity and Jaccard similarity metrics.' }
            ]
          },
          {
            id: 'triage',
            label: 'Analyst Triage Workflow',
            icon: '🛡️',
            overview: 'Standard Operating Procedure (SOP) for investigating flagged emails.',
            steps: [
              { title: 'Step 1: Check Verdict Card', desc: 'Review the high-level risk score and primary reason in the Scan Report.' },
              { title: 'Step 2: Inspect Forensics', desc: 'Open the Forensics page to analyze full Received-hop headers, SPF records, and inert URLs.' },
              { title: 'Step 3: Contain & Block', desc: 'Copy the firewall block rules (origin IP, sender domain) and blacklist across your email gateway.' }
            ]
          }
        ]}
      />
    </div>
  )
}
