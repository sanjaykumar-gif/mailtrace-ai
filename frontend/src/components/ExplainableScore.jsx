import { useState, useEffect } from "react"

const FACTOR_ICONS = { auth:"🔐", domain:"🌐", link:"🔗", nlp:"🧠", geo:"📍", header:"📜", campaign:"🧬", default:"⚠️" }

function barColor(pts, maxPts) {
  const r = maxPts ? pts / maxPts : 0
  if (r >= 0.7) return "#ef4444"
  if (r >= 0.4) return "#f97316"
  if (r >= 0.2) return "#fbbf24"
  return "#22c55e"
}

function getAuthStatus(val) {
  if (!val) return ''
  if (typeof val === 'string') return val.toLowerCase()
  if (typeof val === 'object' && val.status) return String(val.status).toLowerCase()
  return ''
}

function buildFactors(indicators, explanation, auth, nlp, geotrace) {
  const factors = []
  const authFails = []
  const spfStatus = getAuthStatus(auth?.spf)
  const dkimStatus = getAuthStatus(auth?.dkim)
  const dmarcStatus = getAuthStatus(auth?.dmarc)
  if (spfStatus === "fail" || spfStatus === "softfail") authFails.push("SPF")
  if (dkimStatus === "fail") authFails.push("DKIM")
  if (dmarcStatus === "fail") authFails.push("DMARC")
  if (authFails.length) factors.push({ type:"auth", label:`Authentication Failure (${authFails.join(", ")})`, evidence:`Email failed ${authFails.join(" + ")} — sender not authorized`, pts: authFails.length * 10, maxPts:30 })

  const domainPts = indicators?.find(i => i.label?.toLowerCase().includes("domain"))?.points || 0
  if (domainPts > 0) factors.push({ type:"domain", label:"Suspicious Sender Domain", evidence: explanation?.threat_type ? `Classified as ${explanation.threat_type}` : "Domain matches phishing infrastructure pattern", pts: domainPts, maxPts:20 })

  const linkInd = indicators?.find(i => i.label?.toLowerCase().includes("link") || i.label?.toLowerCase().includes("url"))
  if (linkInd) factors.push({ type:"link", label:"Malicious URL Detected", evidence: linkInd.evidence || "Embedded links flagged as credential-harvesting domains", pts: linkInd.points, maxPts:25 })

  const nlpScore = nlp?.social_engineering_score || 0
  if (nlpScore > 20) factors.push({ type:"nlp", label:"Social Engineering Language", evidence: nlp?.summary || `Urgency + impersonation score: ${nlpScore}/100`, pts: Math.round(nlpScore * 0.18), maxPts:18 })

  const geoRisk = geotrace?.risk_label || geotrace?.infrastructure?.network_type
  if (geoRisk && geoRisk !== "Residential") factors.push({ type:"geo", label:`High-Risk Origin (${geoRisk})`, evidence:`Origin IP from ${geotrace?.country || "unknown"} on ${geoRisk} infrastructure`, pts: geoRisk?.toLowerCase().includes("tor") ? 20 : geoRisk?.toLowerCase().includes("vpn") ? 15 : 10, maxPts:20 })

  const replyInd = indicators?.find(i => i.label?.toLowerCase().includes("reply"))
  if (replyInd) factors.push({ type:"header", label:"Reply-To Domain Mismatch", evidence: replyInd.evidence || "Reply-To routes to different domain than sender", pts: replyInd.points || 8, maxPts:10 })

  const campInd = indicators?.find(i => i.label?.toLowerCase().includes("campaign"))
  if (campInd) factors.push({ type:"campaign", label:"Active Campaign Attribution", evidence: campInd.evidence || "Infrastructure matches known phishing campaign cluster", pts: campInd.points || 10, maxPts:15 })

  const mapped = ["domain","link","url","reply","campaign","auth","spf","dkim"]
  const rest = (indicators||[]).filter(ind => !mapped.some(t => ind.label?.toLowerCase().includes(t)))
  rest.forEach(ind => factors.push({ type:"default", label:ind.label, evidence:ind.evidence, pts:ind.points, maxPts:ind.points }))
  return factors.filter(f => f.pts > 0).slice(0, 8)
}

