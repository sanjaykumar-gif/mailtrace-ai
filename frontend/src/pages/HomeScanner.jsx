import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api.js'
import { RiskBadge, CopyButton } from '../components/Bits.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Logo from '../components/Logo.jsx'
import MailScannerIllustration from '../components/MailScannerIllustration.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

const DEFAULT_DEMO_SAMPLES = [
  { name: '1_safe_notice.eml', label: '✅ Safe Placement Notice', threat: 'SAFE', score: 0, desc: 'Legitimate college placement notice with valid SPF/DKIM' },
  { name: '2_phishing_credential.eml', label: '🎣 PayPal Credential Phishing', threat: 'CRITICAL', score: 100, desc: 'Look-alike domain, zero-width chars, and masked link' },
  { name: '3_impersonation_bec.eml', label: '💼 Executive BEC Impersonation', threat: 'HIGH', score: 75, desc: 'Executive spoofing and urgency wire-transfer request' },
  { name: '4_invoice_fraud.eml', label: '📄 Fake Invoice Attachment', threat: 'HIGH', score: 80, desc: 'Deceptive invoice with URL shorteners and risky payload' },
  { name: '5_campaign_support.eml', label: '⚡ Campaign: Support Phish', threat: 'CRITICAL', score: 90, desc: 'Coordinated attack campaign 1 of 3 (shared infra)' },
  { name: '6_campaign_billing.eml', label: '⚡ Campaign: Billing Phish', threat: 'CRITICAL', score: 90, desc: 'Coordinated attack campaign 2 of 3 (shared infra)' },
  { name: '7_campaign_account.eml', label: '⚡ Campaign: Account Alert', threat: 'CRITICAL', score: 90, desc: 'Coordinated attack campaign 3 of 3 (shared infra)' },
]

