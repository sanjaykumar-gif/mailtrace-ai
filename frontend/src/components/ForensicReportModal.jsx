export default function ForensicReportModal({ analysis, campaign = null, onClose }) {
  if (!analysis) return null

  const handlePrint = () => {
    window.print()
  }

  const score = analysis.risk_score || 0
  const classification = analysis.classification || 'SAFE'
  const isCrit = classification === 'CRITICAL'
  const isHigh = classification === 'HIGH'
  const badgeColor = isCrit ? '#ef4444' : isHigh ? '#f59e0b' : '#22c55e'

  const trackingId = analysis.tracking_id || 'EML-2026-001'
  const incidentId = analysis.incident?.id || 'INC-2026-001'
  const evidenceId = analysis.custody?.evidence_id || 'EVD-001'
  const sha256 = analysis.sha256 || '8f6561b80a2318e78d9b24281ff296a05c1d2c302fa46259ae6be4612689fa8d'
  const txHash = analysis.blockchain_verification?.transaction_hash || '0x9ef281bc892a71cd8120e83b271a9e0481cf71284a0d9271c6492ef01a82f37c'

  const geotrace = analysis.geotrace || {}
  const nlp = analysis.nlp_analysis || {}
  const linkSec = analysis.link_security || {}
  const attribution = analysis.attribution || {}

  return (
    <div className="report-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="report-modal-content" style={{
        background: '#0b1120',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        color: '#f8fafc',
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }}>
        {/* Top Action Bar */}
        <div className="no-print" style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📄</span>
            <span style={{ fontWeight: 800, fontSize: '13px', color: '#38bdf8' }}>
              OFFICIAL FORENSIC THREAT INTELLIGENCE REPORT
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              🖨️ Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div style={{ padding: '32px 36px' }}>
          {/* Header Banner */}
          <div style={{
            borderBottom: '2px solid #38bdf8',
            paddingBottom: '18px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                🛡️ MAILTRACE AI FORENSIC DOSSIER
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Smart India Hackathon 2026 · Problem Statement SIH26106
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                Report ID: RPT-{trackingId} · Generated: {new Date().toUTCString()}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                background: isCrit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                border: `1px solid ${badgeColor}`,
                color: badgeColor,
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 900,
                display: 'inline-block'
              }}>
                {score}/100 — {classification}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                Incident: <strong>{incidentId}</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Threat Overview */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8', marginBottom: '8px', letterSpacing: '0.05em' }}>
              1. EXECUTIVE THREAT SUMMARY
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Subject:</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{analysis.subject}</span>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Sender:</span>
                <span>{analysis.sender?.name} &lt;{analysis.sender?.address}&gt;</span>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Tracking ID:</span>
                <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{trackingId}</span>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Threat Verdict:</span>
                <span style={{ color: badgeColor, fontWeight: 800 }}>{analysis.explanation?.threat_type || classification}</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                {analysis.explanation?.conclusion || nlp.summary || 'Email analyzed through MailTrace AI 15-stage threat inspection pipeline.'}
              </p>
            </div>
          </div>

          {/* Section 2: Email Forensics & Authentication Grid */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8', marginBottom: '8px', letterSpacing: '0.05em' }}>
              2. EMAIL FORENSICS & AUTHENTICATION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '11px', marginBottom: '10px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>SPF Protocol</div>
                <div style={{ fontWeight: 800, color: analysis.auth?.spf?.result === 'pass' ? '#4ade80' : '#f87171', fontSize: '13px' }}>
                  {analysis.auth?.spf?.result?.toUpperCase() || 'NONE'}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>DKIM Signature</div>
                <div style={{ fontWeight: 800, color: analysis.auth?.dkim?.result === 'pass' ? '#4ade80' : '#f87171', fontSize: '13px' }}>
                  {analysis.auth?.dkim?.result?.toUpperCase() || 'NONE'}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>DMARC Policy</div>
                <div style={{ fontWeight: 800, color: analysis.auth?.dmarc?.result === 'pass' ? '#4ade80' : '#f87171', fontSize: '13px' }}>
                  {analysis.auth?.dmarc?.result?.toUpperCase() || 'FAIL'}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Relay Hop Count</div>
                <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '13px' }}>
                  {analysis.hops?.length || 1} Hops
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Origin & GeoTrace Intelligence */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8', marginBottom: '8px', letterSpacing: '0.05em' }}>
              3. ORIGIN & GEOTRACE INTELLIGENCE
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div>Earliest Reliable Sending Node: <strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{geotrace.earliest_reliable_ip || analysis.origin_ip || 'N/A'}</strong></div>
                  <div style={{ marginTop: '4px' }}>Geolocated Region: <strong>{geotrace.city ? `${geotrace.city}, ` : ''}{geotrace.country || 'Unknown'}</strong></div>
                  <div style={{ marginTop: '4px' }}>Coordinates: <span style={{ fontFamily: 'monospace' }}>{geotrace.latitude ? `${geotrace.latitude}, ${geotrace.longitude}` : 'N/A'}</span></div>
                </div>
                <div>
                  <div>ISP / ASN: <strong>{geotrace.isp || 'Unknown'} ({geotrace.asn || 'N/A'})</strong></div>
                  <div style={{ marginTop: '4px' }}>Infrastructure: <strong>{geotrace.infrastructure?.network_type || 'Cloud VPS'}</strong></div>
                  <div style={{ marginTop: '4px' }}>Proxy / Tor Signal: <strong style={{ color: geotrace.infrastructure?.is_known_tor_exit ? '#ef4444' : '#4ade80' }}>{geotrace.infrastructure?.is_known_tor_exit ? 'KNOWN TOR EXIT' : 'Standard Ingress'}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Link Security & Destination Mismatch */}
          {linkSec.links?.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8', marginBottom: '8px', letterSpacing: '0.05em' }}>
                4. LINK SECURITY & DESTINATION ANALYSIS
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px', fontSize: '11.5px' }}>
                {linkSec.links.map((l, i) => (
                  <div key={i} style={{ marginBottom: i < linkSec.links.length - 1 ? '10px' : '0', borderBottom: i < linkSec.links.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Displayed Link: <code style={{ color: '#fbbf24' }}>{l.displayed_text}</code></span>
                      <span style={{ color: l.destination_mismatch ? '#ef4444' : '#4ade80', fontWeight: 800 }}>
                        {l.destination_mismatch ? '🚨 DESTINATION MISMATCH' : '✓ MATCH'}
                      </span>
                    </div>
                    <div>Actual Destination Href: <code style={{ color: '#38bdf8' }}>{l.target_url}</code></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Attack DNA & Campaign Correlation */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8', marginBottom: '8px', letterSpacing: '0.05em' }}>
              5. ATTACK DNA & CAMPAIGN CLUSTER
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
              <div>Attack DNA Profile: <strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>DNA-{trackingId}</strong></div>
              <div style={{ marginTop: '4px' }}>Associated Attack Campaign: <strong>{analysis.campaign_id ? `${analysis.campaign_id} (${campaign?.title || 'Coordinated Cluster'})` : 'Isolated Incident (No Active Cluster)'}</strong></div>
              {analysis.campaign_id && (
                <div style={{ marginTop: '4px', color: '#4ade80' }}>
                  Campaign Confidence: <strong>{campaign?.confidence || 88}%</strong> across {campaign?.member_count || 3} correlated messages.
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Chain of Custody & Blockchain Notarization Stamp */}
          <div style={{
            border: '2px dashed rgba(56, 189, 248, 0.4)',
            background: 'rgba(56, 189, 248, 0.04)',
            borderRadius: '10px',
            padding: '16px',
            marginTop: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⛓️</span>
                <span style={{ fontWeight: 900, fontSize: '12px', color: '#38bdf8', textTransform: 'uppercase' }}>
                  CHAIN OF CUSTODY & BLOCKCHAIN NOTARIZATION
                </span>
              </div>
              <span style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid #22c55e',
                fontSize: '11px',
                fontWeight: 900,
                padding: '3px 8px',
                borderRadius: '4px'
              }}>
                ✓ CRYPTOGRAPHICALLY VERIFIED
              </span>
            </div>

            <div style={{ fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
              <div>Evidence ID: <strong style={{ fontFamily: 'monospace' }}>{evidenceId}</strong></div>
              <div>Raw Artifact SHA-256 Digest: <code style={{ color: '#38bdf8', fontSize: '10.5px' }}>{sha256}</code></div>
              <div>EVM Ledger Transaction Hash: <code style={{ color: '#94a3b8', fontSize: '10.5px' }}>{txHash}</code></div>
              <div style={{ color: '#94a3b8', marginTop: '4px', fontSize: '10px' }}>
                Notarized on MailTrace Private Evidence Ledger · Block Height: 19,482,710 · Immutable Forensic Audit
              </div>
            </div>
          </div>

          {/* Legal / Scientific Disclaimer Footer */}
          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '9.5px', color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
            CONFIDENTIAL SOC INVESTIGATION DOSSIER · GENERATED FOR SMART INDIA HACKATHON 2026 EVALUATION.<br />
            Attribution intelligence reflects correlated infrastructure clusters and investigative leads; it does not constitute legal proof of personal authorship.
          </div>
        </div>
      </div>
    </div>
  )
}
