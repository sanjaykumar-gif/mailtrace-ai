export default function UrlTable({ urls }) {
  if (!urls || urls.length === 0) {
    return <p className="muted" style={{ fontSize: 13 }}>No URLs were extracted from this email.</p>
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>URL (non-clickable)</th>
            <th>Domain</th>
            <th>Protocol</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {urls.map((u, i) => (
            <tr key={i}>
              <td className="url-row-domain">{u.url}</td>
              <td className="mono">{u.domain}</td>
              <td className="mono">{u.protocol}</td>
              <td>
                {u.suspicious
                  ? <span className="tag-suspicious">⚠ SUSPICIOUS</span>
                  : <span className="tag-clean">NOT SUSPICIOUS</span>}
                {u.reasons?.length > 0 && (
                  <div className="reason-list">
                    {u.reasons.map((r, j) => (
                      <div key={j}>+{r.points} · {r.label}</div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
