export default function AuthPanel({ auth }) {
  const mechs = [
    { key: 'spf', label: 'SPF' },
    { key: 'dkim', label: 'DKIM' },
    { key: 'dmarc', label: 'DMARC' },
  ]
  return (
    <div className="auth-grid">
      {mechs.map(({ key, label }) => {
        const entry = auth?.[key] || { status: 'UNKNOWN', raw: 'not reported' }
        return (
          <div className="auth-cell" key={key}>
            <div className="auth-mech">{label}</div>
            <div className={`auth-val ${entry.status}`}>{entry.status}</div>
            <div className="auth-raw">{entry.raw}</div>
          </div>
        )
      })}
    </div>
  )
}
