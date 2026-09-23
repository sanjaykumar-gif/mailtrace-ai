import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { api } from "../services/api.js"

const GEMINI_MODEL = "gemini-2.0-flash"

async function callGemini(apiKey, messages, systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.65, maxOutputTokens: 1024 },
    }),
  })
  if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message || "Gemini API error") }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response."
}

const ROUTES = [
  { path: "/",           label: "Email Scanner",        desc: "Scan & analyze email threats" },
  { path: "/dashboard",  label: "Dashboard",            desc: "Overview stats & threat summary" },
  { path: "/geotrace",   label: "Origin GeoTrace",      desc: "GPS map of email threat origins" },
  { path: "/incidents",  label: "Policies & Incidents", desc: "Security policies & incidents" },
  { path: "/attack-dna", label: "Campaigns (DNA)",      desc: "Attack campaign correlation" },
  { path: "/forensics",  label: "Email Forensics",      desc: "Deep forensic analysis" },
  { path: "/live",       label: "Live Monitor",         desc: "Real-time email ingestion" },
  { path: "/ledger",     label: "Forensic Ledger",      desc: "Immutable audit trail" },
  { path: "/history",    label: "Audit History",        desc: "Historical analysis records" },
]

function parseCommand(text) {
  const t = text.toLowerCase()
  for (const r of ROUTES) {
    if ((t.includes(r.label.toLowerCase()) || t.includes(r.path.replace("/", ""))) &&
        t.match(/go to|open|navigate|show|take me|switch|launch/))
      return { type: "navigate", path: r.path, label: r.label }
  }
  if (t.match(/scan|analyze|check/) && t.match(/email/)) return { type: "navigate", path: "/",           label: "Email Scanner"   }
  if (t.match(/dashboard|overview|stats/))               return { type: "navigate", path: "/dashboard",  label: "Dashboard"       }
  if (t.match(/map|geo|gps|origin/))                     return { type: "navigate", path: "/geotrace",   label: "GeoTrace Map"    }
  if (t.match(/incident|polic/))                         return { type: "navigate", path: "/incidents",  label: "Incidents"       }
  if (t.match(/campaign|dna|attack/))                    return { type: "navigate", path: "/attack-dna", label: "Attack DNA"      }
  if (t.match(/forensic/))                               return { type: "navigate", path: "/forensics",  label: "Forensics"       }
  if (t.match(/live|monitor|imap/))                      return { type: "navigate", path: "/live",       label: "Live Monitor"    }
  if (t.match(/ledger|blockchain/))                      return { type: "navigate", path: "/ledger",     label: "Ledger"          }
  if (t.match(/history|past/))                           return { type: "navigate", path: "/history",    label: "History"         }
  return null
}

const buildSystemPrompt = (path, stats) => `
You are APEX (Advanced Protection & Email eXperts), an elite AI security intelligence engine embedded in MailTrace AI.
CURRENT PAGE: ${path}
STATS: ${JSON.stringify(stats || {})}
PAGES: ${ROUTES.map(r => `${r.label}(${r.path}): ${r.desc}`).join(" | ")}
RULES: Be expert, concise, professional. Use bullet points for lists. Max 200 words unless detail requested.
When navigating, start reply with "→ Navigating to [page]...".
`.trim()

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:"5px", alignItems:"center", padding:"2px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:"8px", height:"8px", borderRadius:"50%",
          background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",
          animation:`apexDot 1.3s ease-in-out ${i*0.17}s infinite`,
        }}/>
      ))}
    </div>
  )
}

function Bubble({ msg }) {
  const isUser = msg.role === "user"
  return (
    <div style={{
      display:"flex", flexDirection:isUser?"row-reverse":"row",
      gap:"9px", alignItems:"flex-end", marginBottom:"12px",
      animation:"apexFadeIn .2s ease",
    }}>
      {!isUser && (
        <img src="/apex-logo.jpg" alt="APEX"
          style={{ width:"32px", height:"32px", borderRadius:"8px", flexShrink:0, objectFit:"cover",
            boxShadow:"0 2px 8px rgba(29,78,216,0.25)", border:"1.5px solid #dbeafe" }}/>
      )}
      <div style={{
        maxWidth:"78%", padding:"11px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        background: isUser
          ? "linear-gradient(135deg, #1d4ed8 0%, #0369a1 100%)"
          : "#ffffff",
        border: isUser ? "none" : "1px solid #e2e8f0",
        boxShadow: isUser
          ? "0 4px 14px rgba(29,78,216,0.3)"
          : "0 1px 6px rgba(0,0,0,0.08)",
        fontSize:"13px", lineHeight:"1.58",
        color: isUser ? "#ffffff" : "#1e293b",
        whiteSpace:"pre-wrap", wordBreak:"break-word",
      }}>
        {msg.content}
        {msg.action && (
          <div style={{
            marginTop:"8px", padding:"6px 10px", borderRadius:"6px",
            background:"#eff6ff", border:"1px solid #bfdbfe",
            fontSize:"11px", color:"#1d4ed8", fontWeight:700,
            display:"flex", alignItems:"center", gap:"5px",
          }}>✓ {msg.action}</div>
        )}
      </div>
      {isUser && (
        <div style={{
          width:"32px", height:"32px", borderRadius:"8px", flexShrink:0,
          background:"linear-gradient(135deg,#1d4ed8,#0369a1)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"15px", boxShadow:"0 2px 8px rgba(29,78,216,0.25)",
        }}>👤</div>
      )}
    </div>
  )
}

