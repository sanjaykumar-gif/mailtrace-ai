import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { ErrorBanner } from '../components/Bits.jsx'

const SCENARIOS = [
  {
    filename: '2_phishing_credential.eml',
    title: '🚨 Fake PayPal Alert',
    desc: 'Fake alert trying to steal passwords via look-alike domain and deceptive links.',
    badge: 'CRITICAL',
    badgeColor: 'var(--critical)'
  },
  {
    filename: '3_impersonation_bec.eml',
    title: '👔 Fake CEO Wire Request',
    desc: 'Urgent money transfer request using a mismatched reply address.',
    badge: 'HIGH RISK',
    badgeColor: 'var(--high)'
  },
  {
    filename: '4_invoice_fraud.eml',
    title: '📄 Suspicious Invoice',
    desc: 'Fake billing invoice carrying a risky attachment and shortened link.',
    badge: 'HIGH RISK',
    badgeColor: 'var(--high)'
  },
  {
    filename: '1_safe_notice.eml',
    title: '✅ Safe Campus Notice',
    desc: 'Authentic student notice with verified signatures and valid headers.',
    badge: 'SAFE',
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
      setError('Only .eml or .txt files are accepted.')
      return false
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('File must be under 2 MB.')
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
      if (!file) { setError('Please select an email file first.'); return }
      runAnalysis(() => api.analyzeFile(file), 'analyze')
    } else if (tab === 'paste') {
      if (!content.trim()) { setError('Please paste email text first.'); return }
      runAnalysis(() => api.analyzeText(content), 'analyze')
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Scan Email</h1>
          <div className="sub">
            Pick a sample test, upload an email file, or paste raw text.
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
            ⚡ Sample Tests
          </button>
          <button
            className={`tab ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            📁 Upload File
          </button>
          <button
            className={`tab ${tab === 'paste' ? 'active' : ''}`}
            onClick={() => setTab('paste')}
          >
            📋 Paste Text
          </button>
        </div>

        {/* Tab 1: Quick Scenarios */}
        {tab === 'scenarios' && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 0, marginBottom: '1rem' }}>
              Choose a real-world scenario to run an instant scan:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
              {SCENARIOS.map((sc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--inner-radius)',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: sc.badge.includes('CRITICAL') ? 'rgba(244, 63, 94, 0.15)' : sc.badge.includes('HIGH') ? 'rgba(251, 146, 60, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: sc.badgeColor
                      }}>
                        {sc.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text)', marginBottom: '0.25rem' }}>
                      {sc.title}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.35 }}>
                      {sc.desc}
                    </div>
                  </div>

                  <button
                    onClick={() => runAnalysis(() => api.analyzeSample(sc.filename), sc.filename)}
                    disabled={!!busy}
                    className="btn btn-primary"
                    style={{
                      padding: '0.5rem',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {busy === sc.filename ? 'Scanning...' : '▶ Run Test'}
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
                Drop an .EML file here, or click to browse
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Supports Gmail, Outlook, or Thunderbird export files (up to 2 MB)
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
                  {busy === 'analyze' ? 'Scanning...' : '🚀 Scan File'}
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
              rows={9}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--panel2)',
                border: '1px solid var(--border-soft)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem'
              }}
            />
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={busy === 'analyze' || !content.trim()}
              style={{ marginTop: '0.65rem' }}
            >
              {busy === 'analyze' ? 'Scanning...' : '🚀 Scan Pasted Text'}
            </button>
          </div>
        )}
      </div>

      {/* Helper Box */}
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--inner-radius)',
        padding: '0.9rem 1.15rem',
        fontSize: '0.82rem',
        color: 'var(--text-muted)'
      }}>
        <strong style={{ color: 'var(--text)' }}>💡 How to download an email file:</strong>
        <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div>• <strong>Gmail:</strong> Open email &gt; Click 3 dots (⋮) &gt; <em>"Download message"</em> (.eml).</div>
          <div>• <strong>Outlook:</strong> Open email &gt; File &gt; <em>"Save As"</em> (.eml).</div>
          <div>• <strong>Live Inbox:</strong> Use our <a href="/live" style={{ color: 'var(--accent)' }}>Live Monitor</a> to automatically scan incoming emails.</div>
        </div>
      </div>
    </div>
  )
}
