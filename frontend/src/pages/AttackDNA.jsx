import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge } from '../components/Bits.jsx'
import CampaignGraph from '../components/CampaignGraph.jsx'

function Confidence({ value }) {
  const color = value >= 75 ? 'var(--critical)' : value >= 50 ? 'var(--high)' : 'var(--medium)'
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>CONFIDENCE</span>
        <span style={{ fontWeight: 800, fontSize: 22, color }}>{value}%</span>
      </div>
      <div className="conf-bar mt">
        <div className="conf-fill" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

export default function AttackDNA() {
  const { id } = useParams()
  const [campaigns, setCampaigns] = useState([])
  const [selected, setSelected] = useState(id || '')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.campaigns()
      setCampaigns(r.campaigns)
      if (!selected && r.campaigns.length) setSelected(r.campaigns[0].id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => { loadList() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    api.campaigns().then(() => {}).catch(() => {})
    api.campaign(selected).then(setDetail).catch((e) => setError(e.message))
  }, [selected])

  useEffect(() => {
    if (id) setSelected(id)
  }, [id])

  const choose = (cid) => {
    setSelected(cid)
    navigate(`/attack-dna/${cid}`, { replace: true })
  }

  if (loading) return <Loading text="Loading campaigns…" />

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Attack Campaigns</h1>
          <div className="sub">Detects coordinated attacks that share the same origin, links, or lure patterns.</div>
        </div>
        <div className="spacer" />
        <Link to="/analyze" className="btn btn-primary">Scan Email</Link>
      </div>

      <ErrorBanner error={error} onRetry={loadList} />

      {campaigns.length === 0 ? (
        <div className="card">
          <Empty title="No campaigns detected yet"
            text="Campaigns appear when multiple emails share the same IP, domain, or malicious link pattern. Scan related emails or load sample tests.">
            <Link to="/analyze" className="btn btn-primary">Scan Emails</Link>
          </Empty>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '290px 1fr' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {campaigns.map((c) => (
              <button key={c.id} onClick={() => choose(c.id)}
                className="card" style={{
                  textAlign: 'left', cursor: 'pointer', color: 'inherit',
                  borderColor: selected === c.id ? 'rgba(255,138,61,0.6)' : undefined,
                  background: selected === c.id ? 'linear-gradient(135deg, rgba(255,138,61,0.12), rgba(255,77,94,0.06))' : undefined,
                }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b style={{ fontSize: 14 }}>{c.id}</b>
                  <span className="pill" style={{ color: 'var(--high)' }}>⚠ {c.confidence}%</span>
                </div>
                <div className="muted mt" style={{ fontSize: 12 }}>
                  {c.member_count} emails · {c.shared_indicators.length} shared indicators
                </div>
              </button>
            ))}
            <p className="disclaimer">Campaigns group emails sharing infrastructure or phishing indicators.</p>
          </div>

          <div>
            {detail && (
              <>
                <div className="campaign-banner">
                  <span className="cb-icon">⚠</span>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="cb-title">{detail.title}</div>
                    <div className="cb-sub">{detail.id} · {detail.member_count} emails · detected {fmtDate(detail.created_at)}</div>
                  </div>
                  <div style={{ minWidth: 230, flex: '0 0 250px' }}>
                    <Confidence value={detail.confidence} />
                  </div>
                </div>

                <div className="card section-gap">
                  <div className="card-title">Shared Indicators</div>
                  <div>
                    {detail.shared_indicators.map((s, i) => (
                      <span className="shared-chip" key={i}>
                        <b>{s.label} <span className="pts">+{s.points}</span></b>
                        {s.values.slice(0, 4).map((v, j) => <span key={j}>{v}</span>)}
                      </span>
                    ))}
                  </div>
                  <p className="disclaimer">{detail.disclaimer}</p>
                </div>

                <div className="card section-gap">
                  <div className="card-title">Attack Graph</div>
                  <CampaignGraph campaign={detail} />
                </div>

                <div className="card section-gap">
                  <div className="card-title">Linked Emails</div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Sender</th><th>Subject</th><th>Risk</th><th>Status</th><th>Origin IP</th><th></th></tr>
                      </thead>
                      <tbody>
                        {detail.members.map((m) => (
                          <tr key={m.id}>
                            <td className="mono">{m.sender?.address || '—'}</td>
                            <td>{m.subject}</td>
                            <td className="mono" style={{ fontWeight: 800 }}>{m.risk_score}</td>
                            <td><RiskBadge value={m.classification} /></td>
                            <td className="mono">{m.origin_ip || '—'}</td>
                            <td><Link className="btn btn-sm" to={`/result/${m.id}`}>Report</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
