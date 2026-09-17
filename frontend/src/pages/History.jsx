import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge } from '../components/Bits.jsx'

export default function History() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState('')
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

  useEffect(() => { load() }, [load])

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

  if (loading) return <Loading text="Loading analysis history…" />

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Analysis History</h1>
          <div className="sub">Every analysis persists locally and feeds campaign correlation.</div>
        </div>
        <div className="spacer" />
        <Link to="/analyze" className="btn btn-primary">+ Analyze Email</Link>
      </div>

      <ErrorBanner error={error} onRetry={load} />

      {rows.length === 0 ? (
        <div className="card">
          <Empty title="History is empty" text="Run your first analysis to build the investigation trail.">
            <Link className="btn btn-primary" to="/analyze">Analyze Email</Link>
          </Empty>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">{rows.length} Stored Analyses</div>
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
    </div>
  )
}
