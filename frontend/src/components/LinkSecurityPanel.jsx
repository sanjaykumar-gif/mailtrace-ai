import { useState } from 'react'

export default function LinkSecurityPanel({ linkReport = null, urls = [] }) {
  const [selectedLink, setSelectedLink] = useState(null)

  // Normalize links from link_security or fallback urls
  const links = linkReport?.links?.length > 0 ? linkReport.links : urls.map(u => ({
    displayed_text: u.displayed_text || u.url,
    target_url: u.url,
    domain: u.domain || (u.url ? new URL(u.url.startsWith('http') ? u.url : 'http://' + u.url).hostname : ''),
    destination_mismatch: u.destination_mismatch || false,
    is_shortened: u.is_shortened || false,
    is_redirect: u.is_redirect || false,
    is_lookalike: u.is_lookalike || false,
    risk_level: u.risk_level || 'SAFE',
    evidence: u.evidence || [],
  }))

  const hasMismatch = linkReport?.has_destination_mismatch || links.some(l => l.destination_mismatch)

  return (
    <div className="link-security-panel" style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: hasMismatch ? 'rgba(239, 68, 68, 0.12)' : 'rgba(15, 23, 42, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔗</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
              LINK SECURITY & DESTINATION INSPECTOR
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-faint)' }}>
              Deep hyperlink inspection, display-text vs href mismatch analysis, and homoglyph detection
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasMismatch ? (
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
            }}>
              🚨 DESTINATION MISMATCH DETECTED
            </span>
          ) : (
            <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '11px' }}>
              ✓ No Anchor Mismatch
            </span>
          )}
        </div>
      </div>

      {/* Links List */}
      <div style={{ padding: '16px' }}>
        {links.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' }}>
            No embedded hyperlinks detected in email payload.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {links.map((link, idx) => {
              const isCrit = link.risk_level === 'CRITICAL' || link.destination_mismatch
              const isHigh = link.risk_level === 'HIGH'
              const color = isCrit ? '#ef4444' : isHigh ? '#f59e0b' : '#3b82f6'

              return (
                <div
                  key={idx}
                  style={{
                    background: link.destination_mismatch ? 'rgba(239, 68, 68, 0.07)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${link.destination_mismatch ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-faint)' }}>
                        LINK #{idx + 1}
                      </span>
                      {link.destination_mismatch && (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.4)'
                        }}>
                          🚨 DECEPTIVE ANCHOR
                        </span>
                      )}
                      {link.is_shortened && (
                        <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                          ⚡ Shortener
                        </span>
                      )}
                      {link.is_lookalike && (
                        <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                          🎭 Look-Alike Brand
                        </span>
                      )}
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isCrit ? 'rgba(239, 68, 68, 0.2)' : (isHigh ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)'),
                      color: isCrit ? '#f87171' : (isHigh ? '#fbbf24' : '#4ade80')
                    }}>
                      RISK: {link.risk_level || 'SAFE'}
                    </span>
                  </div>

                  {/* Display URL vs Actual Destination Box */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '2px' }}>
                        Displayed Link Text (What user sees)
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: link.destination_mismatch ? '#fbbf24' : 'var(--text)', wordBreak: 'break-all' }}>
                        {link.displayed_text || link.target_url}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '2px' }}>
                        Actual Destination Href (Where it goes)
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: link.destination_mismatch ? '#f87171' : 'var(--accent)', fontWeight: 700, wordBreak: 'break-all' }}>
                        {link.target_url}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Notes */}
                  {link.evidence?.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px', lineHeight: 1.4 }}>
                      {link.evidence.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>•</span>
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
