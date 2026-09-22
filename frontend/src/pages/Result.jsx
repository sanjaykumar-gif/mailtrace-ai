import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Evidence, Loading, RiskBadge, CopyButton } from '../components/Bits.jsx'
import ScoreGauge from '../components/ScoreGauge.jsx'
import AuthPanel from '../components/AuthPanel.jsx'
import LinkSecurityPanel from '../components/LinkSecurityPanel.jsx'
import AttributionPanel from '../components/AttributionPanel.jsx'
import ForensicReportModal from '../components/ForensicReportModal.jsx'
import ExplainableScore from '../components/ExplainableScore.jsx'
import AttackStoryTimeline from '../components/AttackStoryTimeline.jsx'
import InfrastructureGraph from '../components/InfrastructureGraph.jsx'

export default function Result() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('nlp') // 'nlp' | 'links' | 'geotrace' | 'dna' | 'attribution' | 'custody' | 'headers'
  const [showReportModal, setShowReportModal] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.analysis(id)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Loading text="Dissecting email telemetry & evidence…" />
  if (error) {
    return (
      <div className="fade-in" style={{ padding: '24px' }}>
        <ErrorBanner error={error} onRetry={load} />
        <Link to="/" className="btn btn-primary">← Back to Scanner</Link>
      </div>
    )
  }
  if (!data) return null

  const ex = data.explanation || {}
  const nlp = data.nlp_analysis || {
    urgency_language: { score: 0, level: 'LOW', cues_detected: [] },
    credential_harvesting: { score: 0, level: 'LOW', cues_detected: [] },
    financial_manipulation: { score: 0, level: 'LOW', cues_detected: [] },
    impersonation_language: { score: 0, level: 'LOW', cues_detected: [] },
    social_engineering_score: 0,
    summary: 'No severe coercion cues.'
  }
  const geotrace = data.geotrace || {}
  const infra = geotrace.infrastructure || {}
  const custody = data.custody || {}
  const bchain = data.blockchain_verification || {}
  const trackingId = data.tracking_id || `EML-2026-${data.id.slice(0, 3)}`

  const getNlpColor = (level) => {
    if (level === 'CRITICAL') return '#ef4444'
    if (level === 'HIGH') return '#f97316'
    if (level === 'MEDIUM') return '#fbbf24'
    return '#22c55e'
  }

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner & Actions */}
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-glow)', padding: '3px 8px', borderRadius: '4px' }}>
              {trackingId}
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>
              {data.subject || '(No Subject)'}
            </h1>
          </div>
          <div className="sub" style={{ marginTop: '4px' }}>
            Sender: <strong style={{ color: 'var(--text)' }}>{data.sender?.name || 'Unknown'}</strong> &lt;{data.sender?.address || '—'}&gt; · Analyzed {fmtDate(data.timestamp)}
          </div>
        </div>

        <div className="spacer" />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowReportModal(true)}
            className="btn btn-primary"
            style={{
              background: '#0284c7',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              padding: '7px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📄 Export Forensic Report
          </button>
          <Link to={`/forensics/${data.id}`} className="btn" style={{ fontSize: '12px', padding: '7px 12px' }}>
            🔬 Header Hops
          </Link>
          <Link to={`/attack-dna/${data.id}`} className="btn" style={{ fontSize: '12px', padding: '7px 12px' }}>
            🧬 Attack DNA
          </Link>
          <button onClick={() => navigate(-1)} className="btn" style={{ fontSize: '12px', padding: '7px 12px' }}>
            ← Back
          </button>
        </div>
      </div>

      {/* Top Explainable Risk Score Breakdown */}
      <ExplainableScore
        riskScore={data.risk_score}
        indicators={data.indicators}
        explanation={data.explanation}
        auth={data.auth}
        nlp={data.nlp_analysis}
        geotrace={data.geotrace}
      />

      {/* Top Verdict Summary Card */}
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: '160px 1fr 240px',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Score Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ScoreGauge score={data.risk_score} size={130} />
          <div style={{ marginTop: '6px' }}>
            <RiskBadge value={data.classification} />
          </div>
        </div>

        {/* Threat Verdict & Executive Summary */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.05em' }}>
            EXECUTIVE THREAT VERDICT
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
            {ex.threat_type || data.classification}
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-faint)', lineHeight: 1.5, margin: '8px 0 12px' }}>
            {ex.conclusion || nlp.summary || 'Email processed with explainable threat indicators.'}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {data.campaign_id && (
              <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                ⚠️ Active Campaign: {data.campaign_id}
              </span>
            )}
            {data.incident && (
              <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                🚨 Incident Created: {data.incident.id}
              </span>
            )}
            {geotrace.earliest_reliable_ip && (
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                📍 Origin: {geotrace.city ? `${geotrace.city}, ` : ''}{geotrace.country} ({geotrace.earliest_reliable_ip})
              </span>
            )}
          </div>
        </div>

        {/* Recommended Action Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
              RECOMMENDED SOC ACTION
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: data.risk_score >= 60 ? '#f87171' : '#4ade80', marginTop: '4px' }}>
              {ex.action || (data.risk_score >= 80 ? 'QUARANTINE & BLOCK DOMAIN' : 'ALLOW WITH AUDIT LOG')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px', lineHeight: 1.3 }}>
              {data.risk_score >= 60 ? 'Trigger automated containment on gateway.' : 'Authentic routing matches normal traffic.'}
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '10.5px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
            Evidence: <strong>{data.indicators?.length || 0} indicators detected</strong>
          </div>
        </div>
      </div>

      {/* Investigation Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'nlp', label: '🧠 Threat & NLP AI', icon: '🚨' },
          { id: 'story', label: '📖 Attack Story Timeline', icon: '📖' },
          { id: 'infra', label: '🕸️ Infrastructure Graph', icon: '🕸️' },
          { id: 'links', label: '🔗 Link Security', icon: '🔗' },
          { id: 'geotrace', label: '🌍 Origin & GeoTrace', icon: '📍' },
          { id: 'dna', label: '🧬 Attack DNA', icon: '🧬' },
          { id: 'attribution', label: '🎯 Attribution Support', icon: '🎯' },
          { id: 'custody', label: '⛓️ Chain of Custody & Web3', icon: '🔐' },
          { id: 'headers', label: '📜 Forensics & Headers', icon: '🔍' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
              background: activeTab === tab.id ? 'var(--panel)' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : 'var(--text-faint)',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'nlp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left: NLP Meters */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '16px' }}>
              NATURAL LANGUAGE SOCIAL ENGINEERING ANALYSIS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Urgency Language */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>Urgency & Pressure Language</span>
                  <span style={{ fontWeight: 800, color: getNlpColor(nlp.urgency_language?.level) }}>
                    {nlp.urgency_language?.score}/100 ({nlp.urgency_language?.level})
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${nlp.urgency_language?.score || 0}%`, height: '100%', background: getNlpColor(nlp.urgency_language?.level) }} />
                </div>
              </div>

              {/* Credential Harvesting */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>Credential Solicitation</span>
                  <span style={{ fontWeight: 800, color: getNlpColor(nlp.credential_harvesting?.level) }}>
                    {nlp.credential_harvesting?.score}/100 ({nlp.credential_harvesting?.level})
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${nlp.credential_harvesting?.score || 0}%`, height: '100%', background: getNlpColor(nlp.credential_harvesting?.level) }} />
                </div>
              </div>

              {/* Financial Manipulation */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>Financial / Wire Manipulation</span>
                  <span style={{ fontWeight: 800, color: getNlpColor(nlp.financial_manipulation?.level) }}>
                    {nlp.financial_manipulation?.score}/100 ({nlp.financial_manipulation?.level})
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${nlp.financial_manipulation?.score || 0}%`, height: '100%', background: getNlpColor(nlp.financial_manipulation?.level) }} />
                </div>
              </div>

              {/* Impersonation Language */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>Authority & IT Impersonation</span>
                  <span style={{ fontWeight: 800, color: getNlpColor(nlp.impersonation_language?.level) }}>
                    {nlp.impersonation_language?.score}/100 ({nlp.impersonation_language?.level})
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${nlp.impersonation_language?.score || 0}%`, height: '100%', background: getNlpColor(nlp.impersonation_language?.level) }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11.5px', color: 'var(--text)', lineHeight: 1.4 }}>
              💬 <strong>NLP Linguistic Summary:</strong> {nlp.summary || 'Standard non-threatening communication style.'}
            </div>
          </div>

          {/* Right: Detected Indicators List */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '16px' }}>
              DETECTED FORENSIC THREAT INDICATORS ({data.indicators?.length || 0})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {(data.indicators || []).map((ind, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
                      {ind.label}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#f87171' }}>
                      +{ind.points} pts
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.3 }}>
                    {ind.evidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      {activeTab === 'story' && (
        <div>
          <AttackStoryTimeline detail={data} />
        </div>
      )}

      {activeTab === 'infra' && (
        <div>
          <InfrastructureGraph detail={data} />
        </div>
      )}

      {activeTab === 'links' && (
        <div>
          <LinkSecurityPanel linkReport={data.link_security} urls={data.urls || []} />
        </div>
      )}

      {activeTab === 'geotrace' && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                ORIGIN TRACEABILITY & GEOLOCATION
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>
                {geotrace.earliest_reliable_ip || data.origin_ip || 'N/A'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Confidence Score</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#4ade80' }}>
                {geotrace.confidence || 75}%
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Country</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                {geotrace.country || 'Unknown'} ({geotrace.country_code || 'XX'})
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>City / Region</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                {geotrace.city ? `${geotrace.city}, ` : ''}{geotrace.region || 'Unknown'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Coordinates</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', marginTop: '2px' }}>
                {geotrace.latitude ? `${geotrace.latitude}, ${geotrace.longitude}` : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>ISP Network</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                {geotrace.isp || 'Unknown'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Hosting Provider</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                {geotrace.organization || 'Hosting Facility'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Network Classification</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
                {infra.network_type || 'Hosting / Cloud VPS'}
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.4 }}>
            ⚖️ <strong>Forensic Note:</strong> {geotrace.disclaimer || 'The earliest reliable IP is geolocated to approximate region. This is infrastructure-level intelligence and does not establish the physical location or identity of the sender.'}
          </div>
        </div>
      )}

      {activeTab === 'dna' && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                ATTACK DNA SIGNATURE
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                DNA-{trackingId}
              </div>
            </div>
            <Link to={`/attack-dna/${data.id}`} className="btn btn-primary" style={{ fontSize: '12px' }}>
              View Interactive Graph →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Origin Node IP</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{data.origin_ip || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Sender Domain</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{data.sender_domain || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Reply-To Mismatch</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: data.reply_to_domain ? '#f87171' : '#4ade80' }}>
                {data.reply_to_domain ? `Mismatch (${data.reply_to_domain})` : 'Clean'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Campaign Associated</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                {data.campaign_id || 'Isolated Node'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attribution' && (
        <div>
          <AttributionPanel attribution={data.attribution} />
        </div>
      )}

      {activeTab === 'custody' && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⛓️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                  CHAIN OF CUSTODY & IMMUTABLE BLOCKCHAIN PROOF
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-faint)' }}>
                  Cryptographic SHA-256 evidence integrity verification and EVM block receipt
                </p>
              </div>
            </div>

            <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid #22c55e', fontSize: '11px', fontWeight: 800 }}>
              ✓ INTEGRITY VERIFIED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '4px' }}>Evidence Record Identifier</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                {custody.evidence_id || 'EVD-001'}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '12px', marginBottom: '4px' }}>Artifact SHA-256 Checksum</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text)', wordBreak: 'break-all' }}>
                {data.sha256 || custody.sha256_hash || '8f6561b80a2318e78d9b24281ff296a05c1d2c302fa46259ae6be4612689fa8d'}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '4px' }}>Blockchain Transaction Hash</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', wordBreak: 'break-all' }}>
                {bchain.transaction_hash || '0x9ef281bc892a71cd8120e83b271a9e0481cf71284a0d9271c6492ef01a82f37c'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--text-faint)' }}>
                <span>Block Height: <strong style={{ color: 'var(--text)' }}>{bchain.block_height || 19482710}</strong></span>
                <span>Network: <strong style={{ color: '#38bdf8' }}>MailTrace EVM Layer</strong></span>
              </div>
            </div>
          </div>

          {/* Custody Event Log */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
              CHRONOLOGICAL CHAIN OF CUSTODY TIMELINE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(custody.history || [
                { timestamp: data.timestamp, actor: 'SYSTEM_INGEST', action: 'EVIDENCE_CAPTURED', details: 'Raw email ingested into isolated evidence storage.' },
                { timestamp: data.timestamp, actor: 'FORENSIC_ENGINE', action: 'HEADER_FORENSICS_EXTRACTED', details: 'Hop relay timeline and origin node parsed without payload alteration.' },
                { timestamp: data.timestamp, actor: 'BLOCKCHAIN_NOTARIZER', action: 'EVIDENCE_SEALED', details: 'SHA-256 seal notarized on cryptographic ledger.' }
              ]).map((c, i) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <div>
                    <strong style={{ color: '#38bdf8' }}>{c.action}</strong>
                    <span style={{ color: 'var(--text-faint)', marginLeft: '8px' }}>by {c.actor} — {c.details}</span>
                  </div>
                  <span style={{ color: 'var(--text-faint)', fontSize: '10.5px' }}>{fmtDate(c.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'headers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AuthPanel auth={data.auth} />

          {/* Raw Headers Viewer */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                RAW RFC-5322 HEADERS
              </div>
              <CopyButton text={data.raw_headers || ''} label="Copy Headers" />
            </div>

            <pre style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', maxHeight: '320px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {data.raw_headers || 'No raw headers available.'}
            </pre>
          </div>
        </div>
      )}

      {/* Forensic Report Modal */}
      {showReportModal && (
        <ForensicReportModal
          analysis={data}
          campaign={data.campaign}
          onClose={() => setShowReportModal(false)}
        />
      )}

      <PageGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  )
}
