import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Evidence, Loading, RiskBadge, CopyButton } from '../components/Bits.jsx'
import ScoreGauge from '../components/ScoreGauge.jsx'
import AuthPanel from '../components/AuthPanel.jsx'
import UrlTable from '../components/UrlTable.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

function ScoreBreakdown({ indicators }) {
  const total = Math.min((indicators || []).reduce((s, i) => s + (i.points || 0), 0), 100)
  if (!indicators?.length) {
    return <p className="muted" style={{ fontSize: 13 }}>No scoring indicators — clean across all security detectors.</p>
  }
  return (
    <div>
      {indicators.map((i, idx) => (
        <div className="score-line" key={idx}>
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>{i.label}</span>
          <span className="mono" style={{ color: 'var(--critical)', fontWeight: 800, fontSize: '13px' }}>
            +{i.points}
          </span>
        </div>
      ))}
      <div className="score-total-row">
        <span style={{ fontSize: '14px', fontWeight: 800 }}>Calculated Risk (capped at 100)</span>
        <span className="mono" style={{ fontSize: '18px', fontWeight: 900, color: 'var(--accent)' }}>
          {total}
        </span>
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
  const [showGuide, setShowGuide] = useState(false)
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

  const guideTabs = [
    {
      id: 'understanding',
      name: 'Score Interpretation',
      icon: '📊',
      title: 'How Risk Scores & Classifications Work',
      steps: [
        'The composite score (0–100) is built by summing weighted indicator penalty points across Auth, Urgency, URLs, Headers, and Content.',
        '0–19 (SAFE): Authentic origin, passing DMARC/SPF, reputable domain, benign content.',
        '20–39 (LOW RISK): Minor non-critical anomalies, no immediate credential harvest markers.',
        '40–69 (SUSPICIOUS): Authentication warnings, urgency phrasing, or unknown sender domains requiring analyst review.',
        '70–89 (HIGH RISK): Domain spoofing, homoglyph deception, or detected credential phishing forms.',
        '90–100 (CRITICAL MALICIOUS): Confirmed malicious payload, active brand impersonation with failed security checks.'
      ],
      proTip: 'Use "Plain English" mode for non-technical user briefings, and "Deep Forensic" mode for full RFC 5322 header traces.'
    },
    {
      id: 'actions',
      name: 'Incident Response',
      icon: '🚨',
      title: 'Recommended SOC Remediation Steps',
      steps: [
        'For HIGH or CRITICAL scores: Immediately quarantine the email from all recipient mailboxes via Microsoft 365 / Google Workspace admin console.',
        'Block sender IP and top-level domain on your email gateway and perimeter firewall.',
        'Submit identified malicious URLs to your Web Proxy / EDR blocklists.',
        'If users clicked any enclosed links, trigger automated credential resets and revoke active OAuth tokens.'
      ],
      proTip: 'Click "🔬 Full Forensics" to inspect the raw transit hops and locate the true sender IP behind spoofed From headers.'
    }
  ]

  if (loading) return <Loading text="Dissecting email telemetry & evidence…" />
  if (error) {
    return (
      <div className="fade-in">
        <ErrorBanner error={error} onRetry={load} />
        <Link to="/" className="btn btn-primary">← Back to Scanner</Link>
      </div>
    )
  }
  if (!data) return null

  const ex = data.explanation || {}
  const reasons = ex.reasons || []
  const isDangerous = ['CRITICAL', 'HIGH'].includes(data.classification)
  const isSafe = data.classification === 'SAFE'

  return (
    <div className="fade-in" style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Header */}
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ margin: 0 }}>Forensic Scan Report</h1>
            <RiskBadge value={data.classification} />
          </div>
          <div className="sub mono" style={{ fontSize: '0.85rem' }}>
            Subject: <strong>{data.subject || '(No Subject)'}</strong> · From: <span className="mono">{data.sender?.address || 'unknown'}</span>
          </div>
        </div>
        <div className="spacer" />

        {/* View Mode Switcher */}
        <div className="tabs" style={{ maxWidth: '300px' }}>
          <button
            onClick={() => setViewMode('simple')}
            className={`tab ${viewMode === 'simple' ? 'active' : ''}`}
          >
            🧑‍💻 Plain English
          </button>
          <button
            onClick={() => setViewMode('expert')}
            className={`tab ${viewMode === 'expert' ? 'active' : ''}`}
          >
            🔬 Deep Forensic
          </button>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setShowGuide(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          📖 Guide
        </button>

        <Link className="btn" to={`/forensics/${data.id}`}>🔬 Full Forensics →</Link>
        <Link className="btn btn-primary" to="/">+ Scan Another</Link>
      </div>

      {/* Visual Verdict Card */}
      <div className="card" style={{
        background: isDangerous
          ? 'radial-gradient(ellipse at top left, var(--critical-glow), var(--panel) 70%)'
          : isSafe
            ? 'radial-gradient(ellipse at top left, var(--safe-glow), var(--panel) 70%)'
            : 'radial-gradient(ellipse at top left, var(--medium-glow), var(--panel) 70%)',
        borderColor: isDangerous ? 'rgba(244, 63, 94, 0.4)' : isSafe ? 'rgba(16, 185, 129, 0.4)' : 'rgba(251, 191, 36, 0.4)',
        padding: '1.6rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{
            fontSize: '2.5rem',
            width: '58px',
            height: '58px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: isDangerous ? 'rgba(244, 63, 94, 0.15)' : isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
            boxShadow: `0 0 20px ${isDangerous ? 'rgba(244, 63, 94, 0.3)' : isSafe ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
          }}>
            {isDangerous ? '🛑' : isSafe ? '✅' : '⚠️'}
          </div>
          <div>
            <div style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: isDangerous ? 'var(--critical)' : isSafe ? 'var(--safe)' : 'var(--medium)',
              letterSpacing: '-0.02em'
            }}>
              {isDangerous
                ? (data.threat_type ? data.threat_type.toUpperCase() : 'MALICIOUS THREAT DETECTED')
                : isSafe
                  ? 'VERIFIED SAFE EMAIL'
                  : 'SUSPICIOUS EMAIL'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', maxWidth: '680px', lineHeight: 1.45 }}>
              {ex.recommended_action || (isDangerous
                ? 'Do not interact with links, download attachments, or provide credentials.'
                : 'Email authenticated cleanly without indicators of deception or spoofing.')}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: '120px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', fontWeight: 800, letterSpacing: '0.5px' }}>THREAT SCORE</div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            color: isDangerous ? 'var(--critical)' : isSafe ? 'var(--safe)' : 'var(--medium)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.1
          }}>
            {data.risk_score}<span style={{ fontSize: '1.1rem', color: 'var(--text-faint)' }}>/100</span>
          </div>
        </div>
      </div>

      {/* Related Campaign Banner (if correlated) */}
      {data.campaign && (
        <div className="card" style={{
          background: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.4)',
          padding: '1.2rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.2rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '2.2rem' }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1.05rem' }}>
              Correlated Attack Campaign: {data.campaign.id} ({data.campaign.title})
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              Linked across <strong>{data.campaign.member_count} related emails</strong> with <strong>{data.campaign.confidence}% correlation confidence</strong>.
            </div>
          </div>
          <div>
            <Link to={`/attack-dna/${data.campaign.id}`} className="btn" style={{ background: '#d97706', color: '#fff', border: 'none', fontWeight: 700 }}>
              View Attack Campaign →
            </Link>
          </div>
        </div>
      )}

      {/* EASY / SIMPLE VIEW */}
      {viewMode === 'simple' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          {/* Plain English Findings */}
          <div className="card">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>
              <span>💡 Identified Risk Factors</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.35rem', marginBottom: '1.25rem' }}>
              Summary of specific reasons why this message received a risk score of {data.risk_score}/100:
            </p>

            {reasons.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {reasons.map((r, idx) => (
                  <div key={idx} style={{
                    background: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.6rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(244, 63, 94, 0.12)',
                          color: '#fda4af'
                        }}>
                          +{r.points} pts
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {r.group}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text)', fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.4 }}>
                        {r.reason}
                      </div>
                    </div>
                    {r.evidence && (
                      <div style={{
                        background: 'var(--bg)',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        wordBreak: 'break-all',
                        border: '1px solid var(--border)'
                      }}>
                        Evidence: {r.evidence}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                padding: '1.25rem',
                color: '#6ee7b7',
                fontSize: '0.9rem'
              }}>
                ✓ Clean email. Sender authentication, routing headers, and links conform to legitimate standards.
              </div>
            )}
          </div>

          {/* Action Recommendations Card */}
          <div className="card">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>
              <span>🛡️ Recommended Security Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              {isDangerous ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fda4af' }}>
                    <span style={{ fontSize: '1.2rem' }}>❌</span> <strong>Do NOT click any hyperlinks</strong> embedded in this email.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fda4af' }}>
                    <span style={{ fontSize: '1.2rem' }}>❌</span> <strong>Do NOT download or preview attachments.</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fda4af' }}>
                    <span style={{ fontSize: '1.2rem' }}>❌</span> <strong>Do NOT reply</strong> with credentials, financial data, or MFA codes.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#38bdf8' }}>
                    <span style={{ fontSize: '1.2rem' }}>📩</span> Mark this message as <strong>Phishing / Malicious</strong> in your email client.
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6ee7b7' }}>
                  <span style={{ fontSize: '1.2rem' }}>✓</span> This email appears authentic and safe to open. Standard caution applies.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* EXPERT / FORENSIC VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          <div className="grid grid-2">
            <div className="card">
              <div className="card-title">Score Gauge Meter</div>
              <ScoreGauge score={data.risk_score} classification={data.classification}
                probability={data.phishing_probability} threatType={data.threat_type} />
            </div>
            <div className="card">
              <div className="card-title">Score Evidence Breakdown</div>
              <ScoreBreakdown indicators={data.indicators} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Detected Indicators ({data.indicators?.length || 0})</div>
            {reasons.map((r, i) => (
              <div className="evidence" key={i}>
                <span className="ev-check">✓</span>
                <div className="evidence-body">
                  <div className="evidence-label">{r.group?.toUpperCase()} — {r.reason}</div>
                  <div className="evidence-text mono">{r.evidence}</div>
                </div>
                <span className="mono" style={{ color: 'var(--critical)', fontWeight: 800 }}>+{r.points}</span>
              </div>
            ))}
          </div>

          {/* Live DNS & GeoIP Block in Expert View */}
          {(data.live_dns || data.live_ip) && (
            <div className="card">
              <div className="card-title">🌐 Live DNS &amp; Origin Network Intelligence</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', fontSize: '0.86rem' }}>
                {data.live_dns && (
                  <div>
                    <div style={{ color: 'var(--accent)', fontWeight: 800, marginBottom: '0.4rem' }}>Domain DNS</div>
                    <div>MX: {data.live_dns.has_mx ? '✓ Active Server' : '✕ No MX'}</div>
                    <div>SPF: <span className="mono" style={{ fontSize: '0.78rem' }}>{data.live_dns.spf_record || 'None'}</span></div>
                    <div>DMARC: {data.live_dns.dmarc_policy || 'None'}</div>
                  </div>
                )}
                {data.live_ip && (
                  <div>
                    <div style={{ color: '#a78bfa', fontWeight: 800, marginBottom: '0.4rem' }}>Origin IP Geolocation</div>
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

      {/* Forensic Report Guidance Modal */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="Forensic Scan Report Guide"
        subtitle="Interpretation framework for threat indicator scoring, plain English vs deep forensic views, and incident response."
        tabs={guideTabs}
      />
    </div>
  )
}

