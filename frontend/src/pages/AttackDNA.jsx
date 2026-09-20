import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge } from '../components/Bits.jsx'
import CampaignGraph from '../components/CampaignGraph.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

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
  const [campaigns, setCampaigns] = useState([])
  const [selected, setSelected] = useState(id || '')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const navigate = useNavigate()

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.campaigns()
      setCampaigns(r.campaigns)
      if (!selected && r.campaigns.length) setSelected(r.campaigns[0].id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => { loadList() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    api.campaign(selected).then(setDetail).catch((e) => setError(e.message))
  }, [selected])

  useEffect(() => {
    if (id) setSelected(id)
  }, [id])

  const choose = (cid) => {
    setSelected(cid)
    navigate(`/attack-dna/${cid}`, { replace: true })
  }

  if (loading) return <Loading text="Correlating attack telemetry & infrastructure…" />

  return (
    <div className="fade-in" style={{ width: '100%', margin: 0 }}>
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
          <Link to="/" className="btn btn-primary">+ Scan Email</Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={loadList} />

      {campaigns.length === 0 ? (
        <div className="card">
          <Empty title="No campaign clusters identified yet"
            text="Campaigns appear when multiple analyzed emails share origin IPs, look-alike domain clusters, or lure patterns. Scan related test emails to observe correlation.">
            <Link to="/" className="btn btn-primary">Scan Test Emails</Link>
          </Empty>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Campaign Selection Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.6px', marginBottom: '2px' }}>
              IDENTIFIED CAMPAIGNS ({campaigns.length})
            </div>
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => choose(c.id)}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: '14px 16px',
                  borderColor: selected === c.id ? 'var(--accent)' : 'var(--border)',
                  background: selected === c.id ? 'var(--accent-dim)' : 'var(--panel)',
                  boxShadow: selected === c.id ? '0 0 16px var(--accent-glow)' : 'var(--shadow-ambient)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 14, color: selected === c.id ? 'var(--accent)' : 'var(--text)' }}>{c.id}</b>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: '#fbbf24',
                    background: 'rgba(251, 191, 36, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    ⚠ {c.confidence}%
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                  {c.title}
                </div>
                <div className="muted mt" style={{ fontSize: 11.5, marginTop: '6px', color: 'var(--text-muted)' }}>
                  {c.member_count} emails · {c.shared_indicators.length} shared indicators
                </div>
              </button>
            ))}
            <p className="disclaimer" style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px', lineHeight: 1.4 }}>
              * Correlation indicates shared infrastructure between emails. Results represent investigative leads.
            </p>
          </div>

          {/* Campaign Detail View */}
          <div style={{ gridColumn: 'span 2' }}>
            {detail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="card" style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  borderColor: 'rgba(251, 191, 36, 0.4)',
                  padding: '1.4rem 1.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.2rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '2.5rem' }}>⚡</span>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24' }}>{detail.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {detail.id} · <strong>{detail.member_count} linked emails</strong> · detected {fmtDate(detail.created_at)}
                    </div>
                  </div>
                  <div style={{ minWidth: 220, flex: '0 0 240px' }}>
                    <Confidence value={detail.confidence} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Shared Attack Vectors &amp; Indicators</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {detail.shared_indicators.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--panel2)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <strong style={{ color: 'var(--accent)' }}>{s.label}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--critical)', fontWeight: 800 }}>+{s.points} pts</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {s.values.slice(0, 3).map((v, j) => (
                            <code key={j} style={{ background: 'var(--panel)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px', color: 'var(--text)' }}>
                              {v}
                            </code>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Attack Infrastructure Graph</div>
                  <CampaignGraph campaign={detail} />
                </div>

                <div className="card">
                  <div className="card-title">Linked Campaign Emails ({detail.members.length})</div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Sender</th><th>Subject</th><th>Risk</th><th>Status</th><th>Origin IP</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {detail.members.map((m) => (
                          <tr key={m.id}>
                            <td className="mono" style={{ fontSize: '12px' }}>{m.sender?.address || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{m.subject}</td>
                            <td className="mono" style={{ fontWeight: 900, fontSize: '14px' }}>{m.risk_score}</td>
                            <td><RiskBadge value={m.classification} /></td>
                            <td className="mono" style={{ fontSize: '12px', color: 'var(--accent)' }}>{m.origin_ip || '—'}</td>
                            <td><Link className="btn btn-sm" to={`/result/${m.id}`}>Report →</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attack DNA Guide Modal */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="🧬 Attack DNA & Campaign Correlation Guide"
        subtitle="How MailTrace AI uncovers coordinated cyber adversary campaigns across disparate emails"
        tabs={[
          {
            id: 'dna',
            label: 'What is Attack DNA?',
            icon: '⚡',
            overview: 'Traditional security stops at "this email is phishing". Attack DNA correlates emails arriving across days or weeks to uncover shared attacker infrastructure.',
            steps: [
              { title: 'Beyond Isolated Events', desc: 'Rather than treating 3 emails as separate phishing attempts, Attack DNA recognizes that all 3 share the same hosting server and lure pattern.' },
              { title: 'Confidence Scoring (0–100%)', desc: 'Calculated using Jaccard similarity across shared origin IP, sender name role, look-alike domain, and target URL paths.' },
              { title: 'Actionable Intelligence', desc: 'Enables SOC teams to block entire adversary subnets and domain pools with a single mitigation rule.' }
            ]
          },
          {
            id: 'vectors',
            label: 'Correlation Vectors',
            icon: '🔗',
            overview: '4 primary forensic fingerprints analyzed during campaign clustering:',
            steps: [
              { title: '1. Shared Origin IP / Subnet', desc: 'Emails sent through the same compromised host or bulletproof hosting server (e.g. 185.220.101.47).' },
              { title: '2. Look-Alike Domain Swarms', desc: 'Adversaries register clusters of typosquats (e.g. paypa1-verify.example, paypa1-security.example).' },
              { title: '3. Shared URL Destination', desc: 'Multiple emails directing victims to identical credential-harvesting landing pages.' },
              { title: '4. Role-Based Sender Patterns', desc: 'Consistent naming conventions (e.g. support@, billing@, account@) combined with matching lure text.' }
            ]
          },
          {
            id: 'graph',
            label: 'Graph Visualization',
            icon: '🕸️',
            overview: 'Reading the multi-layered infrastructure topology graph:',
            steps: [
              { title: 'Layer 1: Emails', desc: 'Cyan nodes representing individual analyzed message files.' },
              { title: 'Layer 2: Sender Domains', desc: 'Purple nodes showing sender and reply-to domains.' },
              { title: 'Layer 3: URL Destinations', desc: 'Yellow nodes showing hyperlinks and phishing landing destinations.' },
              { title: 'Layer 4: Origin IPs', desc: 'Orange nodes showing the physical server infrastructure.' },
              { title: 'Dashed Yellow Halos', desc: 'Nodes shared between 2 or more emails, representing the shared attacker infrastructure.' }
            ]
          }
        ]}
      />
    </div>
  )
}
