// Email route timeline built from parsed Received headers.
// Never fabricates hops — shows exactly what was found, or an honest fallback.

export default function RouteTimeline({ route, originIp, originNote }) {
  if (!route || route.length === 0) {
    return (
      <p className="muted" style={{ fontSize: 13 }}>
        Origin could not be conclusively determined from the available headers.
      </p>
    )
  }
  return (
    <div>
      <div className="timeline">
        {route.map((hop, i) => {
          const isOrigin = i === 0
          const isDest = i === route.length - 1
          return (
            <div className="tl-item" key={i}>
              <span className={`tl-dot ${isOrigin ? 'origin' : ''} ${isDest ? 'dest' : ''}`} />
              <div className="tl-tag">
                {isOrigin ? (originIp ? 'Sender / Estimated Origin' : 'First Visible Hop')
                  : isDest ? 'Recipient Server' : `Relay Hop ${i}`}
              </div>
              <div className="tl-host">{hop.from_host || 'unknown host'} → {hop.by_host || 'unknown'}</div>
              <div className="tl-detail">
                {hop.from_ip ? <>IP: {hop.from_ip}</> : 'IP: not recorded'}
                {hop.timestamp ? <> · {hop.timestamp}</> : ''}
              </div>
            </div>
          )
        })}
      </div>
      {originNote && (
        <p className="disclaimer" style={{ marginTop: 16 }}>{originNote}</p>
      )}
    </div>
  )
}
