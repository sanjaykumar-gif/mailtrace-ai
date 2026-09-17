import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { RiskBadge } from '../components/Bits.jsx'
import Logo from '../components/Logo.jsx'

const QUICK_TESTS = [
  {
    filename: '2_phishing_credential.eml',
    title: '🚨 Fake PayPal Alert',
    badge: 'CRITICAL',
    badgeClass: 'badge-CRITICAL',
    desc: 'Fake login link designed to steal passwords'
  },
  {
    filename: '3_impersonation_bec.eml',
    title: '👔 Fake CEO Wire Request',
    badge: 'HIGH RISK',
    badgeClass: 'badge-HIGH',
    desc: 'Urgent money transfer with hidden reply address'
  },
  {
    filename: '4_invoice_fraud.eml',
    title: '📄 Suspicious Invoice',
    badge: 'HIGH RISK',
    badgeClass: 'badge-HIGH',
    desc: 'Fake billing invoice with risky link attachment'
  },
  {
    filename: '1_safe_notice.eml',
    title: '✅ Safe Campus Notice',
    badge: 'SAFE',
    badgeClass: 'badge-SAFE',
    desc: 'Verified email with valid security signatures'
  }
]

export default function HomeScanner() {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showRawPaste, setShowRawPaste] = useState(false)
  const [pasteContent, setPasteContent] = useState('')

  const fileInput = useRef(null)
  const resultRef = useRef(null)

  const scanStepsText = [
    'Reading email headers...',
    'Checking sender & DNS records...',
    'Inspecting links & attachments...',
    'Checking for hidden traps...',
    'Finalizing safety report...'
  ]

  const validateFile = (f) => {
    if (!f) return false
    if (!/\.(eml|txt|msg)$/i.test(f.name)) {
      setError('Please upload an .eml or .txt email file.')
      return false
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('File must be under 2 MB.')
      return false
    }
    return true
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (validateFile(f)) {
      setFile(f)
      runScan(() => api.analyzeFile(f))
    }
  }

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (validateFile(f)) {
      setFile(f)
      runScan(() => api.analyzeFile(f))
    }
  }

  const runQuickTest = (filename) => {
    setError(null)
    setFile({ name: filename, size: 2048 })
    runScan(() => api.analyzeSample(filename))
  }

  const runPasteScan = () => {
    if (!pasteContent.trim()) {
      setError('Please paste email text or headers.')
      return
    }
    setError(null)
    runScan(() => api.analyzeText(pasteContent))
  }

  const runScan = async (apiCall) => {
    setError(null)
    setResult(null)
    setScanning(true)
    setScanStep(0)

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < scanStepsText.length - 1 ? prev + 1 : prev))
    }, 300)

    try {
      const data = await apiCall()
      clearInterval(stepInterval)
      setScanning(false)
      setResult(data)
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      clearInterval(stepInterval)
      setScanning(false)
      setError(err.message || 'Scan failed.')
    }
  }

  const resetScanner = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setPasteContent('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const copyBlockRules = () => {
    if (!result) return
    const rules = [
      `Sender: ${result.sender?.address || 'N/A'}`,
      `Domain: ${result.sender_domain || 'N/A'}`,
      result.reply_to?.address ? `Reply-To: ${result.reply_to.address}` : '',
      result.origin_ip ? `Origin IP: ${result.origin_ip}` : '',
      ...(result.urls?.map(u => `Link: ${u.url}`) || [])
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(rules)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isCritical = result?.classification === 'CRITICAL'
  const isHigh = result?.classification === 'HIGH'
  const isSafe = result?.classification === 'SAFE'
  const isSuspicious = isCritical || isHigh || result?.classification === 'MEDIUM'

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Hero Welcome Header */}
      <div style={{ textAlign: 'center', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <Logo size={50} showText={false} />
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.3rem 0.85rem',
          borderRadius: '999px',
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          color: 'var(--accent)',
          fontSize: '0.78rem',
          fontWeight: 700,
          marginBottom: '0.6rem'
        }}>
          <span>🛡️</span> Instant Email Safety Checker
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text)', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
          Check Any Email for Threats
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: '0 auto', maxWidth: '580px', lineHeight: 1.45 }}>
          Drop any suspicious <strong>.eml</strong> file below. We check sender authenticity, detect scam links, and show you exactly what to do.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '0.85rem 1.15rem',
          background: 'var(--panel)',
          border: '1px solid rgba(225, 29, 72, 0.3)',
          borderRadius: '10px',
          color: 'var(--critical)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.88rem'
        }}>
          <div>⚠️ {error}</div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Main Upload Dropzone */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--card-radius)',
        padding: '1.75rem',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)'
      }}>
        <div
          className={`dropzone ${dragOver ? 'over' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : '#cbd5e1'}`,
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--accent-dim)' : 'var(--panel2)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '2.75rem', marginBottom: '0.6rem' }}>
            {scanning ? '⏳' : '📥'}
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.3rem' }}>
            {scanning ? 'Scanning email...' : 'Drop your email file (.eml) here'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
            {scanning ? scanStepsText[scanStep] : 'Works with Gmail, Outlook, Thunderbird, or text exports'}
          </p>

          {!scanning && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.4rem', fontSize: '0.88rem' }}
              onClick={(e) => { e.stopPropagation(); fileInput.current?.click() }}
            >
              📂 Select File
            </button>
          )}

          <input
            ref={fileInput}
            type="file"
            accept=".eml,.txt,.msg"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {/* Scanning Bar */}
        {scanning && (
          <div style={{ marginTop: '1.25rem', background: 'var(--panel2)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{scanStepsText[scanStep]}</span>
              <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(((scanStep + 1) / scanStepsText.length) * 100)}%
              </span>
            </div>
            <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((scanStep + 1) / scanStepsText.length) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Quick Test Scenarios */}
        <div style={{ marginTop: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Or try a sample test:
            </span>
            <button
              onClick={() => setShowRawPaste(!showRawPaste)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
            >
              {showRawPaste ? '✕ Hide text input' : '📋 Paste text instead'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
            {QUICK_TESTS.map((qt, idx) => (
              <button
                key={idx}
                onClick={() => runQuickTest(qt.filename)}
                disabled={scanning}
                style={{
                  background: 'var(--panel2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.8rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge ${qt.badgeClass}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>{qt.badge}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Test ▶</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text)' }}>{qt.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{qt.desc}</div>
              </button>
            ))}
          </div>

          {showRawPaste && (
            <div style={{ marginTop: '0.85rem', background: 'var(--panel2)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Paste raw email headers or message here..."
                rows={4}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text)',
                  padding: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem'
                }}
              />
              <button
                className="btn btn-primary"
                onClick={runPasteScan}
                disabled={scanning}
                style={{ marginTop: '0.45rem', fontSize: '0.82rem', padding: '0.45rem 1rem' }}
              >
                Scan Pasted Text
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="fade-in">
          {/* Main Verdict Card */}
          <div style={{
            background: isSuspicious
              ? 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)'
              : 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
            border: `1.5px solid ${isSuspicious ? 'rgba(225, 29, 72, 0.35)' : 'rgba(5, 150, 105, 0.35)'}`,
            borderRadius: 'var(--card-radius)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  fontSize: '2.2rem',
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: isSuspicious ? 'rgba(225, 29, 72, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSuspicious ? '🛑' : '✅'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.2rem', color: isSuspicious ? 'var(--critical)' : 'var(--safe)' }}>
                    {isCritical ? 'Dangerous Phishing Threat' : isHigh ? 'High Risk Threat' : isSafe ? 'Verified Safe Email' : 'Suspicious Email'}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    <strong>{result.subject}</strong> · <span className="mono">{result.sender?.address || 'unknown'}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 800 }}>THREAT SCORE</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: isSuspicious ? 'var(--critical)' : 'var(--safe)', fontFamily: 'var(--font-mono)' }}>
                  {result.risk_score}<span style={{ fontSize: '1rem', color: 'var(--text-faint)' }}>/100</span>
                </div>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.85rem',
              lineHeight: 1.45
            }}>
              <strong style={{ color: isSuspicious ? 'var(--critical)' : 'var(--safe)' }}>Verdict: </strong>
              {result.explanation?.summary || 'Analysis complete.'}
            </div>
          </div>

          {/* Section 1: Detected Threat Indicators */}
          <div className="card">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>
              <span>🔎 Threats Found ({result.indicators?.length || 0})</span>
            </div>

            {result.indicators && result.indicators.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {result.indicators.map((ind, idx) => (
                  <div key={idx} style={{
                    background: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.4rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--critical)' }}>
                          +{ind.points} pts
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                          {ind.group}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.86rem' }}>
                        {ind.label}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      {ind.evidence}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '0.85rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', fontSize: '0.85rem' }}>
                ✓ Clean email. No deceptive sender, bad links, or hidden payloads found.
              </div>
            )}
          </div>

          {/* Section 2: Step-by-Step Fix Guide */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="card-title" style={{ marginBottom: '2px', fontSize: '0.95rem' }}>
                  <span>🛠️ What To Do</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Quick steps to protect your account and block this sender.
                </div>
              </div>

              {isSuspicious && (
                <button
                  onClick={copyBlockRules}
                  className="btn"
                  style={{
                    background: copied ? 'var(--safe)' : '#ffffff',
                    borderColor: copied ? 'var(--safe)' : 'var(--border)',
                    color: copied ? '#ffffff' : 'var(--text)',
                    fontSize: '0.78rem',
                    padding: '0.35rem 0.8rem'
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy Block Info'}
                </button>
              )}
            </div>

            {isSuspicious ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem', background: '#fff1f2', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid var(--critical)', border: '1px solid rgba(225, 29, 72, 0.15)' }}>
                  <div style={{ fontSize: '1.2rem' }}>1️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--critical)', fontSize: '0.86rem' }}>
                      Do NOT click links or download files
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      Links in this email may lead to fake login pages or malicious software.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', background: '#fffbeb', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid var(--medium)', border: '1px solid rgba(217, 119, 6, 0.15)' }}>
                  <div style={{ fontSize: '1.2rem' }}>2️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--medium)', fontSize: '0.86rem' }}>
                      If you already entered your password:
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem', lineHeight: 1.4 }}>
                      • Go directly to the official site and <strong>change your password now</strong>.<br />
                      • Turn on <strong>Two-Factor Authentication (2FA)</strong>.<br />
                      • Run a quick virus scan on your computer.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', background: '#eff6ff', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid var(--accent)', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                  <div style={{ fontSize: '1.2rem' }}>3️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.86rem' }}>
                      Block and report the sender
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem', lineHeight: 1.4 }}>
                      • Click <strong>"Report Phishing"</strong> in your email app.<br />
                      • Block sender: <code>{result.sender?.address}</code>.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.85rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', fontSize: '0.85rem' }}>
                ✓ <strong>All checks passed:</strong> This email looks authentic and safe to open.
              </div>
            )}
          </div>

          {/* Action Navigation Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button className="btn btn-primary" onClick={resetScanner} style={{ fontSize: '0.84rem' }}>
              + Check Another Email
            </button>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <Link to={`/forensics/${result.id}`} className="btn" style={{ fontSize: '0.84rem' }}>
                🔬 Forensic Details
              </Link>
              {result.campaign_id && (
                <Link to={`/attack-dna/${result.campaign_id}`} className="btn" style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fcd34d', fontSize: '0.84rem' }}>
                  ⚠ View Campaign
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
