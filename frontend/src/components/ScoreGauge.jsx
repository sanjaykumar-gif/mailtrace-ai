import { RiskBadge, colorFor } from './Bits.jsx'

export default function ScoreGauge({ score, classification, probability, threatType }) {
  const color = colorFor(classification)
  const pct = Math.max(0, Math.min(score ?? 0, 100)) / 100
  const len = Math.PI * 82 // semicircle length for r=82

  return (
    <div className="gauge-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="gauge" role="img" aria-label={`Risk score ${score} of 100`} style={{ position: 'relative' }}>
        <svg viewBox="0 0 200 128" width="210" height="135">
          <defs>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={color} floodOpacity="0.5" />
            </filter>
            <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--gauge-track)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--gauge-track)" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 18 112 A 82 82 0 0 1 182 112"
            fill="none"
            stroke="url(#trackGrad)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Active Colored Arc */}
          <path
            d="M 18 112 A 82 82 0 0 1 182 112"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${pct * len} ${len}`}
            filter="url(#gaugeGlow)"
            style={{
              transition: 'stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease'
            }}
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((v) => {
            const a = Math.PI * (1 - v / 100)
            const x1 = 100 + Math.cos(a) * 66, y1 = 112 - Math.sin(a) * 66
            const x2 = 100 + Math.cos(a) * 56, y2 = 112 - Math.sin(a) * 56
            return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-focus)" strokeWidth="1.5" strokeOpacity="0.4" />
          })}
        </svg>

        <div className="gauge-center" style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <div className="gauge-score" style={{
            color,
            fontSize: '38px',
            fontWeight: 900,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.04em',
            textShadow: `0 0 20px ${color}55`
          }}>
            {score ?? '—'}
            <span className="gauge-max" style={{ fontSize: '14px', color: 'var(--text-faint)', fontWeight: 600 }}>/100</span>
          </div>
        </div>
      </div>

      <div className="gauge-meta" style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Classification</span>
          <RiskBadge value={classification} />
        </div>
        <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Phishing Probability</span>
          <b style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{probability || '—'}</b>
        </div>
        {threatType && (
          <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Suspected Type</span>
            <b style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text)' }}>{threatType}</b>
          </div>
        )}
        <div className="row" style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <span className="faint" style={{ fontSize: '10.5px', letterSpacing: '0.2px' }}>
            0–20 SAFE · 41–60 MEDIUM · 81+ CRITICAL
          </span>
        </div>
      </div>
    </div>
  )
}
