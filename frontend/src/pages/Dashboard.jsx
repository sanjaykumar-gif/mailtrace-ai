import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge, StatCard } from '../components/Bits.jsx'
import { useToast } from '../context/ToastContext.jsx'
import ThreatChart from '../components/ThreatChart.jsx'
import ThreatMap from '../components/ThreatMap.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

export default function Dashboard() {
  const { showToast } = useToast()
  const [stats, setStats] = useState(null)
  const [allAnalyses, setAllAnalyses] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [incidents, setIncidents] = useState([])
  const [geoPoints, setGeoPoints] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [isLiveActive, setIsLiveActive] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  
  // Timeline & Filter Controls
  const [sortOrder, setSortOrder] = useState('newest') // 'newest' | 'oldest' | 'risk_high' | 'risk_low'
  const [timePeriod, setTimePeriod] = useState('all') // 'all' | '1h' | '24h' | '7d' | '30d'
  const [liveOnly, setLiveOnly] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('all') // 'all' | 'live' | 'manual'
  const [searchQuery, setSearchQuery] = useState('')

  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const [s, a, c, incs, mapData] = await Promise.all([
        api.stats(),
        api.analyses(),
        api.campaigns(),
        api.incidents().catch(() => ({ incidents: [] })),
        api.geotraceMap().catch(() => ({ points: [] }))
      ])
      setStats(s)
      setAllAnalyses(a.analyses || [])
      setCampaigns(c.campaigns || [])
      setIncidents(incs.incidents || [])
      setGeoPoints(mapData.points || s.geo_points || [])
      setIsLiveActive(Boolean(s.imap_active))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const handleDataUpdate = () => load()
    window.addEventListener('mailtrace_data_updated', handleDataUpdate)
    const interval = setInterval(load, 5000)
    return () => {
      window.removeEventListener('mailtrace_data_updated', handleDataUpdate)
      clearInterval(interval)
    }
  }, [load])

  const resetAll = async () => {
    if (!window.confirm('Clear all analyses and reset live telemetry?')) return
    setBusy('reset')
    try {
      await api.reset()
      showToast('Workspace reset successfully.', 'info')
      await load()
    } catch (e) {
      setError(e.message)
      showToast(e.message, 'error')
    } finally {
      setBusy('')
    }
  }

  // Filter & Sort Analyses by Timeline & Source
  const filteredAnalyses = useMemo(() => {
    let list = [...allAnalyses]

    // 1. Live Only / Source Filter
    if (liveOnly || sourceFilter === 'live') {
      list = list.filter((a) => a.source?.startsWith('live:imap'))
    } else if (sourceFilter === 'manual') {
      list = list.filter((a) => !a.source?.startsWith('live:imap'))
    }

    // 2. Time Period Filter
    if (timePeriod !== 'all') {
      const now = new Date().getTime()
      const msMap = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }
      const maxAge = msMap[timePeriod]
      if (maxAge) {
        list = list.filter((a) => {
          const t = new Date(a.timestamp || a.date).getTime()
          return !isNaN(t) && now - t <= maxAge
        })
      }
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (a) =>
          (a.subject || '').toLowerCase().includes(q) ||
          (a.sender?.address || a.sender?.name || '').toLowerCase().includes(q) ||
          (a.origin_ip || '').toLowerCase().includes(q) ||
          (a.tracking_id || '').toLowerCase().includes(q) ||
          (a.campaign_id || '').toLowerCase().includes(q)
      )
    }

    // 4. Sort Order
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date || 0).getTime()
      const timeB = new Date(b.timestamp || b.date || 0).getTime()

      if (sortOrder === 'newest') return timeB - timeA
      if (sortOrder === 'oldest') return timeA - timeB
      if (sortOrder === 'risk_high') return (b.risk_score || 0) - (a.risk_score || 0)
      if (sortOrder === 'risk_low') return (a.risk_score || 0) - (b.risk_score || 0)
      return 0
    })

    return list
  }, [allAnalyses, liveOnly, sourceFilter, timePeriod, searchQuery, sortOrder])

  // Timeline Statistics
  const timelineStats = useMemo(() => {
    if (!filteredAnalyses.length) return null
    const timestamps = filteredAnalyses
      .map((a) => new Date(a.timestamp || a.date || 0).getTime())
      .filter((t) => !isNaN(t) && t > 0)
    if (!timestamps.length) return null
    const minTime = new Date(Math.min(...timestamps))
    const maxTime = new Date(Math.max(...timestamps))
    return {
      earliest: fmtDate(minTime.toISOString()),
      latest: fmtDate(maxTime.toISOString()),
      count: filteredAnalyses.length,
      totalCount: allAnalyses.length,
      liveCount: allAnalyses.filter((a) => a.source?.startsWith('live:imap')).length
    }
  }, [filteredAnalyses, allAnalyses])

  if (loading) return <Loading text="Loading Live Security Dashboard…" />

  const hasData = Boolean(allAnalyses.length > 0)

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Top Header Banner */}
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--text)' }}>
              Real-Time SOC Telemetry Dashboard
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: isLiveActive
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(56, 189, 248, 0.12)',
                color: isLiveActive ? '#34d399' : '#38bdf8',
                border: `1px solid ${isLiveActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.25)'}`,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isLiveActive ? '#34d399' : '#38bdf8',
                  boxShadow: isLiveActive ? '0 0 10px #34d399' : '0 0 10px #38bdf8',
                  display: 'inline-block',
                }}
              />
              {isLiveActive ? 'LIVE MAILBOX INGESTION ACTIVE' : `REAL-TIME TELEMETRY FEED (${allAnalyses.length} SCANS)`}
            </span>
          </div>
          <div className="sub" style={{ marginTop: '4px' }}>
            Live RFC-5322 header telemetry, real-time Origin GeoTrace intelligence, and Attack DNA correlation.
          </div>
        </div>

        <div className="spacer" />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Live Ingestion Only Toggle */}
          <button
            onClick={() => setLiveOnly((v) => !v)}
            className="btn"
            style={{
              background: liveOnly ? 'rgba(16, 185, 129, 0.25)' : 'var(--panel2)',
              color: liveOnly ? '#34d399' : 'var(--text)',
              borderColor: liveOnly ? '#10b981' : 'var(--border)',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: liveOnly ? '#34d399' : 'var(--text-faint)'
            }} />
            {liveOnly ? '✓ Live Feed Filter Active' : '⚡ Show Live Only'}
          </button>

          <Link
            to="/live"
            className="btn"
            style={{
              background: isLiveActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--panel2)',
              borderColor: isLiveActive ? '#10b981' : 'var(--border)',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            📡 Manage Live Mailbox
          </Link>

          <button
            onClick={() => setShowGuide(true)}
            className="btn"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-glow)', fontWeight: 700, fontSize: '12px' }}
          >
            📖 SOC Playbook
          </button>

          <button className="btn" onClick={resetAll} disabled={!!busy} style={{ fontSize: '12px' }}>
            {busy === 'reset' ? 'Clearing…' : 'Clear Data'}
          </button>

          <Link to="/" className="btn btn-primary" style={{ fontSize: '12px', fontWeight: 800 }}>
            + Scan Email
          </Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={load} />

      {/* Row 1: Primary Metrics */}
      <div className="grid grid-4" style={{ marginBottom: '16px' }}>
        <StatCard
          label="EMAILS ANALYZED"
          value={liveOnly ? timelineStats?.liveCount ?? 0 : stats?.total ?? allAnalyses.length}
          color="#38bdf8"
          sub={liveOnly ? "live IMAP mailbox feeds" : "total ingested artifacts"}
        />
        <StatCard label="CRITICAL THREATS" value={stats?.critical ?? 0} color="#f43f5e" sub="score 81–100 penalty" />
        <StatCard label="HIGH RISK" value={stats?.high ?? 0} color="#f97316" sub="score 61–80 penalty" />
        <StatCard label="ATTACK CAMPAIGNS" value={stats?.campaigns ?? campaigns.length} color="#fbbf24" sub="correlated clusters" />
      </div>

      {/* Row 2: Origin & Intelligence Metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            ORIGIN GEOTRACES
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
            {stats?.origin_traces ?? allAnalyses.length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            real-time geolocated nodes
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            SUSPICIOUS LINKS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#f87171', marginTop: '4px' }}>
            {stats?.suspicious_links ?? 0}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            anchor mismatches / homoglyphs
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            OPEN SOC INCIDENTS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444', marginTop: '4px' }}>
            {stats?.open_incidents ?? incidents.filter((i) => i.status === 'OPEN').length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            active triage tickets
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 800 }}>
            LIVE INGESTION FEEDS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
            {timelineStats?.liveCount ?? allAnalyses.filter((a) => a.source?.startsWith('live:imap')).length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
            connected mailbox syncs
          </div>
        </div>
      </div>

      {/* Embedded Threat Origin Map with Real-time indicator */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌍 GLOBAL ORIGIN & SENDER GEOTRACE MAP</span>
            <span style={{ fontSize: '10.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ⚡ Real-Time IP Geolocation Active
            </span>
          </div>
          <Link to="/geotrace" style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}>
            Open Dedicated GeoTrace Portal →
          </Link>
        </div>
        <ThreatMap points={geoPoints} onSelectPoint={() => navigate('/geotrace')} />
      </div>

      {/* Section: Mail Timeline & Live Scans Table */}
      <div className="section-gap grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {/* Table of Scans & Filter Toolbar */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          {/* Timeline & Filters Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text)' }}>
                  Chronological Telemetry Feed
                </span>
                <span style={{ fontSize: '11px', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  {filteredAnalyses.length} of {allAnalyses.length} Scans
                </span>
              </div>

              {/* Time Period Filter Pill Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--panel2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: '1h', label: '1 Hour' },
                  { id: '24h', label: 'Today (24h)' },
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTimePeriod(p.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: timePeriod === p.id ? 'var(--accent)' : 'transparent',
                      color: timePeriod === p.id ? '#000' : 'var(--text-faint)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Filter Toolbar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border)'
            }}>
              {/* Search Box */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--text-faint)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  🔍 Search Subject / Sender / IP
                </label>
                <input
                  type="text"
                  placeholder="Filter by subject, sender, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Sort Order Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--text-faint)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  ⏳ Timeline Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outline: 'none',
                    fontWeight: 700
                  }}
                >
                  <option value="newest">⏱️ Newest to Oldest (Default)</option>
                  <option value="oldest">⏳ Oldest to Newest</option>
                  <option value="risk_high">🔴 Highest Risk First</option>
                  <option value="risk_low">🟢 Lowest Risk First</option>
                </select>
              </div>

              {/* Ingestion Source Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--text-faint)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  📡 Ingestion Source
                </label>
                <select
                  value={liveOnly ? 'live' : sourceFilter}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'live') setLiveOnly(true)
                    else {
                      setLiveOnly(false)
                      setSourceFilter(v)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outline: 'none',
                    fontWeight: 700
                  }}
                >
                  <option value="all">🌐 All Ingestion Sources</option>
                  <option value="live">⚡ Live IMAP Feeds Only</option>
                  <option value="manual">📁 Manual Scans & Uploads</option>
                </select>
              </div>
            </div>

            {/* Timeline Visual Banner */}
            {timelineStats && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 14px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.15)',
                fontSize: '11px',
                color: 'var(--text-faint)'
              }}>
                <div>
                  📅 <strong>Timeline Span:</strong> {timelineStats.earliest} ➔ {timelineStats.latest}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span>Matching: <strong style={{ color: '#38bdf8' }}>{timelineStats.count}</strong> records</span>
                  <span>Live Mailbox: <strong style={{ color: '#34d399' }}>{timelineStats.liveCount}</strong></span>
                </div>
              </div>
            )}
          </div>

          {filteredAnalyses.length === 0 ? (
            <Empty
              title={liveOnly ? "No live mailbox emails matching filter" : "No telemetry records found"}
              text={liveOnly ? "Connect your live IMAP account or trigger a mailbox sync to capture live traffic." : "Upload an email (.eml, .msg) or connect your live inbox."}
            >
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Link to="/live" className="btn btn-primary">⚡ Connect Live Mailbox</Link>
                <Link to="/" className="btn">+ Scan Real Email</Link>
              </div>
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Subject / Sender</th>
                    <th>Origin IP</th>
                    <th>Risk</th>
                    <th>Classification</th>
                    <th>Campaign</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalyses.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/result/${r.id}`)}>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                        {r.tracking_id || r.id.slice(0, 8)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.subject || '(No Subject)'}</div>
                        <div className="mono faint" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          {r.sender?.address || '—'}
                          {r.source?.startsWith('live:imap') && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#6ee7b7',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 800
                              }}
                            >
                              ⚡ LIVE IMAP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: '11.5px' }}>
                        {r.origin_ip ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('/geotrace')
                            }}
                            title="Inspect Real-Time IP Geolocation"
                            style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {r.origin_ip}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>
                      <td className="mono" style={{ fontWeight: 900, fontSize: '15px' }}>
                        {r.risk_score}
                      </td>
                      <td>
                        <RiskBadge value={r.classification} />
                      </td>
                      <td>
                        {r.campaign_id ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/attack-dna/${r.campaign_id}`)
                            }}
                            title="View Attack DNA Cluster"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: '#fbbf24',
                              background: 'rgba(251, 191, 36, 0.12)',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {r.campaign_id} ↗
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="muted" style={{ fontSize: '11.5px' }}>
                        {fmtDate(r.timestamp || r.date)}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/result/${r.id}`)
                          }}
                          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 800 }}
                        >
                          Inspect 🔍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Threat Distribution Chart */}
        <div className="card">
          <div className="card-title">Threat Score Distribution</div>
          <ThreatChart data={stats?.distribution || []} />
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <Link to="/incidents" style={{ color: '#f87171', textDecoration: 'none', fontWeight: 700 }}>
              🚨 View Active Incidents ({incidents.length}) →
            </Link>
            <Link to="/geotrace" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700 }}>
              🌍 Full GeoTrace View →
            </Link>
          </div>
        </div>
      </div>

      <PageGuideModal
        isOpen={showGuide}
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="📖 MailTrace AI — SOC Analyst Playbook"
        subtitle="Standard Operating Procedures, Threat Triage Guidelines & PS 26106 Methodology"
      />
    </div>
  )
}
