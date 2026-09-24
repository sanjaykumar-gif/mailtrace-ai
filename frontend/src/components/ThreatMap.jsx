import { useEffect, useRef, useState, useCallback } from 'react'

let leafletCssInjected = false
function injectLeafletCss() {
  if (leafletCssInjected) return
  leafletCssInjected = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

function riskColor(score) {
  if (score >= 80) return '#ef4444'
  if (score >= 50) return '#f59e0b'
  if (score >= 20) return '#38bdf8'
  return '#22c55e'
}

function riskGlow(score) {
  if (score >= 80) return 'rgba(239, 68, 68, 0.7)'
  if (score >= 50) return 'rgba(245, 158, 11, 0.7)'
  if (score >= 20) return 'rgba(56, 189, 248, 0.7)'
  return 'rgba(34, 197, 94, 0.7)'
}

const TILE_PROVIDERS = {
  dark: {
    name: '🗺️ Dark Carto',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { subdomains: 'abcd', maxZoom: 19, attribution: '© OpenStreetMap contributors, © CARTO' }
  },
  satellite: {
    name: '🛰️ Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 18, attribution: 'Tiles © Esri' }
  },
  osm: {
    name: '🌐 Standard OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, attribution: '© OpenStreetMap' }
  }
}

export default function ThreatMap({ points = [], onSelectPoint = null }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const tileLayerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [activeTile, setActiveTile] = useState('dark')
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const mapPoints = points || []
  const selected = selectedPoint || hoveredPoint || (mapPoints.length > 0 ? mapPoints[0] : null)

  // Initialize Real Leaflet Map
  useEffect(() => {
    injectLeafletCss()
    if (!mapContainerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      if (mapRef.current) return

      const map = L.map(mapContainerRef.current, {
        center: [25, 15],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      })

      // Add default dark tile layer
      const provider = TILE_PROVIDERS[activeTile] || TILE_PROVIDERS.dark
      tileLayerRef.current = L.tileLayer(provider.url, provider.options).addTo(map)

      // Add bottom-right zoom control
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Switch Tile Layer (Dark / Satellite / OSM)
  const switchTileLayer = (key) => {
    if (!mapRef.current) return
    setActiveTile(key)
    import('leaflet').then((L) => {
      const map = mapRef.current
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current)
      }
      const provider = TILE_PROVIDERS[key] || TILE_PROVIDERS.dark
      tileLayerRef.current = L.tileLayer(provider.url, provider.options).addTo(map)
    })
  }

  // Plot GPS Threat Markers on Real Map
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !mapReady) return

    import('leaflet').then((L) => {
      const map = mapRef.current

      // Remove previous markers
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
        const isSelected = selected?.ip === pt.ip
        const size = isSelected ? 16 : (pt.risk_score >= 80 ? 14 : 11)

        const icon = L.divIcon({
          className: 'real-map-threat-marker',
          iconSize: [size * 3.5, size * 3.5],
          iconAnchor: [(size * 3.5) / 2, (size * 3.5) / 2],
          html: `
            <div style="position:relative;width:${size * 3.5}px;height:${size * 3.5}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <div style="position:absolute;width:${size * 2.8}px;height:${size * 2.8}px;border-radius:50%;background:${glow};animation:threatPulse 2s ease-out infinite;opacity:0;"></div>
              <div style="position:absolute;width:${size * 2}px;height:${size * 2}px;border-radius:50%;background:${glow};animation:threatPulse 2s ease-out 0.6s infinite;opacity:0;"></div>
              <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 0 10px ${glow},0 0 4px ${color};position:relative;z-index:3;"></div>
            </div>
          `,
        })

        const marker = L.marker([lat, lon], { icon })

        // Popup with rich forensic telemetry
        const popupContent = `
          <div style="background:#0b1329;border:1px solid ${color};border-radius:10px;padding:12px 14px;font-family:sans-serif;color:#f8fafc;min-width:210px;box-shadow:0 0 20px rgba(0,0,0,0.8);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:#94a3b8;">ORIGIN NODE</span>
              <span style="font-size:10.5px;font-weight:900;padding:2px 6px;border-radius:4px;background:${color}22;color:${color};border:1px solid ${color}66;">
                ${pt.risk_score}/100 ${pt.classification || 'THREAT'}
              </span>
            </div>
            <div style="font-size:13.5px;font-weight:900;color:${color};font-family:monospace;margin-bottom:4px;">
              ${pt.ip}
            </div>
            <div style="font-size:12px;color:#e2e8f0;margin-bottom:8px;font-weight:700;">
              📍 ${pt.city ? `${pt.city}, ` : ''}${pt.country || 'Unknown'}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10.5px;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;">
              <div><span style="color:#64748b;">ISP:</span><br><b style="color:#cbd5e1;">${pt.isp || 'Unknown'}</b></div>
              <div><span style="color:#64748b;">Hosting:</span><br><b style="color:#cbd5e1;">${pt.hosting || pt.organization || 'Data Center'}</b></div>
              <div><span style="color:#64748b;">VPN / Proxy:</span><br><b style="color:${pt.vpn_indicator ? '#f59e0b' : '#34d399'}">${pt.vpn_indicator ? '⚠️ Proxy/Tor' : '✓ Clean Direct'}</b></div>
              <div><span style="color:#64748b;">Confidence:</span><br><b style="color:#38bdf8;">${pt.confidence || 85}%</b></div>
            </div>
          </div>
        `

        marker.bindPopup(popupContent, { maxWidth: 280, className: 'real-map-dark-popup' })

        marker.on('click', () => {
          setSelectedPoint(pt)
          if (onSelectPoint) onSelectPoint(pt)
        })

        marker.on('mouseover', () => {
          setHoveredPoint(pt)
        })

        marker.on('mouseout', () => {
          setHoveredPoint(null)
        })

        marker.addTo(map)
        markersRef.current.push(marker)
      })

      // Auto-fit bounds if points exist
      if (validLatLngs.length > 0 && mapRef.current) {
        if (validLatLngs.length === 1) {
          map.setView(validLatLngs[0], 4)
        } else {
          map.fitBounds(validLatLngs, { padding: [40, 40], maxZoom: 6 })
        }
      }
    })
  }, [mapReady, mapPoints, selected, onSelectPoint])

  useEffect(() => {
    updateMarkers()
  }, [updateMarkers])

  // Reset map view to world center
  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.setView([25, 15], 2)
    }
  }

  return (
    <div
      className="threat-map-container"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(15, 23, 42, 0.65)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌍</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
              REAL-TIME SENDER GEOTRACE MAP (REAL CARTOGRAPHIC TILES)
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-faint)' }}>
              Real Global Geographic Map with Precise GPS Geolocation & Sending Node Intelligence ({mapPoints.length} Active {mapPoints.length === 1 ? 'Node' : 'Nodes'})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Map Layer Switcher */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.4)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            {Object.entries(TILE_PROVIDERS).map(([key, prov]) => (
              <button
                key={key}
                onClick={() => switchTileLayer(key)}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTile === key ? 'var(--accent)' : 'transparent',
                  color: activeTile === key ? '#000' : 'var(--text-faint)',
                  transition: 'all 0.15s ease',
                }}
              >
                {prov.name}
              </button>
            ))}
          </div>

          <button
            onClick={resetView}
            className="btn"
            style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}
            title="Reset to Global World View"
          >
            🎯 Reset View
          </button>

          <span
            className="badge"
            style={{
              background: mapPoints.length > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.12)',
              color: mapPoints.length > 0 ? '#38bdf8' : 'var(--text-faint)',
              border: `1px solid ${mapPoints.length > 0 ? 'rgba(56, 189, 248, 0.3)' : 'var(--border)'}`,
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            {mapPoints.length > 0 ? `● ${mapPoints.length} Live GPS Coordinates` : '⚪ Standby (0 Nodes)'}
          </span>
        </div>
      </div>

      {/* Main Grid: Real Leaflet Map on Left / Active Node Details Card on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', minHeight: '380px' }}>
        {/* Real Leaflet Map Container */}
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px', background: '#090d16' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px' }} />

          {/* Map Overlay Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              zIndex: 400,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '10px',
              color: 'var(--text-faint)',
              pointerEvents: 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            🗺️ Real-Time GPS Geolocation · OpenStreetMap & CARTO Cartography
          </div>
        </div>

        {/* Selected Node Details Card */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.75)',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {selected ? (
            <>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', fontWeight: 800 }}>
                    ORIGIN NODE TELEMETRY
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: selected.risk_score >= 80 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      color: selected.risk_score >= 80 ? '#f87171' : '#4ade80',
                    }}
                  >
                    {selected.risk_score}/100 {selected.classification || 'VERIFIED'}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace', marginBottom: '4px' }}>
                  {selected.ip}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 700, marginBottom: '12px' }}>
                  📍 {selected.city ? `${selected.city}, ` : ''}{selected.country}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-faint)' }}>GPS Coordinates:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                      {selected.latitude ? `${parseFloat(selected.latitude).toFixed(4)}, ${parseFloat(selected.longitude).toFixed(4)}` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-faint)' }}>ISP Network:</span>
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
                    <span style={{ color: 'var(--text-faint)' }}>Forensic Confidence:</span>
                    <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                      {selected.confidence || 85}%
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '14px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '9.5px',
                  color: 'var(--text-faint)',
                  lineHeight: 1.3,
                }}
              >
                ⚖️ <strong>Forensic Note:</strong> Real-time GPS coordinate intelligence for physical sender infrastructure mapping.
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '16px 8px',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '12px',
                }}
              >
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

      <style>{`
        @keyframes threatPulse {
          0% { transform: scale(0.4); opacity: 0.8; }
          80% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .real-map-dark-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 10px !important;
        }
        .real-map-dark-popup .leaflet-popup-tip-container {
          display: none;
        }
        .real-map-dark-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-container {
          background: #060d1a !important;
        }
      `}</style>
    </div>
  )
}
