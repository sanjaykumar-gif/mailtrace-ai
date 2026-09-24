import { useState } from "react"

function buildWaves(detail) {
  if (!detail) return []
  const members = detail.members || []
  if (members.length === 0) return []

  return members.map((m, i) => {
    const prev = i > 0 ? members[i - 1] : null
    const changed = []
    const persistent = []

    if (prev) {
      if (m.origin_ip && prev.origin_ip && m.origin_ip !== prev.origin_ip) {
        changed.push('Origin IP rotated')
      } else if (m.origin_ip) {
        persistent.push('Origin IP infrastructure')
      }

      const domain = m.sender?.address?.split('@')[1] || ''
      const prevDomain = prev.sender?.address?.split('@')[1] || ''
      if (domain && prevDomain && domain !== prevDomain) {
        changed.push('Sender domain changed')
      } else if (domain) {
        persistent.push('Sender domain pattern')
      }

      if (m.subject && prev.subject && m.subject !== prev.subject) {
        changed.push('Subject lure shifted')
      } else {
        persistent.push('Targeting lure theme')
      }
    } else {
      persistent.push('Initial campaign baseline', 'Primary lure signature')
    }

    return {
      wave: i + 1,
      label: i === 0 ? 'Initial Ingress' : `Evolution Wave ${i + 1}`,
      date: m.timestamp ? new Date(m.timestamp).toLocaleDateString() : 'Active',
      changed,
      persistent,
      ip: m.origin_ip || '—',
      domain: m.sender?.address?.split('@')[1] || '—',
      urlTheme: m.classification || 'Phishing',
      confidence: m.risk_score || 80,
      evasion: changed.length > 0,
      tracking_id: m.tracking_id || m.id
    }
  })
}

export default function DnaEvolutionTrack({ detail }) {
  const waves = buildWaves(detail)
  const [selected, setSelected] = useState(0)
  const w = waves[selected]

  if (waves.length === 0) return null

  const persistenceScore = w ? Math.round((w.persistent.length / (w.persistent.length + w.changed.length)) * 100) : 0

  return (
    <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:"14px", padding:"20px" }}>
      <div style={{ marginBottom:"16px" }}>
        <div style={{ fontSize:"11px", fontWeight:800, textTransform:"uppercase", color:"var(--text-faint)", letterSpacing:".05em" }}>ATTACK DNA EVOLUTION TRACK</div>
        <div style={{ fontSize:"12px", color:"var(--text-faint)", marginTop:"3px" }}>
          Tracks attacker adaptations across campaign waves — even when IP, domain, or URL changes
        </div>
      </div>

      {/* Wave selector timeline */}
      <div style={{ display:"flex", alignItems:"center", gap:"0", marginBottom:"20px", overflowX:"auto", paddingBottom:"4px" }}>
        {waves.map((wave, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
            <button
              onClick={() => setSelected(i)}
              style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:"4px",
                padding:"10px 16px", borderRadius:"10px", border:"none",
                background: selected===i ? "rgba(56,189,248,0.12)" : "transparent",
                cursor:"pointer", transition:"all .15s",
                outline: selected===i ? "2px solid #38bdf8" : "2px solid transparent",
              }}
            >
              <div style={{
                width:"36px", height:"36px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                background: wave.evasion ? "rgba(249,115,22,0.15)" : "rgba(56,189,248,0.15)",
                border:`2px solid ${wave.evasion ? "#f97316" : "#38bdf8"}`,
                fontSize:"14px", fontWeight:900, color: wave.evasion ? "#f97316" : "#38bdf8",
              }}>{wave.wave}</div>
              <div style={{ fontSize:"10px", fontWeight:700, color:"var(--text)", whiteSpace:"nowrap" }}>{wave.label}</div>
              {wave.evasion && <div style={{ fontSize:"9px", color:"#f97316", fontWeight:800 }}>EVASION</div>}
            </button>
            {i < waves.length-1 && (
              <div style={{ display:"flex", alignItems:"center", gap:"0", flexShrink:0 }}>
                <div style={{ width:"24px", height:"2px", background:"linear-gradient(90deg,#38bdf8,#f97316)", margin:"0 4px" }}/>
                <span style={{ fontSize:"9px", color:"var(--text-faint)" }}>→</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Wave detail */}
      {w && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
          {/* Infrastructure snapshot */}
          <div style={{ background:"rgba(0,0,0,0.25)", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize:"11px", fontWeight:800, color:"var(--text-faint)", marginBottom:"10px", textTransform:"uppercase" }}>Wave {w.wave} Infrastructure</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", fontSize:"12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-faint)" }}>Origin IP</span>
                <span style={{ fontFamily:"monospace", color:"#f97316", fontWeight:700 }}>{w.ip}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-faint)" }}>Sender Domain</span>
                <span style={{ fontFamily:"monospace", color:"#ef4444", fontWeight:700 }}>{w.domain}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-faint)" }}>Lure Theme</span>
                <span style={{ fontWeight:700, color:"var(--text)", textTransform:"capitalize" }}>{w.urlTheme}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-faint)" }}>Confidence</span>
                <span style={{ fontWeight:900, color: w.confidence>=80?"#ef4444":w.confidence>=60?"#f97316":"#fbbf24", fontFamily:"monospace" }}>{w.confidence}%</span>
              </div>
            </div>
          </div>

          {/* DNA diff */}
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {/* Persistence score */}
            <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:"10px", padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                <span style={{ fontSize:"11px", fontWeight:700, color:"#38bdf8" }}>DNA Persistence Score</span>
                <span style={{ fontSize:"18px", fontWeight:900, color:"#38bdf8", fontFamily:"monospace" }}>{persistenceScore}%</span>
              </div>
              <div style={{ height:"5px", background:"rgba(255,255,255,0.07)", borderRadius:"3px", overflow:"hidden" }}>
                <div style={{ width:`${persistenceScore}%`, height:"100%", background:"linear-gradient(90deg,#38bdf8,#818cf8)", borderRadius:"3px", transition:"width .5s ease" }}/>
              </div>
              <div style={{ fontSize:"10px", color:"var(--text-faint)", marginTop:"5px" }}>Higher = attacker kept more of their behavioral fingerprint</div>
            </div>

            {/* Changed */}
            {w.changed.length > 0 && (
              <div>
                <div style={{ fontSize:"10.5px", fontWeight:800, color:"#f97316", marginBottom:"5px" }}>🔴 CHANGED (Evasion Attempt)</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                  {w.changed.map((c,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:"7px", fontSize:"11.5px", color:"var(--text)" }}>
                      <span style={{ color:"#f97316", fontSize:"10px" }}>✕</span>{c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Persistent */}
            {w.persistent.length > 0 && (
              <div>
                <div style={{ fontSize:"10.5px", fontWeight:800, color:"#22c55e", marginBottom:"5px" }}>🟢 PERSISTENT DNA (Attacker Fingerprint)</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                  {w.persistent.map((p,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:"7px", fontSize:"11.5px", color:"var(--text)" }}>
                      <span style={{ color:"#22c55e", fontSize:"10px" }}>✓</span>{p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
