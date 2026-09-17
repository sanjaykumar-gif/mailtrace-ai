// Attack infrastructure relationship graph.
// Deterministic layered layout: Emails → Domains → URL domains → IPs.
// Nodes shared by 2+ emails are highlighted — the visual core of Attack DNA.

const KIND_COLORS = {
  email: '#22d3ee',
  domain: '#a78bfa',
  replyto: '#34d399',
  url: '#f6c945',
  ip: '#ff8a3d',
}

const COLS = [
  { kind: 'email', title: 'EMAILS', x: 120 },
  { kind: 'domain', title: 'SENDER / REPLY-TO DOMAINS', x: 380 },
  { kind: 'url', title: 'URL DOMAINS', x: 638 },
  { kind: 'ip', title: 'INFRASTRUCTURE (IP)', x: 866 },
]

const trunc = (s, n = 30) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '—')

export default function CampaignGraph({ campaign }) {
  const members = campaign?.members || []
  if (members.length === 0) return null

  // Build node sets ------------------------------------------------------
  const domainNodes = new Map() // key: domain  value: {kind, count}
  const urlNodes = new Map()
  const ipNodes = new Map()
  const addTo = (map, key, kind) => {
    if (!key) return
    if (!map.has(key)) map.set(key, { key, kind, count: 0, links: [] })
    const n = map.get(key)
    n.count += 1
  }

  const edges = []
  members.forEach((m) => {
    addTo(domainNodes, m.sender_domain, 'domain')
    edges.push({ from: 'E:' + m.id, to: 'D:' + m.sender_domain, label: 'sender domain' })
    if (m.reply_to_domain) {
      addTo(domainNodes, m.reply_to_domain, 'replyto')
      edges.push({ from: 'E:' + m.id, to: 'D:' + m.reply_to_domain, label: 'reply-to domain' })
    }
    ;(m.url_domains || []).slice(0, 3).forEach((d) => {
      addTo(urlNodes, d, 'url')
      edges.push({ from: 'E:' + m.id, to: 'U:' + d, label: 'URL domain' })
    })
    const ips = (m.public_ips && m.public_ips.length ? m.public_ips : m.ips || []).slice(0, 3)
    ips.forEach((ip) => {
      addTo(ipNodes, ip, 'ip')
      edges.push({ from: 'E:' + m.id, to: 'I:' + ip, label: 'origin IP' })
    })
  })

  const colData = [
    {
      x: COLS[0].x,
      nodes: members.map((m) => ({ key: 'E:' + m.id, label: m.sender?.address || m.id, sub: m.subject, kind: 'email', shared: true })),
    },
    { x: COLS[1].x, nodes: [...domainNodes.values()].map((n) => ({ key: 'D:' + n.key, label: n.key, kind: n.kind, shared: n.count > 1 })) },
    { x: COLS[2].x, nodes: [...urlNodes.values()].map((n) => ({ key: 'U:' + n.key, label: n.key, kind: 'url', shared: n.count > 1 })) },
    { x: COLS[3].x, nodes: [...ipNodes.values()].map((n) => ({ key: 'I:' + n.key, label: n.key, kind: 'ip', shared: n.count > 1 })) },
  ]

  const DY = 78, TOP = 74
  let maxRows = 1
  colData.forEach((c) => { maxRows = Math.max(maxRows, c.nodes.length) })
  const H = Math.max(300, TOP + maxRows * DY + 30)
  const W = 990

  const pos = {}
  colData.forEach((ce) => { // @vitejs-ignore
    ce.nodes.forEach((n, i) => {
      const colH = ce.nodes.length * DY
      const startY = TOP + (maxRows * DY - colH) / 2
      pos[n.key] = { x: ce.x, y: startY + i * DY + DY / 2 }
    })
  })

  return (
    <div className="graph-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ minWidth: 860, maxWidth: '100%', height: 'auto' }}
        role="img" aria-label="Attack infrastructure graph">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3a4d7d" />
          </marker>
        </defs>
        {colData.map((ce, i) => (
          <text key={i} x={ce.x} y={34} textAnchor="middle" fontSize="11" fontWeight="800"
            fill="#5f7099" letterSpacing="1.5">{COLS[i].title}</text>
        ))}
        {edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to]
          if (!a || !b) return null
          const shared = (colData.flatMap((c) => c.nodes).find((n) => n.key === e.to) || {}).shared
          const mx = (a.x + b.x) / 2
          return (
            <path key={i}
              d={`M ${a.x + 14} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 16} ${b.y}`}
              fill="none"
              stroke={shared ? 'rgba(246,201,69,0.75)' : 'rgba(58,77,125,0.55)'}
              strokeWidth={shared ? 2 : 1.2}
              markerEnd="url(#arr)" />
          )
        })}
        {colData.flatMap((ce) => ce.nodes).map((n) => {
          const p = pos[n.key]
          if (!p) return null
          const c = KIND_COLORS[n.kind] || '#8ea2cc'
          return (
            <g key={n.key}>
              {n.shared && n.kind !== 'email' && (
                <circle cx={p.x} cy={p.y} r="19" fill="none" stroke="#f6c945" strokeWidth="1.4"
                  strokeDasharray="3 4" opacity="0.9" />
              )}
              <circle cx={p.x} cy={p.y} r="14" fill="#0e1730" stroke={c} strokeWidth="2.2"
                style={{ filter: n.shared ? `drop-shadow(0 0 7px ${c}88)` : 'none' }} />
              <circle cx={p.x} cy={p.y} r="5" fill={c} />
              <text x={p.x} y={p.y + 32} textAnchor="middle" fontSize="11.5" fontWeight="700"
                fill={n.shared && n.kind !== 'email' ? '#f6c945' : '#c9d6f2'}
                fontFamily="monospace">{trunc(n.label)}</text>
              {n.sub && (
                <text x={p.x} y={p.y + 46} textAnchor="middle" fontSize="10" fill="#5f7099">
                  {trunc(n.sub, 24)}
                </text>
              )}
              {n.shared && n.kind !== 'email' && (
                <text x={p.x} y={p.y - 26} textAnchor="middle" fontSize="9" fontWeight="800"
                  fill="#f6c945" letterSpacing="1">SHARED</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="graph-legend">
        <span className="lg"><span className="lg-dot" style={{ background: KIND_COLORS.email }} /> Email</span>
        <span className="lg"><span className="lg-dot" style={{ background: KIND_COLORS.domain }} /> Sender domain</span>
        <span className="lg"><span className="lg-dot" style={{ background: KIND_COLORS.replyto }} /> Reply-To domain</span>
        <span className="lg"><span className="lg-dot" style={{ background: KIND_COLORS.url }} /> URL domain</span>
        <span className="lg"><span className="lg-dot" style={{ background: KIND_COLORS.ip }} /> IP address</span>
        <span className="lg" style={{ color: '#f6c945' }}>◌ dashed halo = shared between emails</span>
      </div>
    </div>
  )
}
