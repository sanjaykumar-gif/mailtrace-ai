import { useEffect, useRef, useState, useCallback } from "react"

let leafletCssInjected = false
function injectLeafletCss() {
  if (leafletCssInjected) return
  leafletCssInjected = true
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  document.head.appendChild(link)
}

function riskColor(score) {
  if (score >= 80) return "#ef4444"
  if (score >= 50) return "#f59e0b"
  if (score >= 20) return "#38bdf8"
  return "#22c55e"
}

function riskGlow(score) {
  if (score >= 80) return "rgba(239,68,68,0.7)"
  if (score >= 50) return "rgba(245,158,11,0.7)"
  if (score >= 20) return "rgba(56,189,248,0.7)"
  return "rgba(34,197,94,0.7)"
}

function classLabel(score) {
  if (score >= 80) return "CRITICAL"
  if (score >= 50) return "HIGH"
  if (score >= 20) return "MEDIUM"
  return "SAFE"
}

function drawArcs(map, points, canvasRef) {
  if (!canvasRef.current || !map) return
  const canvas = canvasRef.current
  const ctx = canvas.getContext("2d")
  const size = map.getSize()
  if (!size || size.x === 0 || size.y === 0) return
  canvas.width = size.x
  canvas.height = size.y
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const center = map.getCenter()
  const defenderPx = map.latLngToContainerPoint([center.lat, center.lng])
  points.forEach((pt) => {
    if (pt.risk_score < 30) return
    const lat = parseFloat(pt.latitude ?? pt.lat)
    const lon = parseFloat(pt.longitude ?? pt.lon ?? pt.lng)
    if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return
    const srcPx = map.latLngToContainerPoint([lat, lon])
    const color = riskColor(pt.risk_score)
    const cx = (srcPx.x + defenderPx.x) / 2
    const cy = Math.min(srcPx.y, defenderPx.y) - Math.abs(srcPx.x - defenderPx.x) * 0.35
    ctx.beginPath()
    ctx.moveTo(srcPx.x, srcPx.y)
    ctx.quadraticCurveTo(cx, cy, defenderPx.x, defenderPx.y)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.4
    ctx.globalAlpha = 0.4
    ctx.setLineDash([6, 6])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  })
}

