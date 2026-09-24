import { useState } from 'react'

// Equirectangular projection coordinates helper for SVG map
function projectLatLon(lat, lon, width = 800, height = 400) {
  const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat)
  const parsedLon = typeof lon === 'number' ? lon : parseFloat(lon)
  if (isNaN(parsedLat) || isNaN(parsedLon)) {
    return { x: width / 2, y: height / 2, valid: false }
  }
  const clampedLat = Math.max(-85, Math.min(85, parsedLat))
  const x = ((parsedLon + 180) / 360) * width
  const y = ((85 - clampedLat) / 170) * height
  return { x, y, valid: true }
}

export default function ThreatMap({ points = [], onSelectPoint = null }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [activePoint, setActivePoint] = useState(null)

  const width = 800
  const height = 400

  // Real points or empty array
  const mapPoints = points || []

  const selected = activePoint || hoveredPoint || (mapPoints.length > 0 ? mapPoints[0] : null)

  return (
    <div className="threat-map-container" style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15, 23, 42, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌍</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
              THREAT ORIGIN MAP & GEOTRACE
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-faint)' }}>
              Earliest Reliable Sending Nodes & Geolocated Threat Origins ({mapPoints.length} Active {mapPoints.length === 1 ? 'Node' : 'Nodes'})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{
            background: mapPoints.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.12)',
            color: mapPoints.length > 0 ? '#f87171' : 'var(--text-faint)',
            border: `1px solid ${mapPoints.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
            fontSize: '11px'
          }}>
            {mapPoints.length > 0 ? '● Live Infrastructure Ingress' : '⚪ Standby (0 Nodes)'}
          </span>
        </div>
      </div>

      {/* Main Grid: Map on Left / Active Card on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '340px' }}>
        {/* SVG World Map */}
        <div style={{ position: 'relative', background: '#090d16', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', maxHeight: '340px' }}
          >
            <defs>
              <linearGradient id="mapGrid" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.03)" />
                <stop offset="100%" stopColor="rgba(14, 165, 233, 0.08)" />
              </linearGradient>
              <radialGradient id="nodePulse">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background Grid Lines */}
            <rect width={width} height={height} fill="url(#mapGrid)" rx="6" />
            
            {/* Latitude / Longitude Guide Lines */}
            {[-60, -30, 0, 30, 60].map(lat => {
              const { y } = projectLatLon(lat, 0, width, height)
              return <line key={lat} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            })}
            {[-120, -60, 0, 60, 120].map(lon => {
              const { x } = projectLatLon(0, lon, width, height)
              return <line key={lon} x1={x} y1="0" x2={x} y2={height} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            })}

            {/* Stylized Continents Outlines */}
            {/* North America */}
            <path d="M120 70 Q 200 60 250 110 T 220 180 T 170 210 T 140 160 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* South America */}
            <path d="M220 220 Q 270 250 260 320 T 210 360 T 190 280 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* Europe */}
            <path d="M380 70 Q 450 65 470 120 T 430 160 T 370 130 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            {/* Africa */}
            <path d="M380 170 Q 460 180 470 260 T 430 330 T 370 240 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* Asia */}
            <path d="M470 60 Q 640 50 670 140 T 580 220 T 480 140 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
            {/* Australia */}
            <path d="M600 260 Q 690 270 680 330 T 600 340 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Attack Geo Nodes */}
            {mapPoints.map((pt, i) => {
              const lat = pt.latitude ?? pt.lat
              const lon = pt.longitude ?? pt.lon ?? pt.lng
              const { x, y, valid } = projectLatLon(lat, lon, width, height)
              if (!valid) return null

              const isSelected = selected?.ip === pt.ip
              const isCrit = pt.risk_score >= 80
              const isSafe = pt.risk_score <= 20
              const color = isSafe ? '#22c55e' : (isCrit ? '#ef4444' : '#f59e0b')

              return (
                <g
                  key={pt.ip + i}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onClick={() => {
                    setActivePoint(pt)
                    if (onSelectPoint) onSelectPoint(pt)
                  }}
                >
                  {/* Outer pulse circle */}
                  <circle cx={x} cy={y} r={isSelected ? 16 : 9} fill={color} opacity={isSelected ? 0.35 : 0.18}>
                    <animate attributeName="r" values="6;16;6" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2.4s" repeatCount="indefinite" />
                  </circle>

                  {/* Core Node */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 5.5 : 4}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Label on Hover / Selection */}
                  {isSelected && (
                    <g transform={`translate(${x}, ${y - 12})`}>
                      <rect x="-45" y="-18" width="90" height="18" rx="4" fill="#0f172a" stroke={color} strokeWidth="1" />
                      <text x="0" y="-6" fill="#f8fafc" fontSize="9" fontWeight="700" textAnchor="middle">
                        {pt.city || pt.country}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Selected Node Details Card */}
        <div style={{
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.65)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {selected ? (
            <>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', fontWeight: 800 }}>
                    ORIGIN NODE TELEMETRY
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: selected.risk_score >= 80 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: selected.risk_score >= 80 ? '#f87171' : '#4ade80'
                  }}>
                    {selected.risk_score}/100 {selected.classification}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: '4px' }}>
                  {selected.ip}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600, marginBottom: '12px' }}>
                  📍 {selected.city ? `${selected.city}, ` : ''}{selected.country}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-faint)' }}>ISP / Network:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)', textAlign: 'right', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selected.isp || 'Unknown'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-faint)' }}>Hosting Provider:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)', textAlign: 'right', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selected.hosting || selected.organization || 'Hosting Facility'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-faint)' }}>VPN / Tor Signal:</span>
                    <span style={{ fontWeight: 700, color: selected.vpn_indicator ? '#f59e0b' : '#34d399' }}>
                      {selected.vpn_indicator ? '⚠️ Possible Proxy/Tor' : '✓ Direct / Clean'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-faint)' }}>Confidence:</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>
                      {selected.confidence || 75}%
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '14px',
                padding: '8px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.05)',
                fontSize: '9.5px',
                color: 'var(--text-faint)',
                lineHeight: 1.3
              }}>
                ⚖️ <strong>Forensic Note:</strong> Estimated infrastructure geolocation; does not establish sender physical identity.
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '16px 8px'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '12px'
              }}>
                🛰️
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                STANDBY / 0 NODES
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.4 }}>
                No active sending nodes geotraced yet. Ingest an email or connect a live mailbox to map origins.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
