import { useEffect, useState } from "react"
import { fmtDate } from "../services/api.js"

function buildSteps(data) {
  const ex = data.explanation || {}
  const geo = data.geotrace || {}
  const nlp = data.nlp_analysis || {}
  const auth = data.auth || {}
  const links = data.urls || []
  const ts = data.timestamp

  const steps = []

  steps.push({
    icon:"📧", color:"#38bdf8", phase:"PHASE 1 — EMAIL RECEIVED",
    title:"Suspicious Email Arrived",
    detail:`Subject: "${data.subject || "(No Subject)"}" · From: ${data.sender?.name || "Unknown"} <${data.sender?.address || "—"}>`,
    time: ts, status:"confirmed",
  })

  const authFails = [auth.spf==="fail"&&"SPF",auth.dkim==="fail"&&"DKIM",auth.dmarc==="fail"&&"DMARC"].filter(Boolean)
  steps.push({
    icon:"🔐", color: authFails.length ? "#ef4444" : "#22c55e", phase:"PHASE 2 — AUTHENTICATION ANALYSIS",
    title: authFails.length ? `Authentication FAILED — ${authFails.join(" + ")} rejected` : "Authentication Passed",
    detail: authFails.length
      ? `${authFails.join(", ")} verification failed. This email was NOT authorized by the domain owner. Indicates spoofing or compromised relay.`
      : "SPF, DKIM and DMARC all passed. Sender is authorized.",
    time: ts, status: authFails.length ? "critical" : "clean",
  })

  if (geo.earliest_reliable_ip || data.origin_ip) {
    steps.push({
      icon:"🌍", color:"#f97316", phase:"PHASE 3 — GEOLOCATION TRACED",
      title:`Origin Traced to ${geo.city ? geo.city + ", " : ""}${geo.country || "Unknown"}`,
      detail:`Sending IP: ${geo.earliest_reliable_ip || data.origin_ip} · ISP: ${geo.isp || "Unknown"} · Network: ${geo.infrastructure?.network_type || "Unknown"} · Confidence: ${geo.confidence || 75}%`,
      time: ts, status: geo.risk_label === "TOR" ? "critical" : "warning",
    })
  }

  const nlpScore = nlp.social_engineering_score || 0
  if (nlpScore > 10) {
    const dominant = [
      nlp.urgency_language?.level !== "LOW" && `urgency (${nlp.urgency_language?.score})`,
      nlp.credential_harvesting?.level !== "LOW" && `credential harvesting (${nlp.credential_harvesting?.score})`,
      nlp.impersonation_language?.level !== "LOW" && `impersonation (${nlp.impersonation_language?.score})`,
    ].filter(Boolean)
    steps.push({
      icon:"🧠", color:"#a78bfa", phase:"PHASE 4 — NLP THREAT ANALYSIS",
      title:"Social Engineering Language Detected",
      detail: dominant.length
        ? `AI detected: ${dominant.join(", ")}. ${nlp.summary || ""}`
        : `Composite social engineering score: ${nlpScore}/100. ${nlp.summary || ""}`,
      time: ts, status: nlpScore >= 60 ? "critical" : "warning",
    })
  }

  const malLinks = links.filter(u => u.suspicious || u.malicious || (u.risk_score || 0) >= 50)
  if (malLinks.length > 0) {
    steps.push({
      icon:"🔗", color:"#ef4444", phase:"PHASE 5 — MALICIOUS URL DISCOVERED",
      title:`${malLinks.length} Malicious Link${malLinks.length > 1 ? "s" : ""} Found`,
      detail:`URLs: ${malLinks.slice(0,2).map(u=>u.url||u.href||u).join(", ")}${malLinks.length>2?` +${malLinks.length-2} more`:""}`,
      time: ts, status:"critical",
    })
  }

  if (data.campaign_id) {
    steps.push({
      icon:"🧬", color:"#fbbf24", phase:"PHASE 6 — CAMPAIGN ATTRIBUTION",
      title:`Linked to Campaign Cluster: ${data.campaign_id}`,
      detail:"Infrastructure fingerprint matches active phishing campaign. Multiple emails share origin IP, lure theme, and domain registration patterns.",
      time: ts, status:"warning",
    })
  }

  const score = data.risk_score || 0
  steps.push({
    icon: score >= 80 ? "🚨" : score >= 50 ? "⚠️" : "✅",
    color: score >= 80 ? "#ef4444" : score >= 50 ? "#f97316" : "#22c55e",
    phase:"PHASE 7 — SOC VERDICT",
    title:`Risk Score: ${score}/100 — ${data.classification || "UNDER REVIEW"}`,
    detail: ex.action || (score >= 80 ? "QUARANTINE & BLOCK DOMAIN — trigger automated gateway containment" : score >= 50 ? "FLAG & MONITOR — escalate to Tier-2 analyst review" : "ALLOW WITH AUDIT LOG — standard monitoring continues"),
    time: ts, status: score >= 80 ? "critical" : score >= 50 ? "warning" : "clean",
  })

  return steps
}

