import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { ErrorBanner } from '../components/Bits.jsx'

export default function Analyze() {
  const [tab, setTab] = useState('upload') // 'upload', 'paste'
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
            Upload an email file (.eml) or paste raw headers to run a threat analysis.
          </div>
        </div>
      </div>

      <ErrorBanner error={error} />

      {/* Main Tabs */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="tabs" style={{ marginBottom: '1.25rem' }}>
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
