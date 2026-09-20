import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge } from '../components/Bits.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

export default function History() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await api.analyses()
      setRows(r.analyses)
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
    return () => window.removeEventListener('mailtrace_data_updated', handleDataUpdate)
  }, [load])

  const remove = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this analysis? Campaigns will be recalculated.')) return
    setDeleting(id)
    try {
      await api.deleteAnalysis(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting('')
    }
  }

  const guideTabs = [
    {
      id: 'retention',
      name: 'Incident Retention',
      icon: '🗄️',
      title: 'Telemetry Persistence & Storage Architecture',
      steps: [
        'Every uploaded or live-scanned email is permanently indexed in the MailTrace local vector store.',
        'Extracted headers, SPF/DKIM authentication outcomes, hop IPs, and decomposed URLs are cached for instant recall.',
        'Historical records form the baseline corpus used by the Attack DNA engine to cluster multi-wave phishing waves.',
        'No plaintext email bodies are transmitted to 3rd-party servers; all heuristics execute in your dedicated backend environment.'
      ],
      proTip: 'Deleting a historical scan automatically recalculates Jaccard similarity metrics and campaign clusters across the remaining dataset.'
    },
    {
      id: 'triage',
      name: 'SOC Triage Workflow',
      icon: '🛡️',
      title: 'Incident Prioritization & Response',
      steps: [
        'Sort or identify records with Risk Scores > 70 (Malicious / High Risk) first.',
        'Click any row to open the deep Forensic Dissection view with hop timelines and raw header inspector.',
        'Examine the Campaign tag: if an email is assigned a campaign (e.g., CMP-7F2A), check the Attack DNA page to see all affected mailboxes.',
        'Use the copyable IoC lists from individual analysis pages to update perimeter blocklists (e.g. Palo Alto, Cloudflare, CrowdStrike).'
      ],
      proTip: 'Consistently review emails with "Suspicious" classification (Risk 40–69) to identify emerging BEC impersonation techniques.'
    },
    {
      id: 'evidence',
      name: 'Evidence Handling',
      icon: '⚖️',
      title: 'Forensic Audit & Legal Compliance',
      steps: [
        'Maintain chain of custody: Header signatures (DKIM hashes, ARC seals) prove message integrity at the time of delivery.',
        'Export full forensic summaries for compliance reporting and incident retrospectives.',
        'When removing false-positive test emails, use the "Delete" action to prevent test fixtures from skewing correlation models.'
      ],
      proTip: 'Ensure team members tag incident tickets with the MailTrace Analysis UUID for cross-team SOC visibility.'
    }
  ]

  if (loading) return <Loading text="Loading analysis history…" />

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Scan History</h1>
          <div className="sub">Past email scans and detected threat scores.</div>
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowGuide(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            📖 History & Audit Guide
          </button>
          <Link to="/analyze" className="btn btn-primary">+ Scan Email</Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={load} />

      {rows.length === 0 ? (
        <div className="card">
          <Empty title="No scan history" text="Scan an email to start building your threat history.">
            <Link className="btn btn-primary" to="/analyze">Scan Email</Link>
          </Empty>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">{rows.length} Scanned Emails</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Subject</th><th>Sender</th><th>Domain</th><th>Risk</th><th>Status</th><th>Campaign</th><th>Analyzed</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => navigate(`/result/${r.id}`)}>
                    <td style={{ fontWeight: 600 }}>{r.subject}</td>
                    <td className="mono">{r.sender?.address || '—'}</td>
                    <td className="mono faint">{r.sender_domain || '—'}</td>
                    <td className="mono" style={{ fontWeight: 800 }}>{r.risk_score}</td>
                    <td><RiskBadge value={r.classification} /></td>
                    <td>{r.campaign_id ? <span className="pill" style={{ color: 'var(--medium)' }}>{r.campaign_id}</span> : '—'}</td>
                    <td className="muted">{fmtDate(r.timestamp)}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" disabled={deleting === r.id}
                        onClick={(e) => remove(e, r.id)}>
                        {deleting === r.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History & Audit Guidance Modal */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="Audit & Incident History Guide"
        subtitle="Best practices for telemetry retention, SOC incident triage, and forensic evidence tracking."
        tabs={guideTabs}
      />
    </div>
  )
}