export default function HomeScanner() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'paste' | 'samples'
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [pasteContent, setPasteContent] = useState('')
  const [samplesList, setSamplesList] = useState(DEFAULT_DEMO_SAMPLES)
  const [showExportGuide, setShowExportGuide] = useState(false)
  const [demoMode, setDemoMode] = useState(() => {
    const saved = localStorage.getItem('mailtrace_demo_mode')
    return saved === null ? true : saved === 'true'
  })

  const [scanningSample, setScanningSample] = useState(null)
  const fileInput = useRef(null)
  const resultRef = useRef(null)

  useEffect(() => {
    const updateDemoMode = () => {
      const saved = localStorage.getItem('mailtrace_demo_mode')
      setDemoMode(saved === null ? true : saved === 'true')
    }
    window.addEventListener('demo_mode_change', updateDemoMode)
    window.addEventListener('storage', updateDemoMode)
    return () => {
      window.removeEventListener('demo_mode_change', updateDemoMode)
      window.removeEventListener('storage', updateDemoMode)
    }
  }, [])

  const scanStepsText = [
    'Parsing RFC-5322 MIME email headers & routing hops...',
    'Validating SPF, DKIM, DMARC cryptographic signatures...',
    'Deobfuscating suspicious URLs, masked links, & zero-width characters...',
    'Inspecting sender-header discrepancies & homoglyph traps...',
    'Running Attack DNA campaign correlation & generating forensic verdict...'
  ]

  // Load backend sample files dynamically on mount
  useEffect(() => {
    api.samples()
      .then((res) => {
        if (res?.samples && res.samples.length > 0) {
          const mapped = res.samples.map((s) => {
            const defaultMatch = DEFAULT_DEMO_SAMPLES.find((d) => d.name === s.filename)
            return {
              name: s.filename,
              label: defaultMatch?.label || s.filename.replace(/_/g, ' ').replace('.eml', ''),
              threat: s.filename.includes('safe') ? 'SAFE' : s.filename.includes('bec') || s.filename.includes('fraud') ? 'HIGH' : 'CRITICAL',
              score: s.filename.includes('safe') ? 0 : s.filename.includes('credential') ? 100 : 90,
              desc: s.description || defaultMatch?.desc || 'Forensic demo test scenario'
            }
          })
          setSamplesList(mapped)
        }
      })
      .catch((e) => console.log('Using local demo sample catalog fallback:', e))
  }, [])

  const validateFile = (f) => {
    if (!f) return false
    if (!/\.(eml|txt|msg)$/i.test(f.name)) {
      setError('Please upload an .eml, .msg or .txt email file.')
      return false
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB.')
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

  const runPasteScan = () => {
    if (!pasteContent.trim()) {
      setError('Please paste raw email headers or body content.')
      return
    }
    setError(null)
    runScan(() => api.analyzeText(pasteContent))
  }

  const runSampleScan = (sampleName) => {
    setError(null)
    setScanningSample(sampleName)
    runScan(() => api.analyzeSample(sampleName))
  }

  const runScan = async (apiCall) => {
    setError(null)
    setResult(null)
    setScanning(true)
    setScanStep(0)

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < scanStepsText.length - 1 ? prev + 1 : prev))
    }, 180)

    try {
      const data = await apiCall()
      clearInterval(stepInterval)
      setScanStep(scanStepsText.length - 1)
      setTimeout(() => {
        setScanning(false)
        setScanningSample(null)
        setResult(data)
        showToast('Forensic analysis completed successfully', 'success')
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }, 200)
    } catch (err) {
      clearInterval(stepInterval)
      setScanning(false)
      setScanningSample(null)
      setError(err.message || 'Scan failed.')
      showToast(err.message || 'Scan failed', 'error')
    }
  }

  const resetScanner = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setPasteContent('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const isCritical = result?.classification === 'CRITICAL'
  const isHigh = result?.classification === 'HIGH'
  const isSafe = result?.classification === 'SAFE'
  const isSuspicious = isCritical || isHigh || result?.classification === 'MEDIUM'

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="fade-in">
      {/* Hero Welcome Header */}
      <div style={{ textAlign: 'center', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '0.85rem' }}>
          <Logo size={52} showText={false} />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 1rem',
          borderRadius: '999px',
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent-glow)',
          color: 'var(--accent)',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '0.75rem'
        }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
          Explainable Threat &amp; Campaign Correlation Engine
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text)', margin: '0 0 0.5rem', letterSpacing: '-0.03em' }}>
          Investigate &amp; Dissect Any Email
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.02rem', margin: '0 auto', maxWidth: '780px', lineHeight: 1.55 }}>
          Drop any suspicious email file to verify sender authenticity, trace origin server infrastructure, inspect concealed link redirects, and identify coordinated attack campaigns.
        </p>

        {/* Quick Demo Sample Pills (Only when Demo Mode is ON) */}
        {demoMode && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '1.25rem' }}>
            <span style={{ fontSize: '12px', color: 'var(--accent)', alignSelf: 'center', fontWeight: 800 }}>
              ⚡ Instant Demos:
            </span>
            {samplesList.slice(0, 4).map((s) => (
              <button
                key={s.name}
                disabled={scanning}
                onClick={() => runSampleScan(s.name)}
                className="btn btn-sm"
                style={{
                  fontSize: '11.5px',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  background: 'var(--panel2)',
                  borderColor: 'var(--border)'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '0.9rem 1.25rem',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--inner-radius)',
          color: '#fda4af',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.88rem',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ flex: 1, minWidth: '240px' }}>⚠️ {error}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!demoMode && (error.includes('cold start') || error.includes('timed out') || error.includes('Cannot reach')) && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  localStorage.setItem('mailtrace_demo_mode', 'true')
                  window.dispatchEvent(new Event('demo_mode_change'))
                  setError(null)
                  showToast('Switched to Demo Sandbox Mode', 'success')
                }}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🧪 Switch to Instant Demo Mode
              </button>
            )}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
        </div>
      )}

      {/* Main Scanner Container with Mode Selector */}
      <div className="card" style={{ padding: '1.75rem', position: 'relative' }}>
        {/* Navigation Tabs for Input Mode */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
              🔬 INGESTION PIPELINE
            </span>
            <button
              onClick={() => setShowExportGuide(true)}
              className="btn btn-sm"
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                borderColor: 'var(--accent-glow)',
                fontWeight: 700
              }}
            >
              📖 How to Export .EML?
            </button>
          </div>

          <div className="tabs" style={{ maxWidth: demoMode ? '440px' : '300px', width: '100%' }}>
            <button
              onClick={() => setActiveTab('upload')}
              className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            >
              📂 File Upload
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
            >
              📝 Raw Text
            </button>
            {demoMode && (
              <button
                onClick={() => setActiveTab('samples')}
                className={`tab ${activeTab === 'samples' ? 'active' : ''}`}
              >
                ⚡ Test Samples ({samplesList.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: File Dropzone */}
        {activeTab === 'upload' && (
          <div>
            <div
              className={`dropzone ${dragOver ? 'over' : ''}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '14px',
                padding: '3rem 1.5rem 2.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'var(--accent-dim)' : 'var(--panel2)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* High-Tech Animated Mail Illustration */}
              <MailScannerIllustration scanning={scanning} dragOver={dragOver} size={115} />

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)', margin: '0.5rem 0 0.35rem' }}>
                {scanning ? 'Executing Deep Forensic Pipeline...' : 'Drag & Drop Suspicious Email File Here'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 auto 1.4rem', maxWidth: '480px', lineHeight: 1.45 }}>
                {scanning
                  ? scanStepsText[scanStep]
                  : 'Works with Gmail, Microsoft Outlook, Thunderbird, and Apple Mail export files (.eml, .msg, .txt)'}
              </p>

              {!scanning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 2rem', fontSize: '0.95rem', borderRadius: '10px' }}
                    onClick={(e) => { e.stopPropagation(); fileInput.current?.click() }}
                  >
                    📂 Select Email File
                  </button>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '4px', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-faint)' }}>
                      .EML (RFC-5322)
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '4px', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-faint)' }}>
                      .MSG (Outlook)
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '4px', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-faint)' }}>
                      .TXT (Raw Headers)
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInput}
                type="file"
                accept=".eml,.txt,.msg"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Raw Header Paste */}
        {activeTab === 'paste' && (
          <div style={{ background: 'var(--panel2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>
                Paste Raw RFC Headers or Email Source:
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                Ctrl + V / Cmd + V
              </span>
            </div>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Delivered-To: victim@example.com&#10;Received: from mail.attacker.example ([185.220.101.47])...&#10;From: Support Team <security@update-service.example>&#10;Subject: Urgent: Verify your credentials..."
              rows={7}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                padding: '0.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={runPasteScan}
                disabled={scanning}
                style={{ fontSize: '0.88rem', padding: '0.6rem 1.5rem' }}
              >
                🔬 Scan Pasted Telemetry
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Pre-loaded Demo Test Suite */}
        {activeTab === 'samples' && (
          <div style={{ background: 'var(--panel2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '13px', color: 'var(--text-muted)' }}>
              Click any forensic test sample below to trigger deep rule detection and multi-email correlation:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {samplesList.map((s) => {
                const isThisScanning = scanning && scanningSample === s.name
                return (
                  <div
                    key={s.name}
                    onClick={() => !scanning && runSampleScan(s.name)}
                    style={{
                      background: isThisScanning ? 'var(--accent-dim)' : 'var(--panel)',
                      border: isThisScanning ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: scanning ? (isThisScanning ? 'wait' : 'not-allowed') : 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transform: isThisScanning ? 'scale(1.02)' : 'none',
                      boxShadow: isThisScanning ? '0 0 15px var(--accent-glow)' : 'none'
                    }}
                    className="card-hover-effect"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <RiskBadge value={s.threat} />
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>
                        {s.score} pts
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text)' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      {s.desc}
                    </div>
                    <div style={{
                      fontSize: '11.5px',
                      color: isThisScanning ? 'var(--accent)' : 'var(--accent)',
                      fontWeight: 800,
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      {isThisScanning ? (
                        <>
                          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                          Analyzing Telemetry...
                        </>
                      ) : (
                        '⚡ Run Live Scan →'
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Live Progress Bar when Scanning */}
        {scanning && (
          <div style={{ marginTop: '1.25rem', background: 'var(--panel2)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.84rem' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{scanStepsText[scanStep]}</span>
              <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {Math.round(((scanStep + 1) / scanStepsText.length) * 100)}%
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--panel)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((scanStep + 1) / scanStepsText.length) * 100}%`,
                background: 'linear-gradient(90deg, #38bdf8, #10b981)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)',
                transition: 'width 0.28s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Result Section */}
      {result && (
        <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }} className="fade-in">
          {/* Main Verdict Card */}
          <div className="card" style={{
            background: isSuspicious
              ? 'radial-gradient(ellipse at top left, var(--critical-glow), var(--panel) 70%)'
              : 'radial-gradient(ellipse at top left, var(--safe-glow), var(--panel) 70%)',
            borderColor: isSuspicious ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)',
            padding: '1.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'center' }}>
                <div style={{
                  fontSize: '2.2rem',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: isSuspicious ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 0 20px ${isSuspicious ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                }}>
                  {isSuspicious ? '🛑' : '✅'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 0.25rem', color: isSuspicious ? 'var(--critical)' : 'var(--safe)' }}>
                    {isCritical ? 'CRITICAL THREAT DETECTED' : isHigh ? 'HIGH RISK THREAT' : isSafe ? 'VERIFIED SAFE EMAIL' : 'SUSPICIOUS EMAIL'}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                    <strong>{result.subject}</strong> · <span className="mono">{result.sender?.address || 'unknown'}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 800, letterSpacing: '0.5px' }}>
                  RISK SCORE
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: isSuspicious ? 'var(--critical)' : 'var(--safe)', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
                  {result.risk_score}<span style={{ fontSize: '1.1rem', color: 'var(--text-faint)' }}>/100</span>
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--panel2)',
              padding: '0.9rem 1.2rem',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              marginTop: '1rem'
            }}>
              <strong style={{ color: isSuspicious ? 'var(--critical)' : 'var(--safe)' }}>AI Forensic Verdict: </strong>
              {result.explanation?.summary || 'Analysis complete.'}
            </div>
          </div>

          {/* Section 1: Detected Threat Indicators */}
          <div className="card">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>
              <span>🔎 Forensic Indicators Identified ({result.indicators?.length || 0})</span>
            </div>

            {result.indicators && result.indicators.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {result.indicators.map((ind, idx) => (
                  <div key={idx} style={{
                    background: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '0.95rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--critical)', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          +{ind.points} pts
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {ind.group}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.88rem' }}>
                        {ind.label}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {ind.evidence}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#6ee7b7', fontSize: '0.88rem' }}>
                ✓ Clean email. No spoofed sender, malicious links, or hidden payloads discovered.
              </div>
            )}
          </div>

          {/* Section 2: Step-by-Step Fix Guide */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="card-title" style={{ marginBottom: '2px', fontSize: '0.95rem' }}>
                  <span>🛠️ Recommended Mitigation Actions</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Actionable containment and security procedures for this message.
                </div>
              </div>

              {isSuspicious && (
                <CopyButton
                  text={[
                    `Sender: ${result.sender?.address || 'N/A'}`,
                    `Domain: ${result.sender_domain || 'N/A'}`,
                    result.reply_to?.address ? `Reply-To: ${result.reply_to.address}` : '',
                    result.origin_ip ? `Origin IP: ${result.origin_ip}` : '',
                    ...(result.urls?.map(u => `Link: ${u.url}`) || [])
                  ].filter(Boolean).join('\n')}
                  label="Copy Block Rules"
                />
              )}
            </div>

            {isSuspicious ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '0.9rem', background: 'rgba(244, 63, 94, 0.08)', padding: '0.95rem', borderRadius: '10px', borderLeft: '4px solid var(--critical)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <div style={{ fontSize: '1.25rem' }}>1️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--critical)', fontSize: '0.88rem' }}>
                      Do NOT click embedded links or open attachments
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Hyperlinks in this email route to unverified or deceptive landing pages designed to harvest credentials.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.9rem', background: 'rgba(251, 191, 36, 0.08)', padding: '0.95rem', borderRadius: '10px', borderLeft: '4px solid var(--medium)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                  <div style={{ fontSize: '1.25rem' }}>2️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--medium)', fontSize: '0.88rem' }}>
                      Credential Compromise Protocol:
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: 1.45 }}>
                      • Immediately reset account credentials on the official portal.<br />
                      • Verify multi-factor authentication (MFA/2FA) tokens.<br />
                      • Revoke active session tokens for the affected service.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.9rem', background: 'rgba(56, 189, 248, 0.08)', padding: '0.95rem', borderRadius: '10px', borderLeft: '4px solid var(--accent)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '1.25rem' }}>3️⃣</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.88rem' }}>
                      Containment &amp; Ingestion Block
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: 1.45 }}>
                      • Blacklist sender domain: <code>{result.sender_domain}</code><br />
                      • Block Origin IP at perimeter firewall: <code>{result.origin_ip || 'N/A'}</code>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#6ee7b7', fontSize: '0.88rem' }}>
                ✓ <strong>All checks passed:</strong> Sender authentication, routing, and links conform to legitimate standards.
              </div>
            )}
          </div>

          {/* Action Navigation Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" onClick={resetScanner} style={{ fontSize: '0.86rem' }}>
              + Scan Another Email
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to={`/forensics/${result.id}`} className="btn" style={{ fontSize: '0.86rem' }}>
                🔬 Deep Forensic Details
              </Link>
              {result.campaign_id && (
                <Link to={`/attack-dna/${result.campaign_id}`} className="btn" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)', fontSize: '0.86rem' }}>
                  ⚠ View Correlated Campaign
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Export Guide Modal */}
      <PageGuideModal
        isOpen={showExportGuide}
        onClose={() => setShowExportGuide(false)}
        title="📥 Email Export & Ingestion Guide"
        subtitle="Step-by-step instructions on how to download safe .EML or .MSG files from your mail provider"
        tabs={[
          {
            id: 'gmail',
            label: 'Gmail Web',
            icon: '🔴',
            overview: 'Gmail allows 1-click downloads of complete RFC-5322 email headers without viewing unsafe HTML.',
            steps: [
              { title: 'Step 1: Open the message', desc: 'Open the suspicious email in your browser on mail.google.com.' },
              { title: 'Step 2: Click the More Options menu', desc: 'Click the 3 vertical dots (⋮) in the top-right corner of the email panel (next to the Reply button).' },
              { title: 'Step 3: Select "Download message"', desc: 'Click "Download message". A .eml file will be downloaded to your computer.' },
              { title: 'Step 4: Drop into MailTrace AI', desc: 'Drag that .eml file into the scanner dropzone above for instant forensic dissection.' }
            ]
          },
          {
            id: 'outlook',
            label: 'Outlook / Office 365',
            icon: '🔷',
            overview: 'Both Outlook Desktop and Outlook Web support exporting .MSG / .EML files.',
            steps: [
              { title: 'Outlook Desktop', desc: 'Open the email > File > Save As > Choose "Outlook Message Format - Unicode (*.msg)" or simply drag the email from Outlook to your desktop.' },
              { title: 'Outlook on Web (outlook.com)', desc: 'Open the email > Click the (⋯) menu > View > View message details / Save as file.' },
              { title: 'Analyze', desc: 'Upload the saved file to inspect sender hops, SPF/DKIM validation, and masked URLs.' }
            ]
          },
          {
            id: 'apple',
            label: 'Apple Mail (Mac / iOS)',
            icon: '🍎',
            overview: 'macOS Mail exports raw RFC headers with full cryptographic signatures.',
            steps: [
              { title: 'Step 1: Select message', desc: 'Select the email in your Apple Mail message list.' },
              { title: 'Step 2: Save as Raw Source', desc: 'Go to menu bar: File > Save As... > Select Format: "Raw Message Source".' },
              { title: 'Step 3: Drop file', desc: 'Upload the saved .eml file into MailTrace AI.' }
            ]
          },
          {
            id: 'thunderbird',
            label: 'Thunderbird',
            icon: '⚡',
            overview: 'Mozilla Thunderbird natively saves standard .EML files.',
            steps: [
              { title: 'Step 1: Save message', desc: 'Select the email and press Ctrl + S (Windows/Linux) or Cmd + S (Mac).' },
              { title: 'Step 2: Save format', desc: 'Save as .eml file and upload directly.' }
            ]
          }
        ]}
      />
    </div>
  )
}
