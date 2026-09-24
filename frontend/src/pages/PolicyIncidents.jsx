import { useEffect, useState } from 'react'
import { api, fmtDate } from '../services/api.js'

export default function PolicyIncidents() {
  const [incidents, setIncidents] = useState([])
  const [policies, setPolicies] = useState([])
  const [activeTab, setActiveTab] = useState('incidents') // 'incidents' | 'policies'
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [incRes, polRes] = await Promise.all([
        api.incidents().catch(() => ({ incidents: [] })),
        api.policies().catch(() => ({ policies: [] }))
      ])
      setIncidents(incRes?.incidents || [])
      setPolicies(polRes?.policies || [])
      if (incRes?.incidents?.length > 0 && !selectedIncident) {
        setSelectedIncident(incRes.incidents[0])
      }
    } catch (e) {
      console.error('Failed to load incident/policy data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const handleUpdate = () => loadData()
    window.addEventListener('mailtrace_data_updated', handleUpdate)
    const interval = setInterval(loadData, 8000)
    return () => {
      window.removeEventListener('mailtrace_data_updated', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      await api.updateIncident(incidentId, { status: newStatus })
      await loadData()
      if (selectedIncident && selectedIncident.id === incidentId) {
        setSelectedIncident(prev => ({ ...prev, status: newStatus }))
      }
    } catch (e) {
      console.error('Failed to update incident:', e)
    }
  }

  const getSeverityBadge = (sev) => {
    const isCrit = sev === 'CRITICAL'
    const isHigh = sev === 'HIGH'
    const bg = isCrit ? 'rgba(239, 68, 68, 0.2)' : isHigh ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'
    const color = isCrit ? '#f87171' : isHigh ? '#fbbf24' : '#60a5fa'
    return (
      <span style={{ background: bg, color, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
        {sev}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const isOpen = status === 'OPEN'
    const isInvestigating = status === 'INVESTIGATING'
    const isContained = status === 'CONTAINED' || status === 'CLOSED'
    const bg = isOpen ? 'rgba(239, 68, 68, 0.15)' : isInvestigating ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)'
    const color = isOpen ? '#f87171' : isInvestigating ? '#fbbf24' : '#4ade80'
    return (
      <span style={{ background: bg, color, border: `1px solid ${color}`, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
        ● {status}
      </span>
    )
  }

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Title & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛡️</span> SECURITY POLICIES & INCIDENT RESPONSE
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-faint)' }}>
            Enterprise Security Policy Rules, Automated Mitigation Playbooks, and Incident Case Management
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--panel)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('incidents')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'incidents' ? '#0284c7' : 'transparent',
              color: activeTab === 'incidents' ? '#fff' : 'var(--text-faint)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🚨 Incident Queue ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'policies' ? '#0284c7' : 'transparent',
              color: activeTab === 'policies' ? '#fff' : 'var(--text-faint)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚙️ Policy Rules ({policies.length})
          </button>
        </div>
      </div>

      {activeTab === 'incidents' ? (
        /* Incidents View */
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
          {/* Incident List */}
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '12px' }}>
              ACTIVE INCIDENTS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '560px', overflowY: 'auto' }}>
              {incidents.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px', lineHeight: 1.4 }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛡️</div>
                  <strong style={{ color: 'var(--text)' }}>No Open Incidents</strong>
                  <p style={{ margin: '6px 0 0', fontSize: '11.5px' }}>
                    Incidents trigger automatically when emails evaluated by <strong>Scan Email</strong> or <strong>Live Monitor</strong> violate security policies or exceed risk thresholds.
                  </p>
                </div>
              ) : (
                incidents.map(inc => {
                  const isSelected = selectedIncident?.id === inc.id
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? '#38bdf8' : 'var(--border)'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                          {inc.id}
                        </span>
                        {getStatusBadge(inc.status)}
                      </div>

                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                        {inc.subject}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                        <span style={{ color: 'var(--text-faint)' }}>Ref: {inc.tracking_id}</span>
                        {getSeverityBadge(inc.severity)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Selected Incident Detail & Actions */}
          {selectedIncident ? (
            <div style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                        {selectedIncident.id}
                      </span>
                      {getSeverityBadge(selectedIncident.severity)}
                      {getStatusBadge(selectedIncident.status)}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                      {selectedIncident.subject}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-faint)' }}>
                    <div>Created: {fmtDate(selectedIncident.created_at)}</div>
                    <div style={{ marginTop: '2px' }}>Assigned: <strong style={{ color: 'var(--text)' }}>{selectedIncident.assigned_analyst || 'SOC Lead Analyst'}</strong></div>
                  </div>
                </div>

                {/* Trigger Policies */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
                    POLICY TRIGGERS ({selectedIncident.trigger_policies?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(selectedIncident.trigger_policies || []).map((pol, i) => (
                      <span key={i} style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: 700
                      }}>
                        🚨 {pol}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mitigation Playbook Actions */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
                    RECOMMENDED MITIGATION ACTIONS
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(selectedIncident.actions_taken || []).map((act, i) => (
                      <span key={i} style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800
                      }}>
                        ⚡ {act}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '6px' }}>
                    INCIDENT LOGS & TRIAGE NOTES
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '12px',
                    color: 'var(--text)',
                    lineHeight: 1.5
                  }}>
                    {selectedIncident.notes || 'Automated high-risk security incident registered for analyst review.'}
                  </div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>
                  Update Case Status:
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleStatusChange(selectedIncident.id, 'INVESTIGATING')}
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      border: '1px solid #f59e0b',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🔍 Investigate
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedIncident.id, 'CONTAINED')}
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ade80',
                      border: '1px solid #22c55e',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🛡️ Contain Threat
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedIncident.id, 'CLOSED')}
                    style={{
                      background: 'rgba(148, 163, 184, 0.2)',
                      color: '#cbd5e1',
                      border: '1px solid #64748b',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Close Case
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-faint)' }}>
              Select an incident from the queue to review details and mitigation actions.
            </div>
          )}
        </div>
      ) : (
        /* Policies View */
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '16px' }}>
            ACTIVE CORPORATE EMAIL SECURITY POLICIES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {policies.map(pol => (
              <div
                key={pol.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px 140px',
                  gap: '16px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                      {pol.id}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                      {pol.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.4 }}>
                    {pol.description}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '2px' }}>
                    Condition Rule
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                    {pol.condition_summary}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    background: pol.recommended_action === 'QUARANTINE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    color: pol.recommended_action === 'QUARANTINE' ? '#f87171' : '#38bdf8',
                    border: `1px solid ${pol.recommended_action === 'QUARANTINE' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    ⚡ {pol.recommended_action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
