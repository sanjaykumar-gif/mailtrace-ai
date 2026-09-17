import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Evidence, Loading, RiskBadge } from '../components/Bits.jsx'
import ScoreGauge from '../components/ScoreGauge.jsx'
import AuthPanel from '../components/AuthPanel.jsx'
import UrlTable from '../components/UrlTable.jsx'

function ScoreBreakdown({ indicators }) {
  const total = Math.min((indicators || []).reduce((s, i) => s + (i.points || 0), 0), 100)
  if (!indicators?.length) {
    return <p className="muted" style={{ fontSize: 13 }}>No scoring indicators — clean across all detectors.</p>
  }
  return (
    <div>
      {indicators.map((i, idx) => (
        <div className="score-line" key={idx}>
          <span>{i.label}</span>
          <span className="mono" style={{ color: 'var(--high)', fontWeight: 800 }}>+{i.points}</span>
        </div>
      ))}
      <div className="score-total-row">
        <span>Total (capped at 100)</span>
        <span className="mono">{total}</span>
      </div>
    </div>
  )
}

export default function Result() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('simple') // 'simple' or 'expert'
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await api.analysis(id))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <Loading text="Analyzing email evidence…" />
  if (error) {
    return (
      <div>
        <ErrorBanner error={error} onRetry={load} />
        <Link to="/analyze" className="btn">Back to Analyze</Link>
      </div>
    )
  }
  if (!data) return null

  const ex = data.explanation || {}
  const reasons = ex.reasons || []
  const isDangerous = ['CRITICAL', 'HIGH'].includes(data.classification)
  const isSafe = data.classification === 'SAFE'

  return (
    <div>
      {/* Header */}
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>Threat Analysis Report</h1>
            <RiskBadge value={data.classification} />
          </div>
          <div className="sub mono" style={{ fontSize: '0.85rem' }}>
            Subject: <strong>{data.subject}</strong> · From: <span className="mono">{data.sender?.address || 'unknown'}</span>
          </div>
        </div>
        <div className="spacer" />

        {/* View Mode Switcher */}
        <div style={{
          display: 'flex',
          background: '#111827',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid #1f2937'
        }}>
          <button
            onClick={() => setViewMode('simple')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: viewMode === 'simple' ? 'bold' : 'normal',
              background: viewMode === 'simple' ? '#2563eb' : 'transparent',
              color: viewMode === 'simple' ? '#fff' : '#9ca3af',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            🧑‍💻 Easy / Plain English
          </button>
          <button
            onClick={() => setViewMode('expert')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: viewMode === 'expert' ? 'bold' : 'normal',
              background: viewMode === 'expert' ? '#2563eb' : 'transparent',
              color: viewMode === 'expert' ? '#fff' : '#9ca3af',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            🔬 Deep Forensics
          </button>
        </div>

        <Link className="btn" to={`/forensics/${data.id}`}>Full Forensics →</Link>
        <Link className="btn btn-primary" to="/analyze">+ Scan Another</Link>
      </div>

      {/* Big Visual Verdict Card for Plain-English Users */}
      <div style={{
        background: isDangerous
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.05) 100%)'
          : isSafe
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.05) 100%)',
        border: `1px solid ${isDangerous ? '#ef444466' : isSafe ? '#22c55e66' : '#f59e0b66'}`,
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            fontSize: '2.5rem',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: isDangerous ? 'rgba(239, 68, 68, 0.2)' : isSafe ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'
          }}>
            {isDangerous ? '🛑' : isSafe ? '✅' : '⚠️'}
          </div>
          <div>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: isDangerous ? '#fca5a5' : isSafe ? '#86efac' : '#fde68a'
            }}>
              {isDangerous
                ? `SECURITY ALERT: ${data.threat_type ? data.threat_type.toUpperCase() : 'POTENTIAL THREAT'}`
                : isSafe
                  ? 'LEGITIMATE & SAFE EMAIL'
                  : 'SUSPICIOUS EMAIL DETECTED'}
            </div>
            <div style={{ color: '#d1d5db', fontSize: '0.9rem', marginTop: '0.2rem', maxWidth: '680px' }}>
              {ex.recommended_action || (isDangerous
                ? 'Do not click links, open attachments, or reply with credentials.'
                : 'This email passed security checks without signs of deception.')}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: '120px' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>THREAT SCORE</div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: isDangerous ? '#ef4444' : isSafe ? '#22c55e' : '#f59e0b',
            fontFamily: 'monospace'
          }}>
            {data.risk_score}<span style={{ fontSize: '1rem', color: '#6b7280' }}>/100</span>
          </div>
        </div>
      </div>

      {/* Related Campaign Banner (if any) */}
      {data.campaign && (
        <div className="campaign-banner mb" style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '1rem' }}>
              Correlated Attack Campaign Detected: {data.campaign.id} ({data.campaign.title})
            </div>
            <div style={{ color: '#d1d5db', fontSize: '0.85rem' }}>
              This email shares infrastructure (IPs/domains/lures) with <strong>{data.campaign.member_count} other suspicious emails</strong> (Confidence: {data.campaign.confidence}%).
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Link to={`/attack-dna/${data.campaign.id}`} className="btn" style={{ background: '#d97706', color: '#fff', border: 'none' }}>
              View Attack Graph →
            </Link>
          </div>
        </div>
      )}

      {/* EASY / SIMPLE VIEW */}
      {viewMode === 'simple' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Plain English "Why it was flagged" Cards */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f3f4f6', marginTop: 0, marginBottom: '0.5rem' }}>
              💡 What We Found (Plain-English Summary)
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: 0, marginBottom: '1.25rem' }}>
              Here is why our security engine evaluated this message:
            </p>

            {reasons.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {reasons.map((r, idx) => (
                  <div key={idx} style={{
                    background: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171'
                        }}>
                          +{r.points} Threat Points
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'capitalize' }}>
                          [{r.group}]
                        </span>
                      </div>
                      <div style={{ color: '#f3f4f6', fontSize: '0.9rem', fontWeight: 600 }}>
                        {r.reason}
                      </div>
                    </div>
                    {r.evidence && (
                      <div style={{
                        background: '#090d16',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        Evidence: {r.evidence}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                color: '#4ade80'
              }}>
                ✓ No threat indicators found. Sender, links, and content all match legitimate patterns.
              </div>
            )}
          </div>

          {/* Action Recommendations Card */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f3f4f6', marginTop: 0, marginBottom: '0.75rem' }}>
              🛡️ Recommended Action Checklist
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              {isDangerous ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5' }}>
                    <span>❌</span> <strong>Do NOT click any links</strong> inside this email.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5' }}>
                    <span>❌</span> <strong>Do NOT open or download attachments</strong> (they could contain malware).
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5' }}>
                    <span>❌</span> <strong>Do NOT reply</strong> with passwords, OTPs, or financial information.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#93c5fd' }}>
                    <span>📩</span> Mark this message as <strong>Phishing / Spam</strong> in your email app.
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#86efac' }}>
                  <span>✓</span> This email looks safe to read. Exercise standard everyday caution.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* EXPERT / FORENSIC VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid grid-2">
            <div className="card">
              <div className="card-title">Risk Score Gauge</div>
              <ScoreGauge score={data.risk_score} classification={data.classification}
                probability={data.phishing_probability} threatType={data.threat_type} />
            </div>
            <div className="card">
              <div className="card-title">Threat Score Breakdown</div>
              <ScoreBreakdown indicators={data.indicators} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Forensic Indicators ({data.indicators?.length || 0})</div>
            {reasons.map((r, i) => (
              <div className="evidence" key={i}>
                <span className="ev-check">✓</span>
                <div className="evidence-body">
                  <div className="evidence-label">{r.group?.toUpperCase()} — {r.reason}</div>
                  <div className="evidence-text mono">{r.evidence}</div>
                </div>
                <span className="mono" style={{ color: 'var(--high)', fontWeight: 800 }}>+{r.points}</span>
              </div>
            ))}
          </div>

          {/* Live DNS & GeoIP Block in Expert View */}
          {(data.live_dns || data.live_ip) && (
            <div className="card">
              <div className="card-title">🌐 Live DNS & Origin Network Intelligence</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                {data.live_dns && (
                  <div>
                    <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.25rem' }}>Domain DNS</div>
                    <div>MX: {data.live_dns.has_mx ? 'Active' : 'No MX'}</div>
                    <div>SPF: <span className="mono" style={{ fontSize: '0.75rem' }}>{data.live_dns.spf_record || 'None'}</span></div>
                    <div>DMARC: {data.live_dns.dmarc_policy || 'None'}</div>
                  </div>
                )}
                {data.live_ip && (
                  <div>
                    <div style={{ color: '#a78bfa', fontWeight: 'bold', marginBottom: '0.25rem' }}>IP Location</div>
                    <div>IP: <span className="mono">{data.live_ip.ip}</span></div>
                    <div>Location: {data.live_ip.city ? `${data.live_ip.city}, ` : ''}{data.live_ip.country}</div>
                    <div>ISP: {data.live_ip.isp || data.live_ip.org}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
