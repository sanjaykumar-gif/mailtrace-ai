import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import RealTimeGpsMap from '../components/RealTimeGpsMap.jsx'

export default function GeoTraceView() {
  const [analyses, setAnalyses] = useState([])
  const [geoPoints, setGeoPoints] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [aRes, mapRes] = await Promise.all([
          api.analyses(),
          api.geotraceMap().catch(() => ({ points: [] }))
        ])
        const list = aRes?.analyses || []
        setAnalyses(list)
        setGeoPoints(mapRes?.points || [])
        if (list.length > 0) {
          // Fetch full detail of first item with geotrace
          const firstDetail = await api.analysis(list[0].id)
          setSelectedNode(firstDetail)
        } else {
          setSelectedNode(null)
        }
      } catch (err) {
        console.error('Failed to load GeoTrace telemetry:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const handleUpdate = () => load()
    window.addEventListener('mailtrace_data_updated', handleUpdate)
    const interval = setInterval(load, 8000)
    return () => {
      window.removeEventListener('mailtrace_data_updated', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  const handleSelectAnalysis = async (a) => {
    try {
      const full = await api.analysis(a.id)
      setSelectedNode(full)
    } catch (e) {
      console.error(e)
    }
  }

  const handleMapSelect = async (pt) => {
    const matched = analyses.find(a => a.origin_ip === pt.ip)
    if (matched) {
      handleSelectAnalysis(matched)
    }
  }

  const gt = selectedNode?.geotrace || {}
  const infra = gt.infrastructure || {}

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌍</span> ORIGIN & GEOTRACE INTELLIGENCE
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-faint)' }}>
            Earliest Reliable Sending Node Extraction, IP Geolocation, ASN/Hosting Classification & Forensic Tracing
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 12px', fontSize: '12px' }}>
            🛰️ Multi-Hop Relay Chronology
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <RealTimeGpsMap points={geoPoints} onSelectPoint={handleMapSelect} refreshInterval={10000} />
      </div>

      {/* Detail Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Left: Email Node Selector */}
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          height: 'fit-content'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '12px' }}>
            INVESTIGATIVE NODES ({analyses.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {analyses.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '11.5px', lineHeight: 1.4 }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>🛰️</div>
                <strong>Awaiting Telemetry Ingress</strong>
                <p style={{ margin: '6px 0 12px' }}>Nodes appear automatically when you scan an email or receive live mailbox traffic.</p>
              </div>
            ) : (
              analyses.map((a) => {
                const isSelected = selectedNode?.id === a.id
                return (
                  <div
                    key={a.id}
                    onClick={() => handleSelectAnalysis(a)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isSelected ? '#38bdf8' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: isSelected ? '#38bdf8' : 'var(--text-faint)', fontWeight: 800 }}>
                        {a.tracking_id || a.id.slice(0, 8)}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: a.risk_score >= 80 ? '#f87171' : (a.risk_score >= 50 ? '#fbbf24' : '#4ade80')
                      }}>
                        {a.risk_score}/100
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.subject || '(No Subject)'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px', fontFamily: 'monospace' }}>
                      📍 {a.origin_ip || 'No IP'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Selected Node Deep Geotrace & Forensics */}
        {selectedNode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Earliest Reliable IP Card */}
            <div style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800, letterSpacing: '0.05em' }}>
                    EARLIEST RELIABLE SENDING NODE
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>
                    {gt.earliest_reliable_ip || selectedNode.origin_ip || 'Unknown IP'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Origin Confidence</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#4ade80' }}>
                    {gt.confidence || 75}%
                  </div>
                </div>
              </div>

              {/* Geo metadata grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Geolocated Country</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                    {gt.country || 'Unknown'} ({gt.country_code || 'XX'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Region & City</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                    {gt.city ? `${gt.city}, ` : ''}{gt.region || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>GPS Coordinates</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', marginTop: '2px' }}>
                    {gt.latitude ? `${gt.latitude}, ${gt.longitude}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>ISP / Autonomous System</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                    {gt.isp || 'Unknown'} ({gt.asn || 'N/A'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Hosting Organization</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                    {gt.organization || 'Hosting Facility'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Network Classification</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
                    {infra.network_type || 'Hosting / Cloud VPS'}
                  </div>
                </div>
              </div>

              {/* Infrastructure Indicators */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
                  INFRASTRUCTURE INTELLIGENCE SIGNALS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  <div style={{ padding: '8px', borderRadius: '6px', background: infra.is_hosting ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{infra.is_hosting ? '✓ Hosting IP' : '✗ Hosting'}</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '6px', background: infra.is_possible_proxy ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{infra.is_possible_proxy ? '⚠️ Proxy/VPN' : '✗ Proxy'}</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '6px', background: infra.is_known_tor_exit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: infra.is_known_tor_exit ? '#ef4444' : 'inherit' }}>{infra.is_known_tor_exit ? '🚨 Tor Exit' : '✗ Tor Node'}</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '6px', background: infra.is_residential ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{infra.is_residential ? '✓ Residential' : '✗ Residential'}</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '6px', background: infra.is_open_relay ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{infra.is_open_relay ? '🚨 Open Relay' : '✓ Closed Relay'}</div>
                  </div>
                </div>
              </div>

              {/* Responsible Forensic Disclaimer */}
              <div style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                fontSize: '11px',
                color: 'var(--text-faint)',
                lineHeight: 1.4
              }}>
                ⚖️ <strong>Forensic Responsibility Standard:</strong> {gt.disclaimer || 'The earliest reliable IP is geolocated to approximate region. This is infrastructure-level intelligence and does not establish the physical location or identity of the sender.'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-faint)' }}>
            Select an investigative node to view its origin trace and geolocation forensics.
          </div>
        )}
      </div>
    </div>
  )
}
