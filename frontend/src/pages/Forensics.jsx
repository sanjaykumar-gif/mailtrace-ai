import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { Empty, ErrorBanner, Loading, RiskBadge } from '../components/Bits.jsx'
import AuthPanel from '../components/AuthPanel.jsx'
import UrlTable from '../components/UrlTable.jsx'
import RouteTimeline from '../components/RouteTimeline.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

export default function Forensics() {
  const { id } = useParams()
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(id || '')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchList = () => {
      api.analyses().then((r) => {
        setList(r.analyses)
        if (!selected && r.analyses.length) {
          setSelected(r.analyses[0].id)
        }
      }).catch((e) => setError(e.message))
    }
    fetchList()
    window.addEventListener('mailtrace_data_updated', fetchList)
    return () => window.removeEventListener('mailtrace_data_updated', fetchList)
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
    <div className="fade-in" style={{ width: '100%', margin: 0 }}>
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Email Forensics Lab</h1>
          <div className="sub">Deep RFC header parsing, cryptographic auth matrix, routing timeline, and payload inspection.</div>
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowGuide(true)}
            className="btn"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-glow)', fontWeight: 700 }}
          >
            📖 Forensic Handbook
          </button>
          <select
            value={selected}
            onChange={(e) => change(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.85rem',
              maxWidth: 380,
              outline: 'none'
            }}
          >
            {list.length === 0 && <option value="">No scans yet</option>}
            {list.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.classification} {a.risk_score}] {a.subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={() => loadDetail(selected)} />
      {loading && <Loading text="Extracting deep forensic telemetry…" />}

      {!loading && !data && !error && (
        <Empty title="No email selected for forensic analysis"
          text="Scan an email first or choose a recorded scenario from the selector above.">
          <Link className="btn btn-primary" to="/">Scan Email Now</Link>
        </Empty>
      )}

      {!loading && data && (
        <>
          <div className="row mb" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <RiskBadge value={data.classification} />
            <span className="mono" style={{ fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>{data.risk_score}/100</span>
            <span className="spacer" style={{ flex: 1 }} />
            <Link className="btn btn-sm btn-primary" to={`/result/${data.id}`}>View Score Report →</Link>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-title">Sender Identity Details</div>
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
              <div className="card-title">Message Metadata</div>
              <dl className="kv">
                <dt>Subject</dt><dd><strong>{data.subject}</strong></dd>
                <dt>Date</dt><dd className="mono">{data.date}</dd>
                <dt>Message-ID</dt><dd className="mono" style={{ fontSize: '11.5px' }}>{data.message_id}</dd>
                <dt>Recipient</dt><dd className="mono">{data.recipient}</dd>
                <dt>Source</dt><dd className="mono faint">{data.source}</dd>
              </dl>
            </div>
          </div>

          {/* Real-time Live DNS & GeoIP Intelligence Card */}
          {(data.live_dns || data.live_ip) && (
            <div className="card section-gap">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🌐 DNS &amp; Network Threat Intel</span>
                <span style={{ fontSize: '0.72rem', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-glow)', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                  Live Active
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {data.live_dns && (
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      Domain: {data.live_dns.domain || data.sender_domain}
                    </div>
                    <dl className="kv" style={{ margin: 0 }}>
                      <dt>MX Server</dt>
                      <dd><strong style={{ color: data.live_dns.has_mx ? '#34d399' : '#f87171' }}>{data.live_dns.has_mx ? '✓ Active Mail Exchanger' : '✕ No MX records'}</strong></dd>
                      <dt>SPF Record</dt>
                      <dd className="mono" style={{ fontSize: '11px' }}>{data.live_dns.spf_record || '(none)'}</dd>
                      <dt>DMARC Policy</dt>
                      <dd><strong style={{ color: '#fbbf24' }}>{data.live_dns.dmarc_policy}</strong></dd>
                    </dl>
                  </div>
                )}
                {data.live_ip && (
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#a78bfa', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      Origin IP Geolocation: {data.live_ip.ip}
                    </div>
                    <dl className="kv" style={{ margin: 0 }}>
                      <dt>Location</dt>
                      <dd><strong>{data.live_ip.city ? `${data.live_ip.city}, ` : ''}{data.live_ip.country}</strong> ({data.live_ip.country_code})</dd>
                      <dt>ISP / Org</dt>
                      <dd>{data.live_ip.isp || data.live_ip.org || '—'}</dd>
                      <dt>ASN</dt>
                      <dd className="mono">{data.live_ip.asn || '—'}</dd>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-2 section-gap">
            <div className="card">
              <div className="card-title">Authentication Matrix</div>
              <AuthPanel auth={data.auth} />
            </div>

            <div className="card">
              <div className="card-title">Network Infrastructure</div>
              <dl className="kv">
                <dt>Estimated origin IP</dt>
                <dd className="mono" style={{ fontWeight: 800, color: 'var(--accent)' }}>{data.origin_ip || '—'}</dd>
                <dt>Origin note</dt>
                <dd className="faint">{data.origin_note || '—'}</dd>
                <dt>All IPs in hops</dt>
                <dd className="mono">{data.ips?.filter((x) => x !== data.origin_ip).join(', ') || '—'}</dd>
                <dt>Mail servers</dt>
                <dd className="mono">{data.mail_servers?.join(', ') || '—'}</dd>
              </dl>
            </div>
          </div>

          <div className="card section-gap">
            <div className="card-title">Received-Chain Route Timeline</div>
            <RouteTimeline route={data.route} originIp={data.origin_ip} originNote={data.origin_note} />
          </div>

          <div className="card section-gap">
            <div className="card-title">Extracted URLs &amp; Destinations</div>
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
                            {a.risk === 'dangerous' && <span className="badge badge-CRITICAL">DANGEROUS</span>}
                            {a.risk === 'risky' && <span className="badge badge-HIGH">RISKY</span>}
                            {a.risk === 'none' && <span className="badge badge-SAFE">CLEAN</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>No attachments found in MIME structure.</p>
              )}
            </div>

            <div className="card">
              <div className="card-title">Obfuscation &amp; Concealment Findings</div>
              {data.obfuscation?.length ? (
                <>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fda4af',
                    fontWeight: 800,
                    fontSize: '12px',
                    marginBottom: 12
                  }}>
                    ⚠️ ZERO-WIDTH OR HOMOGLYPH EVASION IDENTIFIED
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
                  No hidden zero-width characters, homoglyphs, or deceptive masked links detected.
                </p>
              )}
            </div>
          </div>

          <div className="card section-gap">
            <div className="card-title">Sanitized Message Content</div>
            <div className="raw-pre">{data.body_preview || '(empty body)'}</div>
            <details className="raw-box mt" style={{ marginTop: '16px' }}>
              <summary style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                View Raw RFC Headers ({data.raw_headers?.split('\n').length || 0} lines)
              </summary>
              <div className="raw-pre mt" style={{ marginTop: '10px' }}>{data.raw_headers || '(none)'}</div>
            </details>
          </div>
        </>
      )}

      {/* Forensic Handbook Modal */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="🔬 Email Forensics & Header Handbook"
        subtitle="Analyst guide for interpreting email headers, authentication grids, routing hops, and evasions"
        tabs={[
          {
            id: 'auth',
            label: 'Authentication Grid',
            icon: '🛡️',
            overview: 'Email authentication standards establish cryptographic proof of sender identity.',
            steps: [
              { title: 'SPF (Sender Policy Framework)', desc: 'Checks whether the transmitting IP is declared authorized in the sender domain’s DNS TXT record. Fail indicates spoofed sender.' },
              { title: 'DKIM (DomainKeys Identified Mail)', desc: 'Validates cryptographic digital signature across email headers and body. Guarantees message was not altered in transit.' },
              { title: 'DMARC (Domain-based Message Authentication)', desc: 'Ensures the visible "From" address aligns with SPF and DKIM. Enforces owner policy (none, quarantine, or reject).' }
            ]
          },
          {
            id: 'timeline',
            label: 'Received-Chain Timeline',
            icon: '🛰️',
            overview: 'Every relay mail server appends a "Received:" header at the top of the stack as an email travels across the internet.',
            steps: [
              { title: 'Tracing Origin Server', desc: 'Read Received headers from bottom to top. The bottom-most valid hop indicates the initial submission server and origin IP.' },
              { title: 'Detecting Forged Headers', desc: 'Attackers can forge internal fake Received headers, but the first external hop added by your receiving MX server cannot be faked.' },
              { title: 'Latency Analysis', desc: 'Large timestamps gaps between hops may reveal message staging or proxy relays.' }
            ]
          },
          {
            id: 'links',
            label: 'URL & Payload Deobfuscation',
            icon: '🔗',
            overview: 'Phishers use multiple layers of obfuscation to bypass standard security filters.',
            steps: [
              { title: 'Masked Hyperlinks', desc: 'The visible anchor text reads "https://paypal.com" but the actual href routes to "https://paypa1-verify.example".' },
              { title: 'Zero-Width Unicode Characters', desc: 'Invisible characters (U+200B, U+200C) inserted into brand names (e.g. "Pay​Pal") to evade keyword pattern matchers.' },
              { title: 'Typosquatting & Homoglyphs', desc: 'Substituting Latin letters with look-alike Cyrillic or numeric characters (e.g. "paypa1" vs "paypal").' }
            ]
          }
        ]}
      />
    </div>
  )
}