export default function RealTimeGpsMap({ points = [], onSelectPoint = null, refreshInterval = 8000 }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const canvasRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isLive, setIsLive] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const mapPoints = points || []

  useEffect(() => {
    injectLeafletCss()
    if (!mapContainerRef.current || mapRef.current) return
    import("leaflet").then((L) => {
      const map = L.map(mapContainerRef.current, {
        center: [25, 15],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      })

      // Watermark-free OpenStreetMap / Esri Topo natural ocean & terrain tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        subdomains: "abc",
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      L.control.zoom({ position: "bottomright" }).addTo(map)
      const canvas = canvasRef.current
      if (canvas) {
        map.getPanes().overlayPane.appendChild(canvas)
        canvas.style.position = "absolute"
        canvas.style.top = "0"
        canvas.style.left = "0"
        canvas.style.pointerEvents = "none"
        canvas.style.zIndex = "400"
      }
      mapRef.current = map
      setMapReady(true)
      map.on("move zoom", () => drawArcs(map, mapPoints, canvasRef))
    })
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const refreshMarkers = useCallback(() => {
    if (!mapRef.current || !mapReady) return
    import("leaflet").then((L) => {
      const map = mapRef.current
      markersRef.current.forEach((m) => map.removeLayer(m))
      markersRef.current = []
      const validLatLngs = []

      mapPoints.forEach((pt) => {
        const lat = parseFloat(pt.latitude ?? pt.lat)
        const lon = parseFloat(pt.longitude ?? pt.lon ?? pt.lng)
        if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return

        validLatLngs.push([lat, lon])
        const color = riskColor(pt.risk_score)
        const glow = riskGlow(pt.risk_score)
        const size = pt.risk_score >= 80 ? 18 : pt.risk_score >= 50 ? 14 : 11

        const icon = L.divIcon({
          className: "",
          iconSize: [size * 4, size * 4],
          iconAnchor: [size * 2, size * 2],
          html: `<div style="position:relative;width:${size * 4}px;height:${size * 4}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <div style="position:absolute;width:${size * 3}px;height:${size * 3}px;border-radius:50%;background:${glow};animation:gpsPulse 2s ease-out infinite;opacity:0;"></div>
            <div style="position:absolute;width:${size * 2.2}px;height:${size * 2.2}px;border-radius:50%;background:${glow};animation:gpsPulse 2s ease-out 0.6s infinite;opacity:0;"></div>
            <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 0 ${size}px ${glow},0 0 ${size * 0.5}px ${color};position:relative;z-index:2;"></div>
          </div>`,
        })

        const marker = L.marker([lat, lon], { icon })
        const popupHtml = `
          <div style="background:#0f172a;border:1px solid ${color};border-radius:10px;padding:12px 14px;font-family:sans-serif;color:#f8fafc;min-width:220px;box-shadow:0 0 20px rgba(0,0,0,0.8);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:#94a3b8;">Origin Node</span>
              <span style="font-size:10.5px;font-weight:900;padding:2px 6px;border-radius:4px;background:${color}22;color:${color};border:1px solid ${color}55;">
                ${classLabel(pt.risk_score)} ${pt.risk_score}/100
              </span>
            </div>
            <div style="font-size:14px;font-weight:900;color:${color};font-family:monospace;margin-bottom:4px;">${pt.ip}</div>
            <div style="font-size:12px;color:#cbd5e1;margin-bottom:8px;font-weight:700;">📍 ${pt.city ? `${pt.city}, ` : ""}${pt.country || "Unknown"}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10.5px;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;">
              <div><span style="color:#64748b;">ISP:</span><br><b>${pt.isp || "Unknown"}</b></div>
              <div><span style="color:#64748b;">Emails:</span><br><b>${pt.email_count || 1} detected</b></div>
              <div><span style="color:#64748b;">VPN / Tor:</span><br><b style="color:${pt.vpn_indicator ? "#f59e0b" : "#22c55e"}">${pt.vpn_indicator ? "⚠️ Proxy/Tor" : "✓ Clean Direct"}</b></div>
              <div><span style="color:#64748b;">Confidence:</span><br><b style="color:#38bdf8;">${pt.confidence || 85}%</b></div>
            </div>
          </div>
        `
        marker.bindPopup(popupHtml, { maxWidth: 280, className: "gps-dark-popup", closeButton: true })
        marker.on("click", () => {
          setSelected(pt)
          if (onSelectPoint) onSelectPoint(pt)
        })
        marker.addTo(map)
        markersRef.current.push(marker)
      })

      drawArcs(map, mapPoints, canvasRef)
      setLastRefresh(new Date())

      // Auto-fit bounds
      if (validLatLngs.length > 0 && mapRef.current) {
        if (validLatLngs.length === 1) {
          map.setView(validLatLngs[0], 4)
        } else {
          map.fitBounds(validLatLngs, { padding: [40, 40], maxZoom: 6 })
        }
      }
    })
  }, [mapReady, mapPoints, onSelectPoint])

  useEffect(() => {
    refreshMarkers()
    if (!isLive) return
    const id = setInterval(refreshMarkers, refreshInterval)
    return () => clearInterval(id)
  }, [refreshMarkers, isLive, refreshInterval])

  useEffect(() => {
    if (!selected && mapPoints.length > 0) setSelected(mapPoints.find((p) => p.risk_score >= 80) || mapPoints[0])
  }, [mapPoints])

  useEffect(() => {
    if (document.getElementById("gps-pulse-style")) return
    const style = document.createElement("style")
    style.id = "gps-pulse-style"
    style.textContent = `
      @keyframes gpsPulse { 0%{transform:scale(.4);opacity:.8} 80%{transform:scale(1.6);opacity:0} 100%{transform:scale(1.6);opacity:0} }
      .gps-dark-popup .leaflet-popup-content-wrapper{background:transparent!important;box-shadow:none!important;padding:0!important;border-radius:10px!important;}
      .gps-dark-popup .leaflet-popup-tip-container{display:none}
      .gps-dark-popup .leaflet-popup-content{margin:0!important}
      .leaflet-container{background:#060d1a!important}
    `
    document.head.appendChild(style)
  }, [])

  const critCount = mapPoints.filter((p) => p.risk_score >= 80).length
  const highCount = mapPoints.filter((p) => p.risk_score >= 50 && p.risk_score < 80).length

  return (
    <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(56,189,248,0.2)", background: "#060d1a" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "linear-gradient(90deg,rgba(6,13,26,.95),rgba(15,23,42,.95))", borderBottom: "1px solid rgba(56,189,248,0.15)", backdropFilter: "blur(10px)", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLive ? "#22c55e" : "#64748b", boxShadow: isLive ? "0 0 8px #22c55e" : "none", animation: isLive ? "gpsPulse 1.6s ease-out infinite" : "none" }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 900, color: "#f8fafc", letterSpacing: ".04em" }}>🌍 REAL-TIME THREAT ORIGIN MAP</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>GPS-precision geolocation · {mapPoints.length} active nodes · OpenStreetMap Cartography</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {critCount > 0 && <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>🚨 {critCount} CRITICAL</span>}
          {highCount > 0 && <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px", background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>⚠️ {highCount} HIGH</span>}
          <button onClick={() => setIsLive((v) => !v)} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: "pointer", background: isLive ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)", color: isLive ? "#4ade80" : "#94a3b8", border: `1px solid ${isLive ? "rgba(34,197,94,0.35)" : "rgba(100,116,139,0.3)"}`, transition: "all .2s" }}>
            {isLive ? "⚡ LIVE" : "⏸️ PAUSED"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", minHeight: "480px" }}>
        <div style={{ position: "relative" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "480px" }} />
          <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 400 }} />
          <div style={{ position: "absolute", bottom: "10px", left: "10px", zIndex: 500, background: "rgba(6,13,26,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "10px", color: "#94a3b8", fontFamily: "monospace" }}>
            Last sync: {lastRefresh.toLocaleTimeString()}
          </div>
          <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 500, background: "rgba(6,13,26,0.88)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 12px", fontSize: "10px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "4px" }}>
            {[["#ef4444", "Critical (80–100)"], ["#f59e0b", "High (50–79)"], ["#38bdf8", "Medium (20–49)"], ["#22c55e", "Safe (0–19)"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(6,13,26,0.95)", borderLeft: "1px solid rgba(56,189,248,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selected ? (
            <>
              <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: `linear-gradient(135deg,${riskColor(selected.risk_score)}11 0%,transparent 70%)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "#64748b", letterSpacing: ".06em" }}>Active Threat Node</span>
                  <span style={{ fontSize: "10px", fontWeight: 900, padding: "2px 7px", borderRadius: "4px", background: `${riskColor(selected.risk_score)}22`, color: riskColor(selected.risk_score), border: `1px solid ${riskColor(selected.risk_score)}55` }}>{classLabel(selected.risk_score)}</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: riskColor(selected.risk_score), fontFamily: "monospace" }}>{selected.ip}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>📍 {selected.city ? `${selected.city}, ` : ""}{selected.country}</div>
              </div>

              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                  <span style={{ color: "#64748b" }}>Threat Score</span>
                  <span style={{ fontWeight: 900, color: riskColor(selected.risk_score) }}>{selected.risk_score}/100</span>
                </div>
                <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <div style={{ width: `${selected.risk_score}%`, height: "100%", borderRadius: "3px", background: `linear-gradient(90deg,${riskColor(selected.risk_score)},${riskColor(selected.risk_score)}aa)`, boxShadow: `0 0 8px ${riskColor(selected.risk_score)}`, transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
                </div>
              </div>

              <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "10px", fontSize: "11px" }}>
                {[
                  ["GPS Coordinates", `${selected.latitude?.toFixed(4)}, ${selected.longitude?.toFixed(4)}`],
                  ["ISP / Network", selected.isp || "Unknown"],
                  ["VPN / Tor Signal", selected.vpn_indicator ? "⚠️ Proxy/Tor Detected" : "✓ Direct / Clean"],
                  ["Email Count", `${selected.email_count || 1} email(s) traced`],
                  ["Confidence", `${selected.confidence || 75}%`],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: "2px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color: "#475569", textTransform: "uppercase", fontSize: "9.5px", letterSpacing: ".05em", fontWeight: 700 }}>{label}</span>
                    <span style={{ fontWeight: 700, color: label === "GPS Coordinates" ? "#38bdf8" : label === "VPN / Tor Signal" ? (selected.vpn_indicator ? "#fbbf24" : "#4ade80") : "#e2e8f0", fontFamily: label === "GPS Coordinates" ? "monospace" : "inherit" }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", maxHeight: "180px", overflowY: "auto" }}>
                <div style={{ padding: "8px 16px", fontSize: "9.5px", fontWeight: 800, textTransform: "uppercase", color: "#475569", letterSpacing: ".05em" }}>All Nodes ({mapPoints.length})</div>
                {mapPoints.map((pt) => (
                  <div key={pt.ip} onClick={() => { setSelected(pt); if (onSelectPoint) onSelectPoint(pt) }}
                    style={{ padding: "7px 16px", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "space-between", background: selected?.ip === pt.ip ? `${riskColor(pt.risk_score)}11` : "transparent", borderLeft: `2px solid ${selected?.ip === pt.ip ? riskColor(pt.risk_score) : "transparent"}`, transition: "all .15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: riskColor(pt.risk_score), boxShadow: `0 0 5px ${riskColor(pt.risk_score)}` }} />
                      <span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: "10px" }}>{pt.ip}</span>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: riskColor(pt.risk_score) }}>{pt.risk_score}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: "12px", textAlign: "center", padding: "24px" }}>
              Click a map node<br />to inspect its telemetry
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "8px 18px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,13,26,0.9)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748b" }}>
        <span>⚖️ Infrastructure-level geolocation only · Does not establish sender identity</span>
        <span style={{ color: "#475569" }}>Leaflet · OpenStreetMap Natural Cartography</span>
      </div>
    </div>
  )
}
