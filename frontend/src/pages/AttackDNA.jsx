import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge } from '../components/Bits.jsx'
import CampaignGraph from '../components/CampaignGraph.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'
import { useToast } from '../context/ToastContext.jsx'

function Confidence({ value }) {
  const color = value >= 75 ? 'var(--critical)' : value >= 50 ? 'var(--high)' : 'var(--medium)'
  return (
    <div>
      <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>CAMPAIGN CONFIDENCE</span>
        <span style={{ fontWeight: 900, fontSize: 22, color, fontFamily: 'var(--font-mono)' }}>{value}%</span>
      </div>
      <div className="conf-bar mt" style={{ height: '7px', background: 'var(--panel2)', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}>
        <div className="conf-fill" style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: `linear-gradient(90deg, var(--accent), ${color})`, borderRadius: '999px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

export default function AttackDNA() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [campaigns, setCampaigns] = useState([])
  const [selected, setSelected] = useState('')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const navigate = useNavigate()

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.campaigns()
      const list = r?.campaigns || []
      setCampaigns(list)

      if (list.length > 0) {
        // Check if `id` is a campaign ID or an email ID inside a campaign
        let targetCid = list[0].id
        if (id) {
          const directMatch = list.find(c => c.id.toLowerCase() === id.toLowerCase())
          if (directMatch) {
            targetCid = directMatch.id
          } else {
            const memberMatch = list.find(c => c.members?.some(m => m.id === id || m.tracking_id === id))
            if (memberMatch) {
              targetCid = memberMatch.id
            }
          }
        }
        setSelected(targetCid)
      } else {
        setSelected('')
        setDetail(null)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadList()
    const handleDataUpdate = () => loadList()
    window.addEventListener('mailtrace_data_updated', handleDataUpdate)
    return () => window.removeEventListener('mailtrace_data_updated', handleDataUpdate)
  }, [loadList])

  useEffect(() => {
    if (!selected) {
      setDetail(null)
      return
    }
    api.campaign(selected)
      .then(setDetail)
      .catch((e) => {
        console.warn('Could not load campaign detail:', e)
        if (campaigns.length > 0 && selected !== campaigns[0].id) {
          setSelected(campaigns[0].id)
        }
      })
  }, [selected, campaigns])

  const choose = (cid) => {
    setSelected(cid)
    navigate(`/attack-dna/${cid}`, { replace: true })
  }

  const handleLoadDemoCampaign = async () => {
    setBusy(true)
    try {
      await api.loadSamples()
      showToast('Loaded 3-email correlated attack campaign!', 'success')
      await loadList()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading text="Correlating attack telemetry & infrastructure…" />

  return (
    <div className="fade-in" style={{ width: '100%', margin: 0, paddingBottom: '40px' }}>
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Attack DNA &amp; Campaign Clusters</h1>
          <div className="sub">Cross-email correlation identifying coordinated phishing infrastructure and adversary campaigns.</div>
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowGuide(true)}
            className="btn"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-glow)', fontWeight: 700 }}
          >
            📖 Attack DNA Guide
          </button>
          <button
            onClick={handleLoadDemoCampaign}
            disabled={busy}
            className="btn"
            style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', fontWeight: 700 }}
          >
            {busy ? 'Loading Campaign…' : '⚡ Load Demo Campaign'}
          </button>
          <Link to="/" className="btn btn-primary">+ Scan Email</Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={loadList} />

      {campaigns.length === 0 ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <Empty
            title="No campaign clusters active yet"
            text="Campaigns appear when multiple analyzed emails share origin IPs, look-alike domain clusters, or lure patterns. Click below to load the coherent 3-email attack campaign."
          >
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
              <button onClick={handleLoadDemoCampaign} disabled={busy} className="btn btn-primary">
                ⚡ Load Coordinated Attack Campaign (3 Emails)
              </button>
              <Link to="/" className="btn">
                Scan Custom Email
              </Link>
            </div>
          </Empty>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Campaign Selector Column */}
          <div>
            <div className="sub bold" style={{ fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              IDENTIFIED CAMPAIGNS ({campaigns.length})
            </div>
            <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className={`card card-interactive clickable ${selected === c.id ? 'active' : ''}`}
                  onClick={() => choose(c.id)}
                  style={{
                    border: selected === c.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: selected === c.id ? 'var(--panel2)' : 'var(--panel)',
                    padding: '1.2rem',
                    transition: 'all 0.2s ease',
                    boxShadow: selected === c.id ? '0 0 15px var(--accent-glow)' : 'none'
                  }}
                >
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.05em' }}>
                      {c.id}
                    </span>
                    <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 800 }}>
                      {c.member_count} EMAILS
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.75rem', lineHeight: 1.3 }}>
                    {c.title}
                  </div>
                  <Confidence value={c.confidence} />
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Detail / Graph / Timeline */}
          {detail && (
            <div className="card" style={{ gridColumn: 'span 2', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Campaign Header */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span className="mono bold" style={{ color: 'var(--accent)', fontSize: 13 }}>
                      CAMPAIGN CLUSTER {detail.id}
                    </span>
                    <h2 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.4rem', fontWeight: 900 }}>
                      {detail.title}
                    </h2>
                  </div>
                  <div style={{ minWidth: 180 }}>
                    <Confidence value={detail.confidence} />
                  </div>
                </div>
              </div>

              {/* Interactive SVG Attack Graph */}
              <div>
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span>Interactive Infrastructure Attack Graph</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Emails ↔ Domains ↔ URLs ↔ IPs</span>
                </div>
                <CampaignGraph graph={detail.graph || { nodes: [], links: [] }} />
              </div>

              {/* Shared Threat Indicators */}
              <div>
                <div className="card-title" style={{ marginBottom: '0.75rem' }}>
                  Shared Forensic Infrastructure &amp; Indicators
                </div>
                <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {(detail.shared_indicators || []).map((si, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--panel2)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                          {si.label}
                        </div>
                        {si.values && (
                          <div className="mono faint" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                            {typeof si.values === 'string' ? si.values : Array.isArray(si.values) ? si.values.join(', ') : ''}
                          </div>
                        )}
                      </div>
                      <span className="mono" style={{ color: 'var(--critical)', fontWeight: 800, fontSize: '0.82rem' }}>
                        +{si.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Campaign Timeline */}
              {detail.timeline && detail.timeline.length > 0 && (
                <div>
                  <div className="card-title" style={{ marginBottom: '0.75rem' }}>
                    Attack Wave Progression Timeline
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {detail.timeline.map((evt, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < detail.timeline.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>
                            {evt.tracking_id || `WAVE #${i+1}`}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                            {evt.subject}
                          </span>
                          <span style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
                            ({evt.sender})
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
                          {evt.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlated Member Emails Table */}
              <div>
                <div className="card-title" style={{ marginBottom: '0.75rem' }}>
                  Correlated Member Emails ({detail.members?.length || 0})
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Subject</th>
                        <th>Sender</th>
                        <th>Origin IP</th>
                        <th>Risk Score</th>
                        <th>Classification</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.members || []).map((m) => (
                        <tr key={m.id}>
                          <td className="mono" style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                            {m.tracking_id || m.id.slice(0, 8)}
                          </td>
                          <td style={{ fontWeight: 700 }}>{m.subject}</td>
                          <td className="mono faint" style={{ fontSize: '0.8rem' }}>{m.sender?.address || '—'}</td>
                          <td className="mono faint" style={{ fontSize: '0.8rem' }}>{m.origin_ip || '—'}</td>
                          <td className="mono bold" style={{ fontSize: '0.95rem' }}>{m.risk_score}</td>
                          <td><RiskBadge value={m.classification} /></td>
                          <td>
                            <Link to={`/result/${m.id}`} className="btn btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                              Inspect →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Forensic Disclaimer */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--panel2)',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  color: 'var(--text-faint)',
                  borderLeft: '3px solid var(--accent)',
                  lineHeight: 1.45
                }}
              >
                ⚖️ <strong>Correlation Disclaimer:</strong> {detail.disclaimer || 'Correlation indicates shared infrastructure between emails; treat campaign results as investigative leads.'}
              </div>
            </div>
          )}
        </div>
      )}

      <PageGuideModal
        isOpen={showGuide}
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="📖 MailTrace AI — Attack DNA & Campaign Guide"
        subtitle="Graph Theory, Multi-Vector Correlation, and Infrastructure Clustering"
      />
    </div>
  )
}