const STATUS_STYLES = {
  critical: { dot:"#ef4444", line:"rgba(239,68,68,0.3)", bg:"rgba(239,68,68,0.06)" },
  warning:  { dot:"#f97316", line:"rgba(249,115,22,0.3)", bg:"rgba(249,115,22,0.06)" },
  clean:    { dot:"#22c55e", line:"rgba(34,197,94,0.3)",  bg:"rgba(34,197,94,0.06)"  },
  confirmed:{ dot:"#38bdf8", line:"rgba(56,189,248,0.3)", bg:"rgba(56,189,248,0.06)" },
}

export default function AttackStoryTimeline({ data }) {
  const [visible, setVisible] = useState(0)
  const steps = buildSteps(data)

  useEffect(() => {
    setVisible(0)
    steps.forEach((_, i) => setTimeout(() => setVisible(v => Math.max(v, i+1)), 120 * i))
  }, [data.id]) // eslint-disable-line

  return (
    <div style={{ padding:"4px 0" }}>
      <div style={{ marginBottom:"20px" }}>
        <div style={{ fontSize:"11px", fontWeight:800, textTransform:"uppercase", color:"var(--text-faint)", letterSpacing:".05em" }}>INVESTIGATION NARRATIVE TIMELINE</div>
        <div style={{ fontSize:"12px", color:"var(--text-faint)", marginTop:"3px" }}>Step-by-step reconstruction of how this threat was detected and attributed</div>
      </div>

      <div style={{ position:"relative" }}>
        {/* Vertical spine line */}
        <div style={{ position:"absolute", left:"19px", top:"24px", bottom:"24px", width:"2px", background:"linear-gradient(180deg, rgba(56,189,248,0.3), rgba(239,68,68,0.2))", borderRadius:"1px" }}/>

        <div style={{ display:"flex", flexDirection:"column", gap:"0" }}>
          {steps.map((step, i) => {
            if (i >= visible) return null
            const s = STATUS_STYLES[step.status] || STATUS_STYLES.confirmed
            return (
              <div key={i} style={{ display:"flex", gap:"16px", animation:"apexFadeIn .3s ease", position:"relative", paddingBottom:"16px" }}>
                {/* Node dot */}
                <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", zIndex:1 }}>
                  <div style={{
                    width:"40px", height:"40px", borderRadius:"10px",
                    background:`${step.color}18`, border:`2px solid ${step.color}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"18px", boxShadow:`0 0 12px ${step.color}40`,
                  }}>{step.icon}</div>
                </div>
                {/* Content card */}
                <div style={{
                  flex:1, padding:"12px 16px", borderRadius:"10px",
                  background: s.bg, border:`1px solid ${s.line}`,
                  marginTop:"4px",
                }}>
                  <div style={{ fontSize:"9.5px", fontWeight:800, color:step.color, textTransform:"uppercase", letterSpacing:".06em", marginBottom:"4px" }}>{step.phase}</div>
                  <div style={{ fontSize:"13px", fontWeight:800, color:"var(--text)", marginBottom:"5px" }}>{step.title}</div>
                  <div style={{ fontSize:"11.5px", color:"var(--text-faint)", lineHeight:1.45 }}>{step.detail}</div>
                  {step.time && (
                    <div style={{ fontSize:"10px", color:"var(--text-faint)", marginTop:"6px", opacity:.6 }}>{fmtDate(step.time)}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
