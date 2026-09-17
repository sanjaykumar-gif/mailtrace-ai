import { CLASS_COLORS } from '../services/api.js'

export function RiskBadge({ value }) {
  return <span className={`badge badge-${value || 'UNKNOWN'}`}>● {value || 'UNKNOWN'}</span>
}

export function Loading({ text = 'Loading…' }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="banner banner-error">
      <span style={{ fontWeight: 800 }}>ERROR</span>
      <div style={{ flex: 1 }}>{error}</div>
      {onRetry && <button className="btn btn-sm btn-ghost" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  )
}

export function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat" style={{ '--stat-color': color }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function colorFor(classification) {
  return CLASS_COLORS[classification] || '#8ea2cc'
}

// Render indicator evidence with **bold** and `code` markers converted to
// readable inline elements (never raw HTML injection).
export function Evidence({ text }) {
  if (!text) return null
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <div className="evidence-text">
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
        return <span key={i}>{p}</span>
      })}
    </div>
  )
}