const QUICK = [
  { label:"🗺️ Threat Map",    msg:"Show me the threat map"      },
  { label:"📊 Dashboard",     msg:"Go to dashboard"             },
  { label:"🔬 Forensics",     msg:"Open forensics"              },
  { label:"❓ What is BEC?",  msg:"What is a BEC attack?"       },
  { label:"📧 Scan Email",    msg:"How do I scan an email?"     },
]

export default function GeminiAssistant() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen]               = useState(false)
  const [apiKey, setApiKey]           = useState(() => localStorage.getItem("mailtrace_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY || "")
  const [showKey, setShowKey]         = useState(false)
  const [keyDraft, setKeyDraft]       = useState("")
  const [messages, setMessages]       = useState([{
    role:"assistant",
    content:"Hello! I'm APEX — Advanced Protection & Email eXperts.\n\nI can navigate this platform, explain threat data, and answer any cybersecurity question.\n\nHow can I assist your investigation today?",
  }])
  const [input, setInput]             = useState("")
  const [loading, setLoading]         = useState(false)
  const [stats, setStats]             = useState(null)
  const [unread, setUnread]           = useState(0)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { api.stats().catch(()=>null).then(setStats) }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages, loading])
  useEffect(() => { if (open) { setTimeout(()=>inputRef.current?.focus(), 120); setUnread(0) } }, [open])

  useEffect(() => {
    if (document.getElementById("apex-css")) return
    const s = document.createElement("style")
    s.id = "apex-css"
    s.textContent = `
      @keyframes apexDot    { 0%,60%,100%{transform:scale(.8);opacity:.35} 30%{transform:scale(1.35);opacity:1} }
      @keyframes apexFadeIn { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
      @keyframes apexUp     { from{opacity:0;transform:translateY(22px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes apexPulse  { 0%,100%{box-shadow:0 0 0 0 rgba(29,78,216,.45)} 55%{box-shadow:0 0 0 10px rgba(29,78,216,0)} }
      .apex-fab:hover        { transform:scale(1.07) !important; }
      .apex-input:focus      { outline:none!important; border-color:#93c5fd!important; box-shadow:0 0 0 3px rgba(147,197,253,.25)!important; }
      .apex-send:hover:not(:disabled) { background:linear-gradient(135deg,#1e40af,#0369a1)!important; transform:scale(1.06); }
      .apex-chip:hover       { background:#eff6ff!important; border-color:#93c5fd!important; color:#1d4ed8!important; }
      .apex-scroll::-webkit-scrollbar { width:4px; }
      .apex-scroll::-webkit-scrollbar-track { background:#f8fafc; }
      .apex-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }
      .apex-scroll::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
    `
    document.head.appendChild(s)
  }, [])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return
    if (!apiKey) { setShowKey(true); return }
    const userMsg = { role:"user", content:text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput("")
    setLoading(true)
    const cmd = parseCommand(text)
    try {
      const reply = await callGemini(apiKey, newMsgs.slice(-10), buildSystemPrompt(location.pathname, stats))
      let action = null
      if (cmd) { setTimeout(() => navigate(cmd.path), 650); action = `Navigated to ${cmd.label}` }
      setMessages(prev => [...prev, { role:"assistant", content:reply, action }])
      if (!open) setUnread(n => n+1)
    } catch(err) {
      setMessages(prev => [...prev, { role:"assistant", content:`⚠️ Error: ${err.message}\n\nPlease check your Gemini API key.` }])
    } finally { setLoading(false) }
  }, [apiKey, loading, messages, location.pathname, stats, navigate, open])

  const handleKey = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }
  const saveKey = () => {
    if (!keyDraft.trim()) return
    localStorage.setItem("mailtrace_gemini_key", keyDraft.trim())
    setApiKey(keyDraft.trim()); setShowKey(false); setKeyDraft("")
  }

  return (
    <>
      {/* FAB */}
      <button id="apex-fab-btn" className="apex-fab" onClick={() => setOpen(v=>!v)}
        style={{
          position:"fixed", bottom:"28px", right:"28px", zIndex:9999,
          width:"62px", height:"62px", borderRadius:"18px", border:"none", cursor:"pointer",
          background: open ? "#f1f5f9" : "linear-gradient(145deg,#1d4ed8,#0369a1)",
          boxShadow: open
            ? "0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px #e2e8f0"
            : "0 6px 24px rgba(29,78,216,0.4), 0 2px 8px rgba(0,0,0,0.15)",
          animation: open ? "none" : "apexPulse 2.6s ease infinite",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .25s cubic-bezier(.4,0,.2,1)",
          padding:"0",
        }}
        title={open ? "Close APEX" : "APEX AI Assistant"}
        aria-label="Toggle APEX AI"
      >
        {open
          ? <span style={{ fontSize:"20px", color:"#64748b", fontWeight:300 }}>✕</span>
          : <img src="/apex-logo.jpg" alt="APEX" style={{ width:"44px", height:"44px", borderRadius:"12px", objectFit:"cover" }}/>
        }
      </button>

      {/* Unread badge */}
      {!open && unread > 0 && (
        <div style={{
          position:"fixed", bottom:"80px", right:"22px", zIndex:10000,
          width:"20px", height:"20px", borderRadius:"50%",
          background:"#ef4444", color:"#fff", fontSize:"11px", fontWeight:900,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 8px rgba(239,68,68,0.6)",
        }}>{unread}</div>
      )}

      {/* Chat Panel */}
      {open && (
        <div style={{
          position:"fixed", bottom:"106px", right:"28px", zIndex:9998,
          width:"min(430px, calc(100vw - 56px))", height:"600px",
          background:"#f8fafc",
          border:"1px solid #e2e8f0",
          borderRadius:"22px",
          boxShadow:"0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.8)",
          display:"flex", flexDirection:"column", overflow:"hidden",
          animation:"apexUp .28s cubic-bezier(.4,0,.2,1)",
        }}>

          {/* ── Header ── */}
          <div style={{
            padding:"0 18px",
            height:"68px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:"#ffffff",
            borderBottom:"1px solid #f1f5f9",
            flexShrink:0,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <img src="/apex-logo.jpg" alt="APEX logo"
                style={{ width:"40px", height:"40px", borderRadius:"10px", objectFit:"cover",
                  boxShadow:"0 2px 10px rgba(29,78,216,0.2)", border:"1.5px solid #dbeafe" }}/>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                  <span style={{ fontSize:"16px", fontWeight:800, color:"#0f172a", letterSpacing:".04em" }}>APEX</span>
                  <span style={{
                    fontSize:"9px", fontWeight:700, padding:"2px 6px", borderRadius:"4px",
                    background:"#eff6ff", color:"#1d4ed8", border:"1px solid #bfdbfe", letterSpacing:".05em",
                  }}>AI</span>
                </div>
                <div style={{ fontSize:"10.5px", color:"#94a3b8", marginTop:"1px", fontWeight:500 }}>
                  Advanced Protection & Email eXperts
                </div>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <div style={{
                display:"flex", alignItems:"center", gap:"4px",
                padding:"3px 9px", borderRadius:"20px",
                background: loading ? "#fff7ed" : "#f0fdf4",
                border:`1px solid ${loading ? "#fed7aa" : "#bbf7d0"}`,
              }}>
                <div style={{
                  width:"6px", height:"6px", borderRadius:"50%",
                  background: loading ? "#f97316" : "#22c55e",
                  animation: loading ? "apexPulse .8s ease infinite" : "none",
                }}/>
                <span style={{ fontSize:"10px", fontWeight:700, color: loading ? "#ea580c" : "#16a34a" }}>
                  {loading ? "Thinking…" : "Online"}
                </span>
              </div>
              <button onClick={() => setShowKey(v=>!v)} title="API Key Settings"
                style={{ background:"transparent", border:"1px solid #e2e8f0", borderRadius:"8px",
                  color:"#94a3b8", cursor:"pointer", padding:"5px 9px", fontSize:"14px",
                  transition:"all .15s" }}>⚙</button>
              <button onClick={() => setMessages([{ role:"assistant", content:"Chat cleared. APEX ready." }])}
                title="Clear chat"
                style={{ background:"transparent", border:"1px solid #e2e8f0", borderRadius:"8px",
                  color:"#94a3b8", cursor:"pointer", padding:"5px 9px", fontSize:"13px",
                  transition:"all .15s" }}>🗑</button>
            </div>
          </div>

          {/* ── API Key Input ── */}
          {showKey && (
            <div style={{
              padding:"12px 18px", background:"#fffbeb",
              borderBottom:"1px solid #fde68a", flexShrink:0,
            }}>
              <div style={{ fontSize:"11px", color:"#92400e", marginBottom:"7px", fontWeight:600 }}>
                🔑 Gemini API Key {apiKey && <span style={{ color:"#16a34a" }}>· Saved ✓</span>}
              </div>
              <div style={{ display:"flex", gap:"7px" }}>
                <input type="password" placeholder="AIza..." defaultValue={apiKey}
                  onChange={e => setKeyDraft(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && saveKey()}
                  style={{
                    flex:1, padding:"8px 12px", borderRadius:"9px", fontSize:"12px",
                    background:"#ffffff", border:"1px solid #fde68a",
                    color:"#1e293b", outline:"none", fontFamily:"monospace",
                  }}/>
                <button onClick={saveKey} style={{
                  padding:"8px 16px", borderRadius:"9px", fontSize:"12px", fontWeight:700,
                  background:"linear-gradient(135deg,#1d4ed8,#0369a1)",
                  border:"none", color:"#fff", cursor:"pointer",
                }}>Save</button>
              </div>
              <div style={{ fontSize:"10px", color:"#a16207", marginTop:"5px" }}>
                Get free key at <span style={{ color:"#1d4ed8", textDecoration:"underline" }}>aistudio.google.com</span>
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="apex-scroll" style={{
            flex:1, overflowY:"auto", padding:"18px 16px 8px",
            background:"#f8fafc",
          }}>
            {messages.map((m,i) => <Bubble key={i} msg={m}/>)}
            {loading && (
              <div style={{ display:"flex", gap:"9px", alignItems:"flex-end", marginBottom:"12px" }}>
                <img src="/apex-logo.jpg" alt="APEX"
                  style={{ width:"32px", height:"32px", borderRadius:"8px", objectFit:"cover",
                    boxShadow:"0 2px 8px rgba(29,78,216,0.2)", border:"1.5px solid #dbeafe", flexShrink:0 }}/>
                <div style={{
                  padding:"12px 16px", borderRadius:"4px 18px 18px 18px",
                  background:"#ffffff", border:"1px solid #e2e8f0",
                  boxShadow:"0 1px 6px rgba(0,0,0,0.07)",
                }}>
                  <TypingDots/>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* ── Quick Chips ── */}
          <div style={{
            padding:"8px 16px 10px", display:"flex", gap:"6px", flexWrap:"wrap",
            background:"#f8fafc", borderTop:"1px solid #f1f5f9", flexShrink:0,
          }}>
            {QUICK.map(q => (
              <button key={q.label} onClick={() => sendMessage(q.msg)} className="apex-chip"
                style={{
                  padding:"4px 11px", borderRadius:"20px", fontSize:"11px", fontWeight:600,
                  cursor:"pointer", background:"#ffffff", border:"1px solid #e2e8f0",
                  color:"#64748b", transition:"all .15s", whiteSpace:"nowrap",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                }}>{q.label}</button>
            ))}
          </div>

          {/* ── Input Bar ── */}
          <div style={{
            padding:"10px 14px 16px", borderTop:"1px solid #f1f5f9",
            display:"flex", gap:"8px", alignItems:"flex-end",
            background:"#ffffff", flexShrink:0,
          }}>
            <textarea ref={inputRef} className="apex-input" value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask APEX anything or say 'Open dashboard'…"
              rows={1}
              style={{
                flex:1, padding:"10px 14px", borderRadius:"12px", fontSize:"13px",
                resize:"none", background:"#f8fafc", border:"1.5px solid #e2e8f0",
                color:"#1e293b", fontFamily:"inherit", lineHeight:"1.45",
                maxHeight:"100px", overflow:"auto", transition:"border .2s, box-shadow .2s",
              }}
              onInput={e => { e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,100)+"px" }}
            />
            <button className="apex-send" onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width:"42px", height:"42px", borderRadius:"12px", border:"none",
                cursor:(loading || !input.trim()) ? "not-allowed" : "pointer",
                background:(loading || !input.trim())
                  ? "#f1f5f9"
                  : "linear-gradient(135deg,#1d4ed8,#0369a1)",
                color:(loading || !input.trim()) ? "#cbd5e1" : "#ffffff",
                fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all .2s", flexShrink:0,
                boxShadow:(!loading && input.trim()) ? "0 4px 14px rgba(29,78,216,0.35)" : "none",
              }}
              title="Send">
              {loading ? "⋯" : "↑"}
            </button>
          </div>

          {/* Footer */}
          <div style={{
            padding:"5px 18px 9px", textAlign:"center",
            fontSize:"10px", color:"#cbd5e1", background:"#ffffff",
            borderTop:"1px solid #f8fafc",
          }}>
            APEX · Powered by Google Gemini 2.0 · MailTrace AI
          </div>
        </div>
      )}
    </>
  )
}
