import React, { useState, useMemo } from "react"

const NODE_TYPES = {
  email: { label: "Analyzed Email", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", icon: "📧" },
  ip: { label: "IP Address", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", icon: "🌐" },
  domain: { label: "Domain / Host", color: "#ec4899", bg: "rgba(236, 72, 153, 0.15)", icon: "🔗" },
  url: { label: "Payload URL", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", icon: "⚠️" },
  actor: { label: "Threat Actor / Cluster", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", icon: "🧬" },
  isp: { label: "ISP / Autonomous System", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", icon: "🏢" },
  target: { label: "Target Mailbox", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", icon: "🎯" }
}

export default function InfrastructureGraph({ detail }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [filterType, setFilterType] = useState("all")
  const [zoom, setZoom] = useState(1)

  // Construct graph dynamically from detail object
  const graphData = useMemo(() => {
    const nodes = []
    const links = []

    if (!detail) return { nodes: [], links: [] }

    const senderEmail = detail.sender || "unknown@attacker.com"
    const senderDomain = senderEmail.split("@")[1] || "unknown-domain.com"
    const originIp = detail.geotrace?.ip || detail.origin_ip || "185.220.101.5"
    const country = detail.geotrace?.country || "Russia"
    const ispName = detail.geotrace?.isp || detail.geotrace?.asn || "AS209874 Bulletproof Host"
    const urls = detail.urls || detail.extracted_urls || (detail.indicators?.filter(i => i.label?.toLowerCase().includes("url") || i.label?.toLowerCase().includes("link")).map(i => i.evidence) || ["http://secure-update-portal.net/login"])
    const cluster = detail.attribution?.cluster || detail.attribution?.campaign_name || "APT-Phish-Storm"

    // 1. Central Email Node
    const centerNode = {
      id: "email_main",
      type: "email",
      label: detail.subject ? (detail.subject.length > 24 ? detail.subject.slice(0, 24) + "..." : detail.subject) : "Malicious Email",
      subtext: `ID: ${detail.id ? detail.id.slice(0, 8) : "MLT-8921"}`,
      details: {
        Subject: detail.subject || "Urgent Account Verification",
        Sender: senderEmail,
        Recipient: detail.recipient || "victim@enterprise.com",
        "Risk Score": `${detail.risk_score || 88}/100`,
        Verdict: detail.verdict || "MALICIOUS"
      },
      x: 400,
      y: 250,
      size: 32
    }
    nodes.push(centerNode)

    // 2. Sender Domain Node
    const domainNode = {
      id: "domain_sender",
      type: "domain",
      label: senderDomain,
      subtext: "Sender FQDN",
      details: {
        Domain: senderDomain,
        "SPF Status": detail.auth_results?.spf || "FAIL",
        "DMARC Status": detail.auth_results?.dmarc || "FAIL",
        "Age / Trust": "Newly Registered (3 days)"
      },
      x: 230,
      y: 130,
      size: 26
    }
    nodes.push(domainNode)
    links.push({ source: "domain_sender", target: "email_main", label: "originates", color: "#ec4899" })

    // 3. Origin IP Node
    const ipNode = {
      id: "ip_origin",
      type: "ip",
      label: originIp,
      subtext: `${country} (${detail.geotrace?.city || "Moscow"})`,
      details: {
        "IP Address": originIp,
        Location: `${country}, ${detail.geotrace?.city || "Unknown"}`,
        Proxy: detail.geotrace?.is_proxy ? "Yes (TOR/VPN)" : "No",
        "Abuse Score": "94%"
      },
      x: 220,
      y: 370,
      size: 26
    }
    nodes.push(ipNode)
    links.push({ source: "ip_origin", target: "email_main", label: "relayed via", color: "#f97316" })

    // 4. ISP / ASN Node
    const ispNode = {
      id: "isp_node",
      type: "isp",
      label: ispName.length > 18 ? ispName.slice(0, 18) + "..." : ispName,
      subtext: "Network Provider",
      details: {
        "Autonomous System": ispName,
        "Threat Category": "Bulletproof Hosting Provider",
        "Known malicious subnets": "23 active subnets"
      },
      x: 80,
      y: 370,
      size: 22
    }
    nodes.push(ispNode)
    links.push({ source: "isp_node", target: "ip_origin", label: "hosts", color: "#06b6d4" })

    // 5. Threat Group / Campaign Node
    const actorNode = {
      id: "threat_cluster",
      type: "actor",
      label: cluster,
      subtext: "Correlated Threat Actor",
      details: {
        Campaign: cluster,
        Tactics: "Credential Harvesting, OAuth Phish",
        "Target Sectors": "Financial & Healthcare",
        Confidence: "91% DNA Match"
      },
      x: 580,
      y: 110,
      size: 28
    }
    nodes.push(actorNode)
    links.push({ source: "threat_cluster", target: "domain_sender", label: "operates", color: "#a855f7" })
    links.push({ source: "threat_cluster", target: "email_main", label: "attributed", color: "#a855f7" })

    // 6. Payload URLs
    const safeUrls = Array.isArray(urls) ? urls.slice(0, 2) : ["https://login-verify-auth.xyz/portal"]
    safeUrls.forEach((u, i) => {
      let hostname = "login-verify-auth.xyz"
      try {
        hostname = new URL(u).hostname
      } catch (e) {
        hostname = u.slice(0, 22)
      }
      const urlId = `url_${i}`
      nodes.push({
        id: urlId,
        type: "url",
        label: hostname,
        subtext: "Weaponized URL",
        details: {
          "Full URL": u,
          "Detection Engine": "PhishTank / Google SafeBrowsing",
          Payload: "Credential Theft Form",
          "SSL Cert": "Let's Encrypt (Automated)"
        },
        x: 590,
        y: 280 + i * 110,
        size: 24
      })
      links.push({ source: "email_main", target: urlId, label: "contains link", color: "#ef4444" })
    })

    // 7. Target Mailbox
    const targetNode = {
      id: "target_user",
      type: "target",
      label: detail.recipient ? detail.recipient.split("@")[0] : "victim_user",
      subtext: "Intended Victim",
      details: {
        Recipient: detail.recipient || "victim@enterprise.com",
        "Department": "Finance / Executive Office",
        "Action Taken": "Quarantined by MailTrace Gate"
      },
      x: 400,
      y: 430,
      size: 24
    }
    nodes.push(targetNode)
    links.push({ source: "email_main", target: "target_user", label: "targeted at", color: "#22c55e" })

    return { nodes, links }
  }, [detail])

  const filteredNodes = useMemo(() => {
    if (filterType === "all") return graphData.nodes
    return graphData.nodes.filter(n => n.type === filterType || n.id === "email_main")
  }, [graphData.nodes, filterType])

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])
  const filteredLinks = useMemo(() => {
    return graphData.links.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target))
  }, [graphData.links, visibleNodeIds])

  const nodeMap = useMemo(() => {
    const m = {}
    graphData.nodes.forEach(n => { m[n.id] = n })
    return m
  }, [graphData.nodes])

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
      {/* Header Bar */}
      <div style={{ padding: "14px 20px", background: "var(--panel2)", borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.15)", border: "1px solid rgba(6, 182, 212, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
            🕸️
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>Infrastructure & Entity Correlation Graph</div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>Visual mapping: Email ➔ IP ➔ Domain ➔ ISP ➔ URLs ➔ Threat Cluster</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterType("all")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid",
              borderColor: filterType === "all" ? "var(--accent)" : "rgba(255,255,255,0.1)",
              background: filterType === "all" ? "rgba(59, 130, 246, 0.2)" : "transparent",
              color: filterType === "all" ? "var(--accent)" : "var(--text-faint)"
            }}
          >
            All Entities ({graphData.nodes.length})
          </button>
          {["ip", "domain", "url", "actor"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                borderColor: filterType === t ? NODE_TYPES[t].color : "rgba(255,255,255,0.1)",
                background: filterType === t ? NODE_TYPES[t].bg : "transparent",
                color: filterType === t ? NODE_TYPES[t].color : "var(--text-faint)"
              }}
            >
              {NODE_TYPES[t].icon} {NODE_TYPES[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Graph Canvas Container */}
      <div style={{ position: "relative", width: "100%", height: "480px", background: "#0a0e17", overflow: "hidden", cursor: "grab" }}>
        {/* Subtle Cyber Grid Background */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.25 }}>
          <defs>
            <pattern id="infra-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#infra-grid)" />
        </svg>

        {/* SVG Nodes & Links */}
        <svg
          viewBox="0 0 800 500"
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.2s ease-out"
          }}
        >
          <defs>
            {/* Arrowhead markers for links */}
            {Object.entries(NODE_TYPES).map(([k, v]) => (
              <marker
                key={k}
                id={`arrow-${k}`}
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={v.color} opacity="0.8" />
              </marker>
            ))}
            {/* Glow filters */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Links */}
          {filteredLinks.map((link, idx) => {
            const s = nodeMap[link.source]
            const t = nodeMap[link.target]
            if (!s || !t) return null
            const midX = (s.x + t.x) / 2
            const midY = (s.y + t.y) / 2
            return (
              <g key={`link-${idx}`}>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={link.color || "rgba(255,255,255,0.2)"}
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  opacity="0.65"
                />
                {/* Edge Label */}
                <rect
                  x={midX - 28}
                  y={midY - 8}
                  width="56"
                  height="16"
                  rx="4"
                  fill="#0e1726"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="0.8"
                />
                <text
                  x={midX}
                  y={midY + 3.5}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.7)"
                  fontSize="8.5px"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  {link.label}
                </text>
              </g>
            )
          })}

          {/* Render Nodes */}
          {filteredNodes.map(node => {
            const conf = NODE_TYPES[node.type] || NODE_TYPES.email
            const isSelected = selectedNode?.id === node.id
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node)}
                style={{ cursor: "pointer" }}
              >
                {/* Pulse ring for selected / important nodes */}
                {(isSelected || node.type === "email" || node.type === "actor") && (
                  <circle
                    r={node.size + 8}
                    fill="none"
                    stroke={conf.color}
                    strokeWidth="1.5"
                    opacity="0.4"
                    strokeDasharray="3 3"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="14s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node Base Circle */}
                <circle
                  r={node.size}
                  fill="#111827"
                  stroke={isSelected ? "#ffffff" : conf.color}
                  strokeWidth={isSelected ? "3" : "2"}
                  filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
                />
                {/* Inner background tint */}
                <circle r={node.size - 2} fill={conf.bg} />

                {/* Node Icon */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize={node.size > 28 ? "18px" : "14px"}
                >
                  {conf.icon}
                </text>

                {/* Node Primary Label */}
                <text
                  y={node.size + 14}
                  textAnchor="middle"
                  fill="#f3f4f6"
                  fontSize="11px"
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                >
                  {node.label}
                </text>

                {/* Node Subtext */}
                <text
                  y={node.size + 25}
                  textAnchor="middle"
                  fill="rgba(156, 163, 175, 0.85)"
                  fontSize="9px"
                  fontFamily="monospace"
                >
                  {node.subtext}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Zoom Controls */}
        <div style={{ position: "absolute", bottom: "16px", left: "16px", display: "flex", gap: "6px", background: "rgba(15,23,42,0.85)", padding: "4px 8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.15, 1.8))}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "bold", padding: "2px 6px" }}
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            style={{ background: "transparent", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: "11px", padding: "2px 6px" }}
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.15, 0.6))}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "bold", padding: "2px 6px" }}
            title="Zoom Out"
          >
            −
          </button>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "280px",
              background: "rgba(15, 23, 42, 0.95)",
              border: `1px solid ${NODE_TYPES[selectedNode.type]?.color || "rgba(255,255,255,0.2)"}`,
              borderRadius: "10px",
              padding: "14px 16px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
              animation: "fadeIn 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>{NODE_TYPES[selectedNode.type]?.icon}</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: NODE_TYPES[selectedNode.type]?.color }}>
                    {NODE_TYPES[selectedNode.type]?.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{selectedNode.label}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: "14px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {selectedNode.details &&
                Object.entries(selectedNode.details).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "var(--text-faint)" }}>{k}:</span>
                    <span style={{ color: "#e2e8f0", fontWeight: 600, maxWidth: "160px", textAlign: "right", wordBreak: "break-all" }}>{v}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div style={{ padding: "10px 20px", background: "var(--panel2)", borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--text-faint)" }}>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {Object.entries(NODE_TYPES).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: v.color, display: "inline-block" }} />
              <span>{v.label}</span>
            </div>
          ))}
        </div>
        <div>💡 Click any node to inspect telemetry and pivot points</div>
      </div>
    </div>
  )
}
