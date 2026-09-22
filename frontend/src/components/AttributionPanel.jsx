export default function AttributionPanel({ attribution = null }) {
  if (!attribution) return null

  const matrix = attribution.confidence_matrix || {
    infrastructure_correlation: 'HIGH',
    campaign_correlation: 'HIGH',
    sender_identity_confidence: 'LOW',
    physical_location: 'UNKNOWN',
  }

  const getConfBadge = (val, type = 'conf') => {
    const isHigh = val === 'HIGH' || val === 'KNOWN'
    const isMed = val === 'MEDIUM' || val === 'APPROXIMATE'
    const isLow = val === 'LOW' || val === 'UNKNOWN' || val === 'INCONCLUSIVE'
    
    let bg = 'rgba(59, 130, 246, 0.15)'
    let color = '#60a5fa'

    if (type === 'sender') {
      // For sender personal identity, LOW is scientifically responsible
      bg = 'rgba(245, 158, 11, 0.15)'
      color = '#fbbf24'
    } else if (isHigh) {
      bg = 'rgba(34, 197, 94, 0.15)'
      color = '#4ade80'
    } else if (isMed) {
      bg = 'rgba(245, 158, 11, 0.15)'
      color = '#fbbf24'
    } else {
      bg = 'rgba(148, 163, 184, 0.15)'
      color = '#94a3b8'
    }

    return (
      <span style={{
        background: bg,
        color: color,
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.04em'
      }}>
        {val}
      </span>
    )
  }

  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🎯</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
              ATTRIBUTION INTELLIGENCE & CONFIDENCE ASSESSMENT
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-faint)' }}>
              Probabilistic infrastructure correlation separated strictly from legal personal identity
            </p>
          </div>
        </div>

        <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '11px' }}>
          Confidence-Based Model
        </span>
      </div>

      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left Column: Observed IOCs & Origin Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
              OBSERVED INFRASTRUCTURE CLUSTER
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {(attribution.observed_indicators || []).map((ioc, i) => (
                <div key={i} style={{ fontSize: '11.5px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent)' }}>▶</span>
                  <span>{ioc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
              POSSIBLE ORIGIN CLASSIFICATION
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(attribution.possible_origin_types || []).map((typ, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  color: 'var(--text)',
                  fontWeight: 600
                }}>
                  <span style={{ color: '#ef4444' }}>☑</span>
                  <span>{typ}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Axis Confidence Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
              MULTI-AXIS CONFIDENCE MATRIX
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Infrastructure Correlation</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Shared IP / ASN / Mail routing match</div>
                </div>
                {getConfBadge(matrix.infrastructure_correlation)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Campaign Correlation</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Cross-message Attack DNA overlap</div>
                </div>
                {getConfBadge(matrix.campaign_correlation)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Sender Personal Identity</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Header-level proof of individual author</div>
                </div>
                {getConfBadge(matrix.sender_identity_confidence, 'sender')}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Physical Location</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>GeoIP estimation vs physical device</div>
                </div>
                {getConfBadge(matrix.physical_location)}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '10px',
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            fontSize: '10px',
            color: 'var(--text-faint)',
            lineHeight: 1.4
          }}>
            ⚖️ <strong>Attribution Disclaimer:</strong> {attribution.attribution_disclaimer || 'Attribution reflects correlated infrastructure clusters and investigative leads. It does not constitute legal proof of personal authorship.'}
          </div>
        </div>
      </div>
    </div>
  )
}
