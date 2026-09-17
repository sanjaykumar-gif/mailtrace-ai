import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { ErrorBanner } from '../components/Bits.jsx'

const SCENARIOS = [
  {
    filename: '2_phishing_credential.eml',
    title: '🚨 PayPal Phishing Scam',
    desc: 'Fake PayPal security alert trying to steal login passwords with look-alike domain and masked links.',
    badge: 'CRITICAL THREAT',
    badgeColor: 'var(--critical)'
  },
  {
    filename: '3_impersonation_bec.eml',
    title: '👔 Executive Impersonation (BEC)',
    desc: 'Fraudster impersonating the CEO requesting an urgent wire transfer with a mismatched reply address.',
    badge: 'HIGH RISK',
    badgeColor: 'var(--high)'
  },
  {
    filename: '4_invoice_fraud.eml',
    title: '📄 Fake Invoice & Risky Attachment',
    desc: 'Unsolicited invoice carrying a suspicious file attachment and shortened URLs.',
    badge: 'HIGH RISK',
    badgeColor: 'var(--high)'
  },
  {
    filename: '1_safe_notice.eml',
    title: '✅ Legitimate College Notice',
    desc: 'Authentic student placement announcement with valid headers and legitimate links.',
    badge: 'SAFE & CLEAN',
    badgeColor: 'var(--safe)'
  }
]

export default function Analyze() {
  const [tab, setTab] = useState('scenarios') // 'scenarios', 'upload', 'paste'
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const validateFile = (f) => {
    if (!f) return false
    if (!/\.(eml|txt|msg)$/i.test(f.name)) {
      setError('Only .eml / .txt email files are accepted.')
      return false
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('File exceeds the 2 MB upload limit.')
      return false
    }
    return true
  }

  const pickFile = (f) => {
    setError(null)
    if (validateFile(f)) setFile(f)
  }

  const runAnalysis = async (fn, busyKey) => {
    setError(null)
    setBusy(busyKey)
    try {
      const result = await fn()
      navigate(`/result/${result.id}`)
    } catch (e) {
      setError(e.message)
      setBusy('')
    }
  }

  const submit = () => {
    if (tab === 'upload') {
      if (!file) { setError('Please select a .eml email file first.'); return }
      runAnalysis(() => api.analyzeFile(file), 'analyze')
    } else if (tab === 'paste') {
      if (!content.trim()) { setError('Please paste raw email headers or text first.'); return }
      runAnalysis(() => api.analyzeText(content), 'analyze')
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Scan &amp; Investigate Email</h1>
          <div className="sub">
            Fast, explainable threat detection. Choose a pre-loaded real-world scenario or upload your own email.
          </div>
        </div>
      </div>

      <ErrorBanner error={error} />

      {/* Main Tabs */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="tabs" style={{ marginBottom: '1.25rem' }}>
          <button
            className={`tab ${tab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setTab('scenarios')}
          >
            ⚡ 1-Click Test Scenarios
          </button>
          <button
            className={`tab ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            📁 Upload .EML File
          </button>
          <button
            className={`tab ${tab === 'paste' ? 'active' : ''}`}
            onClick={() => setTab('paste')}
          >
            📋 Paste Email Text
          </button>
        </div>

        {/* Tab 1: 1-Click Quick Scenarios */}
        {tab === 'scenarios' && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 0, marginBottom: '1rem' }}>
              Click any real-world email below to immediately run an explainable security investigation:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {SCENARIOS.map((sc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--inner-radius)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: sc.badge.includes('CRITICAL') ? 'rgba(244, 63, 94, 0.15)' : sc.badge.includes('HIGH') ? 'rgba(251, 146, 60, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: sc.badgeColor
                      }}>
                        {sc.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text)', marginBottom: '0.35rem' }}>
                      {sc.title}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4 }}>
                      {sc.desc}
                    </div>
                  </div>

                  <button
                    onClick={() => runAnalysis(() => api.analyzeSample(sc.filename), sc.filename)}
                    disabled={!!busy}
                    className="btn btn-primary"
                    style={{
                      padding: '0.55rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {busy === sc.filename ? 'Analyzing...' : '▶ Run Threat Scan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Upload EML File */}
        {tab === 'upload' && (
          <div>
            <div
              className={`dropzone ${dragOver ? 'over' : ''}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]) }}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '12px',
                padding: '2.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'var(--accent-dim)' : 'var(--panel2)'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
              <div style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Drag &amp; drop an .EML file here, or click to browse
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Supports standard RFC-822 email files exported from Gmail, Outlook, Thunderbird (up to 2 MB)
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".eml,.txt,.msg"
                style={{ display: 'none' }}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>

            {file && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ color: 'var(--text)' }}>Selected: </strong>
                  <span style={{ color: 'var(--accent)' }}>{file.name}</span>{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={submit}
                  disabled={busy === 'analyze'}
                >
                  {busy === 'analyze' ? 'Scanning...' : '🚀 Start Analysis'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Paste Raw Text */}
        {tab === 'paste' && (
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste email headers or full message text here..."
              rows={10}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--panel2)',
                border: '1px solid var(--border-soft)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem'
              }}
            />
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={busy === 'analyze' || !content.trim()}
              style={{ marginTop: '0.75rem' }}
            >
              {busy === 'analyze' ? 'Scanning...' : '🚀 Analyze Pasted Content'}
            </button>
          </div>
        )}
      </div>

      {/* Helper Box: How to export an email */}
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--inner-radius)',
        padding: '1rem 1.25rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <strong style={{ color: 'var(--text)' }}>💡 How to test your own email:</strong>
        <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div>• <strong>Gmail:</strong> Open the email &gt; Click the 3 dots (⋮) on the right &gt; Select <em>"Download message"</em> (.eml).</div>
          <div>• <strong>Outlook:</strong> Open the email &gt; File &gt; <em>"Save As"</em> (.eml or .msg).</div>
          <div>• <strong>Live Mailbox:</strong> Use our <a href="/live" style={{ color: 'var(--accent)' }}>Live Monitor</a> to automatically scan incoming emails in real-time!</div>
        </div>
      </div>
    </div>
  )
}
