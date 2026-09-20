import { CLASS_COLORS } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'

export function RiskBadge({ value }) {
  return (
    <span className={`badge badge-${value || 'UNKNOWN'}`}>
      <span style={{ fontSize: '9px' }}>●</span> {value || 'UNKNOWN'}
    </span>
  )
}

export function Loading({ text = 'Analyzing threats…' }) {
  return (
    <div className="loading-wrap" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: '16px'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite',
        boxShadow: '0 0 16px var(--accent-glow)'
      }} />
      <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', fontWeight: 600 }}>{text}</p>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null

  const enableDemoMode = () => {
    localStorage.setItem('mailtrace_demo_mode', 'true')
    window.dispatchEvent(new Event('demo_mode_change'))
    window.location.reload()
  }

  const isColdStart = error.includes('cold start') || error.includes('timed out') || error.includes('Cannot reach')

  return (
    <div className="banner banner-error" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 18px',
      borderRadius: 'var(--inner-radius)',
      background: 'rgba(244, 63, 94, 0.12)',
      border: '1px solid rgba(244, 63, 94, 0.3)',
      color: '#fda4af',
      fontSize: '13px',
      margin: '16px 0',
      flexWrap: 'wrap'
    }}>
      <span style={{
        fontWeight: 800,
        background: 'var(--critical)',
        color: '#fff',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px'
      }}>
        {isColdStart ? 'SERVER SLEEPING' : 'ERROR'}
      </span>
      <div style={{ flex: 1, color: 'var(--text)', minWidth: '240px' }}>{error}</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {isColdStart && (
          <button
            className="btn btn-sm"
            onClick={enableDemoMode}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '11px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🧪 Switch to Instant Demo Sandbox
          </button>
        )}
        {onRetry && (
          <button className="btn btn-sm btn-primary" onClick={onRetry}>
            🔄 Retry
          </button>
        )}
      </div>
    </div>
  )
}

export function Empty({ title, text, children }) {
  return (
    <div className="empty card" style={{
      textAlign: 'center',
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', maxWidth: '420px', margin: '0 0 16px' }}>
        {text}
      </p>
      {children}
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }) {
  const { showToast } = useToast()

  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    showToast(`Copied to clipboard: ${text.slice(0, 30)}${text.length > 30 ? '…' : ''}`, 'success')
  }

  return (
    <button
      onClick={handleCopy}
      className="btn btn-sm"
      style={{
        padding: '2px 8px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)'
      }}
      title="Copy to clipboard"
    >
      📋 {label}
    </button>
  )
}

export function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-val" style={{ color: color || 'var(--text)' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function colorFor(classification) {
  return CLASS_COLORS[classification] || '#38bdf8'
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
        if (p.startsWith('`') && p.endsWith('`')) return (
          <code key={i} style={{
            background: 'var(--panel2)',
            border: '1px solid var(--border)',
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            color: 'var(--accent)'
          }}>
            {p.slice(1, -1)}
          </code>
        )
        return <span key={i}>{p}</span>
      })}
    </div>
  )
}
