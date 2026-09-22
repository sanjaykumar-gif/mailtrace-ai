import React, { useState } from 'react'

const DEFAULT_SOC_TABS = [
  {
    id: 'investigation',
    name: 'Investigation SOP',
    label: 'Investigation SOP',
    icon: '🔍',
    title: 'Standard Email Triage & Threat Scoring Workflow',
    overview: 'Follow this 5-step triage sequence upon receiving suspicious email alerts.',
    steps: [
      {
        title: 'Step 1: Check Composite Risk Score & Threat Classification',
        desc: 'Review the 0–100 risk score and gauge band. Scores >= 60 require immediate analyst triage; >= 80 warrant automated quarantine.',
        tip: 'Scores >= 80 automatically escalate to an incident ticket (INC-2026-XXX).'
      },
      {
        title: 'Step 2: Inspect Display URL vs Actual Destination Mismatch',
        desc: 'Check the Link Security panel. Look for deceptive anchor text claiming a legitimate brand (e.g. PayPal) but directing to external adversary domains.',
        tip: 'Destination mismatches immediately indicate malicious intent.'
      },
      {
        title: 'Step 3: Analyze Natural Language & Social Engineering',
        desc: 'Review the NLP AI meters for Urgency, Credential Harvesting lures, and CEO/IT Impersonation phrasing.',
        tip: 'Financial wire requests with urgency require dual-channel out-of-band verification.'
      },
      {
        title: 'Step 4: Check Authentication Protocols (SPF / DKIM / DMARC)',
        desc: 'Verify if the sending domain published passing records or failed alignment. Spoofed From headers usually fail DMARC.',
        tip: 'DKIM body signature failure indicates content was tampered in transit.'
      }
    ],
    proTip: 'Always export the official PDF / Print Dossier before applying destructive quarantine actions.'
  },
  {
    id: 'campaigns',
    name: 'Campaigns & DNA',
    label: 'Campaigns & DNA',
    icon: '🧬',
    title: 'Attack DNA & Campaign Clustering Methodology',
    overview: 'MailTrace AI correlates isolated emails into unified attack clusters.',
    steps: [
      {
        title: 'Multi-Vector Attack DNA Extraction',
        desc: 'The engine generates a unique DNA profile combining Origin IP, Sender Domain pattern, URL infrastructure, and lure classification.',
        tip: 'DNA signatures allow instant clustering across disparate mailboxes.'
      },
      {
        title: 'Investigate Campaign Timeline',
        desc: 'Inspect the chronological attack progression in the Campaign tab to understand attacker timing, cadence, and wave duration.',
        tip: 'Correlated campaigns indicate coordinated adversary tooling.'
      }
    ],
    proTip: 'Look for shared hosting ASNs (e.g. Zwiebelfreunde / Tor nodes) across multiple related incident tickets.'
  },
  {
    id: 'geotrace',
    name: 'GeoTrace & Origin',
    label: 'GeoTrace & Origin',
    icon: '🌍',
    title: 'Origin Traceability & Geolocation Forensics',
    overview: 'Extracting the Earliest Reliable Sending Node from Received headers.',
    steps: [
      {
        title: 'Earliest Reliable Node Identification',
        desc: 'The pipeline traverses Received hops chronologically from client ingress to recipient server to find the true origin IP.',
        tip: 'Look for the first public IP node outside the trusted internal relay chain.'
      },
      {
        title: 'Infrastructure Classification & GeoIP',
        desc: 'The IP is geolocated and classified into Hosting / Data Center, Residential, VPN, or Known Tor Exit nodes.',
        tip: 'Always treat geolocation as infrastructure-level intelligence rather than personal sender identity.'
      }
    ],
    proTip: 'Use the interactive World Map to visualize cross-border attack origins in real time.'
  },
  {
    id: 'custody',
    name: 'Chain of Custody',
    label: 'Chain of Custody',
    icon: '⛓️',
    title: 'Evidence Preservation & Cryptographic Verification',
    overview: 'Ensuring court-admissible forensic integrity with SHA-256 hashes.',
    steps: [
      {
        title: 'Immutable Event Ledger',
        desc: 'Every analysis produces 8 chronological audit events (EVT-001 to EVT-008) tracking ingestion, scoring, and report sealing.',
        tip: 'Events are indexed with SHA-256 digests.'
      },
      {
        title: 'Blockchain Verification Receipt',
        desc: 'Evidence records are notarized on the private EVM-compatible ledger with immutable transaction hashes and block height stamps.',
        tip: 'Proves forensic records were not altered post-investigation.'
      }
    ],
    proTip: 'Include the blockchain receipt and SHA-256 hash when submitting reports for external compliance audits.'
  }
]

export default function PageGuideModal({
  isOpen,
  open,
  onClose,
  title = '📖 MailTrace AI — SOC Analyst Playbook',
  subtitle = 'Standard Operating Procedures, Threat Triage Guidelines & PS 26106 Methodology',
  tabs = []
}) {
  const isModalOpen = Boolean(isOpen ?? open)
  const activeTabs = tabs && tabs.length > 0 ? tabs : DEFAULT_SOC_TABS
  const [activeTab, setActiveTab] = useState(activeTabs[0]?.id || '')

  if (!isModalOpen) return null

  const currentTab = activeTabs.find((t) => t.id === activeTab) || activeTabs[0]

  return (
    <div
      className="guide-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="card fade-in guide-modal-content"
        style={{
          maxWidth: '780px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          background: '#0b1120',
          border: '1px solid #38bdf8',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          borderRadius: '16px',
          color: '#f8fafc'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 4px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {title}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.86rem', margin: 0, lineHeight: 1.45 }}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm"
            style={{
              padding: '6px 12px',
              fontSize: '1rem',
              flexShrink: 0,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        {activeTabs.length > 1 && (
          <div className="tabs guide-tabs" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            {activeTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: (currentTab?.id || activeTab) === t.id ? '#0284c7' : 'rgba(255,255,255,0.05)',
                  color: (currentTab?.id || activeTab) === t.id ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {t.icon && <span>{t.icon}</span>}
                {t.label || t.name}
              </button>
            ))}
          </div>
        )}

        {/* Step-by-Step Content */}
        {currentTab && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Overview / Title Header */}
            {currentTab.title && (
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                {currentTab.title}
              </div>
            )}

            {currentTab.overview && (
              <div style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                color: '#38bdf8',
                lineHeight: 1.45
              }}>
                💡 {currentTab.overview}
              </div>
            )}

            {currentTab.steps?.map((s, idx) => (
              <div key={idx} style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '11px',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>
                  {idx + 1}
                </span>
                {typeof s === 'string' ? (
                  <div style={{ flex: 1, fontSize: '0.84rem', color: '#f8fafc', lineHeight: 1.5 }}>
                    {s}
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc', marginBottom: '2px' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.45 }}>
                      {s.desc}
                    </div>
                    {s.tip && (
                      <div style={{ fontSize: '0.76rem', color: '#fbbf24', marginTop: '4px' }}>
                        ⚡ <em>Tip: {s.tip}</em>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pro Tip Callout */}
            {currentTab.proTip && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                color: '#fbbf24',
                lineHeight: 1.45
              }}>
                ⚡ <strong>SOC Pro-Tip:</strong> {currentTab.proTip}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
