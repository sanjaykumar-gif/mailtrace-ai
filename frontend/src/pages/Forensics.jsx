import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge } from '../components/Bits.jsx'
import AuthPanel from '../components/AuthPanel.jsx'
import UrlTable from '../components/UrlTable.jsx'
import RouteTimeline from '../components/RouteTimeline.jsx'

export default function Forensics() {
  const { id } = useParams()
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(id || '')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.analyses().then((r) => {
      setList(r.analyses)
      if (!selected && r.analyses.length) {
        setSelected(r.analyses[0].id)
      }
    }).catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDetail = useCallback(async (aid) => {
    if (!aid) return
    setLoading(true)
    setError(null)
    try {
      setData(await api.analysis(aid))
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selected) loadDetail(selected)
  }, [selected, loadDetail])

  useEffect(() => {
    if (id && id !== selected) setSelected(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const change = (aid) => {
    setSelected(aid)
    navigate(`/forensics/${aid}`, { replace: true })
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Forensics</h1>
          <div className="sub">Detailed breakdown of headers, routing timeline, authentication, and links.</div>
        </div>
        <div className="spacer" />
        <select value={selected} onChange={(e) => change(e.target.value)} style={{ maxWidth: 420 }}>
          {list.length === 0 && <option value="">No scans yet</option>}
          {list.map((a) => (
            <option key={a.id} value={a.id}>
              [{a.classification} {a.risk_score}] {a.subject}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner error={error} onRetry={() => loadDetail(selected)} />
      {loading && <Loading text="Loading forensic record…" />}

      {!loading && !data && !error && (
        <Empty title="No email selected"
          text="Scan an email first or choose one from the list above.">
          <Link className="btn btn-primary" to="/analyze">Scan Email</Link>
        </Empty>
      )}

      {!loading && data && (
        <>
          <div className="row mb">
            <RiskBadge value={data.classification} />
            <span className="mono" style={{ fontWeight: 800, fontSize: 16 }}>{data.risk_score}/100</span>
            <span className="spacer" style={{ flex: 1 }} />
            <Link className="btn btn-sm" to={`/result/${data.id}`}>Report →</Link>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-title">Sender Details</div>
              <dl className="kv">
                <dt>From</dt>
                <dd>{data.sender?.name && <span className="muted">{data.sender.name} </span>}
                  <span className="mono">{data.sender?.address || '—'}</span></dd>
                <dt>Reply-To</dt>
                <dd className="mono">{data.reply_to?.address || '(not set)'}</dd>
                <dt>Return-Path</dt>
                <dd className="mono">{data.return_path || '(not set)'}</dd>
                <dt>Sender domain</dt>
                <dd className="mono">{data.sender_domain || '—'}</dd>
                <dt>Reply-To domain</dt>
                <dd className="mono">{data.reply_to_domain || '—'}</dd>
                <dt>Return-Path domain</dt>
                <dd className="mono">{data.return_path_domain || '—'}</dd>
              </dl>
            </div>

            <div className="card">
              <div className="card-title">Message Details</div>
              <dl className="kv">
                <dt>Subject</dt><dd>{data.subject}</dd>
                <dt>Date</dt><dd className="mono">{data.date}</dd>
                <dt>Message-ID</dt><dd className="mono">{data.message_id}</dd>
                <dt>Recipient</dt><dd className="mono">{data.recipient}</dd>
                <dt>Source</dt><dd className="mono faint">{data.source}</dd>
              </dl>
            </div>
          </div>

          {/* Real-time Live DNS & GeoIP Intelligence Card */}
          {(data.live_dns || data.live_ip) && (
            <div className="card section-gap">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🌐 DNS &amp; Network Intel</span>
                <span style={{ fontSize: '0.75rem', background: '#0369a1', color: '#e0f2fe', padding: '2px 8px', borderRadius: '999px' }}>
                  Live
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {data.live_dns && (
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      Domain: {data.live_dns.domain || data.sender_domain}
                    </div>
                    <dl className="kv" style={{ margin: 0 }}>
                      <dt>MX Status</dt>
                      <dd style={{ color: data.live_dns.has_mx ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                        {data.live_dns.has_mx ? `Active (${data.live_dns.mx_records?.join(', ') || 'Resolved'})` : 'No Active MX Records Found'}
                      </dd>
                      <dt>Live SPF Record</dt>
                      <dd className="mono" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {data.live_dns.spf_record || '(no SPF TXT record in live DNS)'}
                      </dd>
                      <dt>Live DMARC Policy</dt>
                      <dd>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 'bold',
                          background: data.live_dns.dmarc_policy === 'REJECT' ? '#dc2626' : '#ca8a04',
                          color: '#fff'
                        }}>
                          {data.live_dns.dmarc_policy || 'NONE'}
                        </span>
                      </dd>
                    </dl>
                  </div>
                )}

                {data.live_ip && (
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#a78bfa', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      Origin IP Intelligence: {data.live_ip.ip}
                    </div>
                    <dl className="kv" style={{ margin: 0 }}>
                      <dt>Geo Location</dt>
                      <dd>{data.live_ip.city ? `${data.live_ip.city}, ` : ''}{data.live_ip.country || 'Unknown'}</dd>
                      <dt>ISP / Host</dt>
                      <dd>{data.live_ip.isp || data.live_ip.org || 'Unknown'}</dd>
                      <dt>Autonomous System</dt>
                      <dd className="mono" style={{ fontSize: '0.75rem' }}>{data.live_ip.asn || 'N/A'}</dd>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-2 section-gap">
            <div className="card">
              <div className="card-title">Authentication</div>
              <AuthPanel auth={data.auth} />
              <p className="disclaimer">Reported from email security headers (SPF, DKIM, DMARC).</p>
            </div>

            <div className="card">
              <div className="card-title">Network Route</div>
              <dl className="kv">
                <dt>Origin IP (est.)</dt>
                <dd className="mono" style={{ fontWeight: 700, color: data.origin_ip ? 'var(--high)' : undefined }}>
                  {data.origin_ip || 'Could not determine'}
                </dd>
                <dt>Other IPs</dt>
                <dd className="mono">{data.ips?.filter((x) => x !== data.origin_ip).join(', ') || '—'}</dd>
                <dt>Mail servers</dt>
                <dd className="mono">{data.mail_servers?.join(', ') || '—'}</dd>
              </dl>
            </div>
          </div>

          <div className="card section-gap">
            <div className="card-title">Route Timeline</div>
            <RouteTimeline route={data.route} originIp={data.origin_ip} originNote={data.origin_note} />
          </div>

          <div className="card section-gap">
            <div className="card-title">Links in Email</div>
            <UrlTable urls={data.urls} />
          </div>

          <div className="grid grid-2 section-gap">
            <div className="card">
              <div className="card-title">Attachments ({data.attachments?.length || 0})</div>
              {data.attachments?.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Filename</th><th>Type</th><th>Size</th><th>Risk</th></tr></thead>
                    <tbody>
                      {data.attachments.map((a, i) => (
                        <tr key={i}>
                          <td className="mono">{a.filename}</td>
                          <td className="mono faint">{a.content_type}</td>
                          <td className="mono">{(a.size / 1024).toFixed(1)} KB</td>
                          <td>
                            {a.risk === 'dangerous' && <span className="tag-suspicious">DANGEROUS</span>}
                            {a.risk === 'risky' && <span className="tag-suspicious" style={{ color: 'var(--high)' }}>RISKY</span>}
                            {a.risk === 'none' && <span className="tag-clean">LOW</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>No attachments found.</p>
              )}
            </div>

            <div className="card">
              <div className="card-title">Hidden Techniques</div>
              {data.obfuscation?.length ? (
                <>
                  <div className="banner banner-warn" style={{ marginBottom: 10 }}>
                    <b>⚠ HIDDEN PATTERNS DETECTED</b>
                  </div>
                  {data.obfuscation.map((o, i) => (
                    <div className="evidence" key={i} style={{ marginBottom: 8 }}>
                      <span className="ev-check" style={{ color: 'var(--medium)' }}>◆</span>
                      <div className="evidence-body">
                        <div className="evidence-label">{o.type}</div>
                        <div className="evidence-text">{o.detail}</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No hidden characters, homoglyphs, or deceptive links found.
                </p>
              )}
            </div>
          </div>

          <div className="card section-gap">
            <div className="card-title">Email Preview</div>
            <div className="raw-pre">{data.body_preview || '(empty body)'}</div>
            <details className="raw-box mt">
              <summary>View raw headers ({data.raw_headers?.split('\n').length || 0} lines)</summary>
              <div className="raw-pre mt">{data.raw_headers || '(none)'}</div>
            </details>
          </div>
        </>
      )}
    </div>
  )
}