export default function ExplainableScore({ riskScore, indicators, explanation, auth, nlp, geotrace }) {
  const [open, setOpen] = useState(true)
  const [widths, setWidths] = useState([])
  const factors = buildFactors(indicators, explanation, auth, nlp, geotrace)
  const scoreColor = riskScore >= 80 ? "#ef4444" : riskScore >= 60 ? "#f97316" : riskScore >= 40 ? "#fbbf24" : "#22c55e"

  useEffect(() => {
    setWidths(factors.map(() => 0))
    factors.forEach((f, i) => setTimeout(() => setWidths(p => { const n=[...p]; n[i]=Math.min((f.pts/(f.maxPts||f.pts))*100,100); return n }), 100 + i * 90))
  }, [riskScore]) // eslint-disable-line

  return (
    <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:"14px", overflow:"hidden", marginBottom:"20px" }}>
      <div onClick={() => setOpen(v=>!v)} style={{ padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", background:"var(--panel2)", borderBottom: open ? "1px solid var(--border)" : "none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"46px", height:"46px", borderRadius:"10px", background:`conic-gradient(${scoreColor} ${riskScore*3.6}deg, rgba(255,255,255,0.06) 0deg)`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            <div style={{ position:"absolute", inset:"5px", borderRadius:"6px", background:"var(--panel2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:900, color:scoreColor, fontFamily:"monospace" }}>{riskScore}</div>
          </div>
          <div>
            <div style={{ fontSize:"13px", fontWeight:800, color:"var(--text)" }}>Why this score? — Explainable Risk Breakdown</div>
            <div style={{ fontSize:"11px", color:"var(--text-faint)", marginTop:"2px" }}>{factors.length} contributing factors · {factors.reduce((s,f)=>s+f.pts,0)} pts accounted for</div>
          </div>
        </div>
        <span style={{ color:"var(--text-faint)", fontSize:"16px", transition:"transform .2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </div>

      {open && (
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:"10px" }}>
          {factors.map((f, i) => {
            const color = barColor(f.pts, f.maxPts)
            return (
              <div key={i} style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", flexShrink:0, background:`${color}1a`, border:`1px solid ${color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px" }}>
                  {FACTOR_ICONS[f.type] || FACTOR_ICONS.default}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                    <span style={{ fontSize:"12.5px", fontWeight:700, color:"var(--text)" }}>{f.label}</span>
                    <span style={{ fontSize:"12px", fontWeight:900, color, fontFamily:"monospace" }}>+{f.pts} pts</span>
                  </div>
                  <div style={{ height:"5px", background:"rgba(255,255,255,0.07)", borderRadius:"3px", overflow:"hidden", marginBottom:"5px" }}>
                    <div style={{ width:`${widths[i]||0}%`, height:"100%", background:color, borderRadius:"3px", transition:"width .6s cubic-bezier(.4,0,.2,1)" }}/>
                  </div>
                  <div style={{ fontSize:"11px", color:"var(--text-faint)", lineHeight:1.35 }}>{f.evidence}</div>
                </div>
              </div>
            )
          })}
          {factors.length === 0 && <div style={{ textAlign:"center", color:"var(--text-faint)", fontSize:"12px", padding:"12px 0" }}>Score based on composite multi-signal analysis.</div>}
          <div style={{ marginTop:"4px", padding:"10px 14px", borderRadius:"8px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"11.5px" }}>
            <span style={{ color:"var(--text-faint)" }}>{explanation?.conclusion || "Score reflects weighted combination of authentication, linguistic, and infrastructure signals."}</span>
            <span style={{ color:scoreColor, fontWeight:800, fontFamily:"monospace", whiteSpace:"nowrap", marginLeft:"12px" }}>{riskScore}/100</span>
          </div>
        </div>
      )}
    </div>
  )
}
