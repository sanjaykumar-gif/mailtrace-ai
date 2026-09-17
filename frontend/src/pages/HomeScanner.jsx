import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, fmtDate } from '../services/api.js'
import { RiskBadge } from '../components/Bits.jsx'
import Logo from '../components/Logo.jsx'

const QUICK_TESTS = [
  {
    filename: '2_phishing_credential.eml',
    title: '🚨 Fake PayPal Security Alert',
    badge: 'CRITICAL THREAT',
    badgeClass: 'badge-CRITICAL',
    desc: 'Fake login link, look-alike domain, credential harvesting lure'
  },
  {
    filename: '3_impersonation_bec.eml',
    title: '👔 Fake CEO Wire Transfer',
    badge: 'HIGH RISK',
    badgeClass: 'badge-HIGH',
    desc: 'Executive impersonation with hidden reply-to divert'
  },
  {
    filename: '4_invoice_fraud.eml',
    title: '📄 Suspicious Invoice File',
    badge: 'HIGH RISK',
    badgeClass: 'badge-HIGH',
    desc: 'Unsolicited invoice with risky payload & URL shortener'
  },
  {
    filename: '1_safe_notice.eml',
    title: '✅ Authentic College Notice',
    badge: 'SAFE & CLEAN',
    badgeClass: 'badge-SAFE',
    desc: 'Legitimate email with valid SPF/DKIM/DMARC signatures'
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
    'Reading email headers and sender identity...',
    'Verifying live DNS, SPF & DMARC authentication...',
    'Inspecting hyperlinks & hidden destination URLs...',
    'Scanning attachments and obfuscation techniques...',
    'Generating problem diagnosis and fix guide...'
  ]

  const validateFile = (f) => {
    if (!f) return false
    if (!/\.(eml|txt|msg)$/i.test(f.name)) {
      setError('Please upload a valid .eml or .txt email file.')
      return false
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('File exceeds 2 MB limit.')
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
      setError('Please paste raw email text or headers.')
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
    }, 320)

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
      setError(err.message || 'Failed to analyze email.')
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
      `Sender Domain: ${result.sender_domain || 'N/A'}`,
      result.reply_to?.address ? `Reply-To: ${result.reply_to.address}` : '',
      result.origin_ip ? `Origin IP: ${result.origin_ip}` : '',
      ...(result.urls?.map(u => `Malicious URL: ${u.url}`) || [])
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(rules)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const isCritical = result?.classification === 'CRITICAL'
  const isHigh = result?.classification === 'HIGH'
  const isSafe = result?.classification === 'SAFE'
  const isSuspicious = isCritical || isHigh || result?.classification === 'MEDIUM'

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Welcome Header */}
      <div style={{ textAlign: 'center', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <Logo size={52} showText={false} />
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.9rem',
          borderRadius: '999px',
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          color: 'var(--accent)',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '0.75rem'
        }}>
          <span>🛡️</span> Instant Email Verification &amp; Security Guide
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text)', margin: '0 0 0.5rem', letterSpacing: '-0.03em' }}>
          Verify Email Threat &amp; Get Step-by-Step Fix
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: '0 auto', maxWidth: '640px', lineHeight: 1.5 }}>
          Drop any suspicious <strong>.eml</strong> email. We verify sender authenticity, detect malicious traps, and give you an actionable guide to protect your account.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--panel)',
          border: '1px solid rgba(225, 29, 72, 0.3)',
          borderRadius: '12px',
          color: 'var(--critical)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.9rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
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
        padding: '2rem',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)'
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
            padding: '3rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--accent-dim)' : 'var(--panel2)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
            {scanning ? '⏳' : '📥'}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.35rem' }}>
            {scanning ? 'Verifying Email Forensics...' : 'Drag & Drop your .EML email file here'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
            {scanning ? scanStepsText[scanStep] : 'or click to browse from your computer (Gmail, Outlook, Thunderbird)'}
          </p>

          {!scanning && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
              onClick={(e) => { e.stopPropagation(); fileInput.current?.click() }}
            >
              📂 Choose .EML File to Verify
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

        {/* Scanning Animation Bar */}
        {scanning && (
          <div style={{ marginTop: '1.5rem', background: 'var(--panel2)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{scanStepsText[scanStep]}</span>
              <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(((scanStep + 1) / scanStepsText.length) * 100)}%
              </span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((scanStep + 1) / scanStepsText.length) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* 1-Click Test Scenarios */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Quick 1-Click Verification Scenarios:
            </span>
            <button
              onClick={() => setShowRawPaste(!showRawPaste)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              {showRawPaste ? '✕ Hide Paste' : '📋 Paste Raw Headers'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: '0.75rem' }}>
            {QUICK_TESTS.map((qt, idx) => (
              <button
                key={idx}
                onClick={() => runQuickTest(qt.filename)}
                disabled={scanning}
                style={{
                  background: 'var(--panel2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.9rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge ${qt.badgeClass}`} style={{ fontSize: '0.7rem' }}>{qt.badge}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>▶ Test</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>{qt.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>{qt.desc}</div>
              </button>
            ))}
          </div>

          {showRawPaste && (
            <div style={{ marginTop: '1rem', background: 'var(--panel2)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Paste raw email headers or body here..."
                rows={5}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem'
                }}
              />
              <button
                className="btn btn-primary"
                onClick={runPasteScan}
                disabled={scanning}
                style={{ marginTop: '0.5rem' }}
              >
                🚀 Verify Pasted Content
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Result & Step-by-Step Fix Section */}
      {result && (
        <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="fade-in">
          {/* Main Verdict Card */}
          <div style={{
            background: isSuspicious
              ? 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)'
              : 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
            border: `1.5px solid ${isSuspicious ? 'rgba(225, 29, 72, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`,
            borderRadius: 'var(--card-radius)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{
                  fontSize: '2.5rem',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: isSuspicious ? 'rgba(225, 29, 72, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isSuspicious ? '🛑' : '✅'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 0.25rem', color: isSuspicious ? 'var(--critical)' : 'var(--safe)' }}>
                    {isCritical ? 'CRITICAL THREAT: MALICIOUS PHISHING EMAIL' : isHigh ? 'SECURITY WARNING: HIGH RISK DETECTED' : isSafe ? 'CLEAN & SAFE EMAIL VERIFIED' : 'SUSPICIOUS PATTERN DETECTED'}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Subject: <strong style={{ color: 'var(--text)' }}>{result.subject}</strong> · Sender: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{result.sender?.address || 'unknown'}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 800, textTransform: 'uppercase' }}>THREAT SCORE</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: isSuspicious ? 'var(--critical)' : 'var(--safe)', fontFamily: 'var(--font-mono)' }}>
                  {result.risk_score}<span style={{ fontSize: '1.2rem', color: 'var(--text-faint)' }}>/100</span>
                </div>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '0.9rem 1.25rem',
              borderRadius: 'var(--inner-radius)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.875rem',
              lineHeight: 1.55,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              <strong style={{ color: isSuspicious ? 'var(--critical)' : 'var(--safe)' }}>Verdict: </strong> {result.explanation?.summary || 'Analysis complete.'}
            </div>
          </div>

          {/* Section 1: Problems Found */}
          <div className="card">
            <div className="card-title">
              <span>🔎 1. Detected Threat Indicators ({result.indicators?.length || 0})</span>
            </div>

            {result.indicators && result.indicators.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {result.indicators.map((ind, idx) => (
                  <div key={idx} style={{
                    background: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--inner-radius)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--critical)' }}>
                          +{ind.points} Threat Points
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                          [{ind.group}]
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem' }}>
                        {ind.label}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {ind.evidence}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#047857' }}>
                ✓ No deceptive indicators found across identity, headers, and links.
              </div>
            )}
          </div>

          {/* Section 2: Step-by-Step Fix Guide */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div className="card-title" style={{ marginBottom: '2px' }}>
                  <span>🛠️ 2. How to Fix &amp; Overcome This Problem</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Step-by-step instructions to protect your account and block this attacker.
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
                    fontSize: '0.8rem'
                  }}
                >
                  {copied ? '✓ Copied Block Rules!' : '📋 Copy Attacker Block Rules'}
                </button>
              )}
            </div>

            {isSuspicious ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ display: 'flex', gap: '1rem', background: '#fff1f2', padding: '1rem', borderRadius: 'var(--inner-radius)', borderLeft: '4px solid var(--critical)', border: '1px solid rgba(225, 29, 72, 0.15)' }}>
                  <div style={{ fontSize: '1.4rem' }}>1️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--critical)', fontSize: '0.9rem' }}>
                      DO NOT Click Links or Download Files
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                      Never open links or attachments inside this email. The destination server (<strong>{result.sender_domain || 'untrusted'}</strong>) is unauthorized and designed to capture your login credentials.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', background: '#fffbeb', padding: '1rem', borderRadius: 'var(--inner-radius)', borderLeft: '4px solid var(--medium)', border: '1px solid rgba(217, 119, 6, 0.15)' }}>
                  <div style={{ fontSize: '1.4rem' }}>2️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--medium)', fontSize: '0.9rem' }}>
                      If You Already Entered Your Password:
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                      • Go directly to the official website by typing it manually and <strong>change your password immediately</strong>.<br />
                      • Enable <strong>Two-Factor Authentication (2FA)</strong> on your account right away.<br />
                      • Run a full antivirus or Windows Defender scan on your computer.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', background: '#eff6ff', padding: '1rem', borderRadius: 'var(--inner-radius)', borderLeft: '4px solid var(--accent)', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                  <div style={{ fontSize: '1.4rem' }}>3️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>
                      Block &amp; Report the Attacker
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                      • In Gmail / Outlook: Click <strong>"Report Phishing"</strong> and <strong>"Block Sender"</strong> ({result.sender?.address}).<br />
                      • Add domain <code>{result.sender_domain}</code> to your email gateway blocklist.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#047857', fontSize: '0.875rem' }}>
                ✓ <strong>All checks passed:</strong> This email has valid cryptographic authentication and safe links. You can interact with it normally.
              </div>
            )}
          </div>

          {/* Action Navigation Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" onClick={resetScanner}>
              + Verify Another Email
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to={`/forensics/${result.id}`} className="btn">
                🔬 View Full Forensic Route
              </Link>
              {result.campaign_id && (
                <Link to={`/attack-dna/${result.campaign_id}`} className="btn" style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fcd34d' }}>
                  ⚠ View Correlated Attack Campaign
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
