import { RiskBadge, colorFor } from './Bits.jsx'

export default function ScoreGauge({ score, classification, probability, threatType }) {
  const color = colorFor(classification)
  const pct = Math.max(0, Math.min(score ?? 0, 100)) / 100
  const len = Math.PI * 82 // semicircle length for r=82
  return (
    <div className="gauge-wrap">
      <div className="gauge" role="img" aria-label={`Risk score ${score} of 100`}>
        <svg viewBox="0 0 200 128" width="210" height="135">
          <path d="M 18 112 A 82 82 0 0 1 182 112" fill="none"
            stroke="#16223f" strokeWidth="15" strokeLinecap="round" />
          <path d="M 18 112 A 82 82 0 0 1 182 112" fill="none"
            stroke={color} strokeWidth="15" strokeLinecap="round"
            strokeDasharray={`${pct * len} ${len}`}
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
          {[0, 25, 50, 75, 100].map((v) => {
            const a = Math.PI * (1 - v / 100)
            const x1 = 100 + Math.cos(a) * 66, y1 = 112 - Math.sin(a) * 66
            const x2 = 100 + Math.cos(a) * 58, y2 = 112 - Math.sin(a) * 58
            return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2a3a63" strokeWidth="2" />
          })}
        </svg>
        <div className="gauge-center">
          <div className="gauge-score" style={{ color }}>{score ?? '—'}<span className="gauge-max">/100</span></div>
        </div>
      </div>
      <div className="gauge-meta">
        <div className="row"><span>Classification</span><RiskBadge value={classification} /></div>
        <div className="row"><span>Phishing probability</span><b>{probability || '—'}</b></div>
        {threatType && <div className="row"><span>Suspected type</span><b style={{ textAlign: 'right' }}>{threatType}</b></div>}
        <div className="row"><span>Scale</span><span className="faint">0–20 SAFE · 41–60 MEDIUM · 81+ CRITICAL</span></div>
      </div>
    </div>
  )
}
