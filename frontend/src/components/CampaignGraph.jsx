import { useState } from 'react'

// Attack infrastructure relationship graph.
// Deterministic layered layout: Emails → Domains → URL domains → IPs.
// Nodes shared by 2+ emails are highlighted — the visual core of Attack DNA.

const KIND_COLORS = {
  email: '#38bdf8',
  domain: '#a78bfa',
  replyto: '#34d399',
  url: '#fbbf24',
  ip: '#f97316',
}

const COLS = [
  { kind: 'email', title: 'EMAILS', x: 120 },
  { kind: 'domain', title: 'SENDER / REPLY-TO DOMAINS', x: 380 },
  { kind: 'url', title: 'URL DESTINATIONS', x: 638 },
  { kind: 'ip', title: 'ORIGIN INFRASTRUCTURE (IP)', x: 876 },
]

const trunc = (s, n = 28) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '—')

export default function CampaignGraph({ campaign }) {
  const [hoveredNode, setHoveredNode] = useState(null)
  const members = campaign?.members || []
  if (members.length === 0) return null

  // Build node sets
  const domainNodes = new Map()
  const urlNodes = new Map()
  const ipNodes = new Map()

  const addTo = (map, key, kind) => {
    if (!key) return
    if (!map.has(key)) map.set(key, { key, kind, count: 0 })
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
      nodes: members.map((m) => ({
        key: 'E:' + m.id,
        label: m.sender?.address || m.id,
        sub: m.subject,
        kind: 'email',
        shared: true
      })),
    },
    { x: COLS[1].x, nodes: [...domainNodes.values()].map((n) => ({ key: 'D:' + n.key, label: n.key, kind: n.kind, shared: n.count > 1 })) },
    { x: COLS[2].x, nodes: [...urlNodes.values()].map((n) => ({ key: 'U:' + n.key, label: n.key, kind: 'url', shared: n.count > 1 })) },
    { x: COLS[3].x, nodes: [...ipNodes.values()].map((n) => ({ key: 'I:' + n.key, label: n.key, kind: 'ip', shared: n.count > 1 })) },
  ]

  const DY = 82, TOP = 76
  let maxRows = 1
  colData.forEach((c) => { maxRows = Math.max(maxRows, c.nodes.length) })
  const H = Math.max(320, TOP + maxRows * DY + 30)
  const W = 1000

  const pos = {}
  colData.forEach((ce) => {
    ce.nodes.forEach((n, i) => {
      const colH = ce.nodes.length * DY
      const startY = TOP + (maxRows * DY - colH) / 2
      pos[n.key] = { x: ce.x, y: startY + i * DY + DY / 2 }
    })
  })

  return (
    <div className="graph-scroll" style={{ overflowX: 'auto', padding: '12px 0' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ minWidth: 880, maxWidth: '100%', height: 'auto' }}
        role="img"
        aria-label="Attack infrastructure graph"
      >
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker id="arrGlow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
          </marker>
        </defs>

        {colData.map((ce, i) => (
          <text
            key={i}
            x={ce.x}
            y={34}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="var(--text-faint)"
            letterSpacing="1.5"
          >
            {COLS[i].title}
          </text>
        ))}

        {edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to]
          if (!a || !b) return null
          const shared = (colData.flatMap((c) => c.nodes).find((n) => n.key === e.to) || {}).shared
          const isConnectedToHover = hoveredNode && (e.from === hoveredNode || e.to === hoveredNode)
          const mx = (a.x + b.x) / 2

          return (
            <path
              key={i}
              d={`M ${a.x + 14} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 16} ${b.y}`}
              fill="none"
              stroke={
                isConnectedToHover
                  ? '#38bdf8'
                  : shared
                  ? 'rgba(251, 191, 36, 0.75)'
                  : 'rgba(100, 116, 139, 0.35)'
              }
              strokeWidth={isConnectedToHover ? 3 : shared ? 2.2 : 1.2}
              markerEnd={shared || isConnectedToHover ? 'url(#arrGlow)' : 'url(#arr)'}
              style={{
                transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
                filter: isConnectedToHover ? 'drop-shadow(0 0 6px #38bdf8)' : 'none'
              }}
            />
          )
        })}

        {colData.flatMap((ce) => ce.nodes).map((n) => {
          const p = pos[n.key]
          if (!p) return null
          const c = KIND_COLORS[n.kind] || '#38bdf8'
          const isHovered = hoveredNode === n.key

          return (
            <g
              key={n.key}
              onMouseEnter={() => setHoveredNode(n.key)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {n.shared && n.kind !== 'email' && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="20"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.9"
                />
              )}

              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? '16' : '14'}
                fill="var(--bg-surface)"
                stroke={c}
                strokeWidth={isHovered ? '3' : '2.2'}
                style={{
                  filter: n.shared || isHovered ? `drop-shadow(0 0 10px ${c}aa)` : 'none',
                  transition: 'all 0.2s ease'
                }}
              />

              <circle cx={p.x} cy={p.y} r="5" fill={c} />

              <text
                x={p.x}
                y={p.y + 32}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="700"
                fill={n.shared && n.kind !== 'email' ? '#fbbf24' : 'var(--text)'}
                fontFamily="var(--font-mono)"
              >
                {trunc(n.label)}
              </text>

              {n.sub && (
                <text x={p.x} y={p.y + 47} textAnchor="middle" fontSize="10.5" fill="var(--text-faint)">
                  {trunc(n.sub, 26)}
                </text>
              )}

              {n.shared && n.kind !== 'email' && (
                <text
                  x={p.x}
                  y={p.y - 27}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="800"
                  fill="#fbbf24"
                  letterSpacing="1"
                >
                  SHARED INFRA
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div
        className="graph-legend"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          marginTop: '16px',
          padding: '12px 16px',
          borderRadius: 'var(--inner-radius)',
          background: 'var(--panel2)',
          border: '1px solid var(--border)',
          fontSize: '12px'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLORS.email }} /> Email
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLORS.domain }} /> Sender domain
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLORS.replyto }} /> Reply-To domain
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLORS.url }} /> URL destination
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLORS.ip }} /> IP address
        </span>
        <span style={{ color: '#fbbf24', fontWeight: 600, marginLeft: 'auto' }}>
          ◌ Dashed halo = Shared attack infrastructure
        </span>
      </div>
    </div>
  )
}
